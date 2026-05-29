'use client';

import { useUIStore } from '@/lib/stores/uiStore';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Music,
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden h-[72px] bg-white dark:bg-slate-900 border-t border-[#E2E8F0] dark:border-slate-800 shadow-lg">
      <div className="flex items-center justify-around h-full px-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className="flex flex-col items-center justify-center min-w-[56px] h-full cursor-pointer min-h-0 min-w-0 gap-0.5"
            >
              {/* Active indicator pill */}
              <div className={`relative flex items-center justify-center w-12 h-8 rounded-full transition-all duration-300 ${
                isActive
                  ? 'bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400'
                  : 'text-[#64748B] dark:text-slate-400'
              }`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-medium transition-all duration-200 ${
                isActive
                  ? 'text-[#2563EB] dark:text-blue-400 font-semibold'
                  : 'text-[#64748B] dark:text-slate-500'
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

