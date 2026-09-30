import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { employeeService } from '../services/employee.service';
import { attendanceService } from '../services/attendance.service';
import { absenteeismService } from '../services/absenteeism.service';
import { leaveService } from '../services/leave.service';
import { overtimeService } from '../services/overtime.service';
import { taxService } from '../services/tax.service';
import { payrollService } from '../services/payroll.service';
import { benefitsService } from '../services/benefits.service';
import { costCenterService } from '../services/cost-center.service';
import { reportService } from '../services/report.service';
import { auditService } from '../services/audit.service';
import { notificationService } from '../services/notification.service';
import { advancedFeaturesService } from '../services/advanced-features.service';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';

const api = Router();

const paramStr = (val: string | string[] | undefined): string => {
  if (Array.isArray(val)) return val[0] || '';
  return val || '';
};

// ==========================================
// 1. AUTHENTICATION & USERS
// ==========================================
api.post('/auth/login', async (req: Request, res: Response, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' } });
      return;
    }
    const ip = req.ip || req.socket.remoteAddress;
    const result = await authService.login(email, password, ip);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

api.get('/auth/me', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (e) {
    next(e);
  }
});

api.post('/auth/change-password', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Current and new password required.' } });
      return;
    }
    await authService.changePassword(req.user!.id, oldPassword, newPassword);
    res.json({ success: true, data: { message: 'Password updated successfully.' } });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 2. EMPLOYEES
// ==========================================
api.get('/employees', authenticate, async (req: Request, res: Response, next) => {
  try {
    const employees = await employeeService.getAll();
    res.json({ success: true, data: employees });
  } catch (e) {
    next(e);
  }
});

api.get('/employees/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    const employee = await employeeService.getById(paramStr(req.params.id));
    if (!employee) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found.' } });
      return;
    }
    res.json({ success: true, data: employee });
  } catch (e) {
    next(e);
  }
});

api.post('/employees', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const created = await employeeService.create(req.body, req.user?.name);
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    next(e);
  }
});

api.put('/employees/:id', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const updated = await employeeService.update(paramStr(req.params.id), req.body, req.user?.name);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

api.delete('/employees/:id', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await employeeService.delete(paramStr(req.params.id), req.user?.name);
    res.json({ success: true, data: { message: 'Employee deleted successfully.' } });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 3. ATTENDANCE MONITORING
// ==========================================
api.get('/attendance', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { date, empId } = req.query as { date?: string; empId?: string };
    const attendance = await attendanceService.getAttendance({ date, empId });
    res.json({ success: true, data: attendance });
  } catch (e) {
    next(e);
  }
});

api.post('/attendance/clock-in', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const empId = req.body.empId || req.user?.employeeId || 'EMP-001';
    const record = await attendanceService.clockIn(empId, req.user?.name);
    res.json({ success: true, data: record });
  } catch (e) {
    next(e);
  }
});

api.post('/attendance/clock-out', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const empId = req.body.empId || req.user?.employeeId || 'EMP-001';
    const record = await attendanceService.clockOut(empId, req.user?.name);
    res.json({ success: true, data: record });
  } catch (e) {
    next(e);
  }
});

