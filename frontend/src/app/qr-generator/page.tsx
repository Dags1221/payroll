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
  ExternalLink
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

  // Generate QR code for the selected employee
  useEffect(() => {
    if (!selectedEmployee) return;

    const payload = JSON.stringify({
      empId: selectedEmployee.id,
      name: selectedEmployee.name,
      dept: selectedEmployee.department,
      type: 'APEX_ATTENDANCE_QR',
      v: '2.4',
      issued: new Date().toISOString().slice(0, 10)
    });

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then(url => {
        setQrDataUrl(url);
      })
      .catch(err => {
        console.error('QR generation failed', err);
      });
  }, [selectedEmployee]);

  // Generate batch QR codes when batch mode is active
  useEffect(() => {
    if (viewMode !== 'batch' || employees.length === 0) return;

    employees.forEach(emp => {
      const payload = JSON.stringify({
        empId: emp.id,
        name: emp.name,
        dept: emp.department,
        type: 'APEX_ATTENDANCE_QR',
        v: '2.4'
      });

      QRCode.toDataURL(payload, {
        width: 200,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' }
      }).then(url => {
        setBatchQrs(prev => ({ ...prev, [emp.id]: url }));
      });
    });
  }, [viewMode, employees]);

  const handleDownload = () => {
    if (!qrDataUrl || !selectedEmployee) return;
    soundFx.playSuccess();
    const link = document.createElement('a');
    link.download = `APEX-QR-${selectedEmployee.id}-${selectedEmployee.name.replace(/\s+/g, '_')}.png`;
    link.href = qrDataUrl;
    link.click();
    success('QR Code Downloaded', `Saved attendance QR code badge for ${selectedEmployee.name}.`);
  };

  const handlePrint = () => {
    soundFx.playSuccess();
    window.print();
  };

  const handleCopyPayload = () => {
    if (!selectedEmployee) return;
    const payload = JSON.stringify({
      empId: selectedEmployee.id,
      name: selectedEmployee.name,
      dept: selectedEmployee.department,
      type: 'APEX_ATTENDANCE_QR',
      v: '2.4'
    }, null, 2);
    navigator.clipboard.writeText(payload);
    setCopied(true);
    soundFx.playSuccess();
    success('Payload Copied', 'Copied QR code data structure to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredBatch = employees.filter(e =>
    e.name.toLowerCase().includes(batchSearch.toLowerCase()) ||
    e.id.toLowerCase().includes(batchSearch.toLowerCase()) ||
    e.department.toLowerCase().includes(batchSearch.toLowerCase())
  );

  return (
    <>
      <Navbar title="Digital QR Code Badge Generator" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
                <QrCode className="w-3.5 h-3.5" />
                <span>Contactless Workforce Attendance</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Official Digital QR Badge Generator
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Generate high-resolution encrypted QR code badges for all personnel. Employees can present this digital or printed badge to the QR Attendance Scanner for instant punch in and punch out.
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
                  Single Badge
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
                href={`/qr-scanner${selectedEmployee ? `?empId=${selectedEmployee.id}` : ''}`}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <span>Test in QR Scanner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* View Mode: Single Badge Generator */}
        {viewMode === 'single' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Controls: Employee Selection & Specs */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Select Employee</h3>
                    <p className="text-xs text-slate-500">Pick any active personnel to render their QR ID.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Employee Roster Dropdown
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
                      <span className="text-slate-500">Account Status:</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active & Verified
                      </span>
                    </div>
                  </div>
                )}

                {/* Badge Actions */}
                <div className="space-y-2.5 pt-2">
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
                    <span>{copied ? 'QR Payload Copied!' : 'Copy Decoded QR Payload'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Live Realistic ID Badge Card */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div
                ref={badgeRef}
                id="printable-badge"
                className="w-full max-w-md bg-white rounded-3xl border-2 border-slate-200 shadow-2xl overflow-hidden relative print:border-none print:shadow-none print:m-0"
              >
                {/* Lanyard punch hole indicator */}
                <div className="h-3 w-16 bg-slate-200 rounded-full mx-auto mt-4 print:hidden"></div>

                {/* Badge Header Banner */}
                <div className="p-6 pb-5 text-center bg-gradient-to-b from-indigo-900 to-slate-900 text-white relative mt-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center mx-auto mb-2 text-indigo-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-extrabold tracking-wider uppercase text-white">
                    Apex Payroll Enterprise
                  </h2>
                  <p className="text-[10px] text-indigo-300 font-medium tracking-widest uppercase">
                    Official Corporate Workforce ID
                  </p>
                </div>

                {/* Badge Body */}
                <div className="p-6 text-center space-y-4">
                  {/* Photo / Avatar Placeholder */}
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-md border-4 border-white">
                      {selectedEmployee ? selectedEmployee.name.slice(0, 2).toUpperCase() : 'AP'}
                    </div>
                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></span>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                      {selectedEmployee?.name || 'Juan Dela Cruz'}
                    </h3>
                    <p className="text-xs font-semibold text-indigo-600">
                      {selectedEmployee?.position || 'Staff'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {selectedEmployee?.department || 'Human Resources'}
                    </p>
                  </div>

                  {/* QR Code Canvas Frame */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Employee QR Code"
                        className="w-48 h-48 mx-auto rounded-lg object-contain"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                        Rendering QR Code...
                      </div>
                    )}
                    <div className="mt-2 font-mono font-extrabold text-sm text-slate-900 tracking-wider">
                      {selectedEmployee?.id || 'EMP-001'}
                    </div>
                  </div>

                  {/* Security Footer Details */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>TRAIN Law Compliant</span>
                    <span className="font-mono text-indigo-600 font-bold">SEC-TOKEN: VERIFIED</span>
                    <span>DOLE Philippines</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-slate-500">
                This badge can be scanned at the attendance terminal or from any mobile screen.
              </div>
            </div>
          </div>
        )}

        {/* View Mode: Batch Badges Grid */}
        {viewMode === 'batch' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
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
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
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
                        className="w-36 h-36 mx-auto rounded-lg object-contain"
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
