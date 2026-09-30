'use client';

import React, { useEffect, useState } from 'react';
import {
  Megaphone,
  X,
  AlertTriangle,
  CloudLightning,
  Send,
  Trash2,
  BellRing
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { soundFx } from '../lib/sound';
import { useToast } from '../context/ToastContext';
import { EmergencyBroadcast } from '../types';

interface EmergencyBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmergencyBroadcastModal({ isOpen, onClose }: EmergencyBroadcastModalProps) {
  const { success, error } = useToast();
  const [activeBroadcast, setActiveBroadcast] = useState<EmergencyBroadcast | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<any>('WEATHER_SUSPENSION');
  const [urgency, setUrgency] = useState<any>('URGENT');
  const [submitting, setSubmitting] = useState(false);

  const fetchActive = async () => {
    const res = await apiRequest('/broadcasts');
    if (res.success) {
      setActiveBroadcast(res.data);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActive();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    setSubmitting(true);
    soundFx.playAlert();

    const res = await apiRequest('/broadcasts', {
      method: 'POST',
      body: JSON.stringify({
        title,
        message,
        category,
        urgency
      })
    });

    setSubmitting(false);

    if (res.success) {
      success('Broadcast Dispatched', 'All active personnel have received this emergency notification.');
      setTitle('');
      setMessage('');
      fetchActive();
    } else {
      error('Broadcast Failed', res.error?.message || 'Error sending broadcast.');
    }
  };

  const handleDismiss = async () => {
    if (!activeBroadcast) return;
    const res = await apiRequest(`/broadcasts/${activeBroadcast.id}`, { method: 'DELETE' });
    if (res.success) {
      success('Broadcast Cleared', 'Active banner notification dismissed.');
      setActiveBroadcast(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 relative flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-red-950 via-slate-900 to-red-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Megaphone className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Emergency Notification Broadcast Center</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  Global Alert
                </span>
              </div>
              <p className="text-xs text-red-200">
                Transmit instant company-wide alerts, weather advisories, and emergency suspensions.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Active Broadcast Banner if any */}
          {activeBroadcast && activeBroadcast.active && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start justify-between gap-3 animate-in zoom-in">
              <div className="flex items-start gap-3">
                <BellRing className="w-5 h-5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-xs text-red-900">{activeBroadcast.title}</h5>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-200 text-red-800">
                      LIVE BROADCAST
                    </span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">{activeBroadcast.message}</p>
                  <p className="text-[10px] text-red-500 mt-1">Dispatched by: {activeBroadcast.sender}</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition"
                title="Dismiss Active Alert"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Broadcast Form */}
          <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Broadcast Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-red-500"
                >
                  <option value="WEATHER_SUSPENSION">Weather / Typhoon Suspension (PAGASA)</option>
                  <option value="OFFICE_CLOSURE">Facility Closure / Work From Home</option>
                  <option value="PAYROLL_CUTOFF">Urgent Payroll Cutoff Notice</option>
                  <option value="SECURITY_ALERT">General Corporate Security Alert</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Urgency Level</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-red-500"
                >
                  <option value="URGENT">Urgent (Red Alert + Chime)</option>
                  <option value="HIGH">High Priority (Amber Banner)</option>
                  <option value="NORMAL">Standard Advisory</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Alert Headline / Title</label>
              <input
                type="text"
                placeholder="e.g. Typhoon Signal #2 Work Suspension Advisory"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-red-500 font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Detailed Message & Directives</label>
              <textarea
                rows={3}
                placeholder="Specify instructions for employees, remote attendance policy, or cutoff deadlines..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-red-500 font-sans"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !title || !message}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-600/30 transition"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Transmitting...' : 'Dispatch Broadcast Now'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
