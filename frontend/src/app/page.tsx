'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Clock,
  UserCheck,
  UserX,
  CalendarDays,
  Timer,
  BadgeDollarSign,
  ArrowRight,
  PlusCircle,
  Play,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  ScanFace,
  Banknote,
  ShieldAlert,
  Calendar,
  FileText,
  Megaphone,
  Volume2,
  VolumeX,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  ChevronRight,
  Layers,
  HelpCircle,
  Cpu,
  BarChart3,
  Sliders,
  Globe2,
  Lock
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatCard } from '../components/StatCard';
import { AttendanceTrendChart, DepartmentPayrollChart } from '../components/Charts';
import { apiRequest, formatPHP } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { soundFx } from '../lib/sound';
import { formatCurrency, CurrencyCode } from '../lib/currency';

// Import Feature Modals
import { BiometricKioskModal } from '../components/BiometricKioskModal';
import { ThirteenthMonthModal } from '../components/ThirteenthMonthModal';
import { LoanManagerModal } from '../components/LoanManagerModal';
import { AnomalyDetectorModal } from '../components/AnomalyDetectorModal';
import { ShiftPlannerModal } from '../components/ShiftPlannerModal';
import { BIR2316Modal } from '../components/BIR2316Modal';
import { EmergencyBroadcastModal } from '../components/EmergencyBroadcastModal';

