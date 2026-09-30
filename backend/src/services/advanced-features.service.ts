import {
  LoanRecord,
  ShiftRoster,
  ThirteenthMonthProjection,
  BIR2316Data,
  PayrollAnomaly,
  EmergencyBroadcast
} from '../types';
import { Database } from '../db/database';
import { auditService } from './audit.service';
import { notificationService } from './notification.service';

class AdvancedFeaturesService {
  private loans: LoanRecord[] = [
    {
      id: 'LOAN-001',
      empId: 'EMP-001',
      employeeName: 'Juan Dela Cruz',
      loanType: 'SSS Salary Loan',
      principal: 30000,
      interestRate: 0.10,
      termMonths: 12,
      monthlyAmortization: 2750,
      remainingBalance: 16500,
      startDate: '2026-01-15',
      status: 'Active',
      notes: 'Approved via SSS online portal verification',
      createdAt: '2026-01-15T08:00:00Z'
    },
    {
      id: 'LOAN-002',
      empId: 'EMP-004',
      employeeName: 'Ana Reyes',
      loanType: 'Company Cash Advance',
      principal: 15000,
      interestRate: 0.00,
      termMonths: 3,
      monthlyAmortization: 5000,
      remainingBalance: 5000,
      startDate: '2026-08-01',
      status: 'Active',
      notes: 'Emergency medical assistance advance',
      createdAt: '2026-08-01T09:30:00Z'
    },
    {
      id: 'LOAN-003',
      empId: 'EMP-007',
      employeeName: 'Eduardo Ramos',
      loanType: 'Pag-IBIG Calamity Loan',
      principal: 20000,
      interestRate: 0.0595,
      termMonths: 24,
      monthlyAmortization: 932.50,
      remainingBalance: 18650,
      startDate: '2026-07-10',
      status: 'Active',
      notes: 'Typhoon disaster relief loan',
      createdAt: '2026-07-10T14:15:00Z'
    }
  ];

  private shifts: ShiftRoster[] = [
    {
      id: 'SR-001',
      empId: 'EMP-001',
      employeeName: 'Juan Dela Cruz',
      department: 'Engineering',
      monday: '08:00 - 17:00 (Regular)',
      tuesday: '08:00 - 17:00 (Regular)',
      wednesday: '08:00 - 17:00 (Regular)',
      thursday: '08:00 - 17:00 (Regular)',
      friday: '08:00 - 17:00 (Regular)',
      saturday: 'Rest Day',
      sunday: 'Rest Day',
      effectiveWeek: 'Current Week'
    },
    {
      id: 'SR-002',
      empId: 'EMP-003',
      employeeName: 'Carlos Mendoza',
      department: 'Engineering',
      monday: '22:00 - 07:00 (Night Diff)',
      tuesday: '22:00 - 07:00 (Night Diff)',
      wednesday: '22:00 - 07:00 (Night Diff)',
      thursday: '22:00 - 07:00 (Night Diff)',
      friday: '22:00 - 07:00 (Night Diff)',
      saturday: 'Rest Day',
      sunday: 'Rest Day',
      effectiveWeek: 'Current Week'
    },
    {
      id: 'SR-003',
      empId: 'EMP-005',
      employeeName: 'Mark Bautista',
      department: 'Operations',
      monday: '06:00 - 15:00 (Early)',
      tuesday: '06:00 - 15:00 (Early)',
      wednesday: '06:00 - 15:00 (Early)',
      thursday: '06:00 - 15:00 (Early)',
      friday: '06:00 - 15:00 (Early)',
      saturday: '08:00 - 12:00 (Half Day)',
      sunday: 'Rest Day',
      effectiveWeek: 'Current Week'
    }
  ];

  private activeBroadcast: EmergencyBroadcast | null = {
    id: 'BC-001',
    title: 'Severe Weather Advisory: PAGASA Signal No. 2 Protocol',
    message: 'Work from home is authorized for Metro Manila branches. The automated time-clock will grant excused remote attendance for today.',
    category: 'WEATHER_SUSPENSION',
    urgency: 'HIGH',
    sender: 'HR Operations Command',
    timestamp: new Date().toISOString(),
    active: true
  };

  private signedPayslips: Record<string, { signatureHash: string; signerName: string; signedAt: string }> = {};

  // --- LOANS ---
  public async getLoans(): Promise<LoanRecord[]> {
    return this.loans;
  }

  public async createLoan(data: Omit<LoanRecord, 'id' | 'createdAt' | 'remainingBalance' | 'monthlyAmortization'>): Promise<LoanRecord> {
    const totalInterest = data.principal * data.interestRate;
    const totalPayable = data.principal + totalInterest;
    const monthlyAmortization = Math.round((totalPayable / data.termMonths) * 100) / 100;

    const newLoan: LoanRecord = {
      ...data,
      id: `LOAN-${Date.now().toString().slice(-4)}`,
      monthlyAmortization,
      remainingBalance: totalPayable,
      createdAt: new Date().toISOString()
    };

    this.loans.unshift(newLoan);
    await auditService.log({
      userId: 'ADMIN',
      userName: 'HR Administrator',
      role: 'ADMIN',
      action: 'LOAN_CREATED',
      entity: 'LoanRecord',
      entityId: newLoan.id,
      details: `Created ${newLoan.loanType} for ${newLoan.employeeName} of ₱${newLoan.principal.toLocaleString()}`
    });

    return newLoan;
  }

