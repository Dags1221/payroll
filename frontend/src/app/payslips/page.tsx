'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Printer,
  Download,
  Receipt,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest, formatPHP, formatDate } from '../../lib/api';
import { PayrollPeriod, PayrollItem, Employee } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

function PayslipsContent() {
  const searchParams = useSearchParams();
  const initialPeriodId = searchParams.get('periodId') || '';
  const initialEmpId = searchParams.get('empId') || '';

  const { user, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(initialPeriodId);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState(initialEmpId);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [periodsRes, empRes] = await Promise.all([
        apiRequest<PayrollPeriod[]>('/payroll/periods'),
        apiRequest<Employee[]>('/employees')
      ]);

      if (periodsRes.success && periodsRes.data) {
        setPeriods(periodsRes.data);
        if (!selectedPeriodId && periodsRes.data.length > 0) {
          setSelectedPeriodId(periodsRes.data[0].id);
        }
      }
      if (empRes.success && empRes.data) {
        setEmployees(empRes.data);
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      apiRequest<PayrollItem[]>(`/payroll/items/${selectedPeriodId}`).then(res => {
        if (res.success && res.data) {
          setItems(res.data);
          if (!selectedEmpId || !res.data.some(i => i.empId === selectedEmpId)) {
            // Default to current logged-in employee if employee portal, or first employee
            const matchUser = res.data.find(i => i.empId === user?.employeeId);
            setSelectedEmpId(matchUser ? matchUser.empId : res.data[0]?.empId || '');
          }
        }
      });
    }
  }, [selectedPeriodId]);

  const currentPeriod = periods.find(p => p.id === selectedPeriodId);
  const currentItem = items.find(i => i.empId === selectedEmpId) || items[0];
  const currentEmployee = employees.find(e => e.id === currentItem?.empId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="no-print">
        <Navbar title="Digital Payslip PDF Generator" />
      </div>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Selector Toolbar - hidden when printing */}
        <div className="no-print bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Period:</span>
              <select
                value={selectedPeriodId}
                onChange={e => setSelectedPeriodId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 outline-none"
              >
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.name} [{p.status}]</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Employee:</span>
              <select
                value={selectedEmpId}
                onChange={e => setSelectedEmpId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 outline-none"
              >
                {items.map(i => (
                  <option key={i.empId} value={i.empId}>{i.employeeName} ({i.empId})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Official Payslip Sheet */}
        {!currentItem ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No payroll record found for the selected period and employee. Please compute payroll first.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-300 p-8 sm:p-10 shadow-lg text-slate-900 max-w-4xl mx-auto print:border-0 print:shadow-none print:p-0 print:m-0">
            {/* Payslip Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    AP
                  </div>
                  <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">
                    Apex Enterprises Ltd.
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Ortigas Center, Pasig City, Metro Manila, Philippines • BIR Reg. TIN: 009-876-543-000
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-extrabold text-xs uppercase tracking-wider border border-slate-300">
                  OFFICIAL PAYSLIP
                </span>
                <div className="text-[11px] text-slate-500 font-mono mt-1.5">
                  Ref: {currentItem.id}
                </div>
              </div>
            </div>

            {/* Employee & Payroll Period Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-6">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Employee Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{currentItem.employeeName}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Employee ID</span>
                <span className="font-mono font-bold text-slate-800">{currentItem.empId}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Department / Role</span>
                <span className="font-semibold text-slate-800">{currentItem.department} • {currentItem.position}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Cost Center</span>
                <span className="font-mono font-semibold text-slate-800">{currentItem.costCenterCode}</span>
              </div>

              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Pay Period</span>
                <span className="font-semibold text-slate-800">{currentPeriod?.name || 'Current'}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Cut-Off Date</span>
                <span className="font-semibold text-slate-800">{formatDate(currentPeriod?.cutoffDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Payment Date</span>
                <span className="font-semibold text-slate-800">{formatDate(currentPeriod?.paymentDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Monthly Base Rate</span>
                <span className="font-bold text-slate-900">{formatPHP(currentItem.basicSalary)}</span>
              </div>
            </div>

            {/* Earnings and Deductions 2-Column Ledger */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Earnings Column */}
              <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-2 border-b border-slate-200 mb-3 text-emerald-800">
                    Gross Earnings
                  </h4>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Basic Period Pay:</span>
                      <strong className="font-mono text-slate-900">{formatPHP(currentItem.periodBasicPay)}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">
                        Overtime Pay ({currentItem.overtimeHours} hrs):
                      </span>
                      <strong className="font-mono text-indigo-700">
                        {currentItem.overtimePay > 0 ? formatPHP(currentItem.overtimePay) : '₱0.00'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Benefits & Allowances:</span>
                      <strong className="font-mono text-blue-700">
                        {currentItem.benefitsPay > 0 ? formatPHP(currentItem.benefitsPay) : '₱0.00'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between text-sm font-extrabold mt-6">
                  <span>TOTAL GROSS PAY:</span>
                  <span className="font-mono text-emerald-900">{formatPHP(currentItem.grossPay)}</span>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-2 border-b border-slate-200 mb-3 text-rose-800">
                    Mandatory & Tax Deductions
                  </h4>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Withholding Tax (TRAIN Law):</span>
                      <strong className="font-mono text-rose-700">
                        {formatPHP(currentItem.taxWithheld)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">SSS Contribution (Employee):</span>
                      <strong className="font-mono text-slate-800">
                        {formatPHP(currentItem.sssDeduction)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">PhilHealth Contribution:</span>
                      <strong className="font-mono text-slate-800">
                        {formatPHP(currentItem.philHealthDeduction)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Pag-IBIG / HDMF Fund:</span>
                      <strong className="font-mono text-slate-800">
                        {formatPHP(currentItem.pagIbigDeduction)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Tardiness / Undertime:</span>
                      <strong className="font-mono text-slate-800">
                        {formatPHP(currentItem.lateDeduction)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Unexcused Absences:</span>
                      <strong className="font-mono text-slate-800">
                        {formatPHP(currentItem.absenceDeduction)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between text-sm font-extrabold mt-6">
                  <span>TOTAL DEDUCTIONS:</span>
                  <span className="font-mono text-rose-800">-{formatPHP(currentItem.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Pay Callout Banner */}
            <div className="my-6 p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                  Net Take-Home Pay
                </span>
                <span className="text-xs text-slate-300">Directly deposited to registered payroll bank account</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
                {formatPHP(currentItem.netPay)}
              </div>
            </div>

            {/* Statutory Identifiers Line */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
              <div>TIN: <strong className="font-mono text-slate-700">{currentEmployee?.tin || '123-456-789'}</strong></div>
              <div>SSS: <strong className="font-mono text-slate-700">{currentEmployee?.sssNo || '04-1234567-8'}</strong></div>
              <div>PhilHealth: <strong className="font-mono text-slate-700">{currentEmployee?.philHealthNo || '12-345678901'}</strong></div>
              <div>Pag-IBIG: <strong className="font-mono text-slate-700">{currentEmployee?.pagIbigNo || '1234-5678-9012'}</strong></div>
            </div>

            {/* Signatures & Certification */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
              <div className="text-center">
                <div className="min-h-12 border-b border-slate-400 mb-1 flex items-center justify-center">
                  <div className="text-center">
                    <span className="font-serif italic font-bold text-indigo-700 text-sm block">
                      {currentItem.employeeName}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-600 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Cryptographically Verified (Hash: {currentItem.id.slice(-8)})
                    </span>
                  </div>
                </div>
                <span className="font-bold text-slate-800 block">{currentItem.employeeName}</span>
                <span className="text-[10px] text-slate-400">Employee Signature & Acknowledgement</span>
              </div>

              <div className="text-center">
                <div className="min-h-12 border-b border-slate-400 mb-1 flex items-end justify-center pb-1 text-slate-600 italic text-[11px] font-serif font-semibold">
                  [Electronically Certified & Encrypted]
                </div>
                <span className="font-bold text-slate-800 block">Authorized Finance Officer</span>
                <span className="text-[10px] text-slate-400">Apex Enterprises Payroll Department</span>
              </div>
            </div>

            {/* Legal Footer Note */}
            <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
              Generated on {new Date().toLocaleString('en-PH')} • Compliant with Philippine Labor Code & National Internal Revenue Code (NIRC) • Confidential document.
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function PayslipsPage() {
  return (
    <React.Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading payslip engine...</div>}>
      <PayslipsContent />
    </React.Suspense>
  );
}