api.put('/attendance/adjust/:id', authenticate, requireRole('ADMIN', 'SUPERVISOR'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { reason, ...updates } = req.body;
    const adjusted = await attendanceService.adminAdjust(paramStr(req.params.id), updates, req.user!.name, reason || 'Administrative correction');
    res.json({ success: true, data: adjusted });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 4. ABSENTEEISM DETECTION SCRIPTS
// ==========================================
api.get('/absenteeism', authenticate, async (req: Request, res: Response, next) => {
  try {
    const records = await absenteeismService.getAbsenteeismRecords();
    res.json({ success: true, data: records });
  } catch (e) {
    next(e);
  }
});

api.post('/absenteeism/detect', authenticate, requireRole('ADMIN', 'SUPERVISOR'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { date } = req.body;
    const result = await absenteeismService.detectAbsences(date, req.user?.name);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

api.post('/absenteeism/review/:id', authenticate, requireRole('ADMIN', 'SUPERVISOR'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { status, remarks } = req.body;
    const reviewed = await absenteeismService.reviewAbsence({
      recordId: paramStr(req.params.id),
      newStatus: status,
      reviewedBy: req.user!.name,
      remarks: remarks || 'Reviewed by Management'
    });
    res.json({ success: true, data: reviewed });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 5. LEAVE REQUISITION WORKFLOW
// ==========================================
api.get('/leaves', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { empId, status } = req.query as { empId?: string; status?: string };
    const leaves = await leaveService.getLeaves({ empId, status });
    res.json({ success: true, data: leaves });
  } catch (e) {
    next(e);
  }
});

api.post('/leaves', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { empId, type, start, end, reason } = req.body;
    const effectiveEmpId = empId || req.user?.employeeId || 'EMP-001';
    const leave = await leaveService.createLeave({
      empId: effectiveEmpId,
      type,
      start,
      end,
      reason,
      actorName: req.user?.name || 'Employee'
    });
    res.status(201).json({ success: true, data: leave });
  } catch (e) {
    next(e);
  }
});

api.post('/leaves/review/:id', authenticate, requireRole('ADMIN', 'SUPERVISOR'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { status, remarks } = req.body;
    const reviewed = await leaveService.reviewLeave({
      leaveId: paramStr(req.params.id),
      status,
      reviewerId: req.user!.id,
      reviewerName: req.user!.name,
      remarks: remarks || ''
    });
    res.json({ success: true, data: reviewed });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 6. OVERTIME COMPENSATION
// ==========================================
api.get('/overtime', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { empId, status } = req.query as { empId?: string; status?: string };
    const ot = await overtimeService.getOvertime({ empId, status });
    res.json({ success: true, data: ot });
  } catch (e) {
    next(e);
  }
});

api.post('/overtime', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { empId, date, hours, multiplier, reason } = req.body;
    const effectiveEmpId = empId || req.user?.employeeId || 'EMP-001';
    const ot = await overtimeService.createOvertime({
      empId: effectiveEmpId,
      date,
      hours: Number(hours),
      multiplier: multiplier ? Number(multiplier) : 1.25,
      reason,
      actorName: req.user?.name || 'Employee'
    });
    res.status(201).json({ success: true, data: ot });
  } catch (e) {
    next(e);
  }
});

api.post('/overtime/review/:id', authenticate, requireRole('ADMIN', 'SUPERVISOR'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { status, remarks } = req.body;
    const reviewed = await overtimeService.reviewOvertime({
      overtimeId: paramStr(req.params.id),
      status,
      approverId: req.user!.id,
      approverName: req.user!.name,
      remarks: remarks || ''
    });
    res.json({ success: true, data: reviewed });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 7. TAX BRACKET MATRIX
// ==========================================
api.get('/tax-brackets', authenticate, async (req: Request, res: Response, next) => {
  try {
    const brackets = await taxService.getBrackets();
    res.json({ success: true, data: brackets });
  } catch (e) {
    next(e);
  }
});

api.post('/tax-brackets', authenticate, requireRole('ADMIN'), async (req: Request, res: Response, next) => {
  try {
    const created = await taxService.addBracket(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    next(e);
  }
});

api.put('/tax-brackets/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response, next) => {
  try {
    const updated = await taxService.updateBracket(paramStr(req.params.id), req.body);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

api.post('/tax-brackets/preview', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { income, type } = req.body;
    const result = type === 'Semi-Monthly'
      ? await taxService.computeSemiMonthlyTax(Number(income || 0))
      : await taxService.computeMonthlyTax(Number(income || 0));
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 8. PAYROLL ENGINE & PERIODS
// ==========================================
api.get('/payroll/periods', authenticate, async (req: Request, res: Response, next) => {
  try {
    const periods = await payrollService.getPeriods();
    res.json({ success: true, data: periods });
  } catch (e) {
    next(e);
  }
});

api.post('/payroll/periods', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const period = await payrollService.createPeriod({
      ...req.body,
      creatorName: req.user?.name || 'Administrator'
    });
    res.status(201).json({ success: true, data: period });
  } catch (e) {
    next(e);
  }
});

api.get('/payroll/items/:periodId', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const periodId = paramStr(req.params.periodId);
    const { empId } = req.query as { empId?: string };
    const items = await payrollService.getPayrollItems(periodId, empId);
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
});

api.post('/payroll/compute/:periodId', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const periodId = paramStr(req.params.periodId);
    const result = await payrollService.computePayroll(periodId, req.user?.name);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

api.post('/payroll/finalize/:periodId', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const periodId = paramStr(req.params.periodId);
    const finalized = await payrollService.finalizePayroll(periodId, req.user!.name);
    res.json({ success: true, data: finalized });
  } catch (e) {
    next(e);
  }
});

api.post('/payroll/unlock/:periodId', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const periodId = paramStr(req.params.periodId);
    const { reason } = req.body;
    const unlocked = await payrollService.unlockPeriod(periodId, req.user!.name, reason || 'Adjustment requested');
    res.json({ success: true, data: unlocked });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 9. BENEFITS MANAGEMENT
// ==========================================
api.get('/benefits', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { empId, status } = req.query as { empId?: string; status?: string };
    const benefits = await benefitsService.getBenefits({ empId, status });
    res.json({ success: true, data: benefits });
  } catch (e) {
    next(e);
  }
});

api.post('/benefits', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const created = await benefitsService.addBenefit(req.body, req.user?.name);
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    next(e);
  }
});

