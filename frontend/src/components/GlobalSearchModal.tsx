'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, FileText, ChevronRight, X, Sparkles } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Employee } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (isOpen) {
      apiRequest<Employee[]>('/employees').then(res => {
        if (res.success && res.data) setEmployees(res.data);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickPages = [
    { title: 'Dashboard', desc: 'Overview, analytics & KPIs', href: '/' },
    { title: 'Employee Directory', desc: 'Manage workforce profiles', href: '/employees' },
    { title: 'Attendance Log', desc: 'Daily punch and status verification', href: '/attendance' },
    { title: 'Absenteeism Detection', desc: 'Automated absence detection queue', href: '/absenteeism' },
    { title: 'Leave Requests', desc: 'Submit and approve leave requisitions', href: '/leave' },
    { title: 'Overtime & Comp', desc: 'Manage overtime calculations & review', href: '/overtime' },
    { title: 'Tax Bracket Matrix', desc: 'Configure progressive tax rates & brackets', href: '/tax-matrix' },
    { title: 'Payroll Processing', desc: 'Run safe decimal payroll & disbursements', href: '/payroll' },
    { title: 'Payslip Viewer', desc: 'Preview and generate digital employee payslips', href: '/payslips' },
    { title: 'Cost Center Distribution', desc: 'Departmental budget & payroll breakdown', href: '/cost-centers' },
    { title: 'Benefits Management', desc: 'Statutory and company allowances', href: '/benefits' },
    { title: 'Reports & Analytics', desc: 'Exportable CSV & printable reports', href: '/reports' },
    { title: 'Audit Trail', desc: 'Security logs and compliance records', href: '/audit-logs' },
  ];

  const filteredPages = quickPages.filter(p =>
    p.title.toLowerCase().includes(query.toLowerCase()) ||
    p.desc.toLowerCase().includes(query.toLowerCase())
  );

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(query.toLowerCase()) ||
    e.id.toLowerCase().includes(query.toLowerCase()) ||
    e.department.toLowerCase().includes(query.toLowerCase()) ||
    e.position.toLowerCase().includes(query.toLowerCase())
  );

  const navigateTo = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
        {/* Search Input bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a module, employee name, ID, or command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 text-slate-800 text-sm outline-none placeholder:text-slate-400 bg-transparent"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results area */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Employees match */}
          {filteredEmployees.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Staff & Personnel ({filteredEmployees.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredEmployees.slice(0, 5).map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => navigateTo(`/employees?id=${emp.id}`)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 leading-tight">{emp.name}</div>
                        <div className="text-xs text-slate-400">{emp.id} • {emp.position} ({emp.department})</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      ₱{emp.salary.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modules match */}
          <div>
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              System Modules
            </div>
            <div className="space-y-1 mt-1">
              {filteredPages.map(page => (
                <button
                  key={page.href}
                  onClick={() => navigateTo(page.href)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/60 hover:text-indigo-900 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-600 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-800 group-hover:text-indigo-950">{page.title}</div>
                      <div className="text-xs text-slate-400">{page.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono text-[10px]">Esc</span>
            <span>to close</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Instant search indexed across entire workforce</span>
          </div>
        </div>
      </div>
    </div>
  );
}
