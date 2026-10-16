import { Database } from '../db/database';
import { Attendance, OvertimeRecord } from '../types';
import { auditService } from './audit.service';
import { qrService } from './qr.service';

const round2 = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    return d.getHours() * 60 + d.getMinutes();
  }
  const match = timeStr.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3] ? match[3].toUpperCase() : null;
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return 0;
}

export class AttendanceService {
  private db = Database.getInstance();
  private lastPunchTimestamps = new Map<string, number>();

  public async getAttendance(filter?: { date?: string; empId?: string }): Promise<Attendance[]> {
    return this.db.getAttendance(filter);
  }

  public async clockIn(empId: string, actorName = 'Employee', customTime?: string): Promise<Attendance> {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const timeString = customTime || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let records = await this.db.getAttendance({ date: today, empId });
    let record = records[0];

    if (record && record.in && record.in.trim() !== '') {
      throw new Error('Time-in has already been recorded for today.');
    }

    // Lookup employee schedule
    const employee = await this.db.getEmployeeById(empId);
    let scheduledStartMinutes = 8 * 60; // default 08:00 AM
    if (employee?.workSchedule) {
      const match = employee.workSchedule.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const mer = match[3].toUpperCase();
        if (mer === 'PM' && h < 12) h += 12;
        if (mer === 'AM' && h === 12) h = 0;
        scheduledStartMinutes = h * 60 + m;
      }
    }

