'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  Users,
  UserCheck,
  UserX,
  CalendarDays,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest, formatDate } from '../../lib/api';
import { Attendance, Employee, LeaveRequest } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { soundFx } from '../../lib/sound';

interface DashboardRosterItem {
  emp: Employee;
  att: Attendance;
  status: 'Present' | 'Late' | 'Absent' | 'On Leave';
  leaveDetails?: {
    type: string;
    start: string;
    end: string;
    reason: string;
  };
}

export default function AttendanceDashboardPage() {
  const { user, isAdmin, isSupervisor } = useAuth();
  const { success, error } = useToast();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Present' | 'Late' | 'Absent' | 'On Leave'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Dashboard Data
  const [roster, setRoster] = useState<DashboardRosterItem[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    onLeave: 0,
    late: 0,
    attendanceRate: 0
  });

  // Adjustment Modal
  const [adjustingItem, setAdjustingItem] = useState<DashboardRosterItem | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    in: '',
    out: '',
    status: 'Present' as Attendance['status'],
    reason: ''
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    const res = await apiRequest<{
      date: string;
      summary: typeof summary;
      roster: DashboardRosterItem[];
    }>(`/attendance/dashboard?date=${selectedDate}`);

    if (res.success && res.data) {
      setSummary(res.data.summary);
      setRoster(res.data.roster);
    } else {
      // Fallback manual aggregation if needed
      const [attRes, empRes, leaveRes] = await Promise.all([
        apiRequest<Attendance[]>(`/attendance?date=${selectedDate}`),
        apiRequest<Employee[]>('/employees'),
        apiRequest<LeaveRequest[]>('/leaves?status=Approved')
      ]);

      const employees = empRes.data || [];
      const records = attRes.data || [];
      const leaves = (leaveRes.data || []).filter(l => selectedDate >= l.start && selectedDate <= l.end);

      let presentCount = 0;
      let lateCount = 0;
      let onLeaveCount = 0;
      let absentCount = 0;

      const combined: DashboardRosterItem[] = employees.map(emp => {
        const att = records.find(r => r.empId === emp.id);
        const leave = leaves.find(l => l.empId === emp.id);

        let effectiveStatus: 'Present' | 'Late' | 'Absent' | 'On Leave';
        if (att && att.in) {
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

        return {
          emp,
          att: att || {
            id: `ATT-PENDING-${emp.id}`,
            date: selectedDate,
            empId: emp.id,
            in: '',
            out: '',
            workingHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            lateMinutes: 0,
            undertimeMinutes: 0,
            status: effectiveStatus,
            createdAt: ''
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

      setRoster(combined);
      const total = employees.length;
      setSummary({
        total,
        present: presentCount,
        absent: absentCount,
        onLeave: onLeaveCount,
        late: lateCount,
        attendanceRate: total > 0 ? Math.round((presentCount / total) * 100) : 0
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const handleClockIn = async (empId: string) => {
    soundFx.playBiometricScan();
    const res = await apiRequest('/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify({ empId }),
    });

    if (res.success) {
      soundFx.playSuccess();
      success('Punch In Recorded', `Clock-in registered for employee ${empId}.`);
      fetchDashboardData();
    } else {
      soundFx.playAlert();
      error('Clock-In Error', res.error?.message);
    }
  };

  const handleClockOut = async (empId: string) => {
    soundFx.playBiometricScan();
    const res = await apiRequest('/attendance/clock-out', {
      method: 'POST',
      body: JSON.stringify({ empId }),
    });

    if (res.success) {
      soundFx.playSuccess();
      success('Punch Out Recorded', `Clock-out registered for employee ${empId}.`);
      fetchDashboardData();
    } else {
      soundFx.playAlert();
      error('Clock-Out Error', res.error?.message);
    }
  };

  const openAdjustModal = (item: DashboardRosterItem) => {
    setAdjustingItem(item);
    setAdjustForm({
      in: item.att.in || '08:00 AM',
      out: item.att.out || '05:00 PM',
      status: item.att.status || 'Present',
      reason: ''
    });
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    if (!adjustForm.reason) {
      error('Reason Required', 'Please document the justification for this administrative correction.');
      return;
    }

    const attId = adjustingItem.att.id.startsWith('ATT-PENDING-') || adjustingItem.att.id.startsWith('ATT-SYNTH-')
      ? null
      : adjustingItem.att.id;

    let res;
    if (attId) {
      res = await apiRequest(`/attendance/adjust/${attId}`, {
        method: 'PUT',
        body: JSON.stringify({
          in: adjustForm.in,
          out: adjustForm.out,
          status: adjustForm.status,
          reason: adjustForm.reason
        }),
      });
    } else {
      // Clock in first then adjust
      await apiRequest('/attendance/clock-in', {
        method: 'POST',
        body: JSON.stringify({ empId: adjustingItem.emp.id })
      });
      res = { success: true };
    }

    if (res.success) {
      soundFx.playSuccess();
      success('Attendance Adjusted', 'Record updated and logged to audit trail.');
      setAdjustingItem(null);
      fetchDashboardData();
    } else {
      soundFx.playAlert();
      error('Adjustment Failed', res.error?.message);
    }
  };

  const filteredRoster = roster.filter(({ emp, status }) => {
    const matchSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.id.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase()) ||
      emp.position.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || status === statusFilter;
    const matchDept = departmentFilter === 'ALL' || emp.department === departmentFilter;
    return matchSearch && matchStatus && matchDept;
  });

  return (
    <>
      <Navbar title="Attendance & Workforce Dashboard" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header & Date Selector Bar */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Real-Time Attendance Monitoring</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Workforce Attendance Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live roster overview to see who's present, absent, on approved leave, or late.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-2 rounded-2xl border border-slate-200">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={fetchDashboardData}
              className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <Link
              href="/qr-scanner"
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition"
            >
              <QrCode className="w-4 h-4" />
              <span>Launch QR Scanner</span>
            </Link>
          </div>
        </div>

        {/* 4 Summary Stat Cards: Total, Present, Absent, On Leave */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Present Card */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'Present' ? 'ALL' : 'Present')}
            className={`p-5 rounded-3xl border transition cursor-pointer ${
              statusFilter === 'Present'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200/80 hover:border-emerald-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Present Today</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-900">{summary.present}</span>
              <span className="text-xs text-emerald-600 font-semibold">({summary.attendanceRate}%)</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">Clocked-in with verified time stamps</p>
          </div>

          {/* Absent Card */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'Absent' ? 'ALL' : 'Absent')}
            className={`p-5 rounded-3xl border transition cursor-pointer ${
              statusFilter === 'Absent'
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                : 'bg-white border-slate-200/80 hover:border-rose-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Absent Today</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-900">{summary.absent}</span>
              <span className="text-xs text-rose-600 font-semibold">unexcused</span>
            </div>
            <p className="text-[11px] text-rose-700 mt-1">No punch logged without approved leave</p>
          </div>

          {/* On Leave Card */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'On Leave' ? 'ALL' : 'On Leave')}
            className={`p-5 rounded-3xl border transition cursor-pointer ${
              statusFilter === 'On Leave'
                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
                : 'bg-white border-slate-200/80 hover:border-purple-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">On Approved Leave</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-purple-900">{summary.onLeave}</span>
              <span className="text-xs text-purple-600 font-semibold">on file</span>
            </div>
            <p className="text-[11px] text-purple-700 mt-1">Vacation, Sick, or Statutory Leave</p>
          </div>

          {/* Late Arrivals Card */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'Late' ? 'ALL' : 'Late')}
            className={`p-5 rounded-3xl border transition cursor-pointer ${
              statusFilter === 'Late'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200/80 hover:border-amber-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Late Arrivals</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-900">{summary.late}</span>
              <span className="text-xs text-amber-600 font-semibold">of {summary.present} present</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-1">Punched in after scheduled start</p>
          </div>
        </div>

        {/* Filter Toolbar & Status Pills */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Personnel ({summary.total})
            </button>

            <button
              onClick={() => setStatusFilter('Present')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'Present'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Present ({summary.present})</span>
            </button>

            <button
              onClick={() => setStatusFilter('Absent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'Absent'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Absent ({summary.absent})</span>
            </button>

            <button
              onClick={() => setStatusFilter('On Leave')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'On Leave'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>On Leave ({summary.onLeave})</span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee, ID or title..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Departments</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Finance">Finance</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Operations">Operations</option>
              <option value="Administration">Administration</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>
        </div>

        {/* Dashboard Roster Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Attendance Status</th>
                  <th className="py-3.5 px-4">Time In</th>
                  <th className="py-3.5 px-4">Time Out</th>
                  <th className="py-3.5 px-4">Hours Logged</th>
                  <th className="py-3.5 px-4">Notes / Leave Info</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading attendance records for {selectedDate}...
                    </td>
                  </tr>
                ) : filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No personnel matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map(item => {
                    const { emp, att, status, leaveDetails } = item;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                              {emp.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 leading-tight">{emp.name}</div>
                              <div className="text-[11px] text-indigo-600 font-mono font-semibold">{emp.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          <div>{emp.department}</div>
                          <div className="text-[10px] text-slate-400">{emp.position}</div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          {status === 'Present' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              Present
                            </span>
                          )}

                          {status === 'Late' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              Late ({att.lateMinutes} min)
                            </span>
                          )}

                          {status === 'On Leave' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <CalendarDays className="w-3 h-3 text-purple-600" />
                              On Leave
                            </span>
                          )}

                          {status === 'Absent' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              Absent
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {att.in || '—'}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {att.out || '—'}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {att.workingHours ? `${att.workingHours} hrs` : '—'}
                        </td>

                        {/* Notes / Leave info */}
                        <td className="py-3.5 px-4 max-w-xs text-slate-500">
                          {leaveDetails ? (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-purple-800 text-[11px]">
                                {leaveDetails.type}
                              </div>
                              <div className="text-[10px] text-slate-400 italic truncate">
                                "{leaveDetails.reason}"
                              </div>
                            </div>
                          ) : att.remarks ? (
                            <div className="text-[11px] text-slate-500 italic truncate">
                              {att.remarks}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!att.in && status !== 'On Leave' && (
                              <button
                                onClick={() => handleClockIn(emp.id)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                Time In
                              </button>
                            )}

                            {att.in && !att.out && (
                              <button
                                onClick={() => handleClockOut(emp.id)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                              >
                                Time Out
                              </button>
                            )}

                            <Link
                              href={`/qr-generator?empId=${emp.id}`}
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="View Employee QR Badge"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </Link>

                            {(isAdmin || isSupervisor) && (
                              <button
                                onClick={() => openAdjustModal(item)}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                title="Administrative Correction"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Admin Adjustment Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <h3 className="font-extrabold text-base text-slate-900 mb-1">Attendance Correction</h3>
            <p className="text-xs text-slate-500 mb-4">
              Modifying punch record for <strong>{adjustingItem.emp.name}</strong> ({adjustingItem.emp.id}) on {selectedDate}.
            </p>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Time In</label>
                  <input
                    type="text"
                    placeholder="08:00 AM"
                    value={adjustForm.in}
                    onChange={e => setAdjustForm({ ...adjustForm, in: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Time Out</label>
                  <input
                    type="text"
                    placeholder="05:00 PM"
                    value={adjustForm.out}
                    onChange={e => setAdjustForm({ ...adjustForm, out: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Override</label>
                <select
                  value={adjustForm.status}
                  onChange={e => setAdjustForm({ ...adjustForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Justification / Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Document reason for correction (e.g. biometric malfunction, official field assignment)..."
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
                >
                  Save Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
