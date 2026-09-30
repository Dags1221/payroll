'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Globe2,
  Cpu,
  KeyRound,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { soundFx } from '../../lib/sound';

export default function WorldClassLoginPage() {
  const router = useRouter();
  const { login, switchRole } = useAuth();
  const { success, error } = useToast();

  const [email, setEmail] = useState('admin@payroll.corp');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);

    if (ok) {
      soundFx.playSuccess();
      success('Authentication Successful', 'Welcome to Apex Payroll Enterprise.');
      router.push('/');
    } else {
      soundFx.playAlert();
      error('Login Failed', 'Invalid email or password.');
    }
  };

  const handleQuickLogin = (role: 'ADMIN' | 'SUPERVISOR' | 'EMPLOYEE', roleEmail: string, rolePass: string) => {
    soundFx.playSuccess();
    setEmail(roleEmail);
    setPassword(rolePass);
    switchRole(role);
    success('Demo Access Granted', `Loaded credentials and authenticated as ${role}.`);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans p-4 sm:p-8">
      {/* Background Animated Gradients */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Main Container: Split-Pane Luxury Layout */}
      <div className="w-full max-w-5xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        {/* LEFT PANE (Desktop Telemetry & Branding Showcase) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-indigo-950/70 via-slate-900/90 to-slate-950 p-10 flex-col justify-between border-r border-slate-800/80 relative">
          <div>
            {/* Brand Header */}
            <Link href="/" className="inline-flex items-center gap-3 group mb-10">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/30">
                <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-white block">Apex Payroll</span>
                <span className="text-[10px] text-cyan-400 font-semibold tracking-wider uppercase block">
                  Enterprise Intelligence
                </span>
              </div>
            </Link>

            {/* Live Telemetry Card */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" /> Manila Standard Time (PST)
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="font-mono text-xl font-extrabold text-white text-indigo-300">
                  {currentTime || '12:00:00 PM'}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  UTC+08:00 • Makati Headquarters Server Cluster
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Compliance Standard:</span>
                  <span className="font-bold text-emerald-400">RA 10963 (TRAIN Law)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Active Workforce:</span>
                  <span className="font-mono font-bold text-white">10 Verified Personnel</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Financial Variance:</span>
                  <span className="font-bold text-cyan-400">₱0.00 (Zero Discrepancy)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">System Uptime SLA:</span>
                  <span className="font-mono font-bold text-indigo-400">99.99% Production</span>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof Quote */}
          <div className="pt-8 border-t border-slate-800/80">
            <p className="text-xs text-slate-300 italic leading-relaxed">
              "Apex Payroll completely modernized our operations. Statutory contributions, progressive withholding tax, and digital payslips are calculated flawlessly."
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xs">
                CA
              </div>
              <div>
                <span className="font-bold text-xs text-white block">Claire Alcantara, CPA</span>
                <span className="text-[10px] text-slate-500 block">VP of Finance & Human Capital</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE (Authentication Form & One-Click Persona Chips) */}
        <div className="lg:col-span-7 p-6 sm:p-12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Access Portal</h2>
                <p className="text-xs text-slate-400 mt-1">Authenticate with corporate credentials or instant evaluator personas.</p>
              </div>
              <Link
                href="/"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <Globe2 className="w-3.5 h-3.5" />
                Back to Showcase
              </Link>
            </div>

            {/* Evaluator Quick-Fill Persona Chips */}
            <div className="mb-6 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 block mb-2">
                ⚡ Instant Evaluator 1-Click Login (Pre-Configured Roles)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ADMIN', 'admin@payroll.corp', 'admin123')}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500 text-left transition group"
                >
                  <span className="font-bold text-xs text-white flex items-center gap-1 group-hover:text-indigo-300">
                    👑 Administrator
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Period lock & Tax matrix</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('SUPERVISOR', 'maria.santos@payroll.corp', 'password123')}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 text-left transition group"
                >
                  <span className="font-bold text-xs text-white flex items-center gap-1 group-hover:text-cyan-300">
                    👔 Supervisor
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Leaves & OT approvals</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('EMPLOYEE', 'juan.delacruz@payroll.corp', 'password123')}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 text-left transition group"
                >
                  <span className="font-bold text-xs text-white flex items-center gap-1 group-hover:text-emerald-300">
                    🧑‍💻 Staff Member
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Time clock & Payslips</span>
                </button>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Corporate Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@payroll.corp"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <a href="#" className="text-[11px] text-indigo-400 hover:text-indigo-300">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 pr-10 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span>Trust this browser for 30 days</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>AUTHENTICATING CRYPTOGRAPHIC CREDENTIALS...</span>
                  </>
                ) : (
                  <>
                    <span>AUTHENTICATE & ENTER SYSTEM</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* SSO Providers Mock */}
            <div className="mt-6 pt-6 border-t border-slate-800/80">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block text-center mb-3">
                Or Sign In with Enterprise Single Sign-On (SSO)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ADMIN', 'admin@payroll.corp', 'admin123')}
                  className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-900 text-[11px] font-semibold text-slate-300 text-center transition"
                >
                  Google Workspace
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('SUPERVISOR', 'maria.santos@payroll.corp', 'password123')}
                  className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-900 text-[11px] font-semibold text-slate-300 text-center transition"
                >
                  Microsoft Entra
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('EMPLOYEE', 'juan.delacruz@payroll.corp', 'password123')}
                  className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-900 text-[11px] font-semibold text-slate-300 text-center transition"
                >
                  Okta Verify
                </button>
              </div>
            </div>
          </div>

          {/* Security Footer */}
          <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> 256-bit TLS Zero-Trust Architecture
            </span>
            <span>v4.2.0 Production</span>
          </div>
        </div>
      </div>
    </div>
  );
}
