'use client';

import React, { useEffect, useState } from 'react';
import {
  Banknote,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingDown
} from 'lucide-react';
import { apiRequest, formatPHP } from '../lib/api';
import { LoanRecord } from '../types';
import { useToast } from '../context/ToastContext';

interface LoanManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoanManagerModal({ isOpen, onClose }: LoanManagerModalProps) {
  const { success, error } = useToast();
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [empId, setEmpId] = useState('EMP-001');
  const [employeeName, setEmployeeName] = useState('Juan Dela Cruz');
  const [loanType, setLoanType] = useState<any>('SSS Salary Loan');
  const [principal, setPrincipal] = useState<number>(25000);
  const [termMonths, setTermMonths] = useState<number>(12);
  const [interestRate, setInterestRate] = useState<number>(0.10);
  const [notes, setNotes] = useState('');

  const fetchLoans = async () => {
    setLoading(true);
    const res = await apiRequest('/loans');
    if (res.success && res.data) {
      setLoans(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchLoans();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest('/loans', {
      method: 'POST',
      body: JSON.stringify({
        empId,
        employeeName,
        loanType,
        principal: Number(principal),
        termMonths: Number(termMonths),
        interestRate: Number(interestRate),
        startDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        notes
      })
    });

    if (res.success) {
      success('Loan Enrolled', `Amortization schedule activated for ${employeeName}.`);
      setIsAdding(false);
      fetchLoans();
    } else {
      error('Failed to Create Loan', res.error?.message || 'Error creating loan.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200 relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Loan & Cash Advance Amortization Manager</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Payroll Deduction Auto-Sync
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                Track SSS, Pag-IBIG, and Company advances with automated cutoff amortizations.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isAdding ? (
            <form onSubmit={handleCreateLoan} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 animate-in slide-in-from-top-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h4 className="font-bold text-sm text-slate-800">Enroll New Employee Loan Schedule</h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Employee</label>
                  <select
                    value={empId}
                    onChange={(e) => {
                      setEmpId(e.target.value);
                      if (e.target.value === 'EMP-001') setEmployeeName('Juan Dela Cruz');
                      if (e.target.value === 'EMP-002') setEmployeeName('Maria Santos');
                      if (e.target.value === 'EMP-004') setEmployeeName('Ana Reyes');
                      if (e.target.value === 'EMP-007') setEmployeeName('Eduardo Ramos');
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="EMP-001">EMP-001 - Juan Dela Cruz</option>
                    <option value="EMP-002">EMP-002 - Maria Santos</option>
                    <option value="EMP-004">EMP-004 - Ana Reyes</option>
                    <option value="EMP-007">EMP-007 - Eduardo Ramos</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loan Program</label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="SSS Salary Loan">SSS Salary Loan (10% Annual)</option>
                    <option value="Pag-IBIG Calamity Loan">Pag-IBIG Calamity Loan (5.95% Annual)</option>
                    <option value="Company Cash Advance">Company Cash Advance (0% Interest)</option>
                    <option value="Emergency Assistance">Emergency Medical Assistance</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Principal Amount (₱)</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={principal}
                    onChange={(e) => setPrincipal(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tenure (Months)</label>
                  <select
                    value={termMonths}
                    onChange={(e) => setTermMonths(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="3">3 Months (Short Term)</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months (1 Year)</option>
                    <option value="24">24 Months (2 Years)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs">Approval Notes</label>
                <input
                  type="text"
                  placeholder="e.g. SSS loan voucher #88392 confirmed"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  Save Amortization Schedule
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-bold text-sm text-slate-800">Active Employee Amortization Schedules</h4>
                <p className="text-xs text-slate-400">Deductions automatically scheduled in draft payroll periods.</p>
              </div>
              <button
                onClick={() => setIsAdding(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Enroll New Loan
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">Loading loan ledgers...</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-slate-900 text-sm">{loan.employeeName}</h5>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          {loan.loanType}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {loan.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Principal: <span className="font-mono font-semibold text-slate-800">{formatPHP(loan.principal)}</span> •{' '}
                        Tenure: <span className="font-semibold text-slate-800">{loan.termMonths} mos</span> • Notes:{' '}
                        <span className="text-slate-600">{loan.notes || 'Standard payroll deduction'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6 shrink-0">
                    <p className="text-[10px] font-semibold text-slate-400">Monthly Cutoff Deduction</p>
                    <p className="text-base font-extrabold text-emerald-600 font-mono">
                      {formatPHP(loan.monthlyAmortization)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Remaining: <span className="font-mono font-bold text-slate-700">{formatPHP(loan.remainingBalance)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