api.put('/benefits/:id', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const updated = await benefitsService.updateBenefit(paramStr(req.params.id), req.body, req.user?.name);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

api.delete('/benefits/:id', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await benefitsService.deleteBenefit(paramStr(req.params.id), req.user?.name);
    res.json({ success: true, data: { message: 'Benefit deleted.' } });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 10. COST CENTERS & DISTRIBUTION
// ==========================================
api.get('/cost-centers', authenticate, async (req: Request, res: Response, next) => {
  try {
    const centers = await costCenterService.getCostCenters();
    res.json({ success: true, data: centers });
  } catch (e) {
    next(e);
  }
});

api.get('/cost-centers/summary', authenticate, async (req: Request, res: Response, next) => {
  try {
    const summary = await costCenterService.getDistributionSummary();
    res.json({ success: true, data: summary });
  } catch (e) {
    next(e);
  }
});

api.post('/cost-centers', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const created = await costCenterService.create(req.body, req.user?.name);
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    next(e);
  }
});

api.put('/cost-centers/:code', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const updated = await costCenterService.update(paramStr(req.params.code), req.body, req.user?.name);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 11. REPORTS & DASHBOARD ANALYTICS
// ==========================================
api.get('/reports/dashboard', authenticate, async (req: Request, res: Response, next) => {
  try {
    const metrics = await reportService.getDashboardMetrics();
    res.json({ success: true, data: metrics });
  } catch (e) {
    next(e);
  }
});

api.get('/reports/attendance', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { startDate, endDate, department } = req.query as any;
    const report = await reportService.getAttendanceReport({ startDate, endDate, department });
    res.json({ success: true, data: report });
  } catch (e) {
    next(e);
  }
});

api.get('/reports/payroll-summary', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { periodId } = req.query as { periodId?: string };
    const report = await reportService.getPayrollSummaryReport(periodId);
    res.json({ success: true, data: report });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 12. AUDIT LOGS
// ==========================================
api.get('/audit-logs', authenticate, requireRole('ADMIN'), async (req: Request, res: Response, next) => {
  try {
    const logs = await auditService.getLogs();
    res.json({ success: true, data: logs });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 13. NOTIFICATIONS
// ==========================================
api.get('/notifications', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const notifs = await notificationService.getForUser(req.user!.id);
    res.json({ success: true, data: notifs });
  } catch (e) {
    next(e);
  }
});

api.put('/notifications/read/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    await notificationService.markAsRead(paramStr(req.params.id));
    res.json({ success: true, data: { message: 'Notification marked as read.' } });
  } catch (e) {
    next(e);
  }
});

