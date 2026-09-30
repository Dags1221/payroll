'use client';

import React, { useState, useEffect } from 'react';
import {
  Timer,
  Plus,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest, formatPHP, formatDate } from '../../lib/api';
import { OvertimeRecord, Employee } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function OvertimePage() {
  const { user, isAdmin, isSupervisor } = useAuth();
  const { success, error } = useToast();
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Submit Modal
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [formData, setFormData] = useState({
    empId: '',
    date: new Date().toISOString().slice(0, 10),
    hours: 2,
    multiplier: 1.25,
    reason: ''
  });

  // Review Modal
  const [reviewingOt, setReviewingOt] = useState<OvertimeRecord | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [otRes, empRes] = await Promise.all([
      apiRequest<OvertimeRecord[]>('/overtime'),
      apiRequest<Employee[]>('/employees')
    ]);

    if (otRes.success && otRes.data) setRecords(otRes.data);
    if (empRes.success && empRes.data) {
      setEmployees(empRes.data);
      const defaultId = user?.employeeId || empRes.data[0]?.id;
      if (defaultId) {
        setFormData(prev => ({ ...prev, empId: prev.empId || defaultId }));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitOt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      error('Reason Required', 'Please detail the overtime tasks performed.');
      return;
    }

    const res = await apiRequest('/overtime', {
      method: 'POST',
      body: JSON.stringify({
        ...formData,
        empId: user?.employeeId || formData.empId || 'EMP-001'
      }),
    });

    if (res.success) {
      success('Overtime Filed', 'Overtime record submitted for supervisory review.');
      setIsSubmitOpen(false);
      setFormData({ ...formData, reason: '' });
      fetchData();
    } else {
      error('Filing Failed', res.error?.message);
    }
  };

  const handleReview = async (status: 'Approved' | 'Rejected') => {
    if (!reviewingOt) return;

    const res = await apiRequest(`/overtime/review/${reviewingOt.id}`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        remarks: reviewRemarks || `Decided by ${user?.name || 'Supervisor'}`
      }),
    });

    if (res.success) {
      success(`Overtime ${status}`, `Overtime record ${reviewingOt.id} marked as ${status}.`);
      setReviewingOt(null);
      setReviewRemarks('');
      fetchData();
    } else {
      error('Action Failed', res.error?.message);
    }
  };

  const getEmp = (id: string) => employees.find(e => e.id === id);

  const filtered = records.filter(o => {
    const emp = getEmp(o.empId);
    const matchSearch =
      (emp?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.empId.toLowerCase().includes(search.toLowerCase()) ||
      (o.reason || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate live preview rate for modal
  const selectedEmp = getEmp(formData.empId);
  const computedHourlyRate = selectedEmp ? Math.round(((selectedEmp.salary || 0) / 160) * formData.multiplier * 100) / 100 : 0;
  const computedEstimatedAmount = Math.round(computedHourlyRate * formData.hours * 100) / 100;

  return (
    <>
      <Navbar title="Overtime Compensation Management" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Overtime & Premium Pay</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve overtime hours. Only authorized overtime is incorporated into payroll disbursement.
            </p>
          </div>

          <button
            onClick={() => setIsSubmitOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>File Overtime</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search overtime records, employee, reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overtime Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">OT ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Hours Worked</th>
                  <th className="py-3 px-4">Computed Rate</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Reason & Justification</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading overtime records...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No overtime records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(ot => {
                    const emp = getEmp(ot.empId);
                    return (
                      <tr key={ot.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {ot.id}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {formatDate(ot.date)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{emp?.name || ot.empId}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{ot.empId}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {ot.hours} hrs
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {formatPHP(ot.rate)}/hr ({ot.multiplier}x)
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          {formatPHP(ot.amount)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs">
                          <div className="truncate">"{ot.reason || 'Overtime duties'}"</div>
                          {ot.remarks && (
                            <div className="text-[10px] text-slate-400 italic mt-0.5 truncate">
                              Approver Note: {ot.remarks} ({ot.approverName || 'Admin'})
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ot.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : ot.status === 'Rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {ot.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(isAdmin || isSupervisor) && ot.status === 'Pending' ? (
                            <button
                              onClick={() => {
                                setReviewingOt(ot);
                                setReviewRemarks('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors"
                            >
                              Review
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
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

      {/* File Overtime Modal */}
      {isSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1">File Overtime Record</h3>
            <p className="text-xs text-slate-500 mb-4">Overtime rate is dynamically computed from basic monthly salary.</p>

            <form onSubmit={handleSubmitOt} className="space-y-3.5 text-xs">
              {isAdmin && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employee *</label>
                  <select
                    value={formData.empId}
                    onChange={e => setFormData({ ...formData, empId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hours Worked *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="16"
                    required
                    value={formData.hours}
                    onChange={e => setFormData({ ...formData, hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Overtime Premium Multiplier</label>
                <select
                  value={formData.multiplier}
                  onChange={e => setFormData({ ...formData, multiplier: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value={1.25}>1.25x - Regular Workday Overtime</option>
                  <option value={1.30}>1.30x - Rest Day / Special Holiday OT</option>
                  <option value={2.00}>2.00x - Regular Holiday Overtime</option>
                </select>
              </div>

              {/* Dynamic Calculation Live Display */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] text-indigo-900">
                  <span>Computed Hourly Rate ({formData.multiplier}x):</span>
                  <strong>{formatPHP(computedHourlyRate)} / hr</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-indigo-950 font-bold pt-1 border-t border-indigo-200/60">
                  <span>Total Estimated Compensation:</span>
                  <span className="text-sm font-extrabold text-indigo-700">{formatPHP(computedEstimatedAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Details & Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe tasks completed during overtime hours..."
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
                >
                  Submit Overtime
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingOt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1">Review Overtime Compensation</h3>
            <div className="p-3 bg-slate-50 rounded-xl my-3 text-xs space-y-1">
              <div>OT ID: <strong className="font-mono text-indigo-700">{reviewingOt.id}</strong></div>
              <div>Employee: <strong>{getEmp(reviewingOt.empId)?.name || reviewingOt.empId}</strong></div>
              <div>Date: <strong>{reviewingOt.date}</strong></div>
              <div>Hours: <strong>{reviewingOt.hours} hrs</strong> ({formatPHP(reviewingOt.rate)}/hr)</div>
              <div>Amount to be Disbursed: <strong className="text-emerald-700 font-bold">{formatPHP(reviewingOt.amount)}</strong></div>
              <div>Reason: <em>"{reviewingOt.reason}"</em></div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supervisor Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Optional review remarks..."
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewingOt(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleReview('Rejected')}
                  className="px-4 py-2 font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleReview('Approved')}
                  className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all"
                >
                  Approve OT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
