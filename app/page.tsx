'use client';

import { useState, useEffect } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { AuthPage } from '@/components/AuthPage';
import { useAuthStore, loadUserData } from '@/lib/stores/authStore';
import { Menu } from 'lucide-react';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);

  // Hydration guard: wait until client-side mount before rendering dynamic auth pages
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load user data on mount / session restoration
  useEffect(() => {
    if (mounted && currentUser) {
      loadUserData(currentUser.id);
    }
  }, [currentUser, mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen">
      {/* Animated background layers (aurora + grid + vignette) */}
      <AnimatedBackground />

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 md:ml-20 overflow-auto pb-[72px] md:pb-0">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-[60px] bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-[#E2E8F0] dark:border-slate-800/60 transition-all duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850 transition min-h-0 min-w-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center logo-glow">
                <span className="text-xs font-bold text-white">F</span>
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-white">Focus OS</span>
            </div>
          </div>
          
          {/* User Profile Badge for Mobile Navbar */}
          <div className="flex items-center gap-2">
            {currentUser.foto_profil ? (
              <img
                src={currentUser.foto_profil}
                alt={currentUser.nama}
                className="w-7 h-7 rounded-full border border-slate-250 dark:border-violet-500/50 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-700 dark:text-white font-bold border border-slate-200 dark:border-violet-500/50">
                {currentUser.nama.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <Dashboard />
      </main>

      {/* Bottom navigation — mobile only */}
      <BottomNav />
    </div>
  );
}

