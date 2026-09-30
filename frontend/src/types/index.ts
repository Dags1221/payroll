export type Role = 'ADMIN' | 'EMPLOYEE' | 'SUPERVISOR';

export interface User {
  id: string;
  email: string;
  role: Role;
  employeeId?: string;
  name: string;
  department?: string;
  avatarUrl?: string;
  isActive: boolean;
}

export type EmploymentStatus = 'Active' | 'Inactive' | 'Probationary' | 'Terminated';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  department: string;
  position: string;
  status: EmploymentStatus;
  dateHired: string;
  salary: number;
  workSchedule: string;
  costCenterId: string;
  tin?: string;
  sssNo?: string;
  philHealthNo?: string;
  pagIbigNo?: string;
  emergencyContact?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'On Leave' | 'Incomplete' | 'Rest Day';

export interface Attendance {
  id: string;
  date: string;
  empId: string;
  in: string;
  out: string;
  workingHours: number;
  regularHours: number;
  overtimeHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  status: AttendanceStatus;
  remarks?: string;
  correctedBy?: string;
  correctedAt?: string;
  createdAt: string;
}

export type AbsenceStatus = 'Pending Review' | 'Excused' | 'Unexcused Absence' | 'Resolved';

export interface AbsenteeismRecord {
  id: string;
  empId: string;
  employeeName: string;
  department: string;
  date: string;
  scheduledWorkday: boolean;
  status: AbsenceStatus;
  detectionSource: 'Automated Script' | 'Manual Inspection';
  reason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  remarks?: string;
  createdAt: string;
}

export type LeaveType =
  | 'Vacation Leave'
  | 'Sick Leave'
  | 'Emergency Leave'
  | 'Maternity Leave'
  | 'Paternity Leave'
  | 'Bereavement Leave'
  | 'Other';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveRequest {
  id: string;
  empId: string;
  type: LeaveType;
  start: string;
  end: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewerId?: string;
  reviewerName?: string;
  remarks?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type OvertimeStatus = 'Pending' | 'Approved' | 'Rejected';

export interface OvertimeRecord {
  id: string;
  date: string;
  empId: string;
  regularSchedule: string;
  hours: number;
  rate: number;
  multiplier: number;
  amount: number;
  reason?: string;
  status: OvertimeStatus;
  approverId?: string;
  approverName?: string;
  remarks?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface TaxBracket {
  id: string;
  code: string;
  name: string;
  minIncome: number;
  maxIncome: number;
  baseTax: number;
  excessRate: number;
  effectiveDate: string;
  isActive: boolean;
  notes?: string;
  updatedAt: string;
}

export type BenefitFrequency = 'Monthly' | 'Semi-Monthly' | 'Annual' | 'One-time';
export type BenefitType = 'Allowance' | 'Government Mandated' | 'Insurance' | 'Reimbursement';

export interface Benefit {
  id: string;
  empId: string;
  name: string;
  type: BenefitType;
  amount: number;
  employerShare?: number;
  employeeShare?: number;
  frequency: BenefitFrequency;
  status: 'Active' | 'Inactive';
  isTaxable: boolean;
  createdAt: string;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  dept: string;
  budget: number;
  status: 'Active' | 'Inactive';
  allocatedPayroll?: number;
}

export type PayrollPeriodStatus = 'Draft' | 'Processing' | 'For Review' | 'Approved' | 'Finalized' | 'Locked';

export interface PayrollPeriod {
  id: string;
  name: string;
  type: 'Semi-Monthly' | 'Monthly' | 'Weekly';
  startDate: string;
  endDate: string;
  cutoffDate: string;
  paymentDate: string;
  status: PayrollPeriodStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  finalizedBy?: string;
  finalizedAt?: string;
  createdAt: string;
}

export interface PayrollItem {
  id: string;
  payrollPeriodId: string;
  empId: string;
  employeeName: string;
  department: string;
  position: string;
  costCenterCode: string;
  basicSalary: number;
  periodBasicPay: number;
  overtimeHours: number;
  overtimePay: number;
  benefitsPay: number;
  grossPay: number;
  lateDeduction: number;
  absenceDeduction: number;
  taxWithheld: number;
  sssDeduction: number;
  philHealthDeduction: number;
  pagIbigDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface LoanRecord {
  id: string;
  empId: string;
  employeeName: string;
  loanType: 'SSS Salary Loan' | 'Pag-IBIG Calamity Loan' | 'Company Cash Advance' | 'Emergency Assistance';
  principal: number;
  interestRate: number;
  termMonths: number;
  monthlyAmortization: number;
  remainingBalance: number;
  startDate: string;
  status: 'Active' | 'Fully Paid' | 'Defaulted';
  notes?: string;
  createdAt: string;
}

export interface ShiftRoster {
  id: string;
  empId: string;
  employeeName: string;
  department: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  effectiveWeek: string;
}

export interface ThirteenthMonthProjection {
  empId: string;
  employeeName: string;
  department: string;
  monthlySalary: number;
  monthsWorkedYtd: number;
  projected13thMonth: number;
  taxExemptAmount: number;
  taxableAmount: number;
  status: 'Compliant' | 'Pending Final Cutoff';
}

export interface BIR2316Data {
  year: number;
  employee: {
    id: string;
    name: string;
    tin: string;
    address: string;
    sssNo: string;
    philHealthNo: string;
    pagIbigNo: string;
  };
  employer: {
    name: string;
    tin: string;
    address: string;
    rdoCode: string;
  };
  grossCompensation: number;
  nonTaxable13thMonth: number;
  nonTaxableMandatoryContributions: number;
  totalNonTaxableCompensation: number;
  taxableCompensation: number;
  taxDue: number;
  taxWithheld: number;
}

export interface PayrollAnomaly {
  id: string;
  empId: string;
  employeeName: string;
  type: 'OVERTIME_SPIKE' | 'NEGATIVE_NET_PAY' | 'WAGE_DISCREPANCY' | 'ABSENCE_DISCREPANCY' | 'MISSING_STATUTORY';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  suggestedAction: string;
}

export interface EmergencyBroadcast {
  id: string;
  title: string;
  message: string;
  category: 'WEATHER_SUSPENSION' | 'OFFICE_CLOSURE' | 'PAYROLL_CUTOFF' | 'SECURITY_ALERT';
  urgency: 'URGENT' | 'HIGH' | 'NORMAL';
  sender: string;
  timestamp: string;
  active: boolean;
}