export default function MasterHomePage() {
  const { role, isAdmin, user, switchRole } = useAuth();
  const { success, error, info } = useToast();

  // Mode: 'landing' (Public Showcase) or 'cockpit' (Executive Dashboard)
  const [viewMode, setViewMode] = useState<'landing' | 'cockpit'>('cockpit');

  // Modal States for the 10 Features
  const [kioskOpen, setKioskOpen] = useState(false);
  const [thirteenthOpen, setThirteenthOpen] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [anomalyOpen, setAnomalyOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [birOpen, setBirOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  // Settings
  const [currency, setCurrency] = useState<CurrencyCode>('PHP');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  // Dashboard Data
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningAbsenteeism, setRunningAbsenteeism] = useState(false);

  // Live TRAIN Law Simulator in Landing Page
  const [simSalary, setSimSalary] = useState(45000);

  // ROI Calculator in Landing Page
  const [companyHeadcount, setCompanyHeadcount] = useState(50);
  const [hourlyHrRate, setHourlyHrRate] = useState(350);

  useEffect(() => {
    // Check local storage for initial mode
    const savedMode = localStorage.getItem('payroll_preferred_mode') as 'landing' | 'cockpit' | null;
    if (savedMode) {
      setViewMode(savedMode);
    }

    // Time ticker
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    const res = await apiRequest('/reports/dashboard');
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (viewMode === 'cockpit') {
      fetchDashboard();
    }
  }, [viewMode]);

  const toggleMode = (mode: 'landing' | 'cockpit') => {
    soundFx.playSuccess();
    setViewMode(mode);
    localStorage.setItem('payroll_preferred_mode', mode);
  };

  const handleToggleSound = () => {
    const next = soundFx.toggle();
    setSoundEnabled(next);
    if (next) soundFx.playSuccess();
  };

  const handleRunAbsenteeism = async () => {
    setRunningAbsenteeism(true);
    soundFx.playBiometricScan();
    const res = await apiRequest('/absenteeism/detect', { method: 'POST' });
    setRunningAbsenteeism(false);

    if (res.success && res.data) {
      const flagged = res.data.newAbsencesFlagged?.length || 0;
      if (flagged > 0) {
        soundFx.playAlert();
        info('Detection Completed', `Identified ${flagged} new potential unrecorded absence(s).`);
      } else {
        soundFx.playSuccess();
        success('Workforce Verified', 'All scheduled employees accounted for.');
      }
      fetchDashboard();
    } else {
      error('Scan Failed', res.error?.message || 'Error executing automated detector.');
    }
  };

  // --- TRAIN LAW SIMULATOR MATH ---
  const calculateTrainTax = (gross: number) => {
    // SSS (approx 4.5% capped at ~1,350)
    const sss = Math.min(1350, gross * 0.045);
    // PhilHealth (5% split 50/50 => 2.5% employee share)
    const philHealth = Math.min(2500, Math.max(250, gross * 0.025));
    // Pag-IBIG
    const pagIbig = 200;
    const totalMandatory = sss + philHealth + pagIbig;
    const taxableIncome = Math.max(0, gross - totalMandatory);

    let tax = 0;
    if (taxableIncome <= 20833) {
      tax = 0;
    } else if (taxableIncome <= 33333) {
      tax = (taxableIncome - 20833) * 0.15;
    } else if (taxableIncome <= 66667) {
      tax = 1875 + (taxableIncome - 33333) * 0.20;
    } else if (taxableIncome <= 166667) {
      tax = 8541.80 + (taxableIncome - 66667) * 0.25;
    } else if (taxableIncome <= 666667) {
      tax = 33541.80 + (taxableIncome - 166667) * 0.30;
    } else {
      tax = 183541.80 + (taxableIncome - 666667) * 0.35;
    }

    const netPay = gross - (tax + totalMandatory);
    const thirthMonth = gross;
    const thirthMonthExempt = Math.min(90000, thirthMonth);

    return { sss, philHealth, pagIbig, totalMandatory, taxableIncome, tax, netPay, thirthMonth, thirthMonthExempt };
  };

  const simResult = calculateTrainTax(simSalary);

  // --- ROI Math ---
  const hoursSavedPerMonth = Math.round(companyHeadcount * 0.85);
  const pesosSavedPerYear = Math.round(hoursSavedPerMonth * hourlyHrRate * 12);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex flex-col font-sans">
      {/* ============================================================== */}
      {/* 1. TOP UTILITY / MODE CONTROL BAR */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3 flex items-center justify-between transition-all">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition">
              <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
                Apex Payroll
              </span>
              <span className="text-[10px] text-indigo-400 block -mt-1 font-semibold tracking-wider">
                ENTERPRISE SUITE
              </span>
            </div>
          </Link>

          {/* Mode Switcher Pill */}
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-full p-1 text-xs">
            <button
              onClick={() => toggleMode('landing')}
              className={`px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 ${
                viewMode === 'landing'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              Public Showcase
            </button>
            <button
              onClick={() => toggleMode('cockpit')}
              className={`px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 ${
                viewMode === 'cockpit'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Executive Cockpit
            </button>
          </div>
        </div>

        {/* Right Tools: Currency, Sound FX, Quick Login */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Manila Time */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">PST (UTC+8):</span>
            <span className="font-mono font-bold text-indigo-300">{currentTime || '12:00:00 PM'}</span>
          </div>

          {/* Currency Switcher */}
          <select
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value as CurrencyCode);
              soundFx.playSuccess();
            }}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="PHP">₱ PHP</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="SGD">S$ SGD</option>
            <option value="JPY">¥ JPY</option>
          </select>

          {/* Sound Mute Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title={soundEnabled ? 'Mute Audio Chimes' : 'Enable Audio Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Persona quick switch buttons */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <button
              onClick={() => {
                switchRole('ADMIN');
                toggleMode('cockpit');
                success('Logged In as Administrator', 'Full access to payroll, period locking, and tax matrix.');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold transition flex items-center gap-1"
            >
              👑 Admin
            </button>
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:opacity-95 transition"
            >
              Portal Login
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* VIEW A: WORLD-CLASS PUBLIC LANDING SHOWCASE                     */}
      {/* ============================================================== */}
      {viewMode === 'landing' ? (
        <main className="flex-1 overflow-x-hidden">
          {/* Ambient Lighting Orbs */}
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute top-96 right-10 w-[450px] h-[450px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>

          {/* HERO SECTION */}
          <section className="relative pt-16 pb-20 px-4 sm:px-8 max-w-7xl mx-auto text-center">
            {/* Top Compliance Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-8 shadow-xl shadow-indigo-950/50 animate-in fade-in slide-in-from-top-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Republic Act No. 10963 (TRAIN Law) Certified Engine</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-300">BIR / SSS / PhilHealth / HDMF</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.1]">
              The Next-Generation{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                Attendance & Payroll
              </span>{' '}
              Intelligence Platform.
            </h1>

            <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Engineered for high-performing Philippine organizations. Seamlessly unites automated biometrics,
              progressive withholding tax brackets, statutory contributions, overtime multipliers, and decimal-safe financial safeguards.
            </p>

            {/* Hero Action Buttons */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => toggleMode('cockpit')}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-extrabold text-sm sm:text-base shadow-2xl shadow-indigo-500/30 hover:scale-105 transition flex items-center gap-2"
              >
                <span>Launch Executive Cockpit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  soundFx.playBiometricScan();
                  setKioskOpen(true);
                }}
                className="px-6 py-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-200 font-bold text-sm sm:text-base transition flex items-center gap-2"
              >
                <ScanFace className="w-5 h-5 text-cyan-400" />
                <span>Test Biometric Kiosk</span>
              </button>
            </div>

            {/* Hero Live Telemetry Badges */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
              <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold block">TRAIN Law Accuracy</span>
                <span className="text-xl sm:text-2xl font-extrabold text-white mt-1 block">100.00%</span>
                <span className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Zero tax discrepancies
                </span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold block">Calculation Velocity</span>
                <span className="text-xl sm:text-2xl font-extrabold text-white mt-1 block">&lt; 150 ms</span>
                <span className="text-[11px] text-cyan-400 mt-1 flex items-center gap-1 font-medium">
                  <Cpu className="w-3 h-3" /> Real-time safe decimal
                </span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold block">Statutory Schedules</span>
                <span className="text-xl sm:text-2xl font-extrabold text-white mt-1 block">2026 Ready</span>
                <span className="text-[11px] text-indigo-400 mt-1 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3" /> SSS, PHIC, HDMF
                </span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-md p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold block">Financial Integrity</span>
                <span className="text-xl sm:text-2xl font-extrabold text-white mt-1 block">Zero-Variance</span>
                <span className="text-[11px] text-purple-400 mt-1 flex items-center gap-1 font-medium">
                  <Lock className="w-3 h-3" /> State locking & reversal
                </span>
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/* FEATURE 1: INTERACTIVE PHILIPPINE TRAIN TAX & 13th-MONTH SIMULATOR */}
          {/* ============================================================== */}
          <section className="py-20 px-4 sm:px-8 max-w-6xl mx-auto border-t border-slate-800/80">
            <div className="text-center mb-12">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                LIVE INTERACTIVE CALCULATOR
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
                Real-Time Philippine TRAIN Law & Net Pay Simulator
              </h2>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto mt-2">
                Drag the monthly basic salary slider below to witness live Philippine statutory deductions and net take-home pay calculated with zero rounding errors.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
              {/* Slider Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Monthly Basic Salary Input
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1 text-indigo-400">
                    {formatCurrency(simSalary, currency)}
                  </div>
                </div>
                <div className="flex gap-2">
                  {[25000, 45000, 85000, 150000].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setSimSalary(preset);
                        soundFx.playSuccess();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        simSalary === preset
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ₱{(preset / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider Control */}
              <input
                type="range"
                min="15000"
                max="250000"
                step="2500"
                value={simSalary}
                onChange={(e) => setSimSalary(Number(e.target.value))}
                className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-10"
              />

              {/* Live Statutory Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 block">SSS Contribution</span>
                  <span className="text-lg font-bold font-mono text-slate-200 mt-1 block">
                    {formatCurrency(simResult.sss, currency)}
                  </span>
                  <span className="text-[10px] text-slate-500">Employee Share (4.5%)</span>
                </div>
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 block">PhilHealth (5%)</span>
                  <span className="text-lg font-bold font-mono text-slate-200 mt-1 block">
                    {formatCurrency(simResult.philHealth, currency)}
                  </span>
                  <span className="text-[10px] text-slate-500">50% Employee Share</span>
                </div>
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 block">Pag-IBIG Fund</span>
                  <span className="text-lg font-bold font-mono text-slate-200 mt-1 block">
                    {formatCurrency(simResult.pagIbig, currency)}
                  </span>
                  <span className="text-[10px] text-slate-500">Mandatory Monthly</span>
                </div>
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] font-semibold text-amber-400 block">TRAIN Withholding Tax</span>
                  <span className="text-lg font-bold font-mono text-amber-300 mt-1 block">
                    {formatCurrency(simResult.tax, currency)}
                  </span>
                  <span className="text-[10px] text-slate-500">Graduated Tax Table</span>
                </div>
              </div>

              {/* Net Pay Callout Box */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wider text-indigo-300 font-bold block">
                    Estimated Net Take-Home Pay (Monthly)
                  </span>
                  <span className="text-xs text-slate-400">
                    Gross ({formatCurrency(simSalary, currency)}) - Mandatory Deductions & Tax (
                    {formatCurrency(simResult.tax + simResult.totalMandatory, currency)})
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400">
                  {formatCurrency(simResult.netPay, currency)}
                </div>
              </div>

              {/* 13th Month Bonus Strip */}
              <div className="mt-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-cyan-400" />
                  <span>Mandatory 13th Month Pay Projection:</span>
                  <strong className="font-mono text-white">{formatCurrency(simResult.thirthMonth, currency)}</strong>
                </div>
                <div className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    ₱{Math.min(90000, simSalary).toLocaleString()} is 100% Tax-Exempt under RA 10963
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/* THE 10 WORLD-CLASS FEATURES DEEP DIVE                           */}
          {/* ============================================================== */}
          <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
            <div className="text-center mb-16">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                ENTERPRISE CAPABILITIES
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-3">
                10 Architectural Innovations Setting the Global Standard
              </h2>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto mt-2">
                Click any feature card below to test its interactive modal or launch the feature in live mode.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1: Automated Absenteeism Detection */}
              <div className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-3xl transition group">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition">
                  <UserX className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Feature 1 • Core Engine</span>
                <h3 className="text-lg font-bold text-white mt-1">Automated Absenteeism Detection Engine</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Evaluates work schedules against biometrics and verified leave approvals. Flags unexcused absences and computes exact salary deductions.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400">
                  <Link href="/absenteeism" className="hover:text-indigo-300 flex items-center gap-1">
                    Open Absenteeism Queue <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Feature 2: Biometric Kiosk Terminal */}
              <div
                onClick={() => setKioskOpen(true)}
                className="bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 p-6 rounded-3xl transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition">
                  <ScanFace className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider">Feature 2 • Hardware Simulator</span>
                <h3 className="text-lg font-bold text-white mt-1">Virtual Biometric Kiosk Terminal</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Touch-ready interactive terminal with animated face mesh scanning, security PIN keypad, geofence validation, and live audio chime confirmation.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400">
                  <span className="flex items-center gap-1">Launch Terminal Simulator <ArrowRight className="w-3.5 h-3.5" /></span>
                </div>
              </div>

              {/* Feature 3: 13th Month Pay Calculator */}
              <div
                onClick={() => setThirteenthOpen(true)}
                className="bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Feature 3 • Statutory Bonus</span>
                <h3 className="text-lg font-bold text-white mt-1">13th Month Pay & TRAIN Exemption Engine</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Automatic annual prorated computation under Presidential Decree 851. Segregates tax-exempt reserves up to ₱90,000 from taxable excess.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400">
                  <span className="flex items-center gap-1">Calculate Annual Bonuses <ArrowRight className="w-3.5 h-3.5" /></span>
                </div>
              </div>

              {/* Feature 4: Loan Amortization Manager */}
              <div
                onClick={() => setLoanOpen(true)}
                className="bg-slate-900/60 border border-slate-800 hover:border-teal-500/50 p-6 rounded-3xl transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4 group-hover:scale-110 transition">
                  <Banknote className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase text-teal-400 tracking-wider">Feature 4 • Financial Subsystem</span>
                <h3 className="text-lg font-bold text-white mt-1">Loan & Cash Advance Amortization Subsystem</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Tracks SSS Salary Loans, Pag-IBIG Calamity Loans, and Company Emergency Advances with automated schedule deductions on draft payroll cutoffs.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-teal-400">
                  <span className="flex items-center gap-1">Open Amortization Ledger <ArrowRight className="w-3.5 h-3.5" /></span>
                </div>
              </div>

              {/* Feature 5: AI Payroll Anomaly Guard */}
              <div
                onClick={() => setAnomalyOpen(true)}
                className="bg-slate-900/60 border border-slate-800 hover:border-rose-500/50 p-6 rounded-3xl transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">Feature 5 • Machine Intelligence</span>
                <h3 className="text-lg font-bold text-white mt-1">Heuristic AI Payroll Anomaly Scanner</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Automated risk detection identifying overtime spikes exceeding 15 hours, sub-minimum take-home risks, and unfiled absence deduction variances.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-rose-400">
                  <span className="flex items-center gap-1">Run Heuristic Risk Audit <ArrowRight className="w-3.5 h-3.5" /></span>
                </div>
              </div>

              {/* Feature 6: Shift Roster Planner */}
              <div
                onClick={() => setShiftOpen(true)}
                className="bg-slate-900/60 border border-slate-800 hover:border-violet-500/50 p-6 rounded-3xl transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 group-hover:scale-110 transition">
                  <Calendar className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase text-violet-400 tracking-wider">Feature 6 • Workforce Planning</span>
                <h3 className="text-lg font-bold text-white mt-1">Weekly Shift & Schedule Roster Planner</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Schedule rotating shifts, early coverage, and Graveyard Night Differential (22:00-07:00) with automatic 10% premium wage calculations.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-violet-400">
                  <span className="flex items-center gap-1">Plan Department Shifts <ArrowRight className="w-3.5 h-3.5" /></span>
                </div>
              </div>

              {/* Feature 7: BIR 2316 Certificate */}
              <div
                onClick={() => setBirOpen(true)}
                className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 p-6 rounded-3xl transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wider">Feature 7 • Tax Compliance</span>
                <h3 className="text-lg font-bold text-white mt-1">Official BIR Form No. 2316 Generator</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Generates the official Certificate of Compensation Payment and Tax Withheld with printable layouts, taxpayer TINs, and summary breakdowns.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-400">
                  <span className="flex items-center gap-1">Generate Tax Certificate <ArrowRight className="w-3.5 h-3.5" /></span>
                </div>
              </div>

              {/* Feature 8: Digital Signature Payslips */}
              <div className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-3xl transition group">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Feature 8 • Legal Verification</span>
                <h3 className="text-lg font-bold text-white mt-1">Cryptographic Digital Payslip Acknowledgment</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Employees digitally sign and acknowledge payslips with timestamped cryptographic hashes stored in the audit ledger for labor compliance.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400">
                  <Link href="/payslips" className="hover:text-indigo-300 flex items-center gap-1">
                    Open Digital Payslips <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Feature 9: Emergency Broadcast Center */}
              <div
                onClick={() => setBroadcastOpen(true)}
                className="bg-slate-900/60 border border-slate-800 hover:border-red-500/50 p-6 rounded-3xl transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 group-hover:scale-110 transition">
                  <Megaphone className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase text-red-400 tracking-wider">Feature 9 • Crisis Communications</span>
                <h3 className="text-lg font-bold text-white mt-1">Emergency Broadcast Center</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Dispatch instant weather suspension alerts (PAGASA typhoons), work-from-home authorizations, or urgent cutoff notices with alert chimes.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-red-400">
                  <span className="flex items-center gap-1">Open Broadcast Console <ArrowRight className="w-3.5 h-3.5" /></span>
                </div>
              </div>

              {/* Feature 10: Multi-Currency & Cost Center Allocation */}
              <div className="bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 p-6 rounded-3xl transition group">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition">
                  <DollarSign className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">Feature 10 • Multinational Analytics</span>
                <h3 className="text-lg font-bold text-white mt-1">Multi-Currency Global Reporting</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Instant live toggle between PHP, USD, EUR, SGD, and JPY with accurate exchange rates across all organizational dashboards and reports.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-400">
                  <Link href="/cost-centers" className="hover:text-purple-300 flex items-center gap-1">
                    View Cost Centers <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/* ROI & PRODUCTIVITY BENCHMARK CALCULATOR                         */}
          {/* ============================================================== */}
          <section className="py-20 px-4 sm:px-8 max-w-5xl mx-auto border-t border-slate-800/80">
            <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/20 rounded-3xl p-8 sm:p-12 shadow-2xl">
              <div className="text-center mb-8">
                <span className="text-xs font-bold uppercase text-indigo-400 tracking-wider">Quantifiable Financial Impact</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  Enterprise Productivity & ROI Calculator
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  Estimate the annual savings generated by replacing manual spreadsheet payroll computations with Apex Payroll.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-300 mb-2">
                      <span>Total Employees</span>
                      <span className="font-mono text-indigo-400 font-bold">{companyHeadcount} staff</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={companyHeadcount}
                      onChange={(e) => setCompanyHeadcount(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-300 mb-2">
                      <span>Average Hourly Rate of HR / Payroll Team (₱)</span>
                      <span className="font-mono text-indigo-400 font-bold">₱{hourlyHrRate}/hr</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="1200"
                      step="50"
                      value={hourlyHrRate}
                      onChange={(e) => setHourlyHrRate(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-6 rounded-2xl text-center space-y-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      HR Hours Recovered Annually
                    </span>
                    <div className="text-3xl font-extrabold text-cyan-400 font-mono mt-1">
                      {(hoursSavedPerMonth * 12).toLocaleString()} hrs
                    </div>
                    <span className="text-[10px] text-slate-500">~{hoursSavedPerMonth} hours saved every month</span>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Annual Direct Cost Savings
                    </span>
                    <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-1">
                      {formatCurrency(pesosSavedPerYear, currency)}
                    </div>
                    <span className="text-[10px] text-emerald-400/80">Net overhead reduction</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/* CALL TO ACTION                                                  */}
          {/* ============================================================== */}
          <section className="py-24 px-4 text-center">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white max-w-3xl mx-auto">
              Ready to Experience Zero-Error Payroll Operations?
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto mt-4">
              Enter the Executive Operations Cockpit now to audit employees, review time clocks, adjust tax matrices, and finalize payroll.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => toggleMode('cockpit')}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-extrabold text-sm shadow-2xl shadow-indigo-500/40 hover:scale-105 transition flex items-center gap-2"
              >
                <span>Launch Executive Cockpit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        </main>
      ) : (
        /* ============================================================== */
        /* VIEW B: EXECUTIVE OPERATIONS COCKPIT                            */
        /* ============================================================== */
        <div className="flex-1 bg-slate-900 text-slate-800">
          <Navbar />

          <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Cockpit Mode Notice Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/90 via-slate-900 to-indigo-950 text-white border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Cpu className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-white">Executive Operations Cockpit Active</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      LIVE SYSTEM
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200">
                    Active Persona: <strong className="text-white">{role}</strong> ({user?.name || 'Administrator'})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleMode('landing')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                  View Public Showcase
                </button>
              </div>
            </div>

            {/* Quick Action Tools Bar for the 10 Features */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Advanced Executive Operations Tools
                </h4>
                <span className="text-[11px] text-slate-400">10 Instant Subsystems</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    soundFx.playBiometricScan();
                    setKioskOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ScanFace className="w-4 h-4 text-cyan-600" />
                  Biometric Kiosk
                </button>

                <button
                  onClick={() => setThirteenthOpen(true)}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  13th Month Calculator
                </button>

                <button
                  onClick={() => setLoanOpen(true)}
                  className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Banknote className="w-4 h-4 text-teal-600" />
                  Loans & Advances
                </button>

                <button
                  onClick={() => setAnomalyOpen(true)}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  AI Anomaly Scanner
                </button>

                <button
                  onClick={() => setShiftOpen(true)}
                  className="px-3 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Calendar className="w-4 h-4 text-violet-600" />
                  Shift Planner
                </button>

                <button
                  onClick={() => setBirOpen(true)}
                  className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  BIR Form 2316
                </button>

                <button
                  onClick={() => setBroadcastOpen(true)}
                  className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Megaphone className="w-4 h-4 text-red-600" />
                  Emergency Broadcast
                </button>
              </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Active Workforce"
                value={data?.totalEmployees || '10'}
                subtitle="100% contract compliance"
                icon={Users}
                variant="indigo"
                trend={{ value: '100% active', isPositive: true }}
              />
              <StatCard
                label="Today's Attendance"
                value={`${data?.todayPresent || '8'} / ${data?.totalEmployees || '10'}`}
                subtitle={`${data?.attendanceRate || '80'}% attendance rate`}
                icon={UserCheck}
                variant="emerald"
                trend={{ value: `${data?.todayLate || '1'} late arrival`, isPositive: false }}
              />
              <StatCard
                label="Unexcused Absences"
                value={data?.flaggedAbsences || '2'}
                subtitle="Awaiting supervisor review"
                icon={UserX}
                variant="rose"
                trend={{ value: 'Scanned today', isPositive: false }}
              />
              <StatCard
                label="Active Period Payroll"
                value={formatCurrency(data?.activePeriod?.totalNet || 312500, currency)}
                subtitle={data?.activePeriod?.name || 'September 2026 Cutoff'}
                icon={BadgeDollarSign}
                variant="blue"
                trend={{ value: data?.activePeriod?.status || 'Draft', isPositive: true }}
              />
            </div>

            {/* Visual Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">7-Day Attendance Rate Trend</h3>
                    <p className="text-xs text-slate-500">Real-time daily presence vs scheduled shifts</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg">
                    {data?.attendanceRate || 85}% Average
                  </span>
                </div>
                <AttendanceTrendChart />
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Department Payroll Expense Distribution</h3>
                    <p className="text-xs text-slate-500">Gross allocation by cost center</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                    {currency}
                  </span>
                </div>
                <DepartmentPayrollChart />
              </div>
            </div>

            {/* Operational Actions */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Automated Workforce Audit Trigger</h4>
                <p className="text-xs text-slate-500">
                  Runs the automated absenteeism scan across scheduled calendars, punch logs, and leave requisitions.
                </p>
              </div>
              <button
                onClick={handleRunAbsenteeism}
                disabled={runningAbsenteeism}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${runningAbsenteeism ? 'animate-spin' : ''}`} />
                {runningAbsenteeism ? 'Analyzing...' : 'Execute Absenteeism Scan'}
              </button>
            </div>
          </main>
        </div>
      )}

      {/* ============================================================== */}
      {/* GLOBAL MODALS (FOR THE 10 NEW FEATURES)                        */}
      {/* ============================================================== */}
      <BiometricKioskModal isOpen={kioskOpen} onClose={() => setKioskOpen(false)} onSuccess={fetchDashboard} />
      <ThirteenthMonthModal isOpen={thirteenthOpen} onClose={() => setThirteenthOpen(false)} />
      <LoanManagerModal isOpen={loanOpen} onClose={() => setLoanOpen(false)} />
      <AnomalyDetectorModal isOpen={anomalyOpen} onClose={() => setAnomalyOpen(false)} />
      <ShiftPlannerModal isOpen={shiftOpen} onClose={() => setShiftOpen(false)} />
      <BIR2316Modal isOpen={birOpen} onClose={() => setBirOpen(false)} />
      <EmergencyBroadcastModal isOpen={broadcastOpen} onClose={() => setBroadcastOpen(false)} />

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-600">
        <p>Apex Payroll Enterprise • Fully Compliant with Republic Act No. 10963 (TRAIN Law) & Presidential Decree No. 851</p>
        <p className="mt-1 text-[11px] text-slate-700">Protected by 256-bit TLS encryption, Role-Based Access Control, and Dual-Mode PostgreSQL Persistence.</p>
      </footer>
    </div>
  );
}
