'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Printer,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users,
  Search,
  ArrowRight,
  UserCheck,
  RefreshCw,
  Building2,
  Copy,
  Check,
  FileText,
  BadgeCheck,
  Briefcase,
  Phone,
  HeartPulse,
  Clock,
  UserPlus
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest } from '../../lib/api';
import { Employee } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { soundFx } from '../../lib/sound';

function QrGeneratorContent() {
  const searchParams = useSearchParams();
  const initialEmpId = searchParams.get('empId');

  const { isAdmin } = useAuth();
  const { success, error, info } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialEmpId || 'EMP-001');
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single');
  const [copied, setCopied] = useState(false);

  // Single view source mode: 'roster' | 'custom'
  const [sourceMode, setSourceMode] = useState<'roster' | 'custom'>('roster');
  const [customForm, setCustomForm] = useState({
    id: 'EMP-012',
    name: 'Alexander V. Santos',
    position: 'Operations Specialist',
    department: 'Operations',
    workSchedule: '08:00 AM - 05:00 PM (Mon-Fri)',
    costCenterId: 'CC-004',
    phone: '+63 917 555 0199',
    emergencyContact: 'Maria Santos (Spouse) • +63 918 555 0200',
    bloodType: 'O+',
    validUntil: 'DEC 2027',
    salary: 42000
  });
  const [savingCustom, setSavingCustom] = useState(false);

  // Search in batch view
  const [batchSearch, setBatchSearch] = useState('');
  const [batchQrs, setBatchQrs] = useState<{ [id: string]: string }>({});

  const badgeRef = useRef<HTMLDivElement>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    const res = await apiRequest<Employee[]>('/employees');
    if (res.success && res.data) {
      setEmployees(res.data);
      if (initialEmpId && res.data.some(e => e.id === initialEmpId)) {
        setSelectedId(initialEmpId);
      } else if (res.data[0]) {
        setSelectedId(res.data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const selectedEmployee = employees.find(e => e.id === selectedId) || employees[0];

  // Active badge information depending on mode
  const activeBadge = sourceMode === 'roster'
    ? {
        id: selectedEmployee?.id || 'EMP-001',
        name: selectedEmployee?.name || 'Juan Dela Cruz',
        position: selectedEmployee?.position || 'Staff Specialist',
        department: selectedEmployee?.department || 'Human Resources',
        workSchedule: selectedEmployee?.workSchedule || '08:00 AM - 05:00 PM (Mon-Fri)',
        costCenterId: selectedEmployee?.costCenterId || 'CC-001',
        phone: selectedEmployee?.phone || '+63 917 555 0101',
        emergencyContact: 'Corporate HQ • +63 2 8888 1234',
        bloodType: 'O+',
        validUntil: 'DEC 2027'
      }
    : customForm;

  // Generate QR code for the active badge identity using signed HMAC token
  useEffect(() => {
    let isMounted = true;
    const targetId = activeBadge.id;

    apiRequest<{ token: string; payload: any }>(`/attendance/qr-code?empId=${encodeURIComponent(targetId)}`)
      .then(res => {
        if (!isMounted) return;
        const tokenString = res.success && res.data?.token
          ? res.data.token
          : targetId;

        QRCode.toDataURL(tokenString, {
          width: 360,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        })
          .then(url => {
            if (isMounted) setQrDataUrl(url);
          })
          .catch(err => {
            console.error('QR generation failed', err);
          });
      })
      .catch(err => {
        console.error('Failed to get signed QR token', err);
      });

    return () => {
      isMounted = false;
    };
  }, [activeBadge.id, sourceMode]);

  // Generate batch QR codes when batch mode is active
  useEffect(() => {
    if (viewMode !== 'batch' || employees.length === 0) return;

    employees.forEach(async emp => {
      try {
        const res = await apiRequest<{ token: string }>(`/attendance/qr-code?empId=${emp.id}`);
        const tokenString = res.success && res.data?.token ? res.data.token : emp.id;
        const url = await QRCode.toDataURL(tokenString, {
          width: 220,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'H'
        });
        setBatchQrs(prev => ({ ...prev, [emp.id]: url }));
      } catch (e) {
        console.error('Batch QR error for', emp.id, e);
      }
    });
  }, [viewMode, employees]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    soundFx.playSuccess();
    const link = document.createElement('a');
    link.download = `APEX-QR-ID-${activeBadge.id}-${activeBadge.name.replace(/\s+/g, '_')}.png`;
    link.href = qrDataUrl;
    link.click();
    success('QR Code Downloaded', `Saved attendance ID badge for ${activeBadge.name}.`);
  };

  const handlePrint = () => {
    soundFx.playSuccess();
    window.print();
  };

  const handleCopyPayload = async () => {
    const res = await apiRequest<{ token: string; payload: any }>(`/attendance/qr-code?empId=${encodeURIComponent(activeBadge.id)}`);
    const tokenToCopy = res.success && res.data?.token ? res.data.token : activeBadge.id;
    navigator.clipboard.writeText(tokenToCopy);
    setCopied(true);
    soundFx.playSuccess();
    success('Signed Token Copied', 'Copied cryptographic attendance token to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegisterCustomEmployee = async () => {
    if (!customForm.name || !customForm.id) {
      error('Validation Error', 'Full Name and Employee ID are required.');
      return;
    }

    setSavingCustom(true);
    const res = await apiRequest('/employees', {
      method: 'POST',
      body: JSON.stringify({
        id: customForm.id,
        name: customForm.name,
        department: customForm.department,
        position: customForm.position,
        salary: customForm.salary || 40000,
        workSchedule: customForm.workSchedule,
        costCenterId: customForm.costCenterId,
        phone: customForm.phone,
        email: `${customForm.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@payroll.corp`
      })
    });
    setSavingCustom(false);

    if (res.success) {
      soundFx.playSuccess();
      success('Employee Registered', `Saved ${customForm.name} to active roster.`);
      await fetchEmployees();
      setSelectedId(customForm.id);
      setSourceMode('roster');
    } else {
      soundFx.playAlert();
      error('Registration Failed', res.error?.message || 'Could not save employee.');
    }
  };

  const filteredBatch = employees.filter(e =>
    e.name.toLowerCase().includes(batchSearch.toLowerCase()) ||
    e.id.toLowerCase().includes(batchSearch.toLowerCase()) ||
    e.department.toLowerCase().includes(batchSearch.toLowerCase())
  );

  return (
    <>
      {/* Print Specific CSS to isolate printable ID card */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-badge, #printable-badge * {
            visibility: visible !important;
          }
          #printable-badge {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 3.5in !important;
            max-width: 3.5in !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: 1.5px solid #cbd5e1 !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="print:hidden">
        <Navbar title="Digital QR Code Badge Generator" />
      </div>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="print:hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
                <QrCode className="w-3.5 h-3.5" />
                <span>Contactless Workforce Attendance & Digital ID</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Official Digital QR Badge Generator
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Generate authentic corporate and student-style photo ID badges embedded with cryptographically signed QR codes. Scanning the badge at the attendance scanner terminal instantly identifies the employee and records their attendance punch.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-800/80 p-1 rounded-2xl border border-slate-700 flex items-center gap-1">
                <button
                  onClick={() => setViewMode('single')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewMode === 'single'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Single ID Card
                </button>
                <button
                  onClick={() => setViewMode('batch')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewMode === 'batch'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Batch Roster ({employees.length})
                </button>
              </div>

              <Link
                href={`/qr-scanner?empId=${activeBadge.id}`}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Test in QR Scanner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* View Mode: Single Badge Generator */}
        {viewMode === 'single' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Controls: Source Mode & Specification Fields */}
            <div className="print:hidden lg:col-span-5 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSourceMode('roster')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      sourceMode === 'roster'
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Select from Roster</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceMode('custom')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      sourceMode === 'custom'
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Custom ID Badge</span>
                  </button>
                </div>

                {/* Sub-Panel: Select Existing Employee */}
                {sourceMode === 'roster' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Choose Employee to Render ID Badge
                      </label>
                      <select
                        value={selectedId}
                        onChange={e => setSelectedId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white outline-none focus:border-indigo-500"
                      >
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.id} — {emp.name} ({emp.department})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedEmployee && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Designation:</span>
                          <span className="font-semibold text-slate-800">{selectedEmployee.position}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Department:</span>
                          <span className="font-semibold text-slate-800">{selectedEmployee.department}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Cost Center:</span>
                          <span className="font-mono text-slate-700">{selectedEmployee.costCenterId || 'CC-001'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Work Schedule:</span>
                          <span className="font-medium text-slate-700">{selectedEmployee.workSchedule}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Attendance Status:</span>
                          <span className="font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for QR Punch
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-Panel: Custom Employee ID Creator Form */}
                {sourceMode === 'custom' && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID *</label>
                        <input
                          type="text"
                          required
                          value={customForm.id}
                          onChange={e => setCustomForm({ ...customForm, id: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-indigo-700 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={customForm.name}
                          onChange={e => setCustomForm({ ...customForm, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                        <select
                          value={customForm.department}
                          onChange={e => setCustomForm({ ...customForm, department: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                        >
                          <option value="Information Technology">Information Technology</option>
                          <option value="Finance">Finance</option>
                          <option value="Human Resources">Human Resources</option>
                          <option value="Operations">Operations</option>
                          <option value="Administration">Administration</option>
                          <option value="Marketing">Marketing</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Position / Title</label>
                        <input
                          type="text"
                          value={customForm.position}
                          onChange={e => setCustomForm({ ...customForm, position: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Work Shift & Schedule</label>
                      <input
                        type="text"
                        value={customForm.workSchedule}
                        onChange={e => setCustomForm({ ...customForm, workSchedule: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact / Phone</label>
                        <input
                          type="text"
                          value={customForm.phone}
                          onChange={e => setCustomForm({ ...customForm, phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Blood Type</label>
                        <input
                          type="text"
                          value={customForm.bloodType}
                          onChange={e => setCustomForm({ ...customForm, bloodType: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {isAdmin && !employees.some(e => e.id === customForm.id) && (
                      <button
                        type="button"
                        onClick={handleRegisterCustomEmployee}
                        disabled={savingCustom}
                        className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        {savingCustom ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                        <span>Save & Register to Company Roster</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Badge Actions */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleDownload}
                      className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PNG</span>
                    </button>

                    <button
                      onClick={handlePrint}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print ID Card</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCopyPayload}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Signed QR Token Copied!' : 'Copy Decoded QR Token Payload'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Live Authentic ID Badge Card */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div
                ref={badgeRef}
                id="printable-badge"
                className="w-full max-w-sm bg-white rounded-3xl border-2 border-slate-300 shadow-2xl overflow-hidden relative print:border print:shadow-none print:m-0 select-none"
              >
                {/* Lanyard punch hole simulation */}
                <div className="h-3 w-16 bg-slate-200/90 rounded-full mx-auto mt-4 border border-slate-300/80 print:hidden"></div>

                {/* Badge Header Banner */}
                <div className="p-5 pb-4 text-center bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 text-white relative mt-3 border-b-2 border-amber-400/80">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <div className="w-6 h-6 rounded-md bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-bold text-[10px]">
                      AP
                    </div>
                    <span className="text-[9px] uppercase tracking-widest text-amber-300 font-mono font-bold">
                      PHILIPPINES
                    </span>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  </div>

                  <h2 className="text-sm font-extrabold tracking-wider uppercase text-white">
                    Apex Enterprises Ltd.
                  </h2>
                  <p className="text-[9px] text-indigo-300 font-medium tracking-widest uppercase mt-0.5">
                    Official Corporate Identification Card
                  </p>
                </div>

                {/* Badge Body */}
                <div className="p-5 text-center space-y-4">
                  {/* Photo / Avatar Placeholder with Status Badge */}
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-cyan-500 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-md border-4 border-white">
                      {activeBadge.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span
                      className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold border-2 border-white flex items-center gap-0.5 shadow-xs"
                      title="Verified Identity"
                    >
                      <Check className="w-2.5 h-2.5" /> VERIFIED
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                      {activeBadge.name}
                    </h3>
                    <p className="text-xs font-bold text-indigo-600 mt-0.5">
                      {activeBadge.position}
                    </p>
                    <div className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px] font-extrabold tracking-wider">
                      {activeBadge.id}
                    </div>
                  </div>

                  {/* High-Contrast Official QR Code */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 inline-block shadow-inner">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Employee QR Code"
                        className="w-44 h-44 mx-auto rounded-lg object-contain bg-white p-1"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                        Generating Secure QR...
                      </div>
                    )}
                    <div className="mt-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Scan For Attendance Recording
                    </div>
                  </div>

                  {/* Detailed Meta Specifications Grid */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-[10px] space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-500">Department:</span>
                      <strong className="text-slate-800">{activeBadge.department}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-500">Work Shift:</span>
                      <strong className="text-slate-800">{activeBadge.workSchedule}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-500">Emergency Contact:</span>
                      <strong className="text-slate-800 truncate max-w-[170px]">{activeBadge.emergencyContact}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Blood Type / Validity:</span>
                      <strong className="text-indigo-700">{activeBadge.bloodType} • {activeBadge.validUntil}</strong>
                    </div>
                  </div>

                  {/* Micro-print Security Footer */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                    <span>DOLE Philippines</span>
                    <span className="font-mono text-indigo-700 font-bold">APX-SEC-CRYPT-OK</span>
                    <span>TRAIN Law Compliant</span>
                  </div>
                </div>
              </div>

              <div className="print:hidden mt-4 text-center text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Encodes authentic HMAC-SHA256 signature recognized by the attendance system.</span>
              </div>
            </div>
          </div>
        )}

        {/* View Mode: Batch Badges Grid */}
        {viewMode === 'batch' && (
          <div className="space-y-6">
            <div className="print:hidden bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter personnel, department or ID..."
                  value={batchSearch}
                  onChange={e => setBatchSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print All Selected Badges</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBatch.map(emp => (
                <div
                  key={emp.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs hover:shadow-lg transition-all space-y-4 text-center"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded font-mono">
                      {emp.id}
                    </span>
                    <span className="text-[11px] text-slate-400">{emp.department}</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-900">{emp.name}</h4>
                    <p className="text-xs text-slate-500">{emp.position}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 inline-block mx-auto">
                    {batchQrs[emp.id] ? (
                      <img
                        src={batchQrs[emp.id]}
                        alt={`QR for ${emp.name}`}
                        className="w-36 h-36 mx-auto rounded-lg object-contain bg-white p-1"
                      />
                    ) : (
                      <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">
                        Generating...
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-2">
                    <Link
                      href={`/qr-scanner?empId=${emp.id}`}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Test Scan</span>
                    </Link>

                    <button
                      onClick={() => {
                        setSelectedId(emp.id);
                        setSourceMode('roster');
                        setViewMode('single');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                    >
                      View Badge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function QrGeneratorPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500 text-xs">Loading QR Generator...</div>}>
      <QrGeneratorContent />
    </React.Suspense>
  );
}
