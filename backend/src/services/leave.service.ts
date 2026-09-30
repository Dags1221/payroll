import { Database } from '../db/database';
import { LeaveRequest, LeaveStatus } from '../types';
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
    const startDate = new Date(data.start);
    const endDate = new Date(data.end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const leave: LeaveRequest = {
      id: `LR-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      empId: data.empId,
      type: data.type,
      start: data.start,
      end: data.end,
      days,
      reason: data.reason,
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

    // Notify administrators
    await notificationService.notify({
      userId: 'USR-001',
      title: 'New Leave Request Submitted',
      message: `${data.actorName} submitted a ${data.type} request for ${days} day(s).`,
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
  }): Promise<LeaveRequest> {
    const leave = await this.db.getLeaveById(params.leaveId);
    if (!leave) throw new Error('Leave request not found.');

    const updated = await this.db.updateLeave(params.leaveId, {
      status: params.status,
      reviewerId: params.reviewerId,
      reviewerName: params.reviewerName,
      remarks: params.remarks,
      reviewedAt: new Date().toISOString()
    });

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
