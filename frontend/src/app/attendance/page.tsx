'use client';

import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest, formatDate } from '../../lib/api';
import { Attendance, Employee } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function AttendancePage() {
  const { user, isAdmin } = useAuth();
  const { success, error } = useToast();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Adjustment Modal
  const [adjustingRecord, setAdjustingRecord] = useState<Attendance | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    in: '',
    out: '',
    status: 'Present' as Attendance['status'],
    reason: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const [attRes, empRes] = await Promise.all([
      apiRequest<Attendance[]>(`/attendance?date=${selectedDate}`),
      apiRequest<Employee[]>('/employees')
    ]);

    if (attRes.success && attRes.data) setRecords(attRes.data);
    if (empRes.success && empRes.data) setEmployees(empRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleClockIn = async (empId: string) => {
    const res = await apiRequest('/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify({ empId }),
    });
    if (res.success) {
      success('Punch In Recorded', `Clock-in registered successfully for ${empId}.`);
      fetchData();
    } else {
      error('Clock-In Error', res.error?.message);
    }
  };

  const handleClockOut = async (empId: string) => {
    const res = await apiRequest('/attendance/clock-out', {
      method: 'POST',
      body: JSON.stringify({ empId }),
    });
    if (res.success) {
      success('Punch Out Recorded', `Clock-out registered successfully for ${empId}.`);
      fetchData();
    } else {
      error('Clock-Out Error', res.error?.message);
    }
  };

  const openAdjustModal = (att: Attendance) => {
    setAdjustingRecord(att);
    setAdjustForm({
      in: att.in || '08:00 AM',
      out: att.out || '05:00 PM',
      status: att.status,
      reason: ''
    });
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingRecord) return;
    if (!adjustForm.reason) {
      error('Reason Required', 'Please document the justification for this administrative correction.');
      return;
    }

    const res = await apiRequest(`/attendance/adjust/${adjustingRecord.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        in: adjustForm.in,
        out: adjustForm.out,
        status: adjustForm.status,
        reason: adjustForm.reason
      }),
    });

    if (res.success) {
      success('Attendance Adjusted', 'Record updated and logged to the audit trail.');
      setAdjustingRecord(null);
      fetchData();
    } else {
      error('Adjustment Failed', res.error?.message);
    }
  };

  // Merge employees with today's records
  const displayItems = employees.map(emp => {
    const att = records.find(r => r.empId === emp.id);
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
        status: 'Absent' as Attendance['status'],
        createdAt: ''
      }
    };
  });

  const filtered = displayItems.filter(({ emp, att }) => {
    const matchSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.id.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || att.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      <Navbar title="Employee Attendance Monitoring" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Time & Attendance Roster</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track daily time punches, late arrival minutes, undertime, and administrative adjustments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={fetchData}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Toolbar Filter */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee name, ID or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Status Filter:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Time In</th>
                  <th className="py-3 px-4">Time Out</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Late (Mins)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Punch & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No attendance records found for this date.
                    </td>
                  </tr>
                ) : (
                  filtered.map(({ emp, att }) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{emp.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{emp.id}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {emp.department}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {att.in || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {att.out || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {att.workingHours ? `${att.workingHours} hrs` : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {att.lateMinutes > 0 ? (
                          <span className="text-amber-600 font-bold">{att.lateMinutes} min</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            att.status === 'Present'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : att.status === 'Late'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : att.status === 'On Leave'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {att.status}
                        </span>
                        {att.remarks && (
                          <div className="text-[10px] text-slate-400 italic max-w-xs truncate mt-0.5">
                            {att.remarks}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Time In / Out quick action */}
                          {!att.in && (
                            <button
                              onClick={() => handleClockIn(emp.id)}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              In
                            </button>
                          )}
                          {att.in && !att.out && (
                            <button
                              onClick={() => handleClockOut(emp.id)}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                              Out
                            </button>
                          )}
                          {/* Admin adjustment */}
                          {isAdmin && (
                            <button
                              onClick={() => openAdjustModal(att)}
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Manual Correction"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Admin Adjustment Modal */}
      {adjustingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1">Attendance Correction</h3>
            <p className="text-xs text-slate-500 mb-4">
              Employee: <strong>{adjustingRecord.empId}</strong> on {adjustingRecord.date}
            </p>

            <form onSubmit={handleSaveAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Time In</label>
                <input
                  type="text"
                  placeholder="08:00 AM"
                  value={adjustForm.in}
                  onChange={e => setAdjustForm({ ...adjustForm, in: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Time Out</label>
                <input
                  type="text"
                  placeholder="05:00 PM"
                  value={adjustForm.out}
                  onChange={e => setAdjustForm({ ...adjustForm, out: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={adjustForm.status}
                  onChange={e => setAdjustForm({ ...adjustForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adjustment Reason (Required) *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the audit justification e.g. biometric machine glitch, approved field duty..."
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingRecord(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
