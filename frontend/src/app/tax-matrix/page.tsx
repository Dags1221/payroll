'use client';

import React, { useState, useEffect } from 'react';
import {
  BadgeDollarSign,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Calculator,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest, formatPHP } from '../../lib/api';
import { TaxBracket } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function TaxMatrixPage() {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();
  const [brackets, setBrackets] = useState<TaxBracket[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Add modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBracket, setEditingBracket] = useState<TaxBracket | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    minIncome: 0,
    maxIncome: 20833.33,
    baseTax: 0,
    excessRate: 0.15,
    effectiveDate: '2023-01-01',
    isActive: true,
    notes: ''
  });

  // Simulator State
  const [testIncome, setTestIncome] = useState<number>(35000);
  const [testType, setTestType] = useState<'Monthly' | 'Semi-Monthly'>('Monthly');
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const fetchBrackets = async () => {
    setLoading(true);
    const res = await apiRequest<TaxBracket[]>('/tax-brackets');
    if (res.success && res.data) {
      setBrackets(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBrackets();
  }, []);

  const runSimulation = async () => {
    const res = await apiRequest('/tax-brackets/preview', {
      method: 'POST',
      body: JSON.stringify({ income: testIncome, type: testType }),
    });
    if (res.success && res.data) {
      setSimulationResult(res.data);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [testIncome, testType, brackets]);

  const openAddModal = () => {
    setEditingBracket(null);
    setFormData({
      code: `BRACKET-${brackets.length + 1}`,
      name: `Bracket ${brackets.length + 1}`,
      minIncome: 0,
      maxIncome: 50000,
      baseTax: 0,
      excessRate: 0.15,
      effectiveDate: new Date().toISOString().slice(0, 10),
      isActive: true,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (b: TaxBracket) => {
    setEditingBracket(b);
    setFormData({
      code: b.code,
      name: b.name,
      minIncome: b.minIncome,
      maxIncome: b.maxIncome,
      baseTax: b.baseTax,
      excessRate: b.excessRate,
      effectiveDate: b.effectiveDate,
      isActive: b.isActive,
      notes: b.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveBracket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBracket) {
      const res = await apiRequest(`/tax-brackets/${editingBracket.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        success('Tax Bracket Updated', `Configuration updated for ${formData.name}.`);
        setIsModalOpen(false);
        fetchBrackets();
      } else {
        error('Update Failed', res.error?.message);
      }
    } else {
      const res = await apiRequest('/tax-brackets', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        success('Bracket Added', `Created new tax bracket ${formData.name}.`);
        setIsModalOpen(false);
        fetchBrackets();
      } else {
        error('Creation Failed', res.error?.message);
      }
    }
  };

  const toggleStatus = async (b: TaxBracket) => {
    const res = await apiRequest(`/tax-brackets/${b.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !b.isActive }),
    });
    if (res.success) {
      success('Status Toggled', `${b.name} is now ${!b.isActive ? 'Active' : 'Inactive'}.`);
      fetchBrackets();
    }
  };

  return (
    <>
      <Navbar title="Configurable Tax Bracket Matrix" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <BadgeDollarSign className="w-4 h-4" />
              <span>Withholding Tax Rules Configuration</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">TRAIN Law Withholding Matrix</h1>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Fully configurable progressive tax brackets conforming to the Philippine Tax Reform for Acceleration and Inclusion (TRAIN Law). Tax rules are dynamic and never hardcoded.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Tax Bracket</span>
            </button>
          )}
        </div>

        {/* Live Tax Simulator / Calculator */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Interactive Tax Computation Simulator</h3>
          </div>
          <p className="text-xs text-slate-500">
            Verify active bracket matching and computed progressive withholding tax in real time.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Taxable Income (₱)</label>
              <input
                type="number"
                min="0"
                step="500"
                value={testIncome}
                onChange={e => setTestIncome(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-bold outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pay Schedule Type</label>
              <select
                value={testType}
                onChange={e => setTestType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-indigo-500"
              >
                <option value="Monthly">Monthly Salary</option>
                <option value="Semi-Monthly">Semi-Monthly (Cut-off)</option>
              </select>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-col justify-center">
              <div className="text-[11px] text-indigo-900 font-medium">Computed Withholding Tax:</div>
              <div className="text-xl font-extrabold text-indigo-700 mt-0.5">
                {formatPHP(simulationResult?.taxAmount || 0)}
              </div>
              <div className="text-[10px] text-indigo-800/80 truncate mt-1">
                {simulationResult?.computationDetails || 'Evaluating...'}
              </div>
            </div>
          </div>
        </div>

        {/* Brackets Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Configured Progressive Brackets</h3>
            <span className="text-xs text-slate-400">
              Active Brackets: <strong>{brackets.filter(b => b.isActive).length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Bracket Code</th>
                  <th className="py-3 px-4">Bracket Name</th>
                  <th className="py-3 px-4">Minimum Monthly</th>
                  <th className="py-3 px-4">Maximum Monthly</th>
                  <th className="py-3 px-4">Base Tax</th>
                  <th className="py-3 px-4">Excess Rate %</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading tax configuration matrix...
                    </td>
                  </tr>
                ) : brackets.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {b.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {b.name}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {formatPHP(b.minIncome)}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {b.maxIncome > 50000000 ? 'Over ₱666,666.67' : formatPHP(b.maxIncome)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatPHP(b.baseTax)}
                    </td>
                    <td className="py-3 px-4 font-bold text-indigo-700">
                      {(b.excessRate * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {b.effectiveDate}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        disabled={!isAdmin}
                        onClick={() => toggleStatus(b)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                          b.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {b.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isAdmin && (
                        <button
                          onClick={() => openEditModal(b)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit Bracket"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Bracket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1">
              {editingBracket ? 'Modify Tax Bracket' : 'Configure New Tax Bracket'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Changes will apply dynamically to subsequent payroll period computations.
            </p>

            <form onSubmit={handleSaveBracket} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bracket Code *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bracket Description Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Monthly Income (₱) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.minIncome}
                    onChange={e => setFormData({ ...formData, minIncome: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Monthly Income (₱) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.maxIncome}
                    onChange={e => setFormData({ ...formData, maxIncome: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Tax (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.baseTax}
                    onChange={e => setFormData({ ...formData, baseTax: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Excess Rate (e.g. 0.20 = 20%)</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    required
                    value={formData.excessRate}
                    onChange={e => setFormData({ ...formData, excessRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={formData.effectiveDate}
                  onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy Notes</label>
                <textarea
                  rows={2}
                  placeholder="Government circular or executive order reference..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-indigo-500"
                />
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
                  Save Tax Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