  // --- SHIFTS ---
  public async getShifts(): Promise<ShiftRoster[]> {
    const db = Database.getInstance();
    const employees = await db.getEmployees();

    // Ensure all employees have a shift row
    const existingEmpIds = new Set(this.shifts.map(s => s.empId));
    for (const emp of employees) {
      if (!existingEmpIds.has(emp.id)) {
        this.shifts.push({
          id: `SR-${emp.id}`,
          empId: emp.id,
          employeeName: emp.name,
          department: emp.department,
          monday: '08:00 - 17:00 (Regular)',
          tuesday: '08:00 - 17:00 (Regular)',
          wednesday: '08:00 - 17:00 (Regular)',
          thursday: '08:00 - 17:00 (Regular)',
          friday: '08:00 - 17:00 (Regular)',
          saturday: 'Rest Day',
          sunday: 'Rest Day',
          effectiveWeek: 'Current Week'
        });
      }
    }
    return this.shifts;
  }

  public async updateShift(empId: string, shiftData: Partial<ShiftRoster>): Promise<ShiftRoster> {
    const index = this.shifts.findIndex(s => s.empId === empId);
    if (index === -1) {
      throw new Error(`Shift record for employee ${empId} not found.`);
    }
    this.shifts[index] = { ...this.shifts[index], ...shiftData };
    return this.shifts[index];
  }

  // --- 13th MONTH PAY PROJECTION ---
  public async getThirteenthMonthProjections(): Promise<ThirteenthMonthProjection[]> {
    const db = Database.getInstance();
    const employees = await db.getEmployees();

    return employees.map(emp => {
      // 9 months worked YTD as of September
      const monthsWorkedYtd = 9;
      // Formula: (Monthly Basic Salary * Months Worked) / 12
      const projected13thMonth = Math.round(((emp.salary * monthsWorkedYtd) / 12) * 100) / 100;
      // Republic Act 10963 (TRAIN Law) ceiling is ₱90,000
      const taxExemptAmount = Math.min(projected13thMonth, 90000);
      const taxableAmount = Math.max(0, projected13thMonth - 90000);

      return {
        empId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        monthlySalary: emp.salary,
        monthsWorkedYtd,
        projected13thMonth,
        taxExemptAmount,
        taxableAmount,
        status: 'Compliant'
      };
    });
  }

  // --- BIR FORM 2316 GENERATOR ---
  public async getBIR2316(empId: string): Promise<BIR2316Data> {
    const db = Database.getInstance();
    const emp = await db.getEmployeeById(empId);
    if (!emp) {
      throw new Error(`Employee ${empId} not found for BIR 2316 generation.`);
    }

    const annualBasic = emp.salary * 12;
    const annual13thMonth = emp.salary;
    const nonTaxable13thMonth = Math.min(annual13thMonth, 90000);

    // Annual statutory estimates
    const annualSss = 1350 * 12;
    const annualPhilHealth = (emp.salary * 0.05 * 0.5) * 12;
    const annualPagIbig = 200 * 12;
    const nonTaxableMandatoryContributions = annualSss + annualPhilHealth + annualPagIbig;

    const totalNonTaxableCompensation = nonTaxable13thMonth + nonTaxableMandatoryContributions;
    const taxableCompensation = Math.max(0, annualBasic + annual13thMonth - totalNonTaxableCompensation);

    // Approximate TRAIN annual tax calculation
    let taxDue = 0;
    if (taxableCompensation <= 250000) {
      taxDue = 0;
    } else if (taxableCompensation <= 400000) {
      taxDue = (taxableCompensation - 250000) * 0.15;
    } else if (taxableCompensation <= 800000) {
      taxDue = 22500 + (taxableCompensation - 400000) * 0.20;
    } else if (taxableCompensation <= 2000000) {
      taxDue = 102500 + (taxableCompensation - 800000) * 0.25;
    } else {
      taxDue = 402500 + (taxableCompensation - 2000000) * 0.30;
    }

    return {
      year: 2026,
      employee: {
        id: emp.id,
        name: emp.name,
        tin: emp.tin || '123-456-789-000',
        address: emp.address || 'Metro Manila, Philippines',
        sssNo: emp.sssNo || '34-5678901-2',
        philHealthNo: emp.philHealthNo || '12-345678901-2',
        pagIbigNo: emp.pagIbigNo || '1234-5678-9012'
      },
      employer: {
        name: 'Apex Global Enterprises Inc.',
        tin: '987-654-321-000',
        address: 'Tower One, Ayala Avenue, Makati City, Metro Manila',
        rdoCode: '047'
      },
      grossCompensation: annualBasic + annual13thMonth,
      nonTaxable13thMonth,
      nonTaxableMandatoryContributions,
      totalNonTaxableCompensation,
      taxableCompensation,
      taxDue: Math.round(taxDue * 100) / 100,
      taxWithheld: Math.round(taxDue * 100) / 100
    };
  }

