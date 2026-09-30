import { Database } from '../db/database';
import { OvertimeRecord } from '../types';
import { auditService } from './audit.service';
import { notificationService } from './notification.service';

const round2 = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

export class OvertimeService {
  private db = Database.getInstance();

  public async getOvertime(filter?: { empId?: string; status?: string }): Promise<OvertimeRecord[]> {
    return this.db.getOvertime(filter);
  }

  public async createOvertime(data: {
    empId: string;
    date: string;
    hours: number;
    multiplier?: number;
    reason?: string;
    actorName: string;
  }): Promise<OvertimeRecord> {
    const emp = await this.db.getEmployeeById(data.empId);
    if (!emp) throw new Error('Employee not found.');

    const salary = Number(emp.salary || 0);
    // Standard hourly rate based on 160 hours / month
    const hourlyBase = round2(salary / 160);
    const multiplier = data.multiplier || 1.25;
    const computedHourlyRate = round2(hourlyBase * multiplier);
    const totalAmount = round2(data.hours * computedHourlyRate);

    const otRecord: OvertimeRecord = {
      id: `OT-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      date: data.date,
      empId: data.empId,
      regularSchedule: emp.workSchedule,
      hours: round2(data.hours),
      rate: computedHourlyRate,
      multiplier,
      amount: totalAmount,
      reason: data.reason,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const saved = await this.db.createOvertime(otRecord);

    await auditService.log({
      userId: data.empId,
      userName: data.actorName,
      role: 'EMPLOYEE',
      action: 'OVERTIME_CREATE',
      entity: 'OVERTIME',
      entityId: saved.id,
      details: `Filed overtime for ${data.hours} hours on ${data.date}. Computed amount: ₱${totalAmount.toFixed(2)}. Reason: ${data.reason || 'N/A'}`,
    });

    await notificationService.notify({
      userId: 'USR-001',
      title: 'New Overtime Request Submitted',
      message: `${emp.name} filed an overtime request for ${data.hours} hour(s) on ${data.date}.`,
      type: 'INFO',
      link: '/overtime'
    });

    return saved;
  }

  public async reviewOvertime(params: {
    overtimeId: string;
    status: 'Approved' | 'Rejected';
    approverId: string;
    approverName: string;
    remarks: string;
  }): Promise<OvertimeRecord> {
    const ot = await this.db.getOvertimeById(params.overtimeId);
    if (!ot) throw new Error('Overtime record not found.');

    const updated = await this.db.updateOvertime(params.overtimeId, {
      status: params.status,
      approverId: params.approverId,
      approverName: params.approverName,
      remarks: params.remarks,
      approvedAt: new Date().toISOString()
    });

    await auditService.log({
      userId: params.approverId,
      userName: params.approverName,
      role: 'ADMIN',
      action: `OVERTIME_${params.status.toUpperCase()}`,
      entity: 'OVERTIME',
      entityId: params.overtimeId,
      details: `Overtime record ${params.overtimeId} (${ot.hours}h) was ${params.status.toLowerCase()} by ${params.approverName}. Remarks: ${params.remarks}`,
    });

    // Notify employee
    await notificationService.notify({
      userId: ot.empId,
      title: `Overtime Request ${params.status}`,
      message: `Your overtime request for ${ot.hours} hour(s) on ${ot.date} was ${params.status.toLowerCase()} by ${params.approverName}. Amount: ₱${ot.amount.toFixed(2)}.`,
      type: params.status === 'Approved' ? 'SUCCESS' : 'WARNING',
      link: '/overtime'
    });

    return updated!;
  }
}

export const overtimeService = new OvertimeService();
