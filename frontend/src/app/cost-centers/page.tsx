'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Plus,
  Edit2,
  CheckCircle2,
  Building,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  Sparkles
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest, formatPHP } from '../../lib/api';
import { CostCenter } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function CostCentersPage() {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();
  const [costCenters, setCostCenters] = useState<(CostCenter & { employeeCount: number; budgetUtilizationPercent: number })[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    dept: 'Human Resources',
    budget: 500000,
    status: 'Active' as CostCenter['status']
  });

  const fetchSummary = async () => {
    setLoading(true);
    const res = await apiRequest<{
      costCenters: (CostCenter & { employeeCount: number; budgetUtilizationPercent: number })[];
      totalBudget: number;
      totalAllocatedPayroll: number;
    }>('/cost-centers/summary');

    if (res.success && res.data) {
      setCostCenters(res.data.costCenters);
      setTotalBudget(res.data.totalBudget);
      setTotalAllocated(res.data.totalAllocatedPayroll);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const openAddModal = () => {
    setEditingCenter(null);
    setFormData({
      code: `CC-00${costCenters.length + 1}`,
      name: '',
      dept: 'Human Resources',
      budget: 500000,
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cc: CostCenter) => {
    setEditingCenter(cc);
    setFormData({
      code: cc.code,
      name: cc.name,
      dept: cc.dept,
      budget: cc.budget,
      status: cc.status
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      error('Validation', 'Cost center code and name are required.');
      return;
    }

    if (editingCenter) {
      const res = await apiRequest(`/cost-centers/${editingCenter.code}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        success('Cost Center Updated', `Updated details for ${formData.name}.`);
        setIsModalOpen(false);
        fetchSummary();
      } else {
        error('Update Failed', res.error?.message);
      }
    } else {
      const res = await apiRequest('/cost-centers', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        success('Cost Center Added', `Created ${formData.name} (${formData.code}).`);
        setIsModalOpen(false);
        fetchSummary();
      } else {
        error('Creation Failed', res.error?.message);
      }
    }
  };

  return (
    <>
      <Navbar title="Cost Center Distribution Tables" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cost Center Distribution</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Allocate workforce payroll expenditures by operational unit and reconcile against department budgets.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Cost Center</span>
            </button>
          )}
        </div>

        {/* Financial Utilization Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Org Budget</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{formatPHP(totalBudget)}</div>
            <span className="text-xs text-slate-500 mt-1 block">Combined departmental ceiling</span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Allocated Payroll</span>
            <div className="text-2xl font-extrabold text-indigo-700 mt-1">{formatPHP(totalAllocated)}</div>
            <span className="text-xs text-slate-500 mt-1 block">Reconciled to latest processed payroll</span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-400 uppercase">Budget Utilization</span>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">
              {totalBudget > 0 ? (totalAllocated / totalBudget * 100).toFixed(1) : 0}%
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Safe financial margin</span>
          </div>
        </div>

        {/* Cost Centers Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Cost Center Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4">Budget Limit</th>
                  <th className="py-3 px-4">Allocated Payroll</th>
                  <th className="py-3 px-4">Utilization</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading cost centers...
                    </td>
                  </tr>
                ) : costCenters.map(cc => {
                  const util = cc.budgetUtilizationPercent || 0;
                  return (
                    <tr key={cc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {cc.code}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {cc.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {cc.dept}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {cc.employeeCount || 0} employees
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {formatPHP(cc.budget)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {formatPHP(cc.allocatedPayroll || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, util)}%` }}
                              className={`h-full rounded-full ${
                                util > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                          </div>
                          <span className="font-semibold text-slate-700 text-[11px]">{util}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cc.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {cc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin && (
                          <button
                            onClick={() => openEditModal(cc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Cost Center Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1">
              {editingCenter ? 'Edit Cost Center' : 'Create Cost Center'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Assign budget allocations for financial auditing.</p>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cost Center Code *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingCenter}
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500 font-mono disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cost Center Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                  placeholder="e.g. Information Technology"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={formData.dept}
                  onChange={e => setFormData({ ...formData, dept: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Annual / Periodic Budget (₱) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={formData.budget}
                  onChange={e => setFormData({ ...formData, budget: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
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
                  Save Cost Center
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
