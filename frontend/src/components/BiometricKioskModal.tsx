'use client';

import React, { useState, useEffect } from 'react';
import {
  ScanFace,
  CreditCard,
  KeyRound,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  Building2,
  X,
  Sparkles,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { soundFx } from '../lib/sound';
import { useToast } from '../context/ToastContext';

interface BiometricKioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BiometricKioskModal({ isOpen, onClose, onSuccess }: BiometricKioskModalProps) {
  const { success, error } = useToast();
  const [empId, setEmpId] = useState('EMP-001');
  const [pin, setPin] = useState('1234');
  const [punchType, setPunchType] = useState<'TIME_IN' | 'TIME_OUT'>('TIME_IN');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const handlePunch = async () => {
    setScanning(true);
    setScanResult(null);
    soundFx.playBiometricScan();

    setTimeout(async () => {
      const res = await apiRequest('/kiosk/punch', {
        method: 'POST',
        body: JSON.stringify({
          empId,
          pin,
          type: punchType,
          location: 'Makati CBD Corporate Tower - Level 32 (Authorized Geofence)',
          method: 'Simulated Face Biometric + PIN'
        })
      });

      setScanning(false);

      if (res.success && res.data) {
        soundFx.playSuccess();
        setScanResult(res.data);
        success(
          `${punchType === 'TIME_IN' ? 'Time In' : 'Time Out'} Recorded`,
          `${res.data.employee.name} verified at ${res.data.punchTime}.`
        );
        if (onSuccess) onSuccess();
      } else {
        soundFx.playAlert();
        error('Verification Failed', res.error?.message || 'Employee not recognized.');
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/60 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative text-white">
        {/* Terminal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ScanFace className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Apex Biometric Terminal v4.2</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  GEOFENCE ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">Makati CBD Hub • 14.5547° N, 121.0244° E</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Terminal Clock */}
        <div className="px-6 py-4 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Philippine Standard Time (PST):</span>
            <span className="font-mono text-sm font-bold text-indigo-300">{currentTime}</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400 text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Anti-Spoofing & Liveness Shield Enabled</span>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Camera Simulation Box */}
          <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 flex flex-col items-center justify-center min-h-[260px] overflow-hidden">
            {/* Visual Scan Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-15"></div>

            {scanning ? (
              <div className="relative flex flex-col items-center z-10">
                <div className="w-28 h-28 rounded-full border-2 border-indigo-400 border-dashed animate-spin flex items-center justify-center">
                  <ScanFace className="w-12 h-12 text-indigo-400 animate-pulse" />
                </div>
                {/* Laser scan bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce"></div>
                <p className="text-xs font-semibold text-cyan-400 mt-4 tracking-wider animate-pulse">
                  SCANNING BIOMETRIC MESH...
                </p>
                <p className="text-[10px] text-slate-500">Matching 128 Facial Keypoints</p>
              </div>
            ) : scanResult ? (
              <div className="relative flex flex-col items-center z-10 text-center animate-in zoom-in">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="font-bold text-white text-base">{scanResult.employee.name}</h4>
                <p className="text-xs text-indigo-400 font-medium">{scanResult.employee.department}</p>
                <div className="mt-3 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300">
                  Time: <span className="text-emerald-400 font-bold">{scanResult.punchTime}</span>
                </div>
              </div>
            ) : (
              <div className="relative flex flex-col items-center z-10 text-center text-slate-400">
                <div className="w-24 h-24 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                  <ScanFace className="w-12 h-12" />
                </div>
                <p className="text-xs font-medium text-slate-300">Position Face Before Terminal</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                  Or select employee preset below to simulate immediate biometric punch.
                </p>
              </div>
            )}
          </div>

          {/* Right: Controls & Input */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Action Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPunchType('TIME_IN')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    punchType === 'TIME_IN'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  TIME IN (CLOCK IN)
                </button>
                <button
                  type="button"
                  onClick={() => setPunchType('TIME_OUT')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    punchType === 'TIME_OUT'
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  TIME OUT (CLOCK OUT)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Select Employee ID</label>
              <select
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="EMP-001">EMP-001 - Juan Dela Cruz (Senior Software Eng)</option>
                <option value="EMP-002">EMP-002 - Maria Santos (HR Generalist)</option>
                <option value="EMP-003">EMP-003 - Carlos Mendoza (DevOps Specialist)</option>
                <option value="EMP-004">EMP-004 - Ana Reyes (Financial Analyst)</option>
                <option value="EMP-005">EMP-005 - Mark Bautista (Operations Supervisor)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Security PIN (4 Digits)</label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white tracking-widest text-center focus:outline-none focus:border-indigo-500"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="button"
              disabled={scanning}
              onClick={handlePunch}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>SCANNING & VERIFYING...</span>
                </>
              ) : (
                <>
                  <ScanFace className="w-4 h-4" />
                  <span>TRANSMIT BIOMETRIC PUNCH</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
