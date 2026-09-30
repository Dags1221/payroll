'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  X,
  Clock,
  Save,
  CheckCircle2,
  Sparkles,
  Moon,
  Sun,
  Coffee
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { ShiftRoster } from '../types';
import { useToast } from '../context/ToastContext';

interface ShiftPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShiftPlannerModal({ isOpen, onClose }: ShiftPlannerModalProps) {
  const { success, error } = useToast();
  const [shifts, setShifts] = useState<ShiftRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchShifts = async () => {
    setLoading(true);
    const res = await apiRequest('/shifts');
    if (res.success && res.data) {
      setShifts(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchShifts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleShiftChange = (empId: string, day: keyof ShiftRoster, value: string) => {
    setShifts((prev) =>
      prev.map((s) => (s.empId === empId ? { ...s, [day]: value } : s))
    );
  };

  const handleSaveEmployeeShift = async (roster: ShiftRoster) => {
    setSavingId(roster.empId);
    const res = await apiRequest(`/shifts/${roster.empId}`, {
      method: 'PUT',
      body: JSON.stringify(roster)
    });
    setSavingId(null);

    if (res.success) {
      success('Shift Saved', `Updated weekly roster for ${roster.employeeName}.`);
    } else {
      error('Failed to Save Shift', res.error?.message || 'Error updating schedule.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl border border-slate-200 relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-violet-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Shift & Schedule Roster Planner</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Night Diff (+10%) Enabled
                </span>
              </div>
              <p className="text-xs text-violet-200">
                Organize work shifts, rotating schedules, and rest day coverage across departments.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 font-medium">
            <Sun className="w-3.5 h-3.5 text-amber-500" /> Regular Day: 08:00 - 17:00
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Moon className="w-3.5 h-3.5 text-indigo-500" /> Night Differential: 22:00 - 07:00 (+10% base rate)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Coffee className="w-3.5 h-3.5 text-slate-400" /> Rest Day
          </span>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">Loading operational shifts...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {shifts.map((s) => (
                <div key={s.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{s.employeeName}</h4>
                      <p className="text-xs text-slate-500">{s.department} • {s.empId}</p>
                    </div>
                    <button
                      onClick={() => handleSaveEmployeeShift(s)}
                      disabled={savingId === s.empId}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingId === s.empId ? 'Saving...' : 'Save Shift'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                      <div key={day} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                          {day.slice(0, 3)}
                        </span>
                        <select
                          value={s[day]}
                          onChange={(e) => handleShiftChange(s.empId, day, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[11px] font-medium text-slate-800 focus:outline-none focus:border-violet-500"
                        >
                          <option value="08:00 - 17:00 (Regular)">08:00 - 17:00 (Day)</option>
                          <option value="06:00 - 15:00 (Early)">06:00 - 15:00 (Early)</option>
                          <option value="22:00 - 07:00 (Night Diff)">22:00 - 07:00 (Night +10%)</option>
                          <option value="08:00 - 12:00 (Half Day)">Half Day (4 hrs)</option>
                          <option value="Rest Day">Rest Day</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
