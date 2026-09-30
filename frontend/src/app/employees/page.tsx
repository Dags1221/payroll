'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { ConfirmModal } from '../../components/ConfirmModal';
import { apiRequest, formatPHP, formatDate } from '../../lib/api';
import { Employee } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function EmployeesPage() {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    department: 'Human Resources',
    position: '',
    salary: 25000,
    status: 'Active' as Employee['status'],
    dateHired: new Date().toISOString().slice(0, 10),
    workSchedule: '08:00 AM - 05:00 PM (Mon-Fri)',
    costCenterId: 'CC-001',
    tin: '',
    sssNo: '',
    philHealthNo: '',
    pagIbigNo: '',
    emergencyContact: ''
  });

  const fetchEmployees = async () => {
    setLoading(true);
    const res = await apiRequest<Employee[]>('/employees');
    if (res.success && res.data) {
      setEmployees(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openAddModal = () => {
    setEditingEmp(null);
    const nextIdNum = String(employees.length + 1).padStart(3, '0');
    setFormData({
      id: `EMP-${nextIdNum}`,
      name: '',
      email: '',
      phone: '',
      address: '',
      department: 'Human Resources',
      position: '',
      salary: 25000,
      status: 'Active',
      dateHired: new Date().toISOString().slice(0, 10),
      workSchedule: '08:00 AM - 05:00 PM (Mon-Fri)',
      costCenterId: 'CC-001',
      tin: '',
      sssNo: '',
      philHealthNo: '',
      pagIbigNo: '',
      emergencyContact: ''
    });
    setIsAddEditOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setFormData({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      address: emp.address || '',
      department: emp.department,
      position: emp.position,
      salary: emp.salary,
      status: emp.status,
      dateHired: emp.dateHired || new Date().toISOString().slice(0, 10),
      workSchedule: emp.workSchedule || '08:00 AM - 05:00 PM (Mon-Fri)',
      costCenterId: emp.costCenterId || 'CC-001',
      tin: emp.tin || '',
      sssNo: emp.sssNo || '',
      philHealthNo: emp.philHealthNo || '',
      pagIbigNo: emp.pagIbigNo || '',
      emergencyContact: emp.emergencyContact || ''
    });
    setIsAddEditOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name || !formData.email) {
      error('Validation Error', 'Please complete Employee ID, Full Name, and Email.');
      return;
    }

    if (editingEmp) {
      const res = await apiRequest(`/employees/${editingEmp.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        success('Employee Updated', `Successfully updated profile for ${formData.name}.`);
        setIsAddEditOpen(false);
        fetchEmployees();
      } else {
        error('Update Failed', res.error?.message);
      }
    } else {
      const res = await apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        success('Employee Created', `Successfully added ${formData.name} to directory.`);
        setIsAddEditOpen(false);
        fetchEmployees();
      } else {
        error('Creation Failed', res.error?.message);
      }
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const res = await apiRequest(`/employees/${deletingId}`, { method: 'DELETE' });
    if (res.success) {
      success('Employee Removed', 'Employee record deleted from system.');
      setDeletingId(null);
      fetchEmployees();
    } else {
      error('Delete Failed', res.error?.message);
    }
  };

  const departments = Array.from(new Set(employees.map(e => e.department))).filter(Boolean);

  const filtered = employees.filter(emp => {
    const matchQuery =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.id.toLowerCase().includes(search.toLowerCase()) ||
      emp.position.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase());

    const matchDept = deptFilter === 'ALL' || emp.department === deptFilter;
    const matchStatus = statusFilter === 'ALL' || emp.status === statusFilter;

    return matchQuery && matchDept && matchStatus;
  });

  const exportCSV = () => {
    const headers = ['ID,Name,Department,Position,MonthlySalary,Status,DateHired,Email,Phone,CostCenter'];
    const rows = filtered.map(e =>
      `"${e.id}","${e.name}","${e.department}","${e.position}",${e.salary},"${e.status}","${e.dateHired}","${e.email}","${e.phone || ''}","${e.costCenterId}"`
    );
    const blob = new Blob([headers.concat(rows).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_roster_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    success('Roster Exported', 'CSV file downloaded successfully.');
  };

  return (
    <>
      <Navbar title="Employee Information Management" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Workforce Directory</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage personnel records, statutory tax identifiers, positions, and basic compensation.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={exportCSV}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {isAdmin && (
              <button
                onClick={openAddModal}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search Toolbar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, ID, position, department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Dept:</span>
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Probationary">Probationary</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employee Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Position</th>
                  <th className="py-3 px-4">Cost Center</th>
                  <th className="py-3 px-4">Monthly Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date Hired</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading employee directory...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No employees match your search or filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-50 to-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-indigo-200">
                            {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{emp.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{emp.id} • {emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{emp.position}</div>
                        <div className="text-[11px] text-slate-500">{emp.department}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-600 font-medium">
                          {emp.costCenterId || 'CC-001'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatPHP(emp.salary)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : emp.status === 'Probationary'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatDate(emp.dateHired)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedProfile(emp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => openEditModal(emp)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit Record"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingId(emp.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filtered.length} of {employees.length} personnel</span>
            <span>Total Basic Payroll Commitment: <strong>{formatPHP(filtered.reduce((s, e) => s + Number(e.salary || 0), 0))}</strong></span>
          </div>
        </div>
      </main>

      {/* Add / Edit Employee Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-bold text-base text-slate-900">
                {editingEmp ? `Edit Employee (${editingEmp.id})` : 'Register New Employee'}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingEmp}
                    value={formData.id}
                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                    placeholder="e.g. Juan Dela Cruz"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                    placeholder="name@payroll.corp"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                    placeholder="+63 917 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance">Finance</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Operations">Operations</option>
                    <option value="Administration">Administration</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Position / Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                    placeholder="e.g. Senior Analyst"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Basic Monthly Salary (₱) *</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={formData.salary}
                    onChange={e => setFormData({ ...formData, salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Center</label>
                  <select
                    value={formData.costCenterId}
                    onChange={e => setFormData({ ...formData, costCenterId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="CC-001">CC-001 (Human Resources)</option>
                    <option value="CC-002">CC-002 (Finance)</option>
                    <option value="CC-003">CC-003 (Information Technology)</option>
                    <option value="CC-004">CC-004 (Operations)</option>
                    <option value="CC-005">CC-005 (Administration)</option>
                    <option value="CC-006">CC-006 (Marketing)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Probationary">Probationary</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date Hired</label>
                  <input
                    type="date"
                    value={formData.dateHired}
                    onChange={e => setFormData({ ...formData, dateHired: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Statutory details divider */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Philippine Statutory & Tax Information
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">TIN</label>
                    <input
                      type="text"
                      placeholder="123-456-789-000"
                      value={formData.tin}
                      onChange={e => setFormData({ ...formData, tin: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">SSS Number</label>
                    <input
                      type="text"
                      placeholder="04-1234567-8"
                      value={formData.sssNo}
                      onChange={e => setFormData({ ...formData, sssNo: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">PhilHealth Number</label>
                    <input
                      type="text"
                      placeholder="12-345678901-2"
                      value={formData.philHealthNo}
                      onChange={e => setFormData({ ...formData, philHealthNo: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
                >
                  {editingEmp ? 'Save Changes' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Slide-Over / Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 p-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-base flex items-center justify-center">
                  {selectedProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{selectedProfile.name}</h3>
                  <div className="text-xs text-indigo-600 font-medium">{selectedProfile.position} • {selectedProfile.department}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employee ID</span>
                  <span className="font-mono font-bold text-slate-800">{selectedProfile.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Monthly Basic</span>
                  <span className="font-bold text-slate-900">{formatPHP(selectedProfile.salary)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Work Schedule</span>
                  <span className="text-slate-700 font-medium">{selectedProfile.workSchedule}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cost Center</span>
                  <span className="font-mono font-semibold text-slate-700">{selectedProfile.costCenterId}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5 text-xs">Statutory Details</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>TIN: <strong className="font-mono">{selectedProfile.tin || 'N/A'}</strong></div>
                  <div>SSS: <strong className="font-mono">{selectedProfile.sssNo || 'N/A'}</strong></div>
                  <div>PhilHealth: <strong className="font-mono">{selectedProfile.philHealthNo || 'N/A'}</strong></div>
                  <div>Pag-IBIG: <strong className="font-mono">{selectedProfile.pagIbigNo || 'N/A'}</strong></div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Emergency Contact</span>
                <span className="text-slate-700">{selectedProfile.emergencyContact || 'Not specified'}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedProfile(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Employee Record"
        message="Are you sure you want to delete this employee? All related attendance, leave, and payroll linkages will be affected. This action is recorded in the audit trail."
        confirmText="Yes, Delete Record"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </>
  );
}
