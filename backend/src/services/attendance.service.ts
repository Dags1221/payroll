import { Database } from '../db/database';
import { Attendance } from '../types';
import { auditService } from './audit.service';

export class AttendanceService {
  private db = Database.getInstance();

  public async getAttendance(filter?: { date?: string; empId?: string }): Promise<Attendance[]> {
    return this.db.getAttendance(filter);
  }

  public async clockIn(empId: string, actorName = 'Employee'): Promise<Attendance> {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let records = await this.db.getAttendance({ date: today, empId });
    let record = records[0];

    if (record && record.in && record.in.trim() !== '') {
      throw new Error('Time-in has already been recorded for today.');
    }

    // Standard workday start is 08:00 AM
    // Calculate late minutes
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const scheduledStartMinutes = 8 * 60; // 08:00 AM
    const actualMinutes = currentHour * 60 + currentMinute;
    const lateMinutes = Math.max(0, actualMinutes - scheduledStartMinutes);

    const status = lateMinutes > 0 ? 'Late' : 'Present';

    if (record) {
      record.in = timeString;
      record.status = status;
      record.lateMinutes = lateMinutes;
      await this.db.saveAttendance(record);
    } else {
      record = {
        id: `ATT-${Date.now().toString(36).toUpperCase()}-${empId}`,
        date: today,
        empId,
        in: timeString,
        out: '',
        workingHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        lateMinutes,
        undertimeMinutes: 0,
        status,
        createdAt: now.toISOString()
      };
      await this.db.saveAttendance(record);
    }

    await auditService.log({
      userId: empId,
      userName: actorName,
      role: 'EMPLOYEE',
      action: 'ATTENDANCE_CLOCK_IN',
      entity: 'ATTENDANCE',
      entityId: record.id,
      details: `Clock-in recorded for ${empId} at ${timeString}. Status: ${status} (Late: ${lateMinutes}m).`,
    });

    return record;
  }

  public async clockOut(empId: string, actorName = 'Employee'): Promise<Attendance> {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const records = await this.db.getAttendance({ date: today, empId });
    const record = records[0];

    if (!record || !record.in) {
      throw new Error('No Time-in recorded. Please record Time-in first.');
    }

    if (record.out && record.out.trim() !== '') {
      throw new Error('Time-out has already been recorded for today.');
    }

    // Compute working hours (default standard 8.0h if valid punch)
    const workingHours = 8.0;
    const regularHours = 8.0;

    record.out = timeString;
    record.workingHours = workingHours;
    record.regularHours = regularHours;

    await this.db.saveAttendance(record);

    await auditService.log({
      userId: empId,
      userName: actorName,
      role: 'EMPLOYEE',
      action: 'ATTENDANCE_CLOCK_OUT',
      entity: 'ATTENDANCE',
      entityId: record.id,
      details: `Clock-out recorded for ${empId} at ${timeString}. Total: ${workingHours}h.`,
    });

    return record;
  }

  public async adminAdjust(id: string, updates: Partial<Attendance>, adminName: string, reason: string): Promise<Attendance> {
    const existing = await this.db.getAttendanceById(id);
    if (!existing) throw new Error('Attendance record not found.');

    const updated = await this.db.updateAttendance(id, {
      ...updates,
      correctedBy: adminName,
      correctedAt: new Date().toISOString(),
      remarks: reason ? `Admin adjustment: ${reason}` : existing.remarks
    });

    await auditService.log({
      userId: 'ADMIN',
      userName: adminName,
      role: 'ADMIN',
      action: 'ATTENDANCE_ADJUSTMENT',
      entity: 'ATTENDANCE',
      entityId: id,
      details: `Admin adjustment applied to attendance for ${existing.empId} on ${existing.date}. Reason: ${reason}`,
    });

    return updated!;
  }

