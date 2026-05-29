'use client';

import { useUIStore } from '@/lib/stores/uiStore';
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  Flame,
  FileText,
  Settings,
  Music,
  Sparkles,
  FolderOpen,
} from 'lucide-react';

type Section = 'dashboard' | 'tasks' | 'pomodoro' | 'habits' | 'notes' | 'settings' | 'music' | 'analyzer' | 'document';

const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Home',     icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'tasks',     label: 'Tasks',    icon: <CheckSquare className="w-5 h-5" /> },
  { id: 'notes',     label: 'Notes',    icon: <FileText className="w-5 h-5" /> },
  { id: 'document',  label: 'Word',     icon: <FolderOpen className="w-5 h-5" /> },
  { id: 'music',     label: 'Playlist', icon: <Music className="w-5 h-5" /> },
];

/** Bottom navigation bar — only shown on mobile (< md) */
export function BottomNav() {
  const { activeSection, setActiveSection } = useUIStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800" />

      <div className="relative flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[52px] ${
                isActive
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {/* Active indicator pill */}
              <div className={`relative flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-blue-600 shadow-lg shadow-violet-600/40'
                  : ''
              }`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-medium transition-all duration-200 ${
                isActive ? 'text-violet-400' : 'text-slate-500'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
