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
}

export const attendanceService = new AttendanceService();
