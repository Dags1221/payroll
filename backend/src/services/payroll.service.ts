import { Database } from '../db/database';
import { PayrollPeriod, PayrollItem, PayrollPeriodStatus } from '../types';
import { taxService } from './tax.service';
import { auditService } from './audit.service';
import { notificationService } from './notification.service';

const round2 = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

export class PayrollService {
  private db = Database.getInstance();

  public async getPeriods(): Promise<PayrollPeriod[]> {
    return this.db.getPayrollPeriods();
  }

  public async getPeriodById(id: string): Promise<PayrollPeriod | undefined> {
    return this.db.getPayrollPeriodById(id);
  }

  public async getPayrollItems(periodId: string, empId?: string): Promise<PayrollItem[]> {
    return this.db.getPayrollItems({ periodId, empId });
  }

  public async createPeriod(data: {
    name: string;
    type: 'Semi-Monthly' | 'Monthly' | 'Weekly';
    startDate: string;
    endDate: string;
    cutoffDate: string;
    paymentDate: string;
    creatorName: string;
  }): Promise<PayrollPeriod> {
    const period: PayrollPeriod = {
      id: `PRP-${data.startDate.slice(0, 7)}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      name: data.name,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      cutoffDate: data.cutoffDate,
      paymentDate: data.paymentDate,
      status: 'Draft',
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      employeeCount: 0,
      createdAt: new Date().toISOString()
    };

    const saved = await this.db.createPayrollPeriod(period);

    await auditService.log({
      userId: 'ADMIN',
      userName: data.creatorName,
      role: 'ADMIN',
      action: 'PAYROLL_PERIOD_CREATE',
      entity: 'PAYROLL_PERIOD',
      entityId: saved.id,
      details: `Created new payroll period "${saved.name}" covering ${saved.startDate} to ${saved.endDate}.`,
    });

    return saved;
  }

  /**
   * Safe, auditable payroll computation for a period.
   * Pulls real attendance, approved overtime, active benefits, and computes
   * tax via the active Tax Bracket Matrix.
   */
  public async computePayroll(periodId: string, executedBy = 'Administrator'): Promise<{
    period: PayrollPeriod;
    items: PayrollItem[];
    summary: {
      totalGross: number;
      totalDeductions: number;
      totalNet: number;
      employeeCount: number;
      costCenterAllocations: { code: string; name: string; amount: number }[];
    };
  }> {
    const period = await this.db.getPayrollPeriodById(periodId);
    if (!period) throw new Error('Payroll period not found.');

    if (period.status === 'Finalized' || period.status === 'Locked') {
      throw new Error(`Payroll period is ${period.status} and cannot be recomputed without unlocking.`);
    }

    const employees = await this.db.getEmployees();
    const activeEmployees = employees.filter(e => e.status === 'Active');
    const allOvertime = await this.db.getOvertime();
    const allBenefits = await this.db.getBenefits();
    const allAttendance = await this.db.getAttendance();
    const costCenters = await this.db.getCostCenters();

    const isSemiMonthly = period.type === 'Semi-Monthly';
    const periodFactor = isSemiMonthly ? 0.5 : 1.0;

    const items: PayrollItem[] = [];
    let periodTotalGross = 0;
    let periodTotalDeductions = 0;
    let periodTotalNet = 0;

    for (const emp of activeEmployees) {
      const basicSalary = Number(emp.salary || 0);
      const periodBasicPay = round2(basicSalary * periodFactor);

      // Hourly and minute rates (based on 160 standard working hours per month)
      const hourlyRate = round2(basicSalary / 160);
      const minuteRate = round2(hourlyRate / 60);
      const dailyRate = round2(basicSalary / 22);

      // 1. Approved Overtime within period
      const empOvertime = allOvertime.filter(
        o => o.empId === emp.id &&
             o.status === 'Approved' &&
             o.date >= period.startDate &&
             o.date <= period.endDate
      );
      const totalOtHours = round2(empOvertime.reduce((sum, o) => sum + Number(o.hours), 0));
      const totalOtPay = round2(empOvertime.reduce((sum, o) => sum + Number(o.amount), 0));

      // 2. Active Benefits & Allowances
      const empBenefits = allBenefits.filter(
        b => b.empId === emp.id && b.status === 'Active'
      );
      const monthlyBenefits = empBenefits.reduce((sum, b) => {
        if (b.frequency === 'Monthly') return sum + Number(b.amount);
        if (b.frequency === 'Semi-Monthly') return sum + Number(b.amount) * 2;
        return sum;
      }, 0);
      const periodBenefitsPay = round2(monthlyBenefits * periodFactor);

      // 3. Attendance deductions (late minutes & unexcused absences)
      const empAttendance = allAttendance.filter(
        a => a.empId === emp.id && a.date >= period.startDate && a.date <= period.endDate
      );
      const totalLateMinutes = empAttendance.reduce((sum, a) => sum + (Number(a.lateMinutes) || 0), 0);
      const lateDeduction = round2(totalLateMinutes * minuteRate);

      const totalAbsentDays = empAttendance.filter(a => a.status === 'Absent').length;
      const absenceDeduction = round2(totalAbsentDays * dailyRate);

      // 4. Gross Pay
      const grossPay = round2(periodBasicPay + totalOtPay + periodBenefitsPay);

      // 5. Statutory Deductions (standard Philippine formulas scaled to period)
      // SSS: approx 4.5% of salary capped at ₱1,350/mo
      const monthlySSS = Math.min(1350, basicSalary * 0.045);
      const sssDeduction = round2(monthlySSS * periodFactor);

      // PhilHealth: 2.5% employee share (5% total split 50/50), capped at ₱2,500/mo
      const monthlyPhilHealth = Math.min(2500, basicSalary * 0.025);
      const philHealthDeduction = round2(monthlyPhilHealth * periodFactor);

      // Pag-IBIG: ₱100 standard employee contribution
      const monthlyPagIbig = 100.00;
      const pagIbigDeduction = round2(monthlyPagIbig * periodFactor);

      // 6. Withholding Tax (Tax Bracket Matrix)
      // Taxable income = Gross - Statutory Deductions - NonTaxable Allowances
      const taxableIncome = Math.max(0, grossPay - (sssDeduction + philHealthDeduction + pagIbigDeduction));
      const taxResult = isSemiMonthly
        ? await taxService.computeSemiMonthlyTax(taxableIncome)
        : await taxService.computeMonthlyTax(taxableIncome);
      const taxWithheld = round2(taxResult.taxAmount);

      const otherDeductions = 0;
      const totalDeductions = round2(
        lateDeduction + absenceDeduction + taxWithheld + sssDeduction + philHealthDeduction + pagIbigDeduction + otherDeductions
      );
      const netPay = round2(grossPay - totalDeductions);

      periodTotalGross += grossPay;
      periodTotalDeductions += totalDeductions;
      periodTotalNet += netPay;

      const item: PayrollItem = {
        id: `PI-${period.id.slice(-4)}-${emp.id}`,
        payrollPeriodId: period.id,
        empId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        position: emp.position,
        costCenterCode: emp.costCenterId || 'CC-001',
        basicSalary,
        periodBasicPay,
        overtimeHours: totalOtHours,
        overtimePay: totalOtPay,
        benefitsPay: periodBenefitsPay,
        grossPay,
        lateDeduction,
        absenceDeduction,
        taxWithheld,
        sssDeduction,
        philHealthDeduction,
        pagIbigDeduction,
        otherDeductions,
        totalDeductions,
        netPay,
        createdAt: new Date().toISOString()
      };

      items.push(item);
    }

    periodTotalGross = round2(periodTotalGross);
    periodTotalDeductions = round2(periodTotalDeductions);
    periodTotalNet = round2(periodTotalNet);

    // Save items to store
    await this.db.savePayrollItems(items);

    // Update Period
    const updatedPeriod = await this.db.updatePayrollPeriod(period.id, {
      status: 'For Review',
      totalGross: periodTotalGross,
      totalDeductions: periodTotalDeductions,
      totalNet: periodTotalNet,
      employeeCount: items.length
    });

    // Cost center distribution
    const costCenterAllocations = costCenters.map(cc => {
      const ccItems = items.filter(i => i.costCenterCode === cc.code || i.department === cc.dept);
      const amount = round2(ccItems.reduce((sum, i) => sum + i.grossPay, 0));
      return {
        code: cc.code,
        name: cc.name,
        amount
      };
    });

    // Update cost center allocated payroll
    for (const alloc of costCenterAllocations) {
      await this.db.updateCostCenter(alloc.code, { allocatedPayroll: alloc.amount });
    }

    await auditService.log({
      userId: 'ADMIN',
      userName: executedBy,
      role: 'ADMIN',
      action: 'PAYROLL_COMPUTE',
      entity: 'PAYROLL_PERIOD',
      entityId: period.id,
      details: `Computed payroll for "${period.name}". Processed ${items.length} employees. Total Gross: ₱${periodTotalGross.toFixed(2)}, Net: ₱${periodTotalNet.toFixed(2)}.`,
    });

    await notificationService.notify({
      userId: 'ALL',
      title: 'Payroll Calculation Complete',
      message: `Payroll calculations for ${period.name} have been processed and are ready for managerial review.`,
      type: 'INFO',
      link: '/payroll'
    });

    return {
      period: updatedPeriod || period,
      items,
      summary: {
        totalGross: periodTotalGross,
        totalDeductions: periodTotalDeductions,
        totalNet: periodTotalNet,
        employeeCount: items.length,
        costCenterAllocations
      }
    };
  }

  /**
   * Finalize and lock payroll period with safeguards
   */
  public async finalizePayroll(periodId: string, finalizedBy: string): Promise<PayrollPeriod> {
    const period = await this.db.getPayrollPeriodById(periodId);
    if (!period) throw new Error('Payroll period not found.');

    const items = await this.db.getPayrollItems({ periodId });
    if (items.length === 0) {
      throw new Error('Cannot finalize an empty payroll period. Run payroll computation first.');
    }

    // Safeguard check: Reconcile financial totals
    const sumNet = round2(items.reduce((s, i) => s + i.netPay, 0));
    const sumGross = round2(items.reduce((s, i) => s + i.grossPay, 0));
    const sumDeductions = round2(items.reduce((s, i) => s + i.totalDeductions, 0));

    if (Math.abs(sumNet - period.totalNet) > 0.1 || Math.abs(sumGross - period.totalGross) > 0.1) {
      throw new Error(`Data Reconciliation Alert: Computed sum (Net: ₱${sumNet}) does not match period record (Net: ₱${period.totalNet}). Please recalculate before finalization.`);
    }

    const updated = await this.db.updatePayrollPeriod(periodId, {
      status: 'Finalized',
      finalizedBy,
      finalizedAt: new Date().toISOString()
    });

    await auditService.log({
      userId: 'ADMIN',
      userName: finalizedBy,
      role: 'ADMIN',
      action: 'PAYROLL_FINALIZE',
      entity: 'PAYROLL_PERIOD',
      entityId: periodId,
      details: `Payroll period "${period.name}" finalized and locked by ${finalizedBy}. Disbursed Net: ₱${sumNet.toFixed(2)} to ${items.length} employees.`,
    });

    await notificationService.notify({
      userId: 'ALL',
      title: 'Payslips Ready for Viewing',
      message: `Finalized payslips for ${period.name} are now released and available in your employee portal.`,
      type: 'SUCCESS',
      link: '/payslips'
    });

    return updated!;
  }

  /**
   * Controlled unlock / reversal workflow
   */
  public async unlockPeriod(periodId: string, unlockedBy: string, reason: string): Promise<PayrollPeriod> {
    const period = await this.db.getPayrollPeriodById(periodId);
    if (!period) throw new Error('Payroll period not found.');

    const updated = await this.db.updatePayrollPeriod(periodId, {
      status: 'For Review',
      finalizedBy: undefined,
      finalizedAt: undefined
    });

    await auditService.log({
      userId: 'ADMIN',
      userName: unlockedBy,
      role: 'ADMIN',
      action: 'PAYROLL_UNLOCK',
      entity: 'PAYROLL_PERIOD',
      entityId: periodId,
      details: `Payroll period "${period.name}" unlocked by ${unlockedBy}. Reason: ${reason}`,
    });

    return updated!;
  }
}

export const payrollService = new PayrollService();