    const actualMinutes = parseTimeToMinutes(timeString);
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
        breakMinutes: 0,
        lateMinutes,
        undertimeMinutes: 0,
        status,
        createdAt: now.toISOString()
      };
      await this.db.saveAttendance(record);
    }

    this.lastPunchTimestamps.set(empId, Date.now());

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

  public async clockOut(empId: string, actorName = 'Employee', customTime?: string): Promise<Attendance> {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const timeString = customTime || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const records = await this.db.getAttendance({ date: today, empId });
    const record = records[0];

    if (!record || !record.in || record.in.trim() === '') {
      throw new Error('No Time-in recorded. Please record Time-in first.');
    }

    if (record.out && record.out.trim() !== '') {
      throw new Error('Time-out has already been recorded for today.');
    }

    // Parse time in and out to calculate elapsed working minutes
    const inMinutes = parseTimeToMinutes(record.in);
    const outMinutes = parseTimeToMinutes(timeString);
    let elapsedMinutes = outMinutes - inMinutes;
    if (elapsedMinutes < 0) {
      // Overnight wrap
      elapsedMinutes += 24 * 60;
    }

    // Philippine DOLE statutory mandate:
    // Deduct 1-hour (60 minutes) unpaid meal break if elapsed shift is >= 5 hours (300 minutes)
    const breakMinutes = elapsedMinutes >= 300 ? 60 : 0;
    const netMinutes = Math.max(0, elapsedMinutes - breakMinutes);
    const workingHours = round2(netMinutes / 60);
    const regularHours = Math.min(8.0, workingHours);
    const overtimeHours = Math.max(0, round2(workingHours - 8.0));
    const undertimeMinutes = Math.max(0, 480 - Math.min(480, netMinutes));

    record.out = timeString;
    record.workingHours = workingHours;
    record.regularHours = regularHours;
    record.overtimeHours = overtimeHours;
    record.breakMinutes = breakMinutes;
    record.undertimeMinutes = undertimeMinutes;

    await this.db.saveAttendance(record);
    this.lastPunchTimestamps.set(empId, Date.now());

    // -------------------------------------------------------------
    // AUTOMATIC OVERTIME CANDIDATE UPSERT PIPELINE
    // Triggered automatically on time-out when net hours exceed 8.0h
    // -------------------------------------------------------------
    if (overtimeHours > 0) {
      const employee = await this.db.getEmployeeById(empId);
      const salary = Number(employee?.salary || 0);
      const hourlyBase = round2(salary / 160);
      const multiplier = 1.25; // Standard 1.25x for regular workday overtime
      const hourlyRate = round2(hourlyBase * multiplier);
      const totalAmount = round2(overtimeHours * hourlyRate);

      const existingOt = await this.db.getOvertimeByAttendanceId(record.id);
      if (existingOt) {
        await this.db.updateOvertime(existingOt.id, {
          hours: overtimeHours,
          rate: hourlyRate,
          amount: totalAmount,
          status: 'Pending',
          payrollItemId: undefined,
          reason: `Automatic overtime candidate detected on time-out (${overtimeHours}h exceeding 8h net shift)`
        });
      } else {
        const candidateOt: OvertimeRecord = {
          id: `OT-${Date.now().toString(36).toUpperCase().slice(-4)}`,
          date: record.date,
          empId,
          regularSchedule: employee?.workSchedule || '08:00 AM - 05:00 PM (Mon-Fri)',
          hours: overtimeHours,
          rate: hourlyRate,
          multiplier,
          amount: totalAmount,
          reason: `Automatic overtime candidate detected on time-out (${overtimeHours}h exceeding 8h net shift)`,
          status: 'Pending',
          attendanceId: record.id,
          createdAt: new Date().toISOString()
        };
        await this.db.createOvertime(candidateOt);
      }
    }

    await auditService.log({
      userId: empId,
      userName: actorName,
      role: 'EMPLOYEE',
      action: 'ATTENDANCE_CLOCK_OUT',
      entity: 'ATTENDANCE',
      entityId: record.id,
      details: `Clock-out recorded for ${empId} at ${timeString}. Total: ${workingHours}h (Regular: ${regularHours}h, OT: ${overtimeHours}h, Break: ${breakMinutes}m).`,
    });

    return record;
  }

  public async adminAdjust(id: string, updates: Partial<Attendance>, adminName: string, reason: string): Promise<Attendance> {
    let existing = await this.db.getAttendanceById(id);
    if (!existing) {
      if (updates.empId && updates.date) {
        const newRecord: Attendance = {
          id: id.startsWith('ATT-PENDING-') || id.startsWith('ATT-SYNTH-') ? `ATT-${Date.now().toString(36).toUpperCase()}` : id,
          date: updates.date,
          empId: updates.empId,
          in: updates.in || '08:00 AM',
          out: updates.out || '05:00 PM',
          workingHours: 8,
          regularHours: 8,
          overtimeHours: 0,
          breakMinutes: 60,
          lateMinutes: 0,
          undertimeMinutes: 0,
          status: updates.status || 'Present',
          correctedBy: adminName,
          correctedAt: new Date().toISOString(),
          remarks: reason ? `Admin adjustment: ${reason}` : 'Administrative entry',
          createdAt: new Date().toISOString()
        };
        const saved = await this.db.saveAttendance(newRecord);
        await auditService.log({
          userId: 'ADMIN',
          userName: adminName,
          role: 'ADMIN',
          action: 'ATTENDANCE_ADJUSTMENT',
          entity: 'ATTENDANCE',
          entityId: saved.id,
          details: `Administrative attendance record created for ${saved.empId} on ${saved.date}. Reason: ${reason}`,
        });
        return saved;
      }
      throw new Error('Attendance record not found.');
    }

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

  public async qrPunch(params: {
    token: string;
    requestedType?: 'TIME_IN' | 'TIME_OUT' | 'AUTO';
    actorName?: string;
    customTime?: string;
  }): Promise<{
    record: Attendance;
    action: 'TIME_IN' | 'TIME_OUT';
    employee: any;
    punchTime: string;
    message: string;
  }> {
    if (!params.token || typeof params.token !== 'string' || !params.token.trim().startsWith('APXQR.')) {
      throw new Error('Valid cryptographically signed QR code token (APXQR...) is strictly required for attendance punch. Direct manual punching is prohibited.');
    }

    // Cryptographic verification of HMAC-SHA256 token
    const verified = await qrService.verifySignedToken(params.token);
    const resolvedEmpId = verified.empId;

    const employee = await this.db.getEmployeeById(resolvedEmpId);
    if (!employee) {
      throw new Error(`Employee ID ${resolvedEmpId} not recognized in company roster.`);
    }

    // Duplicate-punch / rapid-scan throttling: minimum 15 seconds
    const lastPunch = this.lastPunchTimestamps.get(resolvedEmpId);
    if (lastPunch && Date.now() - lastPunch < 15000) {
      throw new Error(`Rapid badge scan detected for ${employee.name}. Please wait a moment before punching again.`);
    }

    const today = new Date().toISOString().slice(0, 10);
    const existing = await this.db.getAttendance({ date: today, empId: resolvedEmpId });
    const record = existing[0];

    let action: 'TIME_IN' | 'TIME_OUT';
    if (params.requestedType === 'TIME_IN') {
      action = 'TIME_IN';
    } else if (params.requestedType === 'TIME_OUT') {
      action = 'TIME_OUT';
    } else {
      if (!record || !record.in || record.in.trim() === '') {
        action = 'TIME_IN';
      } else if (!record.out || record.out.trim() === '') {
        action = 'TIME_OUT';
      } else {
        throw new Error(`${employee.name} has already logged both Time-In (${record.in}) and Time-Out (${record.out}) for today.`);
      }
    }

    let savedRecord: Attendance;
    const actor = params.actorName || 'QR Scanner';
    if (action === 'TIME_IN') {
      savedRecord = await this.clockIn(resolvedEmpId, `${employee.name} (${actor})`, params.customTime);
    } else {
      savedRecord = await this.clockOut(resolvedEmpId, `${employee.name} (${actor})`, params.customTime);
    }

    const punchTime = action === 'TIME_IN' ? savedRecord.in : savedRecord.out;

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

  public async getAttendanceDashboard(date?: string, department?: string): Promise<{
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
    let [employees, attendanceList, leaves] = await Promise.all([
      this.db.getEmployees(),
      this.db.getAttendance({ date: queryDate }),
      this.db.getLeaves()
    ]);

    if (department && department !== 'ALL') {
      employees = employees.filter(e => e.department.toLowerCase() === department.toLowerCase());
    }

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
        breakMinutes: 0,
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
