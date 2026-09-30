'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  X,
  Printer,
  ShieldCheck,
  Building,
  User,
  Download
} from 'lucide-react';
import { apiRequest, formatPHP } from '../lib/api';
import { BIR2316Data } from '../types';

interface BIR2316ModalProps {
  isOpen: boolean;
  onClose: () => void;
  empId?: string;
}

export function BIR2316Modal({ isOpen, onClose, empId = 'EMP-001' }: BIR2316ModalProps) {
  const [data, setData] = useState<BIR2316Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmpId, setSelectedEmpId] = useState(empId);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      apiRequest(`/reports/bir-2316/${selectedEmpId}`).then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        }
        setLoading(false);
      });
    }
  }, [isOpen, selectedEmpId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200 relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">BIR Form No. 2316 Certificate Generator</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Taxable Year 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Certificate of Compensation Payment / Tax Withheld For Compensation Payment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Certificate
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Employee Switcher */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3 text-xs">
          <span className="font-semibold text-slate-600">Select Employee:</span>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="EMP-001">EMP-001 - Juan Dela Cruz (Senior Software Eng)</option>
            <option value="EMP-002">EMP-002 - Maria Santos (HR Generalist)</option>
            <option value="EMP-003">EMP-003 - Carlos Mendoza (DevOps Specialist)</option>
            <option value="EMP-004">EMP-004 - Ana Reyes (Financial Analyst)</option>
            <option value="EMP-005">EMP-005 - Mark Bautista (Operations Supervisor)</option>
          </select>
        </div>

        {/* Certificate Preview Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 font-sans">
          {loading || !data ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">Generating official BIR 2316 data...</p>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-sm max-w-3xl mx-auto space-y-6 text-xs text-slate-800">
              {/* Form Title Banner */}
              <div className="border-b-2 border-slate-900 pb-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Republic of the Philippines • Department of Finance</p>
                <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">BUREAU OF INTERNAL REVENUE</h4>
                <p className="text-sm font-bold text-indigo-900 mt-1">BIR Form No. 2316 (Revised January 2026)</p>
                <p className="text-[11px] text-slate-500">Certificate of Compensation Payment / Tax Withheld</p>
              </div>

              {/* Part I: Employee Information */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-3 bg-slate-50/50">
                <h5 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1">
                  PART I — EMPLOYEE INFORMATION
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Taxpayer Identification No. (TIN)</span>
                    <span className="font-mono font-bold text-slate-900">{data.employee.tin}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Employee Name</span>
                    <span className="font-bold text-slate-900">{data.employee.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Registered Address</span>
                    <span className="text-slate-700">{data.employee.address}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Statutory IDs (SSS / PhilHealth / HDMF)</span>
                    <span className="font-mono text-slate-700 text-[11px]">
                      SSS: {data.employee.sssNo} | PH: {data.employee.philHealthNo}
                    </span>
                  </div>
                </div>
              </div>

              {/* Part II: Employer Information */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-3 bg-slate-50/50">
                <h5 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1">
                  PART II — PRESENT EMPLOYER INFORMATION
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Employer TIN</span>
                    <span className="font-mono font-bold text-slate-900">{data.employer.tin}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Employer's Name</span>
                    <span className="font-bold text-slate-900">{data.employer.name}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-semibold text-slate-400 block">Registered Address & RDO Code</span>
                    <span className="text-slate-700">{data.employer.address} (RDO: {data.employer.rdoCode})</span>
                  </div>
                </div>
              </div>

              {/* Part IVA: Summary */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2">
                <h5 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1">
                  PART IV-A — SUMMARY OF COMPENSATION & TAX WITHHELD
                </h5>
                <div className="space-y-1.5 divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">Gross Compensation Income from Present Employer</span>
                    <span className="font-mono font-bold">{formatPHP(data.grossCompensation)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">Total Non-Taxable / Exempt Compensation (13th mo ≤ ₱90k + SSS/PH/HDMF)</span>
                    <span className="font-mono text-emerald-600 font-bold">{formatPHP(data.totalNonTaxableCompensation)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-900 font-bold">Taxable Compensation Income</span>
                    <span className="font-mono font-extrabold text-indigo-900">{formatPHP(data.taxableCompensation)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">Tax Due for the Year (TRAIN Law Schedule)</span>
                    <span className="font-mono font-bold">{formatPHP(data.taxDue)}</span>
                  </div>
                  <div className="flex justify-between pt-1 bg-slate-50 p-2 rounded-lg font-bold text-slate-900">
                    <span>Total Taxes Withheld from Present Employer</span>
                    <span className="font-mono text-emerald-700">{formatPHP(data.taxWithheld)}</span>
                  </div>
                </div>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-center">
                <div>
                  <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center font-serif italic text-slate-600">
                    Juan Dela Cruz
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Signature of Employee</p>
                </div>
                <div>
                  <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center font-serif italic text-slate-600">
                    HR & Payroll Comptroller
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Signature of Authorized Representative</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
