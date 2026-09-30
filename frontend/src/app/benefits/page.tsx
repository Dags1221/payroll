'use client';

import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Plus,
  Trash2,
  Filter,
  Search,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest, formatPHP } from '../../lib/api';
import { Benefit, Employee } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function BenefitsPage() {
  const { user, isAdmin } = useAuth();
  const { success, error } = useToast();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    empId: '',
    name: 'Health & Medical Allowance',
    type: 'Allowance' as Benefit['type'],
    amount: 1500,
    frequency: 'Monthly' as Benefit['frequency'],
    status: 'Active' as Benefit['status'],
    isTaxable: false
  });

  const fetchData = async () => {
    setLoading(true);
    const [bRes, empRes] = await Promise.all([
      apiRequest<Benefit[]>('/benefits'),
      apiRequest<Employee[]>('/employees')
    ]);

    if (bRes.success && bRes.data) setBenefits(bRes.data);
    if (empRes.success && empRes.data) {
      setEmployees(empRes.data);
      const defaultId = empRes.data[0]?.id;
      if (defaultId) {
        setFormData(prev => ({ ...prev, empId: prev.empId || defaultId }));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.amount <= 0) {
      error('Validation', 'Benefit name and positive amount are required.');
      return;
    }

    const res = await apiRequest('/benefits', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    if (res.success) {
      success('Benefit Added', `Added ${formData.name} for ${formData.empId}.`);
      setIsModalOpen(false);
      fetchData();
    } else {
      error('Creation Failed', res.error?.message);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await apiRequest(`/benefits/${id}`, { method: 'DELETE' });
    if (res.success) {
      success('Benefit Removed', 'Benefit successfully removed from active ledger.');
      fetchData();
    } else {
      error('Delete Failed', res.error?.message);
    }
  };

  const getEmp = (id: string) => employees.find(e => e.id === id);

  const filtered = benefits.filter(b => {
    const emp = getEmp(b.empId);
    const matchSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (emp?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      b.empId.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || b.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <>
      <Navbar title="Employee Benefits Management" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Benefits & Allowances</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage statutory benefits, de minimis provisions, and medical allowances linked to payroll calculations.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Benefit</span>
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search benefit name or employee..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Category:</span>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="Allowance">Allowance</option>
                <option value="Government Mandated">Government Mandated</option>
                <option value="Insurance">Insurance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Benefit Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Tax Treatment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading employee benefits...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No benefits found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(b => {
                    const emp = getEmp(b.empId);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{emp?.name || b.empId}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{b.empId}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {b.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {b.type}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                          {formatPHP(b.amount)}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {b.frequency}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.isTaxable
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {b.isTaxable ? 'Taxable' : 'Tax-Exempt / De Minimis'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(b.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Benefit"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Benefit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1">Add Employee Benefit</h3>
            <p className="text-xs text-slate-500 mb-4">Enroll personnel in allowances or statutory stipends.</p>

            <form onSubmit={handleAddBenefit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Employee *</label>
                <select
                  value={formData.empId}
                  onChange={e => setFormData({ ...formData, empId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Benefit Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                  placeholder="e.g. Rice Subsidy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₱) *</label>
                  <input
                    type="number"
                    min="1"
                    step="50"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Semi-Monthly">Semi-Monthly</option>
                    <option value="Annual">Annual</option>
                    <option value="One-time">One-time</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Benefit Classification</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="Allowance">Allowance (Company Sponsored)</option>
                  <option value="Government Mandated">Government Mandated</option>
                  <option value="Insurance">Insurance / Healthcare</option>
                  <option value="Reimbursement">Reimbursement</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="taxableCheck"
                  checked={formData.isTaxable}
                  onChange={e => setFormData({ ...formData, isTaxable: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="taxableCheck" className="text-xs text-slate-700 font-medium">
                  Subject to withholding tax (Uncheck for De Minimis / Non-Taxable)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
                >
                  Save Benefit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
