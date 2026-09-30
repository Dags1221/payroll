'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  trend,
}: StatCardProps) {
  const styles = {
    blue: {
      card: 'border-blue-100 hover:border-blue-200',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    emerald: {
      card: 'border-emerald-100 hover:border-emerald-200',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    amber: {
      card: 'border-amber-100 hover:border-amber-200',
      iconBg: 'bg-amber-50 text-amber-600',
    },
    rose: {
      card: 'border-rose-100 hover:border-rose-200',
      iconBg: 'bg-rose-50 text-rose-600',
    },
    indigo: {
      card: 'border-indigo-100 hover:border-indigo-200',
      iconBg: 'bg-indigo-50 text-indigo-600',
    },
    slate: {
      card: 'border-slate-200 hover:border-slate-300',
      iconBg: 'bg-slate-100 text-slate-700',
    },
  };

  const currentStyle = styles[variant] || styles.blue;

  return (
    <div
      className={`p-5 rounded-2xl bg-white border shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${currentStyle.card}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${currentStyle.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div>
        <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </div>

        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            {trend && (
              <span
                className={`font-semibold ${
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {subtitle && <span className="text-slate-400">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
