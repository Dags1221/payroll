'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!mounted) return;

    // If not authenticated and not already on the login page, direct to /login immediately
    if (!isLoading && !user && !isLoginPage) {
      router.replace('/login');
    }
  }, [mounted, user, isLoading, isLoginPage, router]);

  // When on /login, render 100% full screen with NO sidebar
  if (isLoginPage) {
    return (
      <main className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-0 m-0 overflow-x-hidden">
        {children}
      </main>
    );
  }

  // If redirecting to /login, render a sleek security perimeter splash loader
  if (mounted && !user && !isLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4">
        <div className="relative mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 animate-pulse">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
        <p className="text-xs font-bold tracking-widest uppercase text-slate-300">
          Directing to Secure Authentication Portal...
        </p>
        <p className="text-[11px] text-slate-500 mt-1">Apex Zero-Trust Identity Perimeter</p>
      </div>
    );
  }

  // Authenticated Application Shell: Sidebar + Main Content View
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
