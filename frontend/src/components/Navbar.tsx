'use client';

import React, { useState } from 'react';
import { Search, Clock, LogOut, ChevronDown, UserCircle2, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NotificationDropdown } from './NotificationDropdown';
import { GlobalSearchModal } from './GlobalSearchModal';
import { apiRequest } from '../lib/api';

export function Navbar({ title }: { title: string }) {
  const { user, role, switchRole, logout } = useAuth();
  const { success, error } = useToast();
  const [searchOpen, setSearchOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [clocking, setClocking] = useState(false);

  const handleQuickClockIn = async () => {
    setClocking(true);
    const empId = user?.employeeId || 'EMP-001';
    const res = await apiRequest('/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify({ empId }),
    });
    setClocking(false);

    if (res.success) {
      success('Clock In Successful', `Recorded time-in for ${user?.name || empId}.`);
    } else {
      error('Clock In Notice', res.error?.message || 'Could not record clock in.');
    }
  };

  const handleQuickClockOut = async () => {
    setClocking(true);
    const empId = user?.employeeId || 'EMP-001';
    const res = await apiRequest('/attendance/clock-out', {
      method: 'POST',
      body: JSON.stringify({ empId }),
    });
    setClocking(false);

    if (res.success) {
      success('Clock Out Successful', `Recorded time-out for ${user?.name || empId}.`);
    } else {
      error('Clock Out Notice', res.error?.message || 'Could not record clock out.');
    }
  };

  return (
    <>
      <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-20 px-6 flex items-center justify-between">
        {/* Page Title */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
        </div>

        {/* Center: Search Trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-400 text-xs font-medium w-72 transition-all"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="flex-1 text-left">Search anything...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-500 shadow-2xs">
            Ctrl K
          </kbd>
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Attendance Punch */}
          <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            <button
              disabled={clocking}
              onClick={handleQuickClockIn}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-white rounded-lg transition-all flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Time In</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              disabled={clocking}
              onClick={handleQuickClockOut}
              className="px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-white rounded-lg transition-all"
            >
              Time Out
            </button>
          </div>

          {/* Notifications */}
          <NotificationDropdown />

          {/* Role Switcher & Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {user?.name || 'Administrator'}
                </div>
                <div className="text-[10px] font-semibold text-indigo-600 tracking-wide uppercase">
                  {role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {roleMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setRoleMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
                  <div className="p-3.5 bg-slate-50 border-b border-slate-100">
                    <div className="font-semibold text-xs text-slate-900">{user?.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-medium">
                      <UserCircle2 className="w-3.5 h-3.5" />
                      <span>Active Role: <strong>{role}</strong></span>
                    </div>
                  </div>

                  {/* Switch Persona for Demo */}
                  <div className="p-2 border-b border-slate-100">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>Switch Persona (Demo)</span>
                    </div>

                    <button
                      onClick={() => {
                        switchRole('ADMIN');
                        setRoleMenuOpen(false);
                        success('Role Switched', 'Switched to System Administrator view.');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                        role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>System Administrator</span>
                      {role === 'ADMIN' && <span className="text-[10px] text-indigo-600">Active</span>}
                    </button>

                    <button
                      onClick={() => {
                        switchRole('SUPERVISOR');
                        setRoleMenuOpen(false);
                        success('Role Switched', 'Switched to Maria Santos (Finance Supervisor) view.');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                        role === 'SUPERVISOR' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>Maria Santos (Supervisor)</span>
                      {role === 'SUPERVISOR' && <span className="text-[10px] text-indigo-600">Active</span>}
                    </button>

                    <button
                      onClick={() => {
                        switchRole('EMPLOYEE');
                        setRoleMenuOpen(false);
                        success('Role Switched', 'Switched to Juan Dela Cruz (Employee) view.');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                        role === 'EMPLOYEE' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>Juan Dela Cruz (Employee)</span>
                      {role === 'EMPLOYEE' && <span className="text-[10px] text-indigo-600">Active</span>}
                    </button>
                  </div>

                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        logout();
                        setRoleMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
