'use client';

import React, { useState, useEffect } from 'react';
import {
  UserX,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Search,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest, formatDate } from '../../lib/api';
import { AbsenteeismRecord } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function AbsenteeismPage() {
  const { isAdmin } = useAuth();
  const { success, error, info } = useToast();
  const [records, setRecords] = useState<AbsenteeismRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState('');

  // Review modal
  const [reviewingRecord, setReviewingRecord] = useState<AbsenteeismRecord | null>(null);
  const [reviewAction, setReviewAction] = useState<'Excused' | 'Unexcused Absence'>('Unexcused Absence');
  const [remarks, setRemarks] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    const res = await apiRequest<AbsenteeismRecord[]>('/absenteeism');
    if (res.success && res.data) {
      setRecords(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleRunDetection = async () => {
    setRunning(true);
    const res = await apiRequest('/absenteeism/detect', { method: 'POST' });
    setRunning(false);

    if (res.success && res.data) {
      const flagged = res.data.newAbsencesFlagged?.length || 0;
      if (flagged > 0) {
        info('Detection Completed', `Identified ${flagged} new potential unrecorded absence(s).`);
      } else {
        success('Workforce Verified', 'No new unrecorded absences detected for today.');
      }
      fetchRecords();
    } else {
      error('Detection Engine Error', res.error?.message);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingRecord) return;
    if (!remarks.trim()) {
      error('Remarks Required', 'Please provide review remarks for compliance and audit logs.');
      return;
    }

    const res = await apiRequest(`/absenteeism/review/${reviewingRecord.id}`, {
      method: 'POST',
      body: JSON.stringify({
        status: reviewAction,
        remarks: remarks.trim()
      }),
    });

    if (res.success) {
      success('Review Finalized', `Absence record for ${reviewingRecord.employeeName} marked as ${reviewAction}.`);
      setReviewingRecord(null);
      setRemarks('');
      fetchRecords();
    } else {
      error('Review Failed', res.error?.message);
    }
  };

  const filtered = records.filter(r =>
    r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    r.empId.toLowerCase().includes(search.toLowerCase()) ||
    r.department.toLowerCase().includes(search.toLowerCase()) ||
    r.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Navbar title="Absenteeism Detection System" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Banner with Explanation */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-rose-900/50">
          <div>
            <div className="flex items-center gap-2 mb-1 text-rose-400 font-semibold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Automated Attendance Reconciliation Engine</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Absenteeism Detection Scripts</h1>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Scans scheduled workdays for employees who lack clock-in timestamps and do not have an approved leave request on file. Flags potential absences for administrative review before payroll processing.
            </p>
          </div>

          {isAdmin && (
            <button
              disabled={running}
              onClick={handleRunDetection}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-xs font-bold text-white shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all flex-shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{running ? 'Running Detection Script...' : 'Run Detection Engine'}</span>
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search flagged personnel, department, status..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-rose-500"
            />
          </div>

          <div className="text-xs text-slate-500">
            Total Records in Review: <strong>{filtered.length}</strong>
          </div>
        </div>

        {/* Absenteeism Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Detection Reason</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading absenteeism review queue...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No absenteeism flags found. Clean workforce records!
                    </td>
                  </tr>
                ) : (
                  filtered.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {record.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{record.employeeName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{record.empId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {record.department}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-sm">
                        <span className="line-clamp-2">{record.reason}</span>
                        {record.remarks && (
                          <div className="text-[10px] text-slate-400 italic mt-0.5">
                            Remarks: {record.remarks} ({record.reviewedBy || 'Admin'})
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium border border-slate-200">
                          {record.detectionSource}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            record.status === 'Excused'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : record.status === 'Unexcused Absence'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin && record.status === 'Pending Review' ? (
                          <button
                            onClick={() => {
                              setReviewingRecord(record);
                              setRemarks('');
                            }}
                            className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] transition-colors"
                          >
                            Review & Decide
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Review & Resolution Modal */}
      {reviewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1">Review Flagged Absence</h3>
            <p className="text-xs text-slate-500 mb-4">
              Employee: <strong>{reviewingRecord.employeeName} ({reviewingRecord.empId})</strong> on {reviewingRecord.date}
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Decision / Status *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('Excused')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      reviewAction === 'Excused'
                        ? 'bg-blue-50 border-blue-400 text-blue-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Excused (Valid Reason)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('Unexcused Absence')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      reviewAction === 'Unexcused Absence'
                        ? 'bg-rose-50 border-rose-400 text-rose-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Unexcused (Deduct Pay)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supervisor Remarks & Justification *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State investigation findings e.g. retroactive medical certificate verified, or unnotified absence..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewingRecord(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all"
                >
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
