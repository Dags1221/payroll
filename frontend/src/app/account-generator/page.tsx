'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  QrCode,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Users,
  Search,
  Filter,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Building2,
  BadgeDollarSign,
  Printer
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest, formatPHP } from '../../lib/api';
import { Employee, Role, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { soundFx } from '../../lib/sound';

const SAMPLE_NAMES = [
  { name: 'Rafael Garcia', dept: 'Information Technology', position: 'Senior Full Stack Engineer', salary: 65000, costCenter: 'CC-003' },
  { name: 'Patricia Mendoza', dept: 'Finance', position: 'Senior Financial Analyst', salary: 48000, costCenter: 'CC-002' },
  { name: 'Eduardo Ramos', dept: 'Operations', position: 'Logistics Supervisor', salary: 38000, costCenter: 'CC-004' },
  { name: 'Camille Villanueva', dept: 'Human Resources', position: 'Talent Acquisition Specialist', salary: 35000, costCenter: 'CC-001' },
  { name: 'Gabriel Bautista', dept: 'Information Technology', position: 'Cybersecurity Analyst', salary: 55000, costCenter: 'CC-003' }
];

export default function AccountGeneratorPage() {
  const { user, isAdmin, switchRole } = useAuth();
  const { success, error, info } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    password: 'ApexPass2026!',
    pin: '1234',
    role: 'EMPLOYEE' as Role,
    department: 'Information Technology',
    position: 'Software Engineer',
    salary: 45000,
    costCenterId: 'CC-003',
    workSchedule: '08:00 AM - 05:00 PM (Mon-Fri)',
    phone: '+63 917 555 0199',
    address: 'BGC, Taguig City, Metro Manila',
    tin: '302-881-992-000',
    sssNo: '04-8891234-5',
    philHealthNo: '12-998877665-1',
    pagIbigNo: '1234-9988-7766'
  });

  // Provisioned Modal State
  const [provisionedData, setProvisionedData] = useState<{
    employee: Employee;
    user: any;
    plainPassword: string;
    pin: string;
  } | null>(null);

  // Search & Filter for Table
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    const [empRes, userRes] = await Promise.all([
      apiRequest<Employee[]>('/employees'),
      apiRequest<User[]>('/users')
    ]);

    if (empRes.success && empRes.data) {
      setEmployees(empRes.data);
      // Auto suggest next EMP ID
      let maxNum = 0;
      empRes.data.forEach(e => {
        const match = e.id.match(/^EMP-(\d+)$/i);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });
      const nextId = `EMP-${String(maxNum + 1).padStart(3, '0')}`;
      setFormData(prev => ({ ...prev, id: prev.id || nextId }));
    }

    if (userRes.success && userRes.data) {
      setUsers(userRes.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleNameChange = (nameVal: string) => {
    const slug = nameVal
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.');
    const autoEmail = slug ? `${slug}@payroll.corp` : '';
    setFormData(prev => ({
      ...prev,
      name: nameVal,
      email: autoEmail
    }));
  };

  const handleRandomFill = () => {
    soundFx.playBiometricScan();
    const randomProfile = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
    const randomPin = String(Math.floor(1000 + Math.random() * 9000));
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);

    const slug = randomProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
    setFormData(prev => ({
      ...prev,
      name: randomProfile.name,
      email: `${slug}@payroll.corp`,
      position: randomProfile.position,
      department: randomProfile.dept,
      salary: randomProfile.salary,
      costCenterId: randomProfile.costCenter,
      pin: randomPin,
      tin: `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-000`,
      sssNo: `04-${randomNum}-1`,
      philHealthNo: `12-${randomNum}2-3`,
      pagIbigNo: `1234-${randomNum.toString().slice(0, 4)}-${randomNum.toString().slice(3, 7)}`
    }));
    info('Profile Auto-Filled', `Generated template for ${randomProfile.name}.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      error('Validation Error', 'Full Name and Email Address are required.');
      return;
    }

    setSubmitting(true);
    const res = await apiRequest<{
      employee: Employee;
      user: any;
      plainPassword: string;
      pin: string;
    }>('/employees/generate-account', {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    setSubmitting(false);

    if (res.success && res.data) {
      soundFx.playSuccess();
      success('Account Generated!', `Created employee profile & system login for ${res.data.employee.name}.`);
      setProvisionedData(res.data);

      // Auto-advance next EMP ID
      let maxNum = 0;
      employees.forEach(e => {
        const match = e.id.match(/^EMP-(\d+)$/i);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });
      const currentNum = parseInt(formData.id.replace(/^EMP-/i, ''), 10) || maxNum;
      const nextId = `EMP-${String(Math.max(maxNum, currentNum) + 1).padStart(3, '0')}`;

      setFormData(prev => ({
        ...prev,
        id: nextId,
        name: '',
        email: ''
      }));
      fetchData();
    } else {
      soundFx.playAlert();
      error('Account Generation Failed', res.error?.message || 'Could not provision account.');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    soundFx.playSuccess();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyFullCredentialSlip = () => {
    if (!provisionedData) return;
    const slip = `===================================================
EAMPMS — OFFICIAL EMPLOYEE ACCESS & CREDENTIAL SLIP
Employee Attendance Monitoring & Payroll Management System
===================================================
Employee Name: ${provisionedData.employee.name}
Employee ID:   ${provisionedData.employee.id}
Department:    ${provisionedData.employee.department} (${provisionedData.employee.position})

LOGIN CREDENTIALS:
Access Portal: ${typeof window !== 'undefined' ? window.location.origin : ''}/login
Username/Email:${provisionedData.user.email}
Temporary Pass:${provisionedData.plainPassword}
Attendance PIN:${provisionedData.pin}

ATTENDANCE INSTRUCTIONS:
1. Log in to the employee portal using your credentials above.
2. Present your digital QR badge at any attendance terminal station to record your daily attendance (Time In / Time Out).
===================================================`;
    navigator.clipboard.writeText(slip);
    setCopiedKey('full-slip');
    soundFx.playSuccess();
    success('Credential Slip Copied', 'Copied full handout slip to clipboard.');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handlePrintSlip = () => {
    soundFx.playSuccess();
    window.print();
  };

  const filteredUsers = users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <>
      <Navbar title="Employee Account Generator" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Enterprise Identity & Access Governance</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Employee Account & Credential Generator
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Generate verified employee credentials, automate role-based portal access, assign Philippine statutory IDs, and directly generate digital QR attendance badges.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRandomFill}
                className="px-4 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-400/30 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Auto-Fill Sample Profile</span>
              </button>

              <Link
                href="/qr-generator"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all"
              >
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>Go to QR Generator</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Generator Form Section */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Provision & Generate Employee Account</h2>
                <p className="text-xs text-slate-500">Automatically creates system login credentials, employee master profile, and QR code access.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Load Existing:</span>
              <select
                onChange={e => {
                  const emp = employees.find(x => x.id === e.target.value);
                  if (emp) {
                    setFormData(prev => ({
                      ...prev,
                      id: emp.id,
                      name: emp.name,
                      email: emp.email,
                      department: emp.department,
                      position: emp.position,
                      salary: emp.salary,
                      costCenterId: emp.costCenterId || 'CC-001',
                      workSchedule: emp.workSchedule || prev.workSchedule,
                      phone: emp.phone || prev.phone,
                      address: emp.address || prev.address,
                      tin: emp.tin || prev.tin,
                      sssNo: emp.sssNo || prev.sssNo,
                      philHealthNo: emp.philHealthNo || prev.philHealthNo,
                      pagIbigNo: emp.pagIbigNo || prev.pagIbigNo,
                    }));
                    info('Employee Loaded', `Populated details for ${emp.name} (${emp.id}).`);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 outline-none focus:border-indigo-500"
              >
                <option value="">-- Or Load from Roster --</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.id} — {e.name}</option>
                ))}
              </select>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Row 1: Basic Identity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Employee ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.id}
                  onChange={e => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                  placeholder="EMP-005"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-indigo-700 bg-slate-50/50 outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Unique system identifier</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Rafael Garcia"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rafael.garcia@payroll.corp"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Row 2: Access & Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/60">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Portal Role</span>
                  <span className="text-[10px] text-indigo-600 font-semibold">RBAC Permission</span>
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 text-xs font-semibold text-slate-800 bg-white outline-none focus:border-indigo-500"
                >
                  <option value="EMPLOYEE">EMPLOYEE (Self-Service Attendance & Leave)</option>
                  <option value="SUPERVISOR">SUPERVISOR (Department Approver)</option>
                  <option value="ADMIN">ADMIN (Full Executive Administration)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-indigo-200 text-xs font-mono font-semibold text-slate-800 bg-white outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  QR Security PIN (4-Digits) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={formData.pin}
                  onChange={e => setFormData({ ...formData, pin: e.target.value })}
                  placeholder="1234"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 text-xs font-mono font-bold tracking-widest text-slate-800 bg-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Row 3: Department, Position, Salary, Cost Center */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                <select
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white outline-none focus:border-indigo-500"
                >
                  <option value="Information Technology">Information Technology</option>
                  <option value="Finance">Finance & Accounting</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Operations">Operations & Logistics</option>
                  <option value="Administration">Executive Administration</option>
                  <option value="Marketing">Marketing & Sales</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Position / Title</label>
                <input
                  type="text"
                  required
                  value={formData.position}
                  onChange={e => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Basic Monthly Salary (PHP)</label>
                <input
                  type="number"
                  required
                  min={15000}
                  step={500}
                  value={formData.salary}
                  onChange={e => setFormData({ ...formData, salary: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cost Center Code</label>
                <select
                  value={formData.costCenterId}
                  onChange={e => setFormData({ ...formData, costCenterId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white outline-none focus:border-indigo-500"
                >
                  <option value="CC-001">CC-001 • Human Resources</option>
                  <option value="CC-002">CC-002 • Finance & Accounting</option>
                  <option value="CC-003">CC-003 • Information Technology</option>
                  <option value="CC-004">CC-004 • Operations & Logistics</option>
                  <option value="CC-005">CC-005 • Executive Administration</option>
                  <option value="CC-006">CC-006 • Marketing & Sales</option>
                </select>
              </div>
            </div>

            {/* Row 4: Statutory Numbers (BIR, SSS, PhilHealth, Pag-IBIG) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">TIN (BIR)</label>
                <input
                  type="text"
                  value={formData.tin}
                  onChange={e => setFormData({ ...formData, tin: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">SSS Number</label>
                <input
                  type="text"
                  value={formData.sssNo}
                  onChange={e => setFormData({ ...formData, sssNo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">PhilHealth Number</label>
                <input
                  type="text"
                  value={formData.philHealthNo}
                  onChange={e => setFormData({ ...formData, philHealthNo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Pag-IBIG Number</label>
                <input
                  type="text"
                  value={formData.pagIbigNo}
                  onChange={e => setFormData({ ...formData, pagIbigNo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 outline-none"
                />
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                TRAIN Law Compliant • Automatically configures statutory deductions and attendance roster.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Generate Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Provisioned Modal Card */}
        {provisionedData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 relative my-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">Account Successfully Created!</h3>
                <p className="text-xs text-slate-500">
                  Credentials for <strong>{provisionedData.employee.name}</strong> are ready to hand over.
                </p>
              </div>

              {/* Printable Official Handout Slip */}
              <div
                id="printable-credential-slip"
                className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3 text-xs"
              >
                <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-indigo-900 text-white flex items-center justify-center font-bold text-[10px]">
                      EA
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 uppercase text-[11px] leading-tight">EAMPMS</div>
                      <div className="text-[9px] text-slate-400">Employee Login & Credential Slip</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {provisionedData.employee.id}
                  </span>
                </div>

                <div className="space-y-2 font-mono">
                  <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-sans">Full Name:</span>
                    <strong className="text-slate-900 font-sans">{provisionedData.employee.name}</strong>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-sans">Department:</span>
                    <span className="text-slate-700 font-sans">{provisionedData.employee.department} • {provisionedData.employee.position}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-sans">Login Email:</span>
                    <strong className="text-indigo-700">{provisionedData.user.email}</strong>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-sans">Temporary Password:</span>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">{provisionedData.plainPassword}</strong>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(provisionedData.plainPassword, 'pwd')}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition"
                        title="Copy Password"
                      >
                        {copiedKey === 'pwd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500 font-sans">Attendance PIN:</span>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">{provisionedData.pin}</strong>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(provisionedData.pin, 'pin')}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition"
                        title="Copy PIN"
                      >
                        {copiedKey === 'pin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50/60 rounded-xl p-2.5 border border-indigo-100 text-[11px] text-indigo-900 leading-snug space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Instructions for Employee:</span>
                  </div>
                  <p className="text-[10px] text-slate-600">
                    1. Navigate to the login portal and sign in with your email and password above.<br />
                    2. Scan your official digital or printed QR badge at any company attendance scanner to clock in and out.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={copyFullCredentialSlip}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    {copiedKey === 'full-slip' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey === 'full-slip' ? 'Slip Copied!' : 'Copy Slip Note'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintSlip}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-200"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Print Handout Slip</span>
                  </button>
                </div>

                <Link
                  href={`/qr-generator?empId=${provisionedData.employee.id}`}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Generate QR Attendance Badge Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => setProvisionedData(null)}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors"
                >
                  Done & Provision Next Employee
                </button>
              </div>
            </div>
          </div>
        )}

        {/* All Provisioned System Accounts Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Provisioned System Accounts ({users.length})</h3>
              <p className="text-xs text-slate-500">All registered employee and management users authorized in the system.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user, ID or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="EMPLOYEE">EMPLOYEE</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">User / Personnel</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">Loading system accounts...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">No accounts found matching filter.</td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-indigo-600 font-mono font-semibold">
                              {u.employeeId || u.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {u.email}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : u.role === 'SUPERVISOR'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {u.department || 'General'}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.employeeId && (
                            <Link
                              href={`/qr-generator?empId=${u.employeeId}`}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                              title="Generate QR Badge"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>QR Badge</span>
                            </Link>
                          )}

                          <button
                            onClick={() => {
                              switchRole(u.role, u.employeeId || 'EMP-001', u.name);
                              success('Persona Switched', `Switched active portal view to ${u.name} (${u.role}).`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                          >
                            Switch Demo
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
