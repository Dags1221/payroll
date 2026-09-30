'use client';

import React from 'react';
import { formatPHP } from '../lib/api';

interface AttendanceTrendItem {
  day: string;
  present: number;
  late: number;
  absent: number;
}

export function AttendanceTrendChart({ data }: { data: AttendanceTrendItem[] }) {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-xs text-slate-400">No attendance data to plot.</div>;
  }

  const maxVal = Math.max(...data.map(d => d.present + d.late + d.absent), 10);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
            <span className="text-slate-600">Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500"></span>
            <span className="text-slate-600">Late</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500"></span>
            <span className="text-slate-600">Absent</span>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-medium">5-Day Workforce Log</span>
      </div>

      <div className="h-48 flex items-end gap-4 pt-6 pb-2 px-2 border-b border-slate-100">
        {data.map((item, idx) => {
          const total = item.present + item.late + item.absent;
          const presentHeight = (item.present / maxVal) * 100;
          const lateHeight = (item.late / maxVal) * 100;
          const absentHeight = (item.absent / maxVal) * 100;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
              <div className="w-full max-w-[42px] flex flex-col-reverse rounded-lg overflow-hidden h-full justify-start bg-slate-50 transition-all group-hover:opacity-90 shadow-2xs">
                <div
                  style={{ height: `${presentHeight}%` }}
                  className="w-full bg-emerald-500 transition-all duration-500"
                  title={`Present: ${item.present}`}
                />
                <div
                  style={{ height: `${lateHeight}%` }}
                  className="w-full bg-amber-500 transition-all duration-500"
                  title={`Late: ${item.late}`}
                />
                <div
                  style={{ height: `${absentHeight}%` }}
                  className="w-full bg-rose-500 transition-all duration-500"
                  title={`Absent: ${item.absent}`}
                />
              </div>
              <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-600">
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DeptPayrollItem {
  department: string;
  allocated: number;
  budget: number;
}

export function DepartmentPayrollChart({ data }: { data: DeptPayrollItem[] }) {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-xs text-slate-400">No cost center allocations.</div>;
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.allocated, d.budget)), 100000);

  return (
    <div className="w-full space-y-3.5">
      {data.slice(0, 5).map((item, idx) => {
        const percentOfBudget = item.budget > 0 ? Math.round((item.allocated / item.budget) * 100) : 0;
        const widthPercent = Math.min(100, Math.round((item.allocated / maxVal) * 100));

        return (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">{item.department}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{formatPHP(item.allocated)}</span>
                <span className="text-[11px] text-slate-400">/ {formatPHP(item.budget)}</span>
              </div>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                style={{ width: `${widthPercent}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  percentOfBudget > 90 ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
