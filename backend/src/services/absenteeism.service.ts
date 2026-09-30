import { Database } from '../db/database';
import { AbsenteeismRecord, Attendance } from '../types';
import { auditService } from './audit.service';
import { notificationService } from './notification.service';

export class AbsenteeismService {
  private db = Database.getInstance();

  /**
   * Automated Absenteeism Detection Routine
   * Evaluates all active employees for a given target date.
   * If a scheduled employee has no time-in and no approved leave, flags them as an unrecorded absence.
   */
  public async detectAbsences(targetDate?: string, executedBy = 'Automated System Routine'): Promise<{
    date: string;
    evaluatedCount: number;
    newAbsencesFlagged: AbsenteeismRecord[];
    existingAbsencesCount: number;
  }> {
    const date = targetDate || new Date().toISOString().slice(0, 10);
    const dayOfWeek = new Date(date).getDay(); // 0 is Sunday, 6 is Saturday

    // Check if weekend (standard business schedule Mon-Fri)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const employees = await this.db.getEmployees();
    const activeEmployees = employees.filter(e => e.status === 'Active');

    const attendanceRecords = await this.db.getAttendance({ date });
    const allLeaves = await this.db.getLeaves();
    const approvedLeaves = allLeaves.filter(
      l => l.status === 'Approved' && l.start <= date && l.end >= date
    );

    const existingAbsenteeism = await this.db.getAbsenteeism();
    const dateAbsenteeism = existingAbsenteeism.filter(a => a.date === date);

    const newAbsencesFlagged: AbsenteeismRecord[] = [];

    for (const emp of activeEmployees) {
      // Check if already in attendance as Present or Late
      const att = attendanceRecords.find(a => a.empId === emp.id);
      const hasClockedIn = Boolean(att && att.in && att.in.trim() !== '');

      // Check if on approved leave
      const onLeave = approvedLeaves.some(l => l.empId === emp.id);

      // Check if already flagged for this date
      const alreadyFlagged = dateAbsenteeism.some(a => a.empId === emp.id);

      // If it's a scheduled workday and employee did not clock in and has no approved leave
      if (!isWeekend && !hasClockedIn && !onLeave && !alreadyFlagged) {
        const absenceRecord: AbsenteeismRecord = {
          id: `ABS-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
          empId: emp.id,
          employeeName: emp.name,
          department: emp.department,
          date,
          scheduledWorkday: true,
          status: 'Pending Review',
          detectionSource: 'Automated Script',
          reason: `No attendance record found for scheduled workday ${date} and no approved leave on file.`,
          createdAt: new Date().toISOString()
        };

        await this.db.createAbsenteeismRecord(absenceRecord);
        newAbsencesFlagged.push(absenceRecord);

        // Also create/update an Attendance entry flagged as Absent with audit note
        if (!att) {
          const attendanceEntry: Attendance = {
            id: `ATT-ABS-${Date.now().toString(36).toUpperCase()}-${emp.id}`,
            date,
            empId: emp.id,
            in: '',
            out: '',
            workingHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            lateMinutes: 0,
            undertimeMinutes: 0,
            status: 'Absent',
            remarks: 'Flagged by Absenteeism Detection Engine (Pending Review)',
            createdAt: new Date().toISOString()
          };
          await this.db.saveAttendance(attendanceEntry);
        }
      }
    }

    if (newAbsencesFlagged.length > 0) {
      await auditService.log({
        userId: 'SYSTEM',
        userName: executedBy,
        role: 'ADMIN',
        action: 'ABSENTEEISM_DETECTION_RUN',
        entity: 'ABSENTEEISM',
        details: `Absenteeism Detection Engine processed ${activeEmployees.length} employees for ${date}. Identified and flagged ${newAbsencesFlagged.length} potential absences.`,
      });

      await notificationService.notify({
        userId: 'USR-001',
        title: 'Absenteeism Detection Report',
        message: `${newAbsencesFlagged.length} potential absence(s) flagged for review on ${date}.`,
        type: 'ALERT',
        link: '/absenteeism'
      });
    }

    return {
      date,
      evaluatedCount: activeEmployees.length,
      newAbsencesFlagged,
      existingAbsencesCount: dateAbsenteeism.length
    };
  }

  public async getAbsenteeismRecords(): Promise<AbsenteeismRecord[]> {
    return this.db.getAbsenteeism();
  }

  public async reviewAbsence(params: {
    recordId: string;
    newStatus: 'Excused' | 'Unexcused Absence' | 'Resolved';
    reviewedBy: string;
    remarks: string;
  }): Promise<AbsenteeismRecord | null> {
    const updated = await this.db.updateAbsenteeismRecord(params.recordId, {
      status: params.newStatus,
      reviewedBy: params.reviewedBy,
      reviewedAt: new Date().toISOString(),
      remarks: params.remarks
    });

    if (updated) {
      await auditService.log({
        userId: 'ADMIN',
        userName: params.reviewedBy,
        role: 'ADMIN',
        action: 'ABSENTEEISM_REVIEW',
        entity: 'ABSENTEEISM',
        entityId: updated.id,
        details: `Absence record for ${updated.employeeName} (${updated.empId}) on ${updated.date} reviewed and updated to status "${params.newStatus}". Remarks: ${params.remarks}`,
      });

      // Update corresponding attendance record status if needed
      const attendance = await this.db.getAttendance({ date: updated.date, empId: updated.empId });
      if (attendance.length > 0) {
        await this.db.updateAttendance(attendance[0].id, {
          status: params.newStatus === 'Excused' ? 'On Leave' : 'Absent',
          remarks: `Absence review finalized: ${params.newStatus}. ${params.remarks}`,
          correctedBy: params.reviewedBy,
          correctedAt: new Date().toISOString()
        });
      }
    }

    return updated;
  }
}

export const absenteeismService = new AbsenteeismService();
