'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  Check,
  X,
  Clock,
  Sparkles
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest, formatDate } from '../../lib/api';
import { LeaveRequest, Employee } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function LeavePage() {
  const { user, isAdmin, isSupervisor } = useAuth();
  const { success, error } = useToast();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Submit Modal
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [formData, setFormData] = useState({
    empId: '',
    type: 'Vacation Leave' as LeaveRequest['type'],
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
    reason: ''
  });

  // Review Modal
  const [reviewingLeave, setReviewingLeave] = useState<LeaveRequest | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');

  const fetchLeaves = async () => {
    setLoading(true);
    const [leaveRes, empRes] = await Promise.all([
      apiRequest<LeaveRequest[]>('/leaves'),
      apiRequest<Employee[]>('/employees')
    ]);

    if (leaveRes.success && leaveRes.data) setLeaves(leaveRes.data);
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
    fetchLeaves();
  }, []);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      error('Reason Required', 'Please enter a clear explanation for the leave request.');
      return;
    }

    const res = await apiRequest('/leaves', {
      method: 'POST',
      body: JSON.stringify({
        ...formData,
        empId: user?.employeeId || formData.empId || 'EMP-001'
      }),
    });

    if (res.success) {
      success('Leave Filed', 'Your leave request has been submitted for supervisor review.');
      setIsSubmitOpen(false);
      setFormData({
        ...formData,
        reason: ''
      });
      fetchLeaves();
    } else {
      error('Submission Failed', res.error?.message);
    }
  };

  const handleReview = async (status: 'Approved' | 'Rejected') => {
    if (!reviewingLeave) return;

    const res = await apiRequest(`/leaves/review/${reviewingLeave.id}`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        remarks: reviewRemarks || `Decided by ${user?.name || 'Supervisor'}`
      }),
    });

    if (res.success) {
      success(`Leave ${status}`, `Request ${reviewingLeave.id} updated to ${status}.`);
      setReviewingLeave(null);
      setReviewRemarks('');
      fetchLeaves();
    } else {
      error('Action Failed', res.error?.message);
    }
  };

  const getEmp = (id: string) => employees.find(e => e.id === id);

  const filtered = leaves.filter(l => {
    const emp = getEmp(l.empId);
    const matchSearch =
      (emp?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      l.id.toLowerCase().includes(search.toLowerCase()) ||
      l.empId.toLowerCase().includes(search.toLowerCase()) ||
      l.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      <Navbar title="Leave Requisition & Approval" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Requisition Workflow</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit, track, and approve vacation, sick, and statutory leave applications.
            </p>
          </div>

          <button
            onClick={() => setIsSubmitOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Apply For Leave</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search request ID, personnel, leave type..."
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

        {/* Leaves Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Inclusive Dates</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Reason & Remarks</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading leave requisitions...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(l => {
                    const emp = getEmp(l.empId);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {l.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{emp?.name || l.empId}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{l.empId}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {l.type}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {formatDate(l.start)} to {formatDate(l.end)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {l.days} d
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs">
                          <div className="truncate">"{l.reason}"</div>
                          {l.remarks && (
                            <div className="text-[10px] text-slate-400 italic mt-0.5 truncate">
                              Remarks: {l.remarks}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : l.status === 'Rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(isAdmin || isSupervisor) && l.status === 'Pending' ? (
                            <button
                              onClick={() => {
                                setReviewingLeave(l);
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

      {/* New Leave Requisition Modal */}
      {isSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1">File Leave Requisition</h3>
            <p className="text-xs text-slate-500 mb-4">Complete your dates and justification for approval.</p>

            <form onSubmit={handleSubmitLeave} className="space-y-3.5 text-xs">
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type *</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="Vacation Leave">Vacation Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Paternity Leave">Paternity Leave</option>
                  <option value="Bereavement Leave">Bereavement Leave</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.start}
                    onChange={e => setFormData({ ...formData, start: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.end}
                    onChange={e => setFormData({ ...formData, end: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Justification *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail the reason for requested leave..."
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
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1">Review Leave Application</h3>
            <div className="p-3 bg-slate-50 rounded-xl my-3 text-xs space-y-1">
              <div>Request ID: <strong className="font-mono text-indigo-700">{reviewingLeave.id}</strong></div>
              <div>Employee: <strong>{getEmp(reviewingLeave.empId)?.name || reviewingLeave.empId}</strong></div>
              <div>Leave Type: <strong>{reviewingLeave.type}</strong></div>
              <div>Inclusive: <strong>{reviewingLeave.start}</strong> to <strong>{reviewingLeave.end}</strong> ({reviewingLeave.days} day(s))</div>
              <div>Reason: <em>"{reviewingLeave.reason}"</em></div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supervisor Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Optional review remarks or conditions..."
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewingLeave(null)}
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
                  Approve Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
