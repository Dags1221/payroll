import { Database } from '../db/database';
import { LeaveRequest, LeaveStatus, Attendance } from '../types';
import { auditService } from './audit.service';
import { notificationService } from './notification.service';

export class LeaveService {
  private db = Database.getInstance();

  public async getLeaves(filter?: { empId?: string; status?: string }): Promise<LeaveRequest[]> {
    return this.db.getLeaves(filter);
  }

  public async createLeave(data: {
    empId: string;
    type: LeaveRequest['type'];
    start: string;
    end: string;
    reason: string;
    actorName: string;
  }): Promise<LeaveRequest> {
    if (!data.empId) throw new Error('Employee ID is required.');
    if (!data.start || !data.end) throw new Error('Start date and end date are required.');
    if (!data.reason || data.reason.trim() === '') throw new Error('A clear reason for the leave is required.');

    const startDate = new Date(data.start + 'T00:00:00');
    const endDate = new Date(data.end + 'T00:00:00');

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD.');
    }

    if (data.start > data.end) {
      throw new Error('Start date cannot be after end date.');
    }

    // -------------------------------------------------------------
    // Retroactive filing limits
    // -------------------------------------------------------------
    const today = new Date().toISOString().slice(0, 10);
    const todayDate = new Date(today + 'T00:00:00');
    const diffDaysFromToday = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (data.type === 'Vacation Leave') {
      if (data.start < today) {
        throw new Error('Vacation Leave must be filed in advance and cannot start in the past.');
      }
    } else {
      // Sick Leave / Emergency Leave / Bereavement Leave / Other: retroactive limit 5 calendar days
      if (diffDaysFromToday > 5) {
        throw new Error(`Retroactive leave filing for ${data.type} cannot exceed 5 calendar days in the past.`);
      }
    }

    // -------------------------------------------------------------
    // Overlap validation against existing Pending/Approved requests
    // -------------------------------------------------------------
    const existingLeaves = await this.db.getLeaves({ empId: data.empId });
    const overlapping = existingLeaves.find(l => {
      if (l.status === 'Rejected' || l.status === 'Cancelled') return false;
      return (data.start <= l.end && data.end >= l.start);
    });

    if (overlapping) {
      throw new Error(`An active or pending leave request already overlaps this period (${overlapping.start} to ${overlapping.end}, status: ${overlapping.status}).`);
    }

    const diffTime = endDate.getTime() - startDate.getTime();
    const days = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const leave: LeaveRequest = {
      id: `LR-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      empId: data.empId,
      type: data.type,
      start: data.start,
      end: data.end,
      days,
      reason: data.reason.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const saved = await this.db.createLeave(leave);

    await auditService.log({
      userId: data.empId,
      userName: data.actorName,
      role: 'EMPLOYEE',
      action: 'LEAVE_REQUEST_CREATE',
      entity: 'LEAVE_REQUEST',
      entityId: saved.id,
      details: `Submitted ${data.type} request (${data.start} to ${data.end}, ${days} day(s)) for reason: ${data.reason}.`,
    });

    // Notify administrators and supervisors
    await notificationService.notify({
      userId: 'ALL',
      title: 'New Leave Request Submitted',
      message: `${data.actorName} submitted a ${data.type} request for ${days} day(s) (${data.start} to ${data.end}).`,
      type: 'INFO',
      link: '/leave'
    });

    return saved;
  }

  public async reviewLeave(params: {
    leaveId: string;
    status: 'Approved' | 'Rejected' | 'Cancelled';
    reviewerId: string;
    reviewerName: string;
    remarks: string;
    reviewerRole?: string;
    reviewerDepartment?: string;
  }): Promise<LeaveRequest> {
    const leave = await this.db.getLeaveById(params.leaveId);
    if (!leave) throw new Error('Leave request not found.');

    // Concurrency / Idempotency check: only Pending leaves can be reviewed
    if (leave.status !== 'Pending') {
      throw new Error(`Leave request has already been finalized (${leave.status}).`);
    }

    // Mandatory rejection remarks
    if (params.status === 'Rejected') {
      if (!params.remarks || params.remarks.trim() === '') {
        throw new Error('A rejection reason is mandatory.');
      }
    }

    const updated = await this.db.updateLeave(params.leaveId, {
      status: params.status,
      reviewerId: params.reviewerId,
      reviewerName: params.reviewerName,
      remarks: params.remarks.trim(),
      reviewedAt: new Date().toISOString()
    });

    // -------------------------------------------------------------
    // Synchronize Attendance upon Leave Approval
    // -------------------------------------------------------------
    if (params.status === 'Approved') {
      const cur = new Date(leave.start + 'T00:00:00');
      const end = new Date(leave.end + 'T00:00:00');

      while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const existingAtt = await this.db.getAttendance({ date: dateStr, empId: leave.empId });
        const att = existingAtt[0];

        if (att) {
          // Update only if employee has not already clocked in
          if (!att.in || att.in.trim() === '') {
            att.status = 'On Leave';
            att.remarks = `Approved ${leave.type}: ${leave.reason}`;
            await this.db.saveAttendance(att);
          }
        } else {
          const leaveAttendance: Attendance = {
            id: `ATT-LV-${Date.now().toString(36).toUpperCase()}-${leave.empId}`,
            date: dateStr,
            empId: leave.empId,
            in: '',
            out: '',
            workingHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            breakMinutes: 0,
            lateMinutes: 0,
            undertimeMinutes: 0,
            status: 'On Leave',
            remarks: `Approved ${leave.type}: ${leave.reason}`,
            createdAt: new Date().toISOString()
          };
          await this.db.saveAttendance(leaveAttendance);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    await auditService.log({
      userId: params.reviewerId,
      userName: params.reviewerName,
      role: 'ADMIN',
      action: `LEAVE_${params.status.toUpperCase()}`,
      entity: 'LEAVE_REQUEST',
      entityId: params.leaveId,
      details: `Leave request ${params.leaveId} was ${params.status.toLowerCase()} by ${params.reviewerName}. Remarks: ${params.remarks}`,
    });

    // Notify employee
    await notificationService.notify({
      userId: leave.empId,
      title: `Leave Request ${params.status}`,
      message: `Your ${leave.type} request (${leave.start} to ${leave.end}) has been ${params.status.toLowerCase()} by ${params.reviewerName}. Remarks: ${params.remarks || 'None'}`,
      type: params.status === 'Approved' ? 'SUCCESS' : 'WARNING',
      link: '/leave'
    });

    return updated!;
  }
}

export const leaveService = new LeaveService();