api.put('/notifications/read-all', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await notificationService.markAllAsRead(req.user!.id);
    res.json({ success: true, data: { message: 'All notifications marked as read.' } });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 14. VIRTUAL BIOMETRIC & KIOSK TERMINAL
// ==========================================
api.post('/kiosk/punch', async (req: Request, res: Response, next) => {
  try {
    const { empId, pin, type, location, method } = req.body;
    if (!empId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee ID or PIN is required.' } });
      return;
    }

    const emp = await employeeService.getById(empId);
    if (!emp) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Employee ID ${empId} not recognized by kiosk.` } });
      return;
    }

    const nowTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let record;
    if (type === 'TIME_OUT') {
      record = await attendanceService.clockOut(emp.id, 'Biometric Kiosk');
    } else {
      record = await attendanceService.clockIn(emp.id, 'Biometric Kiosk');
    }

    await auditService.log({
      userId: emp.id,
      userName: emp.name,
      role: 'EMPLOYEE',
      action: `KIOSK_${type || 'TIME_IN'}`,
      entity: 'Attendance',
      entityId: record.id,
      details: `Biometric Kiosk punch via ${method || 'Face/PIN Scanner'} at ${location || 'Makati HQ Geofence'}`
    });

    res.json({
      success: true,
      data: {
        record,
        employee: {
          id: emp.id,
          name: emp.name,
          department: emp.department,
          avatar: emp.avatar
        },
        punchTime: nowTimeStr,
        location: location || 'Verified Makati CBD Geofence',
        method: method || 'Biometric Face / PIN'
      }
    });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 15. LOANS & CASH ADVANCE AMORTIZATION
// ==========================================
api.get('/loans', authenticate, async (req: Request, res: Response, next) => {
  try {
    const loans = await advancedFeaturesService.getLoans();
    res.json({ success: true, data: loans });
  } catch (e) {
    next(e);
  }
});

api.post('/loans', authenticate, requireRole('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response, next) => {
  try {
    const newLoan = await advancedFeaturesService.createLoan(req.body);
    res.status(201).json({ success: true, data: newLoan });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 16. SHIFT & SCHEDULE ROSTER PLANNER
// ==========================================
api.get('/shifts', authenticate, async (req: Request, res: Response, next) => {
  try {
    const shifts = await advancedFeaturesService.getShifts();
    res.json({ success: true, data: shifts });
  } catch (e) {
    next(e);
  }
});

api.put('/shifts/:empId', authenticate, requireRole('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response, next) => {
  try {
    const updated = await advancedFeaturesService.updateShift(paramStr(req.params.empId), req.body);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 17. AI PAYROLL ANOMALY SCANNER
// ==========================================
api.get('/payroll/anomalies', authenticate, requireRole('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response, next) => {
  try {
    const anomalies = await advancedFeaturesService.detectPayrollAnomalies();
    res.json({ success: true, data: anomalies });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 18. EMERGENCY BROADCAST CENTER
// ==========================================
api.get('/broadcasts', async (req: Request, res: Response, next) => {
  try {
    const broadcast = await advancedFeaturesService.getActiveBroadcast();
    res.json({ success: true, data: broadcast });
  } catch (e) {
    next(e);
  }
});

api.post('/broadcasts', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const broadcast = await advancedFeaturesService.setBroadcast({
      ...req.body,
      sender: req.user!.name || 'System Administrator'
    });
    res.status(201).json({ success: true, data: broadcast });
  } catch (e) {
    next(e);
  }
});

api.delete('/broadcasts/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response, next) => {
  try {
    await advancedFeaturesService.dismissBroadcast();
    res.json({ success: true, data: { message: 'Emergency broadcast dismissed.' } });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 19. 13TH MONTH PAY & TAX EXEMPTION PROJECTION
// ==========================================
api.get('/tax/thirteenth-month', authenticate, async (req: Request, res: Response, next) => {
  try {
    const projections = await advancedFeaturesService.getThirteenthMonthProjections();
    res.json({ success: true, data: projections });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 20. BIR FORM 2316 TAX CERTIFICATE GENERATOR
// ==========================================
api.get('/reports/bir-2316/:empId', authenticate, async (req: Request, res: Response, next) => {
  try {
    const birData = await advancedFeaturesService.getBIR2316(paramStr(req.params.empId));
    res.json({ success: true, data: birData });
  } catch (e) {
    next(e);
  }
});

// ==========================================
// 21. DIGITAL SIGNATURE ACKNOWLEDGMENT
// ==========================================
api.post('/payslips/:id/sign', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { signatureHash } = req.body;
    const signed = await advancedFeaturesService.signPayslip(
      paramStr(req.params.id),
      signatureHash || `SIG-${Date.now().toString(36)}`,
      req.user!.name || 'Authorized Signatory'
    );
    res.json({ success: true, data: signed });
  } catch (e) {
    next(e);
  }
});

api.get('/payslips/:id/signature', authenticate, async (req: Request, res: Response, next) => {
  try {
    const sig = await advancedFeaturesService.getPayslipSignature(paramStr(req.params.id));
    res.json({ success: true, data: sig });
  } catch (e) {
    next(e);
  }
});

export default api;

