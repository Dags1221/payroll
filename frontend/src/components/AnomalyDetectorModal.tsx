'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  FileCheck,
  ShieldCheck
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { soundFx } from '../lib/sound';
import { PayrollAnomaly } from '../types';

interface AnomalyDetectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnomalyDetectorModal({ isOpen, onClose }: AnomalyDetectorModalProps) {
  const [anomalies, setAnomalies] = useState<PayrollAnomaly[]>([]);
  const [scanning, setScanning] = useState(false);

  const runScan = async () => {
    setScanning(true);
    soundFx.playBiometricScan();
    const res = await apiRequest('/payroll/anomalies');
    setTimeout(() => {
      if (res.success && res.data) {
        setAnomalies(res.data);
        soundFx.playSuccess();
      }
      setScanning(false);
    }, 800);
  };

  useEffect(() => {
    if (isOpen) {
      runScan();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const criticalCount = anomalies.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = anomalies.filter((a) => a.severity === 'HIGH').length;
  const mediumCount = anomalies.filter((a) => a.severity === 'MEDIUM').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">AI Payroll Anomaly & Risk Guard</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Heuristic ML Engine
                </span>
              </div>
              <p className="text-xs text-rose-200">
                Detects overtime spikes, negative take-home risks, and statutory withholding discrepancies.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Risk Score Summary */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white p-3 rounded-2xl border border-rose-100 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Critical Risks</p>
            <p className="text-2xl font-extrabold text-rose-700 mt-0.5">{criticalCount}</p>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-amber-100 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">High Discrepancies</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-0.5">{highCount}</p>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-blue-100 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Medium Audits</p>
            <p className="text-2xl font-extrabold text-blue-700 mt-0.5">{mediumCount}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Heuristic Audit Findings</h4>
            <button
              onClick={runScan}
              disabled={scanning}
              className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              Re-Scan Active Payroll
            </button>
          </div>

          {scanning ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-semibold">Running heuristic fraud & variance analysis on payroll ledgers...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anom) => {
                const isCritical = anom.severity === 'CRITICAL';
                const isHigh = anom.severity === 'HIGH';
                const isMedium = anom.severity === 'MEDIUM';

                return (
                  <div
                    key={anom.id}
                    className={`p-4 rounded-2xl border transition ${
                      isCritical
                        ? 'bg-rose-50/70 border-rose-200'
                        : isHigh
                        ? 'bg-amber-50/70 border-amber-200'
                        : isMedium
                        ? 'bg-blue-50/70 border-blue-200'
                        : 'bg-emerald-50/70 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isCritical
                              ? 'bg-rose-500 text-white'
                              : isHigh
                              ? 'bg-amber-500 text-white'
                              : isMedium
                              ? 'bg-blue-500 text-white'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {isCritical || isHigh ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-900 text-xs sm:text-sm">{anom.title}</h5>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCritical
                                  ? 'bg-rose-200 text-rose-800'
                                  : isHigh
                                  ? 'bg-amber-200 text-amber-800'
                                  : isMedium
                                  ? 'bg-blue-200 text-blue-800'
                                  : 'bg-emerald-200 text-emerald-800'
                              }`}
                            >
                              {anom.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{anom.description}</p>
                          <div className="mt-2 text-[11px] font-semibold text-slate-700 bg-white/80 p-2 rounded-lg border border-slate-200/60">
                            💡 Recommendation: {anom.suggestedAction}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Evaluates: Max OT threshold, Negative Net Pay shield, Unfiled Absenteeism</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition"
          >
            Acknowledge Findings
          </button>
        </div>
      </div>
    </div>
  );
}
