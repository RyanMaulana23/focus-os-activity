'use client';

import { useUIStore } from '@/lib/stores/uiStore';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Music,
  FolderOpen,
} from 'lucide-react';
import { useState } from 'react';

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
  const { activeSection, setActiveSection, isLightMode } = useUIStore();
  const [hoveredId, setHoveredId] = useState<Section | null>(null);
  const LM = isLightMode;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden h-[72px]"
      style={LM
        ? {
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid #E4E8F0',
            boxShadow: '0 -4px 20px rgba(15,23,42,0.06)',
          }
        : {
            background: 'rgba(9,9,11,0.92)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(30,41,59,0.8)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
          }
      }
    >
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const isActive  = activeSection === item.id;
          const isHovered = hoveredId === item.id;

          // ── Light mode colors ─────────────────────────────────────────────
          const lmPillBg   = isActive  ? '#EEF0FF'
                           : isHovered ? '#F5F3FF'
                           : 'transparent';
          const lmIconColor = isActive  ? '#5B50F0'
                            : isHovered ? '#7C6FF7'
                            : '#94A3B8';
          const lmTextColor = isActive  ? '#5B50F0'
                            : isHovered ? '#7C6FF7'
                            : '#94A3B8';

          // ── Dark mode colors ──────────────────────────────────────────────
          const dmPillBg    = isActive  ? 'rgba(91,80,240,0.18)'
                            : isHovered ? 'rgba(91,80,240,0.1)'
                            : 'transparent';
          const dmIconColor = isActive  ? '#A78BFA'
                            : isHovered ? '#8B7CF6'
                            : '#64748B';
          const dmTextColor = isActive  ? '#A78BFA'
                            : isHovered ? '#8B7CF6'
                            : '#64748B';

          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onTouchStart={() => setHoveredId(item.id)}
              onTouchEnd={() => setTimeout(() => setHoveredId(null), 300)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 cursor-pointer select-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Pill indicator */}
              <div
                className="relative flex items-center justify-center rounded-full transition-all duration-200"
                style={{
                  width: '48px',
                  height: '32px',
                  background: LM ? lmPillBg : dmPillBg,
                  transform: isActive ? 'scale(1.05)' : isHovered ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Active top indicator dot */}
                {isActive && (
                  <span
                    className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: LM ? '#5B50F0' : '#A78BFA' }}
                  />
                )}
                <span
                  className="transition-all duration-200"
                  style={{ color: LM ? lmIconColor : dmIconColor }}
                >
                  {item.icon}
                </span>
              </div>

              {/* Label */}
              <span
                className="text-[10px] transition-all duration-200"
                style={{
                  color: LM ? lmTextColor : dmTextColor,
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: isActive ? '0.01em' : 'normal',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
