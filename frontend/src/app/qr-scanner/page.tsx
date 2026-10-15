'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Upload,
  RefreshCw,
  ArrowRight,
  MapPin,
  Calendar,
  Layers,
  UserX
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { apiRequest } from '../../lib/api';
import { Employee, Attendance } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { soundFx } from '../../lib/sound';

function QrScannerContent() {
  const searchParams = useSearchParams();
  const prefillEmpId = searchParams.get('empId');

  const { user, isAdmin, isSupervisor } = useAuth();
  const { success, error, info } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<{
    empId: string;
    name?: string;
    dept?: string;
  } | null>(null);

  // Selected Employee & Attendance status
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [punching, setPunching] = useState(false);
  const [lastPunchResult, setLastPunchResult] = useState<any>(null);

  // Video / Canvas Refs for scanning
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const fetchEmployeesAndStatus = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [empRes, attRes] = await Promise.all([
      apiRequest<Employee[]>('/employees'),
      apiRequest<Attendance[]>(`/attendance?date=${today}`)
    ]);

    let empList: Employee[] = [];
    if (empRes.success && empRes.data) {
      empList = empRes.data;
      setEmployees(empList);
    }

    const targetId = prefillEmpId || user?.employeeId || empList[0]?.id;
    if (targetId) {
      const match = empList.find(e => e.id === targetId);
      if (match) {
        handleSelectEmployee(match, attRes.data || []);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchEmployeesAndStatus();
    return () => {
      stopCamera();
    };
  }, []);

  const handleSelectEmployee = (emp: Employee, attList?: Attendance[]) => {
    setSelectedEmp(emp);
    setScannedData({ empId: emp.id, name: emp.name, dept: emp.department });
    setLastPunchResult(null);

    const today = new Date().toISOString().slice(0, 10);
    if (attList) {
      const rec = attList.find(a => a.empId === emp.id && a.date === today);
      setTodayAttendance(rec || null);
    } else {
      apiRequest<Attendance[]>(`/attendance?date=${today}&empId=${emp.id}`).then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setTodayAttendance(res.data[0]);
        } else {
          setTodayAttendance(null);
        }
      });
    }
  };

  // ==============================
  // Camera & Video Frame Scanner
  // ==============================
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setCameraActive(true);
        soundFx.playBiometricScan();
        animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access not available or permission denied. You can use the Quick Test Punch or Image Upload below.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setCameraActive(false);
  };

  const scanVideoFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        handleDecodedCode(code.data);
        return; // stop continuous scan once code is caught
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  const handleDecodedCode = (rawText: string) => {
    stopCamera();
    soundFx.playBiometricScan();

    let empId = rawText.trim();
    let name = '';
    let dept = '';

    try {
      const parsed = JSON.parse(rawText);
      if (parsed.empId) empId = parsed.empId;
      if (parsed.name) name = parsed.name;
      if (parsed.dept) dept = parsed.dept;
    } catch {
      // rawText is just the empId
    }

    const found = employees.find(e => e.id.toUpperCase() === empId.toUpperCase());
    if (found) {
      handleSelectEmployee(found);
      success('QR Code Recognized', `Identified badge for ${found.name} (${found.id}).`);
    } else {
      error('QR Code Unrecognized', `Employee ID ${empId} was not found in company roster.`);
    }
  };

  // ==============================
  // Image Upload Scanner
  // ==============================
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleDecodedCode(code.data);
        } else {
          error('No QR Code Found', 'Could not detect a clear QR code in this image.');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ==============================
  // Punch Execution
  // ==============================
  const handlePunch = async (punchType: 'TIME_IN' | 'TIME_OUT') => {
    if (!selectedEmp) return;

    setPunching(true);
    soundFx.playBiometricScan();

    const res = await apiRequest('/attendance/qr-punch', {
      method: 'POST',
      body: JSON.stringify({
        empId: selectedEmp.id,
        type: punchType
      })
    });

    setPunching(false);

    if (res.success && res.data) {
      soundFx.playSuccess();
      setLastPunchResult(res.data);
      setTodayAttendance(res.data.record);
      success(
        `${punchType === 'TIME_IN' ? 'Time In' : 'Time Out'} Recorded!`,
        `${selectedEmp.name} timestamped at ${res.data.punchTime}.`
      );
    } else {
      soundFx.playAlert();
      error('Attendance Punch Notice', res.error?.message || 'Could not record punch.');
    }
  };

  return (
    <>
      <Navbar title="QR Attendance Scanner" />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Contactless QR Clock In & Clock Out</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Workforce QR Attendance Scanner
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Position your digital badge QR code inside the viewfinder. Automatically records real-time punches, updates your attendance record, and syncs immediately with the Admin Attendance Dashboard.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/attendance"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
              >
                <Clock className="w-4 h-4" />
                <span>View Attendance Dashboard</span>
              </Link>

              {isAdmin && (
                <Link
                  href="/qr-generator"
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all"
                >
                  <QrCode className="w-4 h-4 text-cyan-400" />
                  <span>Generate Badges</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Scanner Viewport & Punch Action Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive QR Camera & Upload Viewport */}
          <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800 p-6 text-white shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                  <QrCode className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Live Scanner Terminal</h3>
                  <p className="text-xs text-slate-400">Position QR code inside active scanner frame</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {cameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Stop Camera</span>
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Start Camera</span>
                  </button>
                )}
              </div>
            </div>

            {/* Viewfinder Display Box */}
            <div className="relative aspect-video w-full rounded-2xl bg-slate-950 border-2 border-dashed border-slate-800 overflow-hidden flex items-center justify-center">
              {/* Hidden Video element for camera feed */}
              <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {/* Viewfinder crosshairs and scanning line */}
              <div className="absolute inset-8 sm:inset-12 border-2 border-indigo-500/60 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg"></div>
                  <div className="w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg"></div>
                </div>

                {/* Laser animation */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400 animate-pulse my-auto"></div>

                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg"></div>
                  <div className="w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg"></div>
                </div>
              </div>

              {!cameraActive && (
                <div className="text-center p-6 space-y-3 z-10">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-300">Camera Feed Inactive</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                      Click <strong>"Start Camera"</strong> to scan live, or select a badge from the quick roster below.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Alternative Input: Upload Badge Image */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Or scan an image file:</span>
              </span>

              <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition border border-slate-700 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR Image / Badge</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Right Column: Verified Personnel & Punch Actions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Verified Personnel</h3>
                    <p className="text-xs text-slate-500">Live attendance status for current date</p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-slate-400 font-mono">
                  {new Date().toISOString().slice(0, 10)}
                </span>
              </div>

              {selectedEmp ? (
                <div className="space-y-5">
                  {/* Employee Identity Box */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-extrabold text-xl flex items-center justify-center shadow-md">
                      {selectedEmp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-base text-slate-900 leading-tight">
                          {selectedEmp.name}
                        </h4>
                        <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                          {selectedEmp.id}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-600">{selectedEmp.position}</p>
                      <p className="text-[11px] text-slate-400">{selectedEmp.department}</p>
                    </div>
                  </div>

                  {/* Current Status Today */}
                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Today's Time-In:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {todayAttendance?.in ? (
                          <span className="text-emerald-700 font-bold">{todayAttendance.in}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not recorded yet</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Today's Time-Out:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {todayAttendance?.out ? (
                          <span className="text-amber-700 font-bold">{todayAttendance.out}</span>
                        ) : (
                          <span className="text-slate-400 italic">Pending</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">Current Status:</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          todayAttendance?.status === 'Present'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : todayAttendance?.status === 'Late'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {todayAttendance ? todayAttendance.status : 'Awaiting Punch'}
                      </span>
                    </div>
                  </div>

                  {/* Punch Action Buttons */}
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handlePunch('TIME_IN')}
                        disabled={punching || Boolean(todayAttendance?.in)}
                        className={`py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                          todayAttendance?.in
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        <span>{todayAttendance?.in ? 'Time-In Logged' : 'Punch Time-In'}</span>
                      </button>

                      <button
                        onClick={() => handlePunch('TIME_OUT')}
                        disabled={punching || !todayAttendance?.in || Boolean(todayAttendance?.out)}
                        className={`py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                          !todayAttendance?.in || todayAttendance?.out
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        <span>{todayAttendance?.out ? 'Time-Out Logged' : 'Punch Time-Out'}</span>
                      </button>
                    </div>

                    {lastPunchResult && (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1 animate-in fade-in-50">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Punch Verified & Recorded</span>
                        </div>
                        <p>{lastPunchResult.message}</p>
                        <div className="pt-2 text-[11px] text-emerald-700 flex items-center justify-between">
                          <span>Location: Makati CBD HQ Geofence</span>
                          <Link href="/attendance" className="font-bold underline flex items-center gap-0.5">
                            Check Dashboard <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <UserX className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Scan a QR code to view personnel and record attendance.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Test Punch Roster (Simulated Badges for Instant Testing) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Quick Test Scanner Roster</span>
              </h3>
              <p className="text-xs text-slate-500">
                Click any employee below to simulate presenting their verified QR badge to this terminal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {employees.map(emp => {
              const isSelected = selectedEmp?.id === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => {
                    soundFx.playBiometricScan();
                    handleSelectEmployee(emp);
                    success('Badge Scanned', `Loaded ${emp.name} (${emp.id}) into terminal.`);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {emp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-slate-900 truncate">{emp.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{emp.id}</div>
                    <div className="text-[10px] text-indigo-600 font-semibold truncate">{emp.position}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}

export default function QrScannerPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500 text-xs">Loading QR Scanner...</div>}>
      <QrScannerContent />
    </React.Suspense>
  );
}