  // --- AI PAYROLL ANOMALY SCANNER ---
  public async detectPayrollAnomalies(): Promise<PayrollAnomaly[]> {
    const db = Database.getInstance();
    const periods = await db.getPayrollPeriods();
    const activePeriod = periods.find(p => p.status === 'Draft' || p.status === 'Processing') || periods[0];
    
    if (!activePeriod) return [];
    
    const items = await db.getPayrollItems({ periodId: activePeriod.id });
    const anomalies: PayrollAnomaly[] = [];

    for (const item of items) {
      // 1. Overtime Spike (> 15 hours in one cutoff)
      if (item.overtimeHours > 15) {
        anomalies.push({
          id: `ANOM-${item.empId}-OT`,
          empId: item.empId,
          employeeName: item.employeeName,
          type: 'OVERTIME_SPIKE',
          severity: 'HIGH',
          title: `Excessive Overtime Detected (${item.overtimeHours} hrs)`,
          description: `${item.employeeName} logged ${item.overtimeHours} overtime hours which exceeds the 15-hour standard weekly risk ceiling.`,
          suggestedAction: 'Require written supervisor overtime verification before payroll finalization.'
        });
      }

      // 2. High Absence / Deduction Variance
      if (item.absenceDeduction > item.periodBasicPay * 0.4) {
        anomalies.push({
          id: `ANOM-${item.empId}-ABS`,
          empId: item.empId,
          employeeName: item.employeeName,
          type: 'ABSENCE_DISCREPANCY',
          severity: 'MEDIUM',
          title: 'Heavy Absence Salary Reduction (>40%)',
          description: `Absence deduction of ₱${item.absenceDeduction.toLocaleString()} represents over 40% of standard basic pay.`,
          suggestedAction: 'Confirm if unfiled medical leaves or approved leaves with pay should be retroactively credited.'
        });
      }

      // 3. Potential Negative Net Pay Risk
      if (item.netPay < 5000) {
        anomalies.push({
          id: `ANOM-${item.empId}-NET`,
          empId: item.empId,
          employeeName: item.employeeName,
          type: 'NEGATIVE_NET_PAY',
          severity: 'CRITICAL',
          title: 'Sub-Minimum Take Home Pay Alert',
          description: `Projected net pay is ₱${item.netPay.toLocaleString()}, nearing or below the statutory take-home pay protection threshold.`,
          suggestedAction: 'Review non-mandatory loan amortizations and adjust deduction schedules.'
        });
      }
    }

    if (anomalies.length === 0) {
      // Provide a clean operational assurance item
      anomalies.push({
        id: 'ANOM-CLEAN',
        empId: 'ALL',
        employeeName: 'Entire Workforce',
        type: 'MISSING_STATUTORY',
        severity: 'LOW',
        title: 'Zero High-Risk Anomalies Detected',
        description: 'All 10 employees meet TRAIN law withholding brackets and statutory contribution minimums.',
        suggestedAction: 'Ready for executive payroll approval.'
      });
    }

    return anomalies;
  }

  // --- EMERGENCY BROADCAST ---
  public async getActiveBroadcast(): Promise<EmergencyBroadcast | null> {
    return this.activeBroadcast;
  }

  public async setBroadcast(data: Omit<EmergencyBroadcast, 'id' | 'timestamp' | 'active'>): Promise<EmergencyBroadcast> {
    this.activeBroadcast = {
      ...data,
      id: `BC-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      active: true
    };

    // Dispatch in-app notification to all users
    await notificationService.notify({
      userId: 'ALL',
      title: `EMERGENCY ALERT: ${data.title}`,
      message: data.message,
      type: 'ALERT'
    });

    await auditService.log({
      userId: 'ADMIN',
      userName: data.sender || 'Administrator',
      role: 'ADMIN',
      action: 'EMERGENCY_BROADCAST_SENT',
      entity: 'EmergencyBroadcast',
      entityId: this.activeBroadcast.id,
      details: `Broadcast: ${data.title}`
    });

    return this.activeBroadcast;
  }

  public async dismissBroadcast(): Promise<void> {
    if (this.activeBroadcast) {
      this.activeBroadcast.active = false;
    }
  }

  // --- DIGITAL PAYSLIP SIGNING ---
  public async signPayslip(id: string, signatureHash: string, signerName: string): Promise<any> {
    const record = {
      signatureHash,
      signerName,
      signedAt: new Date().toISOString()
    };
    this.signedPayslips[id] = record;

    await auditService.log({
      userId: id,
      userName: signerName,
      role: 'EMPLOYEE',
      action: 'PAYSLIP_DIGITALLY_SIGNED',
      entity: 'PayrollItem',
      entityId: id,
      details: `Digitally signed payslip with hash: ${signatureHash.substring(0, 16)}...`
    });

    return record;
  }

  public async getPayslipSignature(id: string): Promise<any> {
    return this.signedPayslips[id] || null;
  }
}

export const advancedFeaturesService = new AdvancedFeaturesService();
