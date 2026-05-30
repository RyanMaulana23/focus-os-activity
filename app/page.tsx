'use client';

import { useState, useEffect } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { AuthPage } from '@/components/AuthPage';
import { useAuthStore, loadUserData } from '@/lib/stores/authStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const currentUser  = useAuthStore((state) => state.currentUser);
  const isLightMode  = useUIStore((s) => s.isLightMode);
  const LM = isLightMode;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && currentUser) loadUserData(currentUser.id);
  }, [currentUser, mounted]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) return <AuthPage />;

  return (
    <div className="flex h-screen">
      <AnimatedBackground />

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 md:ml-20 overflow-auto pb-[72px] md:pb-0">

        {/* ── Mobile Top Bar ─────────────────────────────────────────────── */}
        <div
          className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-[60px] backdrop-blur-md transition-all duration-300"
          style={LM
            ? { background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid #E4E8F0', boxShadow: '0 1px 12px rgba(15,23,42,0.06)' }
            : { background: 'rgba(9,9,11,0.85)', borderBottom: '1px solid rgba(30,41,59,0.7)' }
          }
        >
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3">

            {/* Animated hamburger button */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="relative p-2 rounded-xl transition-all duration-200 active:scale-90"
              style={LM
                ? { color: '#5B50F0', background: mobileMenuOpen ? '#EEF0FF' : 'transparent' }
                : { color: '#94A3B8', background: mobileMenuOpen ? 'rgba(91,80,240,0.15)' : 'transparent' }
              }
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = LM ? '#EEF0FF' : 'rgba(91,80,240,0.12)';
                (e.currentTarget as HTMLButtonElement).style.color = '#5B50F0';
              }}
              onMouseLeave={(e) => {
                if (!mobileMenuOpen) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = LM ? '#5B50F0' : '#94A3B8';
                }
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileMenuOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0,   opacity: 1, scale: 1   }}
                    exit={{    rotate:  90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90,  opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0,   opacity: 1, scale: 1   }}
                    exit={{    rotate: -90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="flex items-center justify-center"
                  >
                    <Menu className="w-5 h-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center logo-glow"
                style={{ background: '#5B50F0' }}
              >
                <span className="text-xs font-bold text-white">F</span>
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: LM ? '#0F172A' : '#FFFFFF' }}
              >
                Focus OS
              </span>
            </div>
          </div>

          {/* Right: user avatar */}
          <div className="flex items-center gap-2">
            {currentUser.foto_profil ? (
              <img
                src={currentUser.foto_profil}
                alt={currentUser.nama}
                className="w-8 h-8 rounded-full object-cover"
                style={{ border: LM ? '2px solid #E4E8F0' : '2px solid rgba(139,92,246,0.5)' }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={LM
                  ? { background: '#EEF0FF', color: '#5B50F0', border: '2px solid #C7D2FE' }
                  : { background: '#1e293b', color: '#FFFFFF',  border: '2px solid rgba(139,92,246,0.5)' }
                }
              >
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