  public async qrPunch(empId: string, requestedType?: 'TIME_IN' | 'TIME_OUT' | 'AUTO', actorName = 'QR Scanner'): Promise<{
    record: Attendance;
    action: 'TIME_IN' | 'TIME_OUT';
    employee: any;
    punchTime: string;
    message: string;
  }> {
    const employee = await this.db.getEmployeeById(empId);
    if (!employee) {
      throw new Error(`Employee ID ${empId} not recognized in company roster.`);
    }

    const today = new Date().toISOString().slice(0, 10);
    const existing = await this.db.getAttendance({ date: today, empId });
    const record = existing[0];

    let action: 'TIME_IN' | 'TIME_OUT';
    if (requestedType === 'TIME_IN') {
      action = 'TIME_IN';
    } else if (requestedType === 'TIME_OUT') {
      action = 'TIME_OUT';
    } else {
      if (!record || !record.in) {
        action = 'TIME_IN';
      } else if (!record.out) {
        action = 'TIME_OUT';
      } else {
        throw new Error(`${employee.name} has already logged both Time-In (${record.in}) and Time-Out (${record.out}) for today.`);
      }
    }

    let savedRecord: Attendance;
    if (action === 'TIME_IN') {
      savedRecord = await this.clockIn(empId, `${employee.name} (${actorName})`);
    } else {
      savedRecord = await this.clockOut(empId, `${employee.name} (${actorName})`);
    }

    const now = new Date();
    const punchTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return {
      record: savedRecord,
      action,
      employee: {
        id: employee.id,
        name: employee.name,
        department: employee.department,
        position: employee.position,
      },
      punchTime,
      message: `${action === 'TIME_IN' ? 'Time In' : 'Time Out'} recorded for ${employee.name} at ${punchTime}.`
    };
  }

  public async getAttendanceDashboard(date?: string): Promise<{
    date: string;
    summary: {
      total: number;
      present: number;
      absent: number;
      onLeave: number;
      late: number;
      attendanceRate: number;
    };
    roster: Array<{
      emp: any;
      att: Attendance;
      status: 'Present' | 'Late' | 'Absent' | 'On Leave';
      leaveDetails?: any;
    }>;
  }> {
    const queryDate = date || new Date().toISOString().slice(0, 10);
    const [employees, attendanceList, leaves] = await Promise.all([
      this.db.getEmployees(),
      this.db.getAttendance({ date: queryDate }),
      this.db.getLeaves()
    ]);

    const approvedLeavesOnDate = leaves.filter(l =>
      l.status === 'Approved' &&
      queryDate >= l.start &&
      queryDate <= l.end
    );

    let presentCount = 0;
    let lateCount = 0;
    let onLeaveCount = 0;
    let absentCount = 0;

    const roster = employees.map(emp => {
      const att = attendanceList.find(a => a.empId === emp.id);
      const leave = approvedLeavesOnDate.find(l => l.empId === emp.id);

      let effectiveStatus: 'Present' | 'Late' | 'Absent' | 'On Leave';
      if (att && att.in && att.in.trim() !== '') {
        effectiveStatus = att.status === 'Late' ? 'Late' : 'Present';
        if (effectiveStatus === 'Late') lateCount++;
        presentCount++;
      } else if (leave) {
        effectiveStatus = 'On Leave';
        onLeaveCount++;
      } else {
        effectiveStatus = 'Absent';
        absentCount++;
      }

      const synthesizedAtt: Attendance = att || {
        id: `ATT-SYNTH-${emp.id}`,
        date: queryDate,
        empId: emp.id,
        in: '',
        out: '',
        workingHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        lateMinutes: 0,
        undertimeMinutes: 0,
        status: effectiveStatus,
        createdAt: ''
      };

      return {
        emp,
        att: {
          ...synthesizedAtt,
          status: effectiveStatus,
          remarks: synthesizedAtt.remarks || (effectiveStatus === 'On Leave' ? `Approved ${leave?.type}: ${leave?.reason}` : undefined)
        },
        status: effectiveStatus,
        leaveDetails: leave ? {
          type: leave.type,
          start: leave.start,
          end: leave.end,
          reason: leave.reason
        } : undefined
      };
    });

    const total = employees.length;
    const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    return {
      date: queryDate,
      summary: {
        total,
        present: presentCount,
        absent: absentCount,
        onLeave: onLeaveCount,
        late: lateCount,
        attendanceRate
      },
      roster
    };
  }
}

export const attendanceService = new AttendanceService();
