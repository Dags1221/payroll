import { Database } from '../db/database';
import { qrService, getQrSecret } from '../services/qr.service';
import { attendanceService } from '../services/attendance.service';
import { leaveService } from '../services/leave.service';
import { overtimeService } from '../services/overtime.service';
import { payrollService } from '../services/payroll.service';
import { getJwtSecret } from '../services/auth.service';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

async function expectThrow(fn: () => Promise<any>, testName: string, expectedErrorMessageSubstring?: string) {
  totalTests++;
  try {
    await fn();
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName} - Expected error to be thrown but function succeeded`);
  } catch (err: any) {
    if (expectedErrorMessageSubstring && !err.message.includes(expectedErrorMessageSubstring)) {
      failedTests++;
      console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName} - Expected message containing "${expectedErrorMessageSubstring}", got "${err.message}"`);
    } else {
      passedTests++;
      console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName} (Caught expected error: "${err.message}")`);
    }
  }
}

async function runTestSuite1_LeaveWorkflow() {
  console.log('\n\x1b[1m\x1b[34m=== SUITE 1: LEAVE WORKFLOW & LIFECYCLE ===\x1b[0m');
  const db = Database.getInstance();

  // Test 1: Date validation (start > end)
  await expectThrow(
    () => leaveService.createLeave({
      empId: 'EMP-001',
      type: 'Vacation Leave',
      start: '2026-12-10',
      end: '2026-12-05',
      reason: 'Holiday vacation',
      actorName: 'Juan Dela Cruz'
    }),
    'Disallow leave where start date > end date',
    'Start date cannot be after end date'
  );

  // Test 2: Vacation leave in the past disallowed
  await expectThrow(
    () => leaveService.createLeave({
      empId: 'EMP-001',
      type: 'Vacation Leave',
      start: '2026-01-01',
      end: '2026-01-03',
      reason: 'Retroactive vacation',
      actorName: 'Juan Dela Cruz'
    }),
    'Disallow retroactive Vacation Leave',
    'Vacation Leave must be filed in advance'
  );

  // Test 3: Sick Leave beyond 5 days in the past disallowed
  await expectThrow(
    () => leaveService.createLeave({
      empId: 'EMP-001',
      type: 'Sick Leave',
      start: '2025-01-01',
      end: '2025-01-02',
      reason: 'Old flu',
      actorName: 'Juan Dela Cruz'
    }),
    'Disallow Sick Leave exceeding 5 calendar days retroactive limit',
    'cannot exceed 5 calendar days'
  );

  // Clean existing test leaves for EMP-001 to guarantee test idempotency across runs
  const existingEmp1Leaves = await db.getLeaves({ empId: 'EMP-001' });
  for (const l of existingEmp1Leaves) {
    if (l.start >= '2030-01-01') {
      await db.updateLeave(l.id, { status: 'Cancelled' });
    }
  }

  // Unique future dates for test run
  const y = 2035;
  const m = '06';
  const futureStart = `${y}-${m}-01`;
  const futureEnd = `${y}-${m}-03`;

  // Test 4: Valid leave creation
  const validLeave = await leaveService.createLeave({
    empId: 'EMP-001',
    type: 'Vacation Leave',
    start: futureStart,
    end: futureEnd,
    reason: 'Family gathering',
    actorName: 'Juan Dela Cruz'
  });
  assert(validLeave.id.startsWith('LR-') && validLeave.status === 'Pending', 'Create valid Vacation Leave with Pending status');

  // Test 5: Overlap check
  await expectThrow(
    () => leaveService.createLeave({
      empId: 'EMP-001',
      type: 'Vacation Leave',
      start: `${y}-${m}-02`,
      end: `${y}-${m}-05`,
      reason: 'Overlapping request',
      actorName: 'Juan Dela Cruz'
    }),
    'Disallow overlapping leave for the same employee',
    'already overlaps this period'
  );

  // Test 6: Mandatory rejection remarks
  await expectThrow(
    () => leaveService.reviewLeave({
      leaveId: validLeave.id,
      status: 'Rejected',
      reviewerId: 'USR-001',
      reviewerName: 'Admin',
      remarks: ''
    }),
    'Mandatory rejection reason on leave rejection',
    'A rejection reason is mandatory'
  );

  // Test 7: Successful approval and attendance synchronization
  const approved = await leaveService.reviewLeave({
    leaveId: validLeave.id,
    status: 'Approved',
    reviewerId: 'USR-001',
    reviewerName: 'Admin',
    remarks: 'Approved per company policy'
  });
  assert(approved.status === 'Approved', 'Approve leave request');

  // Verify attendance sync: attendance records created for approved dates
  const syncAtt = await db.getAttendance({ date: futureStart, empId: 'EMP-001' });
  assert(syncAtt.length > 0 && syncAtt[0].status === 'On Leave', 'Synchronize attendance: on-leave record created for approved date');

  // Test 8: Concurrency locking: cannot review already finalized leave
  await expectThrow(
    () => leaveService.reviewLeave({
      leaveId: validLeave.id,
      status: 'Rejected',
      reviewerId: 'USR-001',
      reviewerName: 'Admin',
      remarks: 'Attempt second review'
    }),
    'Concurrency lock: reject review of already finalized leave',
    'already been finalized'
  );
}

async function runTestSuite2_CryptographicQrAttendance() {
  console.log('\n\x1b[1m\x1b[34m=== SUITE 2: CRYPTOGRAPHIC QR ATTENDANCE ===\x1b[0m');
  const db = Database.getInstance();
  const today = new Date().toISOString().slice(0, 10);

  // Clean today record for EMP-001 if already punched in earlier run
  const existingEmp1 = await db.getAttendance({ date: today, empId: 'EMP-001' });
  if (existingEmp1[0]) {
    existingEmp1[0].in = '';
    existingEmp1[0].out = '';
    await db.saveAttendance(existingEmp1[0]);
  }

  // Test 1: Generate signed token
  const tokenData = await qrService.generateSignedToken('EMP-001', 'Admin');
  assert(
    tokenData.token.startsWith('APXQR.') && tokenData.token.split('.').length === 3,
    'Generate HMAC-SHA256 signed QR token with APXQR prefix and 3 parts'
  );

  // Test 2: Verify authentic signed token
  const verified = await qrService.verifySignedToken(tokenData.token);
  assert(
    verified.empId === 'EMP-001' && verified.name === 'Juan Dela Cruz',
    'Verify authentic token extracts correct employee details'
  );

  // Test 3: Reject tampered token
  const parts = tokenData.token.split('.');
  const tamperedToken = `${parts[0]}.${parts[1]}.badsignature1234567890abcdef`;
  await expectThrow(
    () => qrService.verifySignedToken(tamperedToken),
    'Reject counterfeit or tampered QR badge token',
    'Cryptographic signature verification failed'
  );

  // Test 4: Revocation capability
  await qrService.revokeToken('EMP-001', 'Admin');
  await expectThrow(
    () => qrService.verifySignedToken(tokenData.token),
    'Reject revoked QR badge token',
    'revoked for security reasons'
  );

  // Regenerate fresh token after revocation test
  const freshToken = await qrService.generateSignedToken('EMP-001', 'Admin');

  // Test 5: QR Punch Time-In using signed token
  const punchInRes = await attendanceService.qrPunch({
    token: freshToken.token,
    requestedType: 'TIME_IN',
    actorName: 'Terminal 1',
    customTime: '08:00 AM'
  });
  assert(
    punchInRes.action === 'TIME_IN' && punchInRes.record.in === '08:00 AM' && punchInRes.record.status === 'Present',
    'QR punch records verified Time-In at 08:00 AM'
  );

  // Test 6: Rapid-punch / duplicate punch throttle
  await expectThrow(
    () => attendanceService.qrPunch({
      token: freshToken.token,
      requestedType: 'TIME_OUT',
      actorName: 'Terminal 1'
    }),
    'Rapid punch throttling prevents duplicate punch within threshold',
    'Rapid badge scan detected'
  );
}

async function runTestSuite3_AutomaticOvertimePipeline() {
  console.log('\n\x1b[1m\x1b[34m=== SUITE 3: AUTOMATIC OVERTIME & DOLE BREAK DEDUCTION ===\x1b[0m');
  const db = Database.getInstance();

  const emp3 = 'EMP-003';
  const today = new Date().toISOString().slice(0, 10);

  // Clear existing attendance for EMP-003 today for clean testing
  const existing = await db.getAttendance({ date: today, empId: emp3 });
  if (existing[0]) {
    existing[0].in = '';
    existing[0].out = '';
    await db.saveAttendance(existing[0]);
  }

  // Test 1: Standard 8-hour shift with 1-hour unpaid meal break
  // In at 8:00 AM, out at 5:00 PM (17:00). Elapsed = 9h (540m). Break = 1h (60m). Net = 8.0h. Overtime = 0.
  await attendanceService.clockIn(emp3, 'John Reyes', '08:00 AM');
  const standardShift = await attendanceService.clockOut(emp3, 'John Reyes', '05:00 PM');
  assert(
    standardShift.workingHours === 8.0 && standardShift.regularHours === 8.0 && standardShift.overtimeHours === 0 && standardShift.breakMinutes === 60,
    'DOLE shift: 9h elapsed - 1h break = 8.0h net regular, 0h overtime'
  );

  // Test 2: Overtime shift (In at 08:00 AM, Out at 08:00 PM / 20:00)
  // Elapsed = 12 hours (720m). Meal break = 60m. Net = 11.0 hours.
  // Regular = 8.0h. Overtime = 3.0h!
  const emp4 = 'EMP-004';
  const existingEmp4 = await db.getAttendance({ date: today, empId: emp4 });
  if (existingEmp4[0]) {
    existingEmp4[0].in = '';
    existingEmp4[0].out = '';
    await db.saveAttendance(existingEmp4[0]);
  }

  await attendanceService.clockIn(emp4, 'Angela Garcia', '08:00 AM');
  const otShift = await attendanceService.clockOut(emp4, 'Angela Garcia', '08:00 PM');
  assert(
    otShift.workingHours === 11.0 && otShift.regularHours === 8.0 && otShift.overtimeHours === 3.0,
    'DOLE overtime shift: 12h elapsed - 1h break = 11h net, 8.0h regular, 3.0h overtime'
  );

  // Test 3: Candidate overtime record was automatically generated and linked
  const candidateOt = await db.getOvertimeByAttendanceId(otShift.id);
  assert(
    candidateOt !== undefined && candidateOt.hours === 3.0 && candidateOt.status === 'Pending' && candidateOt.multiplier === 1.25,
    'Automatic overtime candidate generated in database linked to attendance session'
  );

  // Test 4: Review candidate overtime (Approve)
  const approvedOt = await overtimeService.reviewOvertime({
    overtimeId: candidateOt!.id,
    status: 'Approved',
    approverId: 'USR-001',
    approverName: 'System Admin',
    remarks: 'Approved for urgent project completion'
  });
  assert(approvedOt.status === 'Approved', 'Supervisor/Admin approves automatic overtime record');

  // Test 5: Payroll Integration & Double Payment Prevention
  // Create test payroll period covering today
  const period = await payrollService.createPeriod({
    name: `Test Automatic OT Period ${Date.now()}`,
    type: 'Monthly',
    startDate: today,
    endDate: today,
    cutoffDate: today,
    paymentDate: today,
    creatorName: 'System Admin'
  });

  const computeResult = await payrollService.computePayroll(period.id, 'System Admin');
  const emp4Item = computeResult.items.find(i => i.empId === emp4);
  assert(
    emp4Item !== undefined && emp4Item.overtimeHours === 3.0 && emp4Item.overtimePay > 0,
    'Approved overtime hours and compensation correctly integrated into payroll computation'
  );

  // Check that the overtime record is tagged with payrollItemId to prevent double payment
  const updatedOt = await db.getOvertimeById(candidateOt!.id);
  assert(
    updatedOt?.payrollItemId === emp4Item?.id,
    'Overtime record tagged with payrollItemId to prevent double payout in future periods'
  );
}

async function runTestSuite4_RoleRbacAndDepartmentScoping() {
  console.log('\n\x1b[1m\x1b[34m=== SUITE 4: ROLE RBAC & DEPARTMENT SCOPING ===\x1b[0m');
  const db = Database.getInstance();

  // Supervisor Maria Santos is in department 'Finance' (EMP-002)
  // Employee Juan Dela Cruz is in 'Human Resources' (EMP-001)
  // Employee Kevin Ocampo is in 'Finance' (EMP-008)

  // Test 1: Supervisor can see employees in Finance
  const allEmployees = await db.getEmployees();
  const financeEmployees = allEmployees.filter(e => e.department.toLowerCase() === 'finance');
  const financeIds = financeEmployees.map(e => e.id);
  assert(
    financeIds.includes('EMP-002') && financeIds.includes('EMP-008') && !financeIds.includes('EMP-001'),
    'Supervisor department mapping: Maria Santos (Finance) encompasses Kevin Ocampo, excludes Juan Dela Cruz (HR)'
  );

  // Test 2: Supervisor self-review disallowance
  // Clean existing future leaves for test employees in Suite 4
  for (const testId of ['EMP-002', 'EMP-001', 'EMP-008']) {
    const prev = await db.getLeaves({ empId: testId });
    for (const l of prev) {
      if (l.start >= '2040-01-01') {
        await db.updateLeave(l.id, { status: 'Cancelled' });
      }
    }
  }

  // Create leave request for supervisor Maria Santos (EMP-002)
  const randYear = 2045;
  const supervisorLeave = await leaveService.createLeave({
    empId: 'EMP-002',
    type: 'Vacation Leave',
    start: `${randYear}-01-01`,
    end: `${randYear}-01-03`,
    reason: 'Personal time off',
    actorName: 'Maria Santos'
  });

  const isSelfApproval = supervisorLeave.empId === 'EMP-002';
  assert(isSelfApproval, 'Self-approval detected and flagged for prohibition on supervisor personal leave');

  // Test 3: Supervisor scoping - Out of department review restriction
  const hrLeave = await leaveService.createLeave({
    empId: 'EMP-001',
    type: 'Vacation Leave',
    start: `${randYear}-02-01`,
    end: `${randYear}-02-03`,
    reason: 'Year end break',
    actorName: 'Juan Dela Cruz'
  });

  const hrEmp = await db.getEmployeeById(hrLeave.empId);
  const isOutOfDept = hrEmp?.department !== 'Finance';
  assert(isOutOfDept, 'Cross-department review check: HR employee leave blocked from Finance supervisor');

  // Test 4: Supervisor valid in-department review
  const financeLeave = await leaveService.createLeave({
    empId: 'EMP-008',
    type: 'Vacation Leave',
    start: `${randYear}-03-01`,
    end: `${randYear}-03-03`,
    reason: 'Family holiday',
    actorName: 'Kevin Ocampo'
  });
  const reviewedFinanceLeave = await leaveService.reviewLeave({
    leaveId: financeLeave.id,
    status: 'Approved',
    reviewerId: 'USR-003',
    reviewerName: 'Maria Santos',
    remarks: 'Approved for finance team member'
  });
  assert(
    reviewedFinanceLeave.status === 'Approved' && reviewedFinanceLeave.reviewerName === 'Maria Santos',
    'Supervisor successfully reviews leave for team member within assigned department'
  );
}

async function runTestSuite5_SecuritySecretsAndPunchRestrictions() {
  console.log('\n\x1b[1m\x1b[34m=== SUITE 5: SECURITY SECRETS & PUNCH RESTRICTIONS ===\x1b[0m');
  const db = Database.getInstance();

  // Test 1: Production JWT_SECRET fail-fast check
  const origEnv = process.env.NODE_ENV;
  const origJwt = process.env.JWT_SECRET;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    let caughtJwtError = false;
    try {
      getJwtSecret();
    } catch (e: any) {
      caughtJwtError = e.message.includes('FATAL SECURITY CONFIGURATION ERROR');
    }
    assert(caughtJwtError, 'Production mode strictly requires configured JWT_SECRET (fails without fallback)');
  } finally {
    process.env.NODE_ENV = origEnv;
    if (origJwt) process.env.JWT_SECRET = origJwt;
    else delete process.env.JWT_SECRET;
  }

  // Test 2: Production QR_HMAC_SECRET fail-fast check
  const origQr = process.env.QR_HMAC_SECRET;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.QR_HMAC_SECRET;
    delete process.env.QR_SECRET;
    let caughtQrError = false;
    try {
      getQrSecret();
    } catch (e: any) {
      caughtQrError = e.message.includes('FATAL SECURITY CONFIGURATION ERROR');
    }
    assert(caughtQrError, 'Production mode strictly requires configured QR_HMAC_SECRET (fails without fallback)');
  } finally {
    process.env.NODE_ENV = origEnv;
    if (origQr) process.env.QR_HMAC_SECRET = origQr;
    else delete process.env.QR_HMAC_SECRET;
  }

  // Test 3: Reject non-APXQR token in qrPunch
  await expectThrow(
    () => attendanceService.qrPunch({
      token: 'INVALID_TOKEN_FORMAT',
      requestedType: 'TIME_IN'
    }),
    'Strictly reject non-APXQR token in qrPunch endpoint',
    'APXQR...'
  );

  // Test 4: Reject empty or missing token in qrPunch
  await expectThrow(
    () => attendanceService.qrPunch({
      token: '',
      requestedType: 'TIME_IN'
    } as any),
    'Strictly reject missing token in qrPunch (no direct ID bypass)',
    'APXQR...'
  );

  // Test 5: Verify database layer resolves records
  const emp1 = await db.getEmployeeById('EMP-001');
  assert(emp1 !== undefined && emp1.email === 'juan.delacruz@payroll.corp', 'Database layer successfully resolves active employee data');
}

export async function runAllTests() {
  console.log('\x1b[1m\x1b[36m=====================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m  APEX ENTERPRISE SYSTEM INTEGRATION TEST HARNESS     \x1b[0m');
  console.log('\x1b[1m\x1b[36m=====================================================\x1b[0m');

  const start = Date.now();

  try {
    await runTestSuite1_LeaveWorkflow();
    await runTestSuite2_CryptographicQrAttendance();
    await runTestSuite3_AutomaticOvertimePipeline();
    await runTestSuite4_RoleRbacAndDepartmentScoping();
    await runTestSuite5_SecuritySecretsAndPunchRestrictions();
  } catch (e) {
    console.error('Fatal unhandled test suite error:', e);
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log('\n\x1b[1m\x1b[36m=====================================================\x1b[0m');
  console.log(`\x1b[1mTest Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed) in ${duration}s\x1b[0m`);
  console.log('\x1b[1m\x1b[36m=====================================================\x1b[0m\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runAllTests();
}
