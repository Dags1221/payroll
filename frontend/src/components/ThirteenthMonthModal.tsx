'use client';

import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  X,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { apiRequest, formatPHP } from '../lib/api';
import { ThirteenthMonthProjection } from '../types';

interface ThirteenthMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThirteenthMonthModal({ isOpen, onClose }: ThirteenthMonthModalProps) {
  const [data, setData] = useState<ThirteenthMonthProjection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      apiRequest('/tax/thirteenth-month').then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        }
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const total13th = data.reduce((acc, cur) => acc + cur.projected13thMonth, 0);
  const totalExempt = data.reduce((acc, cur) => acc + cur.taxExemptAmount, 0);
  const totalTaxable = data.reduce((acc, cur) => acc + cur.taxableAmount, 0);

  const handleExportCSV = () => {
    const headers = ['Employee ID,Name,Department,Monthly Basic,Months YTD,Projected 13th Month,Tax Exempt (<=90k),Taxable Portion'];
    const rows = data.map(
      (d) =>
        `"${d.empId}","${d.employeeName}","${d.department}",${d.monthlySalary},${d.monthsWorkedYtd},${d.projected13thMonth},${d.taxExemptAmount},${d.taxableAmount}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `13th_Month_Pay_Projections_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200 relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 to-blue-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">13th Month Pay & Annual Bonus Calculator</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  TRAIN Law RA 10963
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Mandatory Presidential Decree No. 851 • ₱90,000 Tax-Exempt Threshold Applied
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Total 13th Month Liability</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{formatPHP(total13th)}</p>
            <p className="text-[10px] text-slate-400 mt-1">Based on 9 months YTD accrued service</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-emerald-600">Tax-Exempt Reserve (≤ ₱90k)</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">{formatPHP(totalExempt)}</p>
            <p className="text-[10px] text-emerald-500 mt-1">100% Tax-Free for Employees</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-amber-600">Taxable Excess (&gt; ₱90k)</p>
            <p className="text-xl font-extrabold text-amber-600 mt-1">{formatPHP(totalTaxable)}</p>
            <p className="text-[10px] text-amber-500 mt-1">Subjected to TRAIN Withholding Tax</p>
          </div>
        </div>

        {/* Table Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">Projecting annual statutory 13th-month allocations...</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="pb-3">Employee</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3 text-right">Monthly Basic</th>
                  <th className="pb-3 text-center">Months YTD</th>
                  <th className="pb-3 text-right">Projected 13th</th>
                  <th className="pb-3 text-right">Tax Exempt</th>
                  <th className="pb-3 text-right">Taxable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item) => (
                  <tr key={item.empId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 font-semibold text-slate-800">
                      {item.employeeName}
                      <span className="block text-[10px] font-mono text-slate-400 font-normal">{item.empId}</span>
                    </td>
                    <td className="py-3 text-slate-600">{item.department}</td>
                    <td className="py-3 text-right font-mono text-slate-700">{formatPHP(item.monthlySalary)}</td>
                    <td className="py-3 text-center font-bold text-indigo-600">{item.monthsWorkedYtd} / 12</td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900">{formatPHP(item.projected13thMonth)}</td>
                    <td className="py-3 text-right font-mono text-emerald-600 font-semibold">{formatPHP(item.taxExemptAmount)}</td>
                    <td className="py-3 text-right font-mono text-amber-600 font-semibold">
                      {item.taxableAmount > 0 ? formatPHP(item.taxableAmount) : '₱0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Formula: (Total Basic Salary Earned YTD) / 12 • Due on or before December 24
          </p>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export 13th Month CSV
          </button>
        </div>
      </div>
    </div>
  );
}
