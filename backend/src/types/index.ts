export type Role = 'ADMIN' | 'EMPLOYEE' | 'SUPERVISOR';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  employeeId?: string;
  name: string;
  department?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export type EmploymentStatus = 'Active' | 'Inactive' | 'Probationary' | 'Terminated';

export interface Employee {
  id: string; // e.g. "EMP-001"
  name: string;
  email: string;
  phone?: string;
  address?: string;
  department: string;
  position: string;
  status: EmploymentStatus;
  dateHired: string;
  salary: number; // monthly basic salary
  workSchedule: string; // e.g. "08:00 AM - 05:00 PM (Mon-Fri)"
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
  date: string; // YYYY-MM-DD
  empId: string;
  in: string; // HH:mm AM/PM or ISO
  out: string; // HH:mm AM/PM or ISO
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
  id: string; // e.g. "LR-001"
  empId: string;
  type: LeaveType;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
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
  id: string; // e.g. "OT-001"
  date: string; // YYYY-MM-DD
  empId: string;
  regularSchedule: string;
  hours: number;
  rate: number; // hourly rate
  multiplier: number; // standard 1.25x for regular OT, 1.30x for rest day
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
  excessRate: number; // e.g. 0.15, 0.20, 0.25, 0.30, 0.35
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
  code: string; // e.g. "CC-001"
  name: string;
  dept: string;
  budget: number;
  status: 'Active' | 'Inactive';
  allocatedPayroll?: number;
}

export type PayrollPeriodStatus = 'Draft' | 'Processing' | 'For Review' | 'Approved' | 'Finalized' | 'Locked';

export interface PayrollPeriod {
  id: string;
  name: string; // e.g. "September 2026 - Semi-Monthly (2nd Half)"
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
  userId: string; // or "ALL" or "ADMINS"
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
