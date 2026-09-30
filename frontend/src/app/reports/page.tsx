'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Printer,
  Download,
  Filter,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  Clock,
  UserX,
  PieChart,
  Sparkles
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest, formatPHP, formatDate } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export default function ReportsPage() {
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState<'attendance' | 'payroll' | 'absenteeism' | 'costCenters'>('attendance');
  const [loading, setLoading] = useState(true);

  // Data stores
  const [attendanceReport, setAttendanceReport] = useState<any>(null);
  const [payrollReport, setPayrollReport] = useState<any>(null);
  const [absenteeismList, setAbsenteeismList] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const [attRes, payRes, absRes, ccRes] = await Promise.all([
        apiRequest('/reports/attendance'),
        apiRequest('/reports/payroll-summary'),
        apiRequest('/absenteeism'),
        apiRequest('/cost-centers/summary')
      ]);

      if (attRes.success && attRes.data) setAttendanceReport(attRes.data);
      if (payRes.success && payRes.data) setPayrollReport(payRes.data);
      if (absRes.success && absRes.data) setAbsenteeismList(absRes.data);
      if (ccRes.success && ccRes.data) setCostCenters(ccRes.data.costCenters || []);
      setLoading(false);
    };
    fetchReports();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[] = [];
    let filename = `report_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === 'attendance') {
      headers = ['Date,EmpID,Name,Department,InTime,OutTime,Hours,LateMins,Status'];
      rows = (attendanceReport?.records || []).map((r: any) =>
        `"${r.date}","${r.empId}","${r.employeeName}","${r.department}","${r.in || ''}","${r.out || ''}",${r.workingHours},${r.lateMinutes},"${r.status}"`
      );
    } else if (activeTab === 'payroll') {
      headers = ['Period,EmpID,Name,Dept,BasePay,OTPay,Allowances,Gross,TaxWithheld,Statutory,Deductions,NetPay'];
      rows = (payrollReport?.items || []).map((i: any) =>
        `"${payrollReport?.period?.name}","${i.empId}","${i.employeeName}","${i.department}",${i.periodBasicPay},${i.overtimePay},${i.benefitsPay},${i.grossPay},${i.taxWithheld},${i.sssDeduction + i.philHealthDeduction + i.pagIbigDeduction},${i.totalDeductions},${i.netPay}`
      );
    } else if (activeTab === 'absenteeism') {
      headers = ['Date,EmpID,Name,Department,Source,Reason,Status,ReviewedBy'];
      rows = absenteeismList.map(a =>
        `"${a.date}","${a.empId}","${a.employeeName}","${a.department}","${a.detectionSource}","${a.reason}","${a.status}","${a.reviewedBy || ''}"`
      );
    } else {
      headers = ['Code,Name,Dept,Budget,AllocatedPayroll,Utilization%'];
      rows = costCenters.map(c =>
        `"${c.code}","${c.name}","${c.dept}",${c.budget},${c.allocatedPayroll},"${c.budgetUtilizationPercent}%"`
      );
    }

    const csvContent = headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    success('Export Completed', `Downloaded ${filename}.`);
  };

  return (
    <>
      <div className="no-print">
        <Navbar title="Reports & Analytics Suite" />
      </div>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header - hidden when printing */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Reporting Suite</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate auditable attendance rate metrics, absenteeism reviews, and payroll financial summaries.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Tab Selector - hidden when printing */}
        <div className="no-print flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Attendance & Tardiness
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'payroll'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Payroll Summary
          </button>
          <button
            onClick={() => setActiveTab('absenteeism')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'absenteeism'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Absenteeism Log
          </button>
          <button
            onClick={() => setActiveTab('costCenters')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'costCenters'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cost Centers Breakdown
          </button>
        </div>

        {/* Printable Document Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          {/* Print Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold uppercase text-slate-900">
                Apex Enterprises Ltd.
              </h2>
              <div className="text-xs text-slate-500">
                Report Type: <strong className="text-slate-800 uppercase">{activeTab} Summary</strong> • Generated on {new Date().toLocaleString('en-PH')}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-slate-400">CONFIDENTIAL</span>
            </div>
          </div>

          {/* TAB 1: Attendance Report */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Total Logged Records</span>
                  <span className="text-lg font-extrabold text-slate-900">{attendanceReport?.summary?.totalRecords || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Present Count</span>
                  <span className="text-lg font-extrabold text-emerald-700">{attendanceReport?.summary?.presentCount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Late Punctuality Flags</span>
                  <span className="text-lg font-extrabold text-amber-700">{attendanceReport?.summary?.lateCount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Workforce Attendance Rate</span>
                  <span className="text-lg font-extrabold text-indigo-700">{attendanceReport?.summary?.attendanceRate || 0}%</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Staff Name</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Time In</th>
                      <th className="py-2.5 px-3">Time Out</th>
                      <th className="py-2.5 px-3">Hours</th>
                      <th className="py-2.5 px-3">Late Mins</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(attendanceReport?.records || []).map((r: any) => (
                      <tr key={r.id}>
                        <td className="py-2 px-3 font-mono">{r.date}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{r.employeeName} ({r.empId})</td>
                        <td className="py-2 px-3 text-slate-600">{r.department}</td>
                        <td className="py-2 px-3 font-mono">{r.in || '—'}</td>
                        <td className="py-2 px-3 font-mono">{r.out || '—'}</td>
                        <td className="py-2 px-3 font-mono">{r.workingHours || 0} h</td>
                        <td className="py-2 px-3 font-mono">{r.lateMinutes || 0} m</td>
                        <td className="py-2 px-3 font-bold">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Payroll Report */}
          {activeTab === 'payroll' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Gross Payroll</span>
                  <span className="text-lg font-extrabold text-slate-900">{formatPHP(payrollReport?.totals?.grossPay)}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Withholding Tax</span>
                  <span className="text-lg font-extrabold text-rose-700">{formatPHP(payrollReport?.totals?.taxWithheld)}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Statutory Total</span>
                  <span className="text-lg font-extrabold text-slate-800">
                    {formatPHP((payrollReport?.totals?.sssDeductions || 0) + (payrollReport?.totals?.philHealthDeductions || 0) + (payrollReport?.totals?.pagIbigDeductions || 0))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Net Disbursed</span>
                  <span className="text-lg font-extrabold text-emerald-700">{formatPHP(payrollReport?.totals?.netPay)}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Base Pay</th>
                      <th className="py-2.5 px-3">OT Pay</th>
                      <th className="py-2.5 px-3">Gross Pay</th>
                      <th className="py-2.5 px-3">Tax Withheld</th>
                      <th className="py-2.5 px-3">Deductions</th>
                      <th className="py-2.5 px-3 font-bold text-slate-900">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(payrollReport?.items || []).map((i: any) => (
                      <tr key={i.id}>
                        <td className="py-2 px-3 font-bold text-slate-900">{i.employeeName} ({i.empId})</td>
                        <td className="py-2 px-3 text-slate-600">{i.department}</td>
                        <td className="py-2 px-3 font-mono">{formatPHP(i.periodBasicPay)}</td>
                        <td className="py-2 px-3 font-mono text-indigo-700">{formatPHP(i.overtimePay)}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{formatPHP(i.grossPay)}</td>
                        <td className="py-2 px-3 font-mono text-rose-700">{formatPHP(i.taxWithheld)}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{formatPHP(i.totalDeductions)}</td>
                        <td className="py-2 px-3 font-mono font-extrabold text-emerald-800">{formatPHP(i.netPay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Absenteeism Report */}
          {activeTab === 'absenteeism' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Detection Reason</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Reviewed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {absenteeismList.map(a => (
                      <tr key={a.id}>
                        <td className="py-2 px-3 font-mono">{a.date}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{a.employeeName} ({a.empId})</td>
                        <td className="py-2 px-3 text-slate-600">{a.department}</td>
                        <td className="py-2 px-3">{a.detectionSource}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-xs truncate">{a.reason}</td>
                        <td className="py-2 px-3 font-bold">{a.status}</td>
                        <td className="py-2 px-3 text-slate-500">{a.reviewedBy || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Cost Centers Report */}
          {activeTab === 'costCenters' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Cost Center Name</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Periodic Budget</th>
                      <th className="py-2.5 px-3">Allocated Payroll</th>
                      <th className="py-2.5 px-3">Budget Utilization</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {costCenters.map(cc => (
                      <tr key={cc.id}>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">{cc.code}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{cc.name}</td>
                        <td className="py-2 px-3 text-slate-600">{cc.dept}</td>
                        <td className="py-2 px-3 font-mono">{formatPHP(cc.budget)}</td>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">{formatPHP(cc.allocatedPayroll)}</td>
                        <td className="py-2 px-3 font-bold text-emerald-700">{cc.budgetUtilizationPercent || 0}%</td>
                        <td className="py-2 px-3">{cc.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
