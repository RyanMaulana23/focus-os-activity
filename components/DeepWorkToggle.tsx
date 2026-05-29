'use client';

import { useUIStore } from '@/lib/stores/uiStore';
import { Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';

export function DeepWorkToggle() {
  const { isLightMode, toggleTheme } = useUIStore();

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [isLightMode]);

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300 font-semibold text-sm shadow-lg border cursor-pointer active:scale-95 ${
        isLightMode
          ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-slate-200/50'
          : 'bg-slate-900 hover:bg-slate-850 text-slate-200 border-slate-800 shadow-slate-950/40'
      }`}
      title={isLightMode ? 'Aktifkan Mode Gelap' : 'Aktifkan Mode Terang'}
    >
      {isLightMode ? (
        <>
          <Moon className="w-4 h-4 text-violet-500 fill-violet-500" />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-amber-500 fill-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Light Mode</span>
        </>
      )}
    </button>
  );
}
export { DeepWorkToggle as ThemeToggle };
