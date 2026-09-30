'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Clock,
  UserCheck,
  UserX,
  CalendarDays,
  Timer,
  BadgeDollarSign,
  ArrowRight,
  PlusCircle,
  Play,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatCard } from '../components/StatCard';
import { AttendanceTrendChart, DepartmentPayrollChart } from '../components/Charts';
import { apiRequest, formatPHP } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { role, isAdmin } = useAuth();
  const { success, error, info } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningAbsenteeism, setRunningAbsenteeism] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    const res = await apiRequest('/reports/dashboard');
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRunAbsenteeism = async () => {
    setRunningAbsenteeism(true);
    const res = await apiRequest('/absenteeism/detect', { method: 'POST' });
    setRunningAbsenteeism(false);

    if (res.success && res.data) {
      const flagged = res.data.newAbsencesFlagged?.length || 0;
      if (flagged > 0) {
        info('Detection Completed', `Identified ${flagged} new potential unrecorded absence(s).`);
      } else {
        success('Workforce Verified', 'All scheduled employees accounted for.');
      }
      fetchDashboard();
    } else {
      error('Detection Notice', res.error?.message || 'Could not run detection.');
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    const res = await apiRequest(`/leaves/review/${leaveId}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'Approved', remarks: 'Endorsed via Dashboard Quick Action' }),
    });
    if (res.success) {
      success('Leave Approved', `Request ${leaveId} approved.`);
      fetchDashboard();
    } else {
      error('Approval Failed', res.error?.message);
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    const res = await apiRequest(`/leaves/review/${leaveId}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'Rejected', remarks: 'Declined via Dashboard Quick Action' }),
    });
    if (res.success) {
      info('Leave Rejected', `Request ${leaveId} rejected.`);
      fetchDashboard();
    } else {
      error('Action Failed', res.error?.message);
    }
  };

  const kpi = data?.kpi || {
    totalEmployees: 10,
    presentToday: 6,
    lateToday: 2,
    absentToday: 1,
    onLeaveToday: 1,
    pendingLeaves: 1,
    pendingOvertime: 1,
    totalApprovedOtHours: 5.0,
    latestPayrollNet: 175069.75,
    latestPayrollGross: 201250.00,
    totalCostCenterBudget: 3900000,
    totalAllocatedPayroll: 379000,
  };

  return (
    <>
      <Navbar title="Workforce & Payroll Overview" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1 text-indigo-400 font-semibold text-xs tracking-wider uppercase">
              <Sparkles className="w-4 h-4" />
              <span>Real-Time Workforce Analytics</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Enterprise Attendance & Payroll Dashboard
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Active Pay Period: <strong className="text-slate-200">September 2026 (2nd Half)</strong> • Automated Absenteeism & TRAIN Tax Engine active.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchDashboard}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {isAdmin && (
              <button
                disabled={runningAbsenteeism}
                onClick={handleRunAbsenteeism}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-xs font-bold text-white shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{runningAbsenteeism ? 'Scanning...' : 'Scan Absenteeism'}</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Personnel"
            value={kpi.totalEmployees}
            subtitle="Active registered employees"
            icon={Users}
            variant="blue"
          />
          <StatCard
            label="Present Today"
            value={kpi.presentToday}
            subtitle={`${kpi.lateToday} marked late (< 15m grace)`}
            icon={UserCheck}
            variant="emerald"
          />
          <StatCard
            label="Absent / Flagged"
            value={kpi.absentToday}
            subtitle={`${kpi.onLeaveToday} on approved leave`}
            icon={UserX}
            variant="rose"
          />
          <StatCard
            label="Latest Net Payroll"
            value={formatPHP(kpi.latestPayrollNet)}
            subtitle={`Gross: ${formatPHP(kpi.latestPayrollGross)}`}
            icon={BadgeDollarSign}
            variant="indigo"
          />
        </div>

        {/* Quick Action Buttons (All Functional) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Operational Quick Actions
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {isAdmin && (
              <Link
                href="/employees"
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-indigo-50/60 hover:border-indigo-200 transition-all text-left group"
              >
                <PlusCircle className="w-5 h-5 text-indigo-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-950">Add Employee</div>
                <div className="text-[10px] text-slate-400">Onboard new personnel</div>
              </Link>
            )}

            <Link
              href="/attendance"
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/60 hover:border-emerald-200 transition-all text-left group"
            >
              <Clock className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-950">Log Attendance</div>
              <div className="text-[10px] text-slate-400">Time punches & adjustments</div>
            </Link>

            <Link
              href="/leave"
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-amber-50/60 hover:border-amber-200 transition-all text-left group"
            >
              <CalendarDays className="w-5 h-5 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-800 group-hover:text-amber-950">File Leave</div>
              <div className="text-[10px] text-slate-400">{kpi.pendingLeaves} pending review</div>
            </Link>

            <Link
              href="/overtime"
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-purple-50/60 hover:border-purple-200 transition-all text-left group"
            >
              <Timer className="w-5 h-5 text-purple-600 mb-1.5 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-800 group-hover:text-purple-950">File Overtime</div>
              <div className="text-[10px] text-slate-400">{kpi.pendingOvertime} requests pending</div>
            </Link>

            {isAdmin && (
              <Link
                href="/payroll"
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition-all text-left group"
              >
                <FileSpreadsheet className="w-5 h-5 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-800 group-hover:text-blue-950">Process Payroll</div>
                <div className="text-[10px] text-slate-400">Disburse & finalize pay</div>
              </Link>
            )}

            <Link
              href="/payslips"
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-all text-left group"
            >
              <ArrowRight className="w-5 h-5 text-slate-700 mb-1.5 group-hover:translate-x-1 transition-transform" />
              <div className="text-xs font-bold text-slate-800">Print Payslips</div>
              <div className="text-[10px] text-slate-400">Download PDF copies</div>
            </Link>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Trend Chart */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Workforce Attendance Dynamics</h3>
            <p className="text-xs text-slate-400 mb-4">Five-day presence vs tardiness & absenteeism breakdown</p>
            <AttendanceTrendChart data={data?.attendanceTrends || []} />
          </div>

          {/* Department Payroll Distribution */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-slate-900">Cost Center & Department Distribution</h3>
                <Link href="/cost-centers" className="text-xs text-indigo-600 font-semibold hover:underline">
                  View All
                </Link>
              </div>
              <p className="text-xs text-slate-400 mb-4">Actual allocated payroll compared against approved budget</p>
              <DepartmentPayrollChart data={data?.deptDistribution || []} />
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Total Org Budget: <strong>{formatPHP(kpi.totalCostCenterBudget)}</strong></span>
              <span>Allocated: <strong>{formatPHP(kpi.totalAllocatedPayroll)}</strong></span>
            </div>
          </div>
        </div>

        {/* Tables Section: Today's Attendance & Pending Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Live Attendance */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Today's Attendance Roster</h3>
                <p className="text-xs text-slate-400">Live time-in stamps for current date</p>
              </div>
              <Link href="/attendance" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                View Full Log →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="pb-2.5">Staff</th>
                    <th className="pb-2.5">Time In</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.recentAttendance || []).map((att: any) => (
                    <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 font-semibold text-slate-800">
                        {att.empId}
                      </td>
                      <td className="py-2.5 text-slate-600 font-mono">
                        {att.in || '—'}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            att.status === 'Present'
                              ? 'bg-emerald-50 text-emerald-700'
                              : att.status === 'Late'
                              ? 'bg-amber-50 text-amber-700'
                              : att.status === 'On Leave'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Leave Requisitions Queue */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pending Leave Approvals</h3>
                <p className="text-xs text-slate-400">Requisitions awaiting supervisor review</p>
              </div>
              <Link href="/leave" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                Manage Leaves →
              </Link>
            </div>

            <div className="space-y-3">
              {(data?.recentLeaves || []).filter((l: any) => l.status === 'Pending').length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl">
                  No pending leave requests awaiting approval.
                </div>
              ) : (
                (data?.recentLeaves || []).filter((l: any) => l.status === 'Pending').map((leave: any) => (
                  <div
                    key={leave.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/40 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {leave.empId} • {leave.type}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {leave.start} to {leave.end} ({leave.days}d)
                      </div>
                      <div className="text-[11px] text-slate-400 italic mt-0.5">
                        "{leave.reason}"
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleApproveLeave(leave.id)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectLeave(leave.id)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
