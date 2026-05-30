'use client';

import { useUIStore } from '@/lib/stores/uiStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  Flame,
  Settings,
  LogOut,
  FileText,
  X,
  Music,
  FolderOpen,
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  section: 'dashboard' | 'tasks' | 'pomodoro' | 'habits' | 'notes' | 'settings' | 'music' | 'analyzer' | 'document';
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard',   icon: <LayoutDashboard className="w-5 h-5" />, section: 'dashboard' },
  { id: 'tasks',     label: 'Tasks',       icon: <CheckSquare    className="w-5 h-5" />, section: 'tasks'     },
  { id: 'pomodoro',  label: 'Pomodoro',    icon: <Clock          className="w-5 h-5" />, section: 'pomodoro'  },
  { id: 'habits',    label: 'Habits',      icon: <Flame          className="w-5 h-5" />, section: 'habits'    },
  { id: 'notes',     label: 'Notes',       icon: <FileText       className="w-5 h-5" />, section: 'notes'     },
  { id: 'document',  label: 'Word Viewer', icon: <FolderOpen     className="w-5 h-5" />, section: 'document'  },
  { id: 'music',     label: 'Playlist',    icon: <Music          className="w-5 h-5" />, section: 'music'     },
  { id: 'settings',  label: 'Settings',    icon: <Settings       className="w-5 h-5" />, section: 'settings'  },
];

