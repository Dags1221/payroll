'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Clock,
  UserX,
  CalendarDays,
  Timer,
  BadgeDollarSign,
  FileSpreadsheet,
  Receipt,
  HeartHandshake,
  PieChart,
  BarChart3,
  ShieldAlert,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const pathname = usePathname();
  const { role, isAdmin } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    ...(isAdmin ? [{ label: 'Employees', href: '/employees', icon: Users }] : []),
    { label: 'Attendance', href: '/attendance', icon: Clock },
    ...(isAdmin ? [{ label: 'Absenteeism Detection', href: '/absenteeism', icon: UserX }] : []),
    { label: 'Leave Requests', href: '/leave', icon: CalendarDays },
    { label: 'Overtime & Comp', href: '/overtime', icon: Timer },
    ...(isAdmin ? [{ label: 'Tax Bracket Matrix', href: '/tax-matrix', icon: BadgeDollarSign }] : []),
    ...(isAdmin ? [{ label: 'Payroll Processing', href: '/payroll', icon: FileSpreadsheet }] : []),
    { label: 'Payslip Viewer', href: '/payslips', icon: Receipt },
    ...(isAdmin ? [{ label: 'Benefits Management', href: '/benefits', icon: HeartHandshake }] : []),
    ...(isAdmin ? [{ label: 'Cost Centers', href: '/cost-centers', icon: PieChart }] : []),
    { label: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
    ...(isAdmin ? [{ label: 'Audit Trail', href: '/audit-logs', icon: ShieldAlert }] : []),
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col flex-shrink-0 min-h-screen sticky top-0 z-30 transition-all">
      {/* Brand header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-tight leading-snug">
              Apex Payroll
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Enterprise Workforce</p>
          </div>
        </Link>
      </div>

      {/* Role Indicator Banner */}
      <div className="px-4 py-2.5 bg-slate-950/50 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-300">
            {role} PORTAL
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
          v2.4 Pro
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile note */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-400">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-slate-300">Philippine Compliant</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/50">
            TRAIN Law
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          Safe decimal payroll with automated statutory reconciliation.
        </p>
      </div>
    </aside>
  );
}
