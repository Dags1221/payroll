'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Play,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Eye,
  Download,
  Receipt,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { ConfirmModal } from '../../components/ConfirmModal';
import { apiRequest, formatPHP, formatDate } from '../../lib/api';
import { PayrollPeriod, PayrollItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

export default function PayrollPage() {
  const { user, isAdmin } = useAuth();
  const { success, error, info } = useToast();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  // Safeguard & Finalize Modal
  const [isFinalizeSafeguardOpen, setIsFinalizeSafeguardOpen] = useState(false);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');

  // Create Period Modal
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    name: 'October 2026 - Semi-Monthly (1st Half)',
    type: 'Semi-Monthly' as PayrollPeriod['type'],
    startDate: '2026-10-01',
    endDate: '2026-10-15',
    cutoffDate: '2026-10-15',
    paymentDate: '2026-10-20'
  });

  const fetchPeriods = async () => {
    setLoading(true);
    const res = await apiRequest<PayrollPeriod[]>('/payroll/periods');
    if (res.success && res.data) {
      setPeriods(res.data);
      if (res.data.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(res.data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchItems = async (periodId: string) => {
    if (!periodId) return;
    const res = await apiRequest<PayrollItem[]>(`/payroll/items/${periodId}`);
    if (res.success && res.data) {
      setItems(res.data);
    }
  };

  useEffect(() => {
    if (selectedPeriodId) {
      fetchItems(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

  const handleComputePayroll = async () => {
    if (!selectedPeriodId) return;
    setComputing(true);
    const res = await apiRequest(`/payroll/compute/${selectedPeriodId}`, { method: 'POST' });
    setComputing(false);

    if (res.success && res.data) {
      success('Payroll Computed', `Processed ${res.data.items?.length} employees with automated TRAIN tax & statutory deductions.`);
      fetchPeriods();
      fetchItems(selectedPeriodId);
    } else {
      error('Computation Error', res.error?.message);
    }
  };

  const handleFinalizeWithSafeguard = async () => {
    if (!selectedPeriodId) return;
    const res = await apiRequest(`/payroll/finalize/${selectedPeriodId}`, { method: 'POST' });
    setIsFinalizeSafeguardOpen(false);

    if (res.success) {
      success('Payroll Finalized & Locked', `Disbursement locked. Net total: ${formatPHP(selectedPeriod?.totalNet)}. Payslips are now available.`);
      fetchPeriods();
    } else {
      error('Finalization Error', res.error?.message);
    }
  };

  const handleUnlockPeriod = async () => {
    if (!selectedPeriodId) return;
    if (!unlockReason.trim()) {
      error('Reason Required', 'Please enter justification for unlocking finalized payroll.');
      return;
    }

    const res = await apiRequest(`/payroll/unlock/${selectedPeriodId}`, {
      method: 'POST',
      body: JSON.stringify({ reason: unlockReason.trim() }),
    });
    setIsUnlockOpen(false);
    setUnlockReason('');

    if (res.success) {
      info('Payroll Unlocked', 'Period reverted to review status for controlled adjustments.');
      fetchPeriods();
    } else {
      error('Unlock Failed', res.error?.message);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest('/payroll/periods', {
      method: 'POST',
      body: JSON.stringify(periodForm),
    });

    if (res.success && res.data) {
      success('Payroll Period Created', `Period ${res.data.name} is ready for processing.`);
      setIsCreatePeriodOpen(false);
      fetchPeriods();
      setSelectedPeriodId(res.data.id);
    } else {
      error('Creation Failed', res.error?.message);
    }
  };

  // Reconciled Totals from current items
  const computedGross = items.reduce((s, i) => s + i.grossPay, 0);
  const computedDeductions = items.reduce((s, i) => s + i.totalDeductions, 0);
  const computedNet = items.reduce((s, i) => s + i.netPay, 0);
  const computedOt = items.reduce((s, i) => s + i.overtimePay, 0);
  const computedBenefits = items.reduce((s, i) => s + i.benefitsPay, 0);

  return (
    <>
      <Navbar title="Payroll Processing & Disbursements" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payroll Processing Engine</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Precision safe decimal calculations with statutory deductions, overtime integration, and audit locks.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <button
                onClick={() => setIsCreatePeriodOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Period</span>
              </button>
            )}

            {isAdmin && selectedPeriod && selectedPeriod.status !== 'Finalized' && selectedPeriod.status !== 'Locked' && (
              <button
                disabled={computing}
                onClick={handleComputePayroll}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{computing ? 'Calculating Engine...' : 'Run Computation'}</span>
              </button>
            )}

            {isAdmin && selectedPeriod && (selectedPeriod.status === 'For Review' || selectedPeriod.status === 'Approved') && items.length > 0 && (
              <button
                onClick={() => setIsFinalizeSafeguardOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Finalize</span>
              </button>
            )}

            {isAdmin && selectedPeriod && (selectedPeriod.status === 'Finalized' || selectedPeriod.status === 'Locked') && (
              <button
                onClick={() => setIsUnlockOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock for Adjustment</span>
              </button>
            )}
          </div>
        </div>

        {/* Period Selector & Status Banner */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payroll Period:</span>
            <select
              value={selectedPeriodId}
              onChange={e => setSelectedPeriodId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.status}]
                </option>
              ))}
            </select>
          </div>

          {selectedPeriod && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500">
                Cutoff: <strong>{formatDate(selectedPeriod.cutoffDate)}</strong> • Payout: <strong>{formatDate(selectedPeriod.paymentDate)}</strong>
              </span>
              <span
                className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                  selectedPeriod.status === 'Finalized' || selectedPeriod.status === 'Locked'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border border-amber-300'
                }`}
              >
                {selectedPeriod.status}
              </span>
            </div>
          )}
        </div>

        {/* Period Financial Reconciliation Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Gross Payroll</span>
            <div className="text-lg font-extrabold text-slate-900 mt-1">{formatPHP(computedGross)}</div>
            <span className="text-[10px] text-slate-400">Total earnings before deductions</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Overtime Disbursed</span>
            <div className="text-lg font-extrabold text-indigo-700 mt-1">{formatPHP(computedOt)}</div>
            <span className="text-[10px] text-slate-400">Approved overtime pay</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Benefits & Allowances</span>
            <div className="text-lg font-extrabold text-blue-700 mt-1">{formatPHP(computedBenefits)}</div>
            <span className="text-[10px] text-slate-400">Company allowances</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Deductions</span>
            <div className="text-lg font-extrabold text-rose-700 mt-1">{formatPHP(computedDeductions)}</div>
            <span className="text-[10px] text-slate-400">Tax, SSS, PhilHealth, Pag-IBIG</span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-50 to-emerald-100/50 border border-emerald-200 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase">Reconciled Net Payroll</span>
            <div className="text-xl font-extrabold text-emerald-900 mt-1">{formatPHP(computedNet)}</div>
            <span className="text-[10px] text-emerald-700 font-medium">To be disbursed ({items.length} staff)</span>
          </div>
        </div>

        {/* Detailed Employee Payroll Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Employee Payroll Register</h3>
            <Link
              href="/payslips"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Go to Payslip PDF Generator →</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3">Personnel</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Base Pay</th>
                  <th className="py-3 px-3">OT Pay</th>
                  <th className="py-3 px-3">Allowances</th>
                  <th className="py-3 px-3">Gross Pay</th>
                  <th className="py-3 px-3">Tax Withheld</th>
                  <th className="py-3 px-3">Statutory (SSS/PH/PI)</th>
                  <th className="py-3 px-3">Late/Absence</th>
                  <th className="py-3 px-3 font-bold text-slate-900">Net Pay</th>
                  <th className="py-3 px-3 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No payroll items computed yet for this period. Click "Run Computation" above.
                    </td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 leading-tight">{item.employeeName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.empId}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.department}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {formatPHP(item.periodBasicPay)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-indigo-700">
                        {item.overtimePay > 0 ? formatPHP(item.overtimePay) : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-blue-700">
                        {item.benefitsPay > 0 ? formatPHP(item.benefitsPay) : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {formatPHP(item.grossPay)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-rose-600">
                        {item.taxWithheld > 0 ? formatPHP(item.taxWithheld) : '₱0.00'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {formatPHP(item.sssDeduction + item.philHealthDeduction + item.pagIbigDeduction)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-600">
                        {item.lateDeduction + item.absenceDeduction > 0
                          ? formatPHP(item.lateDeduction + item.absenceDeduction)
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-extrabold text-emerald-700 text-sm">
                        {formatPHP(item.netPay)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/payslips?periodId=${item.payrollPeriodId}&empId=${item.empId}`}
                          className="px-2 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-[11px] font-semibold transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Finalize Safeguard Confirmation Modal */}
      {isFinalizeSafeguardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Pre-Finalization Financial Safeguard</h3>
                <p className="text-xs text-slate-500">Please review and reconcile the ledger totals before locking.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl my-4 text-xs space-y-2 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pay Period:</span>
                <strong className="text-slate-900">{selectedPeriod?.name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Headcount:</span>
                <strong className="text-slate-900">{items.length} Active Employees</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Gross Payroll:</span>
                <strong className="text-slate-900">{formatPHP(computedGross)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Overtime Disbursed:</span>
                <strong className="text-indigo-700">{formatPHP(computedOt)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Allowances & Benefits:</span>
                <strong className="text-blue-700">{formatPHP(computedBenefits)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Mandatory Deductions:</span>
                <strong className="text-rose-700">{formatPHP(computedDeductions)}</strong>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-800">Final Net Disbursement:</span>
                <strong className="font-extrabold text-emerald-700">{formatPHP(computedNet)}</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Audit Notice:</strong> Finalizing this period will lock the records against accidental modifications, release digital payslips to employee self-service portals, and append a permanent entry to the compliance audit log.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsFinalizeSafeguardOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeWithSafeguard}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all"
              >
                Confirm & Lock Payroll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock / Reversal Controlled Workflow Modal */}
      {isUnlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1">Controlled Payroll Reversal</h3>
            <p className="text-xs text-slate-500 mb-4">
              Unlocking this period will allow adjustments and recalculations. An audit justification is mandatory.
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Reopening Period *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Retroactive overtime approved by executive board..."
                  value={unlockReason}
                  onChange={e => setUnlockReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsUnlockOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnlockPeriod}
                  className="px-5 py-2 font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-all"
                >
                  Confirm Reversal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Period Modal */}
      {isCreatePeriodOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1">Schedule New Payroll Period</h3>
            <p className="text-xs text-slate-500 mb-4">Configure cut-off dates and disbursement cycle.</p>

            <form onSubmit={handleCreatePeriod} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Period Name *</label>
                <input
                  type="text"
                  required
                  value={periodForm.name}
                  onChange={e => setPeriodForm({ ...periodForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cycle Type</label>
                <select
                  value={periodForm.type}
                  onChange={e => setPeriodForm({ ...periodForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="Semi-Monthly">Semi-Monthly (15-Day)</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.startDate}
                    onChange={e => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.endDate}
                    onChange={e => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cut-Off Date *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.cutoffDate}
                    onChange={e => setPeriodForm({ ...periodForm, cutoffDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.paymentDate}
                    onChange={e => setPeriodForm({ ...periodForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatePeriodOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
                >
                  Create Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
