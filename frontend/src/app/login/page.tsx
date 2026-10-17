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
  Shield,
  UserPlus,
  User,
  Phone,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { soundFx } from '../../lib/sound';
import { apiRequest } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, switchRole } = useAuth();
  const { success, error, info } = useToast();

  // Mode: 'login' (Manual Login) or 'signup' (Employee Signup)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Login Form State
  const [email, setEmail] = useState('admin@payroll.corp');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Signup Form State
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Information Technology',
    position: 'Associate Staff',
    phone: '+63 917 000 0000'
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signingUp, setSigningUp] = useState(false);

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

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      error('Missing Credentials', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);

    if (ok) {
      soundFx.playSuccess();
      success('Authentication Successful', 'Welcome to EAMPMS.');
      router.push('/');
    } else {
      soundFx.playAlert();
      error('Login Failed', 'Invalid email or password.');
    }
  };

  const handleFillCredentials = (targetEmail: string, targetPass: string, roleName: string) => {
    soundFx.playBiometricScan();
    setEmail(targetEmail);
    setPassword(targetPass);
    info('Credentials Loaded', `Pre-filled ${roleName} credentials into manual login fields.`);
  };

  const handleEmployeeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.name.trim() || !signupForm.email.trim() || !signupForm.password.trim()) {
      error('Validation Error', 'Full Name, Corporate Email, and Password are required.');
      return;
    }

    setSigningUp(true);
    const res = await apiRequest<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(signupForm)
    });
    setSigningUp(false);

    if (res.success && res.data) {
      soundFx.playSuccess();
      localStorage.setItem('payroll_token', res.data.token);
      localStorage.setItem('payroll_user', JSON.stringify(res.data.user));
      success('Account Registered!', `Welcome to EAMPMS, ${signupForm.name}! Your QR attendance access is ready.`);
      router.push('/qr-scanner');
    } else {
      soundFx.playAlert();
      error('Registration Failed', res.error?.message || 'Could not register account.');
    }
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
                <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center text-indigo-400 font-extrabold text-sm">
                  EA
                </div>
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white block">EAMPMS</span>
                <span className="text-[10px] text-cyan-400 font-semibold tracking-wider uppercase block">
                  Attendance & Payroll System
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
                  UTC+08:00 • Enterprise Identity & Biometric Node
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">System Title:</span>
                  <span className="font-bold text-white">EAMPMS</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Full Name:</span>
                  <span className="font-semibold text-cyan-300 text-[11px] text-right">
                    Employee Attendance Monitoring &<br />Payroll Management System
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Compliance Standard:</span>
                  <span className="font-bold text-emerald-400">RA 10963 (TRAIN Law)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Fixed Admin Account:</span>
                  <span className="font-mono text-indigo-300">admin@payroll.corp</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Fixed Supervisor Account:</span>
                  <span className="font-mono text-cyan-300">maria.santos@payroll.corp</span>
                </div>
              </div>
            </div>
          </div>

          {/* Governance Notice */}
          <div className="pt-6 border-t border-slate-800/80">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>Enterprise RBAC Governance:</strong> Administrator and Supervisor credentials are fixed system accounts. Employees use credentials provisioned by HR/Admin or register through the employee portal.
            </p>
          </div>
        </div>

        {/* RIGHT PANE (Manual Login / Signup Tabs & Form) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Header with Mode Toggle Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  {authMode === 'login' ? 'Manual Portal Login' : 'Employee Registration'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {authMode === 'login'
                    ? 'Authenticate with your assigned username/email and password.'
                    : 'Create your verified employee account to access attendance & QR badges.'}
                </p>
              </div>

              {/* Mode Toggle Switcher */}
              <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    authMode === 'login'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Manual Login
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    authMode === 'signup'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Employee Signup
                </button>
              </div>
            </div>

            {/* TAB 1: MANUAL LOGIN */}
            {authMode === 'login' ? (
              <div className="space-y-5">
                {/* Fixed Accounts Documentation & 1-Click Fillers */}
                <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
                      Fixed System Accounts (System Presets)
                    </span>
                    <span className="text-[10px] text-cyan-300 font-mono">Ready to Use</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-white block">👑 Administrator</span>
                        <span className="text-[10px] text-slate-400 block font-mono">admin@payroll.corp</span>
                        <span className="text-[9px] text-indigo-400 block font-mono">Password: admin123</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFillCredentials('admin@payroll.corp', 'admin123', 'Administrator')}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/60 border border-indigo-500/40 text-[10px] font-bold text-indigo-200 transition"
                      >
                        Auto-Fill
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-white block">👔 Supervisor</span>
                        <span className="text-[10px] text-slate-400 block font-mono">maria.santos@payroll.corp</span>
                        <span className="text-[9px] text-cyan-400 block font-mono">Password: employee123</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFillCredentials('maria.santos@payroll.corp', 'employee123', 'Supervisor')}
                        className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/60 border border-cyan-500/40 text-[10px] font-bold text-cyan-200 transition"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                    <span>🧑‍💻 <strong>Employee Accounts:</strong> Created by Admin via Account Generator, or sign up below.</span>
                    <button
                      type="button"
                      onClick={() => handleFillCredentials('juan.delacruz@payroll.corp', 'employee123', 'Sample Employee')}
                      className="text-emerald-400 hover:underline font-mono text-[10px]"
                    >
                      Fill Sample Employee
                    </button>
                  </div>
                </div>

                {/* Manual Login Form */}
                <form onSubmit={handleManualLogin} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Email Address or Username <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@payroll.corp or employee@payroll.corp"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-xs text-white focus:outline-none focus:border-indigo-500 transition font-medium"
                      />
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => info('Password Guidance', 'For Admin use admin123. For Supervisor and Sample Employee use employee123. For provisioned employees, use the temporary password handed out by your administrator.')}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300"
                      >
                        Need credentials help?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 pr-10 text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition"
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
                      <span>Remember credentials on this workstation</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Authenticating Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Authenticate & Enter EAMPMS</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* TAB 2: EMPLOYEE SIGNUP */
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-300 mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Employee Self-Registration Portal</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Register your verified employee profile to activate digital QR attendance access. Admin and Supervisor roles are fixed and cannot be self-registered.
                  </p>
                </div>

                <form onSubmit={handleEmployeeSignup} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={signupForm.name}
                          onChange={e => setSignupForm({ ...signupForm, name: e.target.value })}
                          placeholder="e.g. Maria Clara Santos"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 pl-9 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                        <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Corporate Email Address *</label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={signupForm.email}
                          onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                          placeholder="maria.clara@payroll.corp"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 pl-9 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Department</label>
                      <select
                        value={signupForm.department}
                        onChange={e => setSignupForm({ ...signupForm, department: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Information Technology">Information Technology</option>
                        <option value="Finance">Finance</option>
                        <option value="Operations">Operations</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Engineering">Engineering</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Job Title / Position</label>
                      <input
                        type="text"
                        value={signupForm.position}
                        onChange={e => setSignupForm({ ...signupForm, position: e.target.value })}
                        placeholder="e.g. Staff Analyst"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Create Password *</label>
                      <div className="relative">
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          required
                          value={signupForm.password}
                          onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 pl-9 pr-9 text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                        />
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                        >
                          {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Contact Phone</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={signupForm.phone}
                          onChange={e => setSignupForm({ ...signupForm, phone: e.target.value })}
                          placeholder="+63 917 123 4567"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 pl-9 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={signingUp}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {signingUp ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Registering Employee Account...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Register Account & Access QR Attendance</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Security & System Title Footer */}
          <div className="mt-8 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <strong>EAMPMS</strong> — Employee Attendance Monitoring & Payroll Management System
            </span>
            <span>v4.2.0 Production • RA 10963 Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