const staggerClass = ['nav-item-1','nav-item-2','nav-item-3','nav-item-4','nav-item-5','nav-item-6','nav-item-7','nav-item-8'];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { activeSection, setActiveSection, isLightMode } = useUIStore();
  const { currentUser, logout } = useAuthStore();
  const [isExpanded,  setIsExpanded]  = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsAnimating(false), 700);
    return () => clearTimeout(t);
  }, []);

  const handleNavClick = (section: SidebarItem['section']) => {
    setActiveSection(section);
    onMobileClose?.();
  };

  // ── Desktop Nav Item ─────────────────────────────────────────────────────
  const DesktopNavItem = ({ item, index }: { item: SidebarItem; index: number }) => {
    const isActive = activeSection === item.section;

    if (isLightMode) {
      return (
        <button
          onClick={() => handleNavClick(item.section)}
          className={[isAnimating ? staggerClass[index] : '', 'relative w-full flex items-center gap-3 transition-all duration-200 group overflow-hidden'].join(' ')}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            background: isActive ? '#EEF0FF' : 'transparent',
            color: isActive ? '#5B50F0' : '#64748B',
            borderLeft: isActive ? '3px solid #5B50F0' : '3px solid transparent',
            fontWeight: isActive ? 600 : 400,
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              (e.currentTarget as HTMLButtonElement).style.background = '#F1F3FF';
              (e.currentTarget as HTMLButtonElement).style.color = '#3730A3';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#64748B';
            }
          }}
          title={item.label}
        >
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center" style={{ color: isActive ? '#5B50F0' : '#94A3B8' }}>
            {item.icon}
          </span>
          <span className={['text-sm whitespace-nowrap transition-all duration-300 ease-out', isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none absolute left-16'].join(' ')}>
            {item.label}
          </span>
          {/* Tooltip when collapsed */}
          {!isExpanded && (
            <div
              className="absolute left-full ml-3 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg transition-all duration-200 translate-x-1 group-hover:translate-x-0 z-50"
              style={{ background: '#FFFFFF', border: '1px solid #E4E8F0', color: '#0F172A' }}
            >
              {item.label}
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent" style={{ borderRightColor: '#E4E8F0' }} />
            </div>
          )}
        </button>
      );
    }

    // Dark mode nav item
    return (
      <button
        onClick={() => handleNavClick(item.section)}
        className={[
          isAnimating ? staggerClass[index] : '',
          'relative w-full flex items-center gap-4 px-4 py-3 rounded-xl',
          'transition-all duration-300 group overflow-hidden',
          isActive ? 'nav-active-glow text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
        ].join(' ')}
        title={item.label}
      >
        {isActive && <span className="absolute inset-0 nav-active-shimmer rounded-xl opacity-90" aria-hidden="true" />}
        {!isActive && <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-slate-800/80 to-slate-700/40 rounded-xl" aria-hidden="true" />}

        <span className={['relative z-10 flex-shrink-0 w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:scale-110', isActive ? 'scale-110' : ''].join(' ')}>
          {item.icon}
        </span>
        <span className={['relative z-10 text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out', isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none absolute left-16'].join(' ')}>
          {item.label}
        </span>
        {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-white/70 rounded-r-full" aria-hidden="true" />}
        {!isExpanded && (
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 border border-slate-700 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-xl transition-all duration-200 translate-x-1 group-hover:translate-x-0">
            {item.label}
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
          </div>
        )}
      </button>
    );
  };

  // Light mode sidebar styles
  const lmSidebarStyle = {
    background: '#FFFFFF',
    borderRight: '1px solid #E4E8F0',
    boxShadow: '1px 0 0 0 #E4E8F0',
  };

  return (
    <>
      {/* ── Mobile Drawer Overlay ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-40 md:hidden"
          style={{ background: isLightMode ? 'rgba(15,23,42,0.25)' : 'rgba(0,0,0,0.60)' }}
          onClick={onMobileClose}
        />
      )}

      {/* ── Mobile Drawer ─────────────────────────────────────────────────── */}
      <aside
        className={[
          'fixed left-0 top-0 h-screen w-72 z-50 flex flex-col md:hidden',
          !isLightMode && 'bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/60 shadow-2xl shadow-violet-950/30',
          'transition-transform duration-300 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].filter(Boolean).join(' ')}
        style={isLightMode ? { ...lmSidebarStyle, boxShadow: '4px 0 16px rgba(15,23,42,0.08)' } : undefined}
      >
        {/* Mobile header */}
        <div
          className="flex items-center justify-between px-5 py-5"
          style={{ borderBottom: isLightMode ? '1px solid #E4E8F0' : '1px solid rgba(51,65,85,0.6)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 logo-glow" style={{ background: '#5B50F0' }}>
              <span className="text-lg font-bold text-white">F</span>
            </div>
            <div>
              <h1 className="text-base font-bold" style={{ color: isLightMode ? '#0F172A' : '#FFFFFF' }}>Focus OS</h1>
              <p className="text-xs" style={{ color: isLightMode ? '#94A3B8' : '#94A3B8' }}>Productivity Suite</p>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg transition"
            style={{ color: isLightMode ? '#94A3B8' : '#94A3B8' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = isLightMode ? '#F1F5F9' : '#1e293b'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile nav */}
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1 overflow-y-auto">
          {sidebarItems.map((item, idx) => {
            const isActive = activeSection === item.section;
            if (isLightMode) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.section)}
                  className={[isAnimating ? staggerClass[idx] : '', 'flex items-center gap-4 transition-all duration-200 relative overflow-hidden'].join(' ')}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: isActive ? '#EEF0FF' : 'transparent',
                    color: isActive ? '#5B50F0' : '#64748B',
                    borderLeft: isActive ? '3px solid #5B50F0' : '3px solid transparent',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <span style={{ color: isActive ? '#5B50F0' : '#94A3B8' }}>{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            }
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.section)}
                className={[
                  isAnimating ? staggerClass[idx] : '',
                  'flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden',
                  isActive ? 'text-white nav-active-glow' : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
                ].join(' ')}
              >
                {isActive && <span className="absolute inset-0 nav-active-shimmer rounded-xl opacity-90" aria-hidden="true" />}
                <span className="relative z-10 flex-shrink-0">{item.icon}</span>
                <span className="relative z-10 text-sm font-medium">{item.label}</span>
                {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-white/70 rounded-r-full" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>

        {/* Mobile bottom profile */}
        {currentUser && (
          <div className="p-4 space-y-4" style={{ borderTop: isLightMode ? '1px solid #E4E8F0' : '1px solid rgba(51,65,85,0.6)' }}>
            <div className="flex items-center gap-3">
              {currentUser.foto_profil ? (
                <img src={currentUser.foto_profil} alt={currentUser.nama} className="w-10 h-10 rounded-xl object-cover" style={{ border: isLightMode ? '1px solid #E4E8F0' : '1px solid rgba(139,92,246,0.4)' }} />
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: isLightMode ? '#EEF0FF' : '#1e293b', color: isLightMode ? '#5B50F0' : '#FFFFFF', border: isLightMode ? '1px solid #E4E8F0' : '1px solid rgba(139,92,246,0.4)' }}>
                  {currentUser.nama.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: isLightMode ? '#0F172A' : '#FFFFFF' }}>{currentUser.nama}</p>
                <p className="text-xs truncate" style={{ color: isLightMode ? '#475569' : '#94A3B8' }}>@{currentUser.username}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); onMobileClose?.(); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm cursor-pointer active:scale-95 transition-all duration-200"
              style={isLightMode
                ? { background: '#FFF1F2', color: '#E11D48', border: '1px solid #FECDD3' }
                : { color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', background: 'transparent' }
              }
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </aside>

      {/* ── Desktop Sidebar ───────────────────────────────────────────────── */}
      <aside
        className={[
          'sidebar-enter',
          'hidden md:flex fixed left-0 top-0 h-screen flex-col z-40',
          !isLightMode && 'bg-slate-950/90 backdrop-blur-xl border-r border-slate-800/50 shadow-2xl shadow-violet-950/20',
          'transition-[width] duration-300 ease-out',
          isExpanded ? 'w-64' : 'w-20',
        ].filter(Boolean).join(' ')}
        style={isLightMode ? lmSidebarStyle : undefined}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Logo */}
        <div
          className={['flex items-center gap-3 px-4 py-6 transition-all duration-300', isExpanded ? 'justify-start' : 'justify-center'].join(' ')}
          style={{ borderBottom: isLightMode ? '1px solid #E4E8F0' : '1px solid rgba(51,65,85,0.5)' }}
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center logo-glow" style={{ background: '#5B50F0' }}>
            <span className="text-lg font-bold text-white">F</span>
          </div>
          <div className={['flex flex-col overflow-hidden transition-all duration-300', isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 pointer-events-none'].join(' ')}>
            <h1 className="text-base font-bold whitespace-nowrap" style={{ color: isLightMode ? '#0F172A' : '#FFFFFF' }}>Focus OS</h1>
            <p className="text-xs whitespace-nowrap" style={{ color: '#94A3B8' }}>Productivity Suite</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5 px-3 py-4 flex-1">
          {sidebarItems.map((item, index) => (
            <DesktopNavItem key={item.id} item={item} index={index} />
          ))}
        </nav>

        {/* Bottom Profile & Logout */}
        {currentUser && (
          <div className="p-3 space-y-2" style={{ borderTop: isLightMode ? '1px solid #E4E8F0' : '1px solid rgba(51,65,85,0.5)' }}>
            <div className={`flex items-center transition-all duration-300 ${isExpanded ? 'justify-between px-1' : 'justify-center'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative group w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: isLightMode ? '#EEF0FF' : '#1e293b', border: isLightMode ? '1px solid #E4E8F0' : '1px solid rgba(139,92,246,0.4)' }}>
                  {currentUser.foto_profil ? (
                    <img src={currentUser.foto_profil} alt={currentUser.nama} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: isLightMode ? '#5B50F0' : '#FFFFFF' }}>
                      {currentUser.nama.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {!isExpanded && (
                    <div
                      className="absolute left-full ml-3 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-xl transition-all duration-200 translate-x-1 group-hover:translate-x-0 z-50"
                      style={isLightMode ? { background: '#FFFFFF', border: '1px solid #E4E8F0', color: '#0F172A' } : { background: '#1e293b', border: '1px solid #334155', color: '#FFFFFF' }}
                    >
                      <div className="font-bold">{currentUser.nama}</div>
                      <div className="text-[10px]" style={{ color: '#94A3B8' }}>@{currentUser.username}</div>
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <div className="min-w-0 leading-tight">
                    <p className="text-sm font-bold truncate" style={{ color: isLightMode ? '#0F172A' : '#FFFFFF' }}>{currentUser.nama}</p>
                    <p className="text-[11px] truncate" style={{ color: isLightMode ? '#475569' : '#94A3B8' }}>@{currentUser.username}</p>
                  </div>
                )}
              </div>
              {isExpanded && (
                <button
                  onClick={logout}
                  className="p-2 rounded-lg transition-all duration-200 flex-shrink-0 cursor-pointer active:scale-95"
                  style={{ color: '#94A3B8' }}
                  title="Logout"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = isLightMode ? '#FFF1F2' : 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#E11D48'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; }}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
            {!isExpanded && (
              <button
                onClick={logout}
                className="w-full flex items-center justify-center p-3 rounded-xl transition-all duration-300 group relative cursor-pointer"
                style={{ color: '#94A3B8' }}
                title="Logout"
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = isLightMode ? '#FFF1F2' : 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#E11D48'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; }}
              >
                <LogOut className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <div
                  className="absolute left-full ml-3 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-xl transition-all duration-200 translate-x-1 group-hover:translate-x-0 z-50"
                  style={isLightMode ? { background: '#FFFFFF', border: '1px solid #E4E8F0', color: '#0F172A' } : { background: '#1e293b', border: '1px solid #334155', color: '#FFFFFF' }}
                >
                  Logout
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent" style={{ borderRightColor: isLightMode ? '#E4E8F0' : '#1e293b' }} />
                </div>
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
