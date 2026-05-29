'use client';

import { useEffect } from 'react';
import { TaskManager } from '@/components/TaskManager';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { HabitTracker } from '@/components/HabitTracker';
import { QuickStats } from '@/components/QuickStats';
import { ThemeToggle } from '@/components/DeepWorkToggle';
import { MusicPlayer } from '@/components/MusicPlayer';
import { NotesUpload } from '@/components/NotesUpload';
import { NotesViewer } from '@/components/NotesViewer';
import { NotesSummary } from '@/components/NotesSummary';
import { MusicDashboard } from '@/components/MusicDashboard';
import { FloatingMiniPlayer } from '@/components/FloatingMiniPlayer';
import { ToastNotification } from '@/components/ToastNotification';
import { DocumentViewer } from '@/components/DocumentViewer';
import { useUIStore } from '@/lib/stores/uiStore';
import { usePlaylistStore } from '@/lib/stores/playlistStore';
import { SmartRichEditor } from '@/components/SmartRichEditor';
import { useNotesStore } from '@/lib/stores/notesStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { LogOut, User } from 'lucide-react';

export function Dashboard() {
  const activeSection = useUIStore((state) => state.activeSection);
  const restorePlaylistsFromStorage = usePlaylistStore((s) => s.restorePlaylistsFromStorage);
  const isEditing = useNotesStore((s) => s.isEditing);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const setEditing = useNotesStore((s) => s.setEditing);

  const { currentUser, logout } = useAuthStore();

  // Restore playlist data on mount
  useEffect(() => {
    restorePlaylistsFromStorage();
  }, [restorePlaylistsFromStorage]);

  // Responsive classes reused across sections
  const headerClass = [
    'sticky top-0 z-30',
    'bg-gradient-to-b from-slate-900/95 to-slate-900/50 backdrop-blur-md',
    'border-b border-slate-800 shadow-lg',
    'py-4 px-4 sm:py-6 sm:px-6 lg:px-8',
    'rounded-b-xl',
  ].join(' ');

  const titleClass   = 'text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent';
  const subtitleClass = 'text-xs sm:text-sm text-slate-400 mt-1';
  const contentClass  = 'flex-1 overflow-auto p-4 sm:p-6 lg:p-8';

  // Shared reusable premium Header widget
  const DashboardHeader = ({ title, subtitle }: { title: string; subtitle: string }) => {
    return (
      <header className={headerClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className={titleClass}>{title}</h1>
            <p className={subtitleClass}>{subtitle}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            {currentUser && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md hover:bg-slate-800/60 transition duration-300">
                {currentUser.foto_profil ? (
                  <img
                    src={currentUser.foto_profil}
                    alt={currentUser.nama}
                    className="w-8 h-8 rounded-full border border-violet-500/40 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-violet-500/40">
                    {currentUser.nama.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left min-w-0 leading-tight">
                  <p className="text-xs font-bold text-white truncate max-w-[120px]">{currentUser.nama}</p>
                  <p className="text-[10px] text-slate-400 truncate max-w-[120px]">@{currentUser.username}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-1 rounded-lg text-slate-400 hover:text-red-400 active:scale-90 transition-all cursor-pointer"
                  title="Keluar dari Focus OS"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      // ── Tasks ────────────────────────────────────────────────────────────
      case 'tasks':
        return (
          <main className="flex-1 flex flex-col min-h-screen">
            <DashboardHeader title="Tasks" subtitle="Organize and prioritize your work" />
            <div className={contentClass}>
              <TaskManager />
            </div>
          </main>
        );

      // ── Pomodoro ─────────────────────────────────────────────────────────
      case 'pomodoro':
        return (
          <main className="flex-1 flex flex-col min-h-screen">
            <DashboardHeader title="Pomodoro Timer" subtitle="Stay focused with time-blocked sessions" />
            <div className={contentClass}>
              <PomodoroTimer />
            </div>
          </main>
        );

      // ── Habits ───────────────────────────────────────────────────────────
      case 'habits':
        return (
          <main className="flex-1 flex flex-col min-h-screen">
            <DashboardHeader title="Weekly Habits" subtitle="Build consistency through daily practices" />
            <div className={contentClass}>
              <HabitTracker />
            </div>
          </main>
        );

      // ── Notes ─────────────────────────────────────────────────────────────
      case 'notes':
        if (isEditing) {
          return (
            <main className="flex-1 flex flex-col min-h-screen">
              <DashboardHeader 
                title={activeNoteId ? 'Edit Catatan' : 'Tulis Catatan Modern'} 
                subtitle={activeNoteId ? 'Perbarui isi catatan Anda dengan editor Notion-style' : 'Buat materi belajar baru dengan editor Notion-style'} 
              />
              <div className="flex-1 p-2 sm:p-6 lg:p-8">
                <SmartRichEditor
                  noteId={activeNoteId}
                  onSaveSuccess={() => setEditing(false)}
                  onCancel={() => setEditing(false)}
                />
              </div>
            </main>
          );
        }

        return (
          <main className="flex-1 flex flex-col min-h-screen">
            <DashboardHeader title="Catatan &amp; Materi" subtitle="Upload, lihat, dan ringkas materi pembelajaran Anda" />
            <div className="flex-1 overflow-auto px-2 py-4 sm:p-6 lg:p-8 pb-44 md:pb-8">
              <div className="space-y-6 lg:space-y-8">
                {/* Upload Section */}
                <NotesUpload />

                {/* Viewer + Summary Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
                  <div className="xl:col-span-1">
                    <NotesViewer />
                  </div>
                  <div className="xl:col-span-2">
                    <NotesSummary />
                  </div>
                </div>
              </div>
            </div>
          </main>
        );

      // ── Settings ─────────────────────────────────────────────────────────
      case 'settings':
        return (
          <main className="flex-1 flex flex-col min-h-screen">
            <DashboardHeader title="Settings" subtitle="Customize your productivity experience" />
            <div className={contentClass}>
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-xl p-8 sm:p-12 text-center">
                <p className="text-slate-400 text-lg">Settings page coming soon…</p>
              </div>
            </div>
          </main>
        );

      // ── Music Playlist ───────────────────────────────────────────────────
      case 'music':
        return (
          <main className="flex-1 flex flex-col min-h-screen">
            <DashboardHeader title="Focus Playlist" subtitle="Manage and listen to your custom music playlists" />
            <div className={contentClass}>
              <MusicDashboard />
            </div>
          </main>
        );

      // ── Word Document Workspace ──────────────────────────────────────────
      case 'document':
        return (
          <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              <DocumentViewer />
            </div>
          </main>
        );

      // ── Dashboard (default) ───────────────────────────────────────────────
      default:
        return (
          <main className="flex-1 flex flex-col min-h-screen">
            <DashboardHeader title="Welcome Back" subtitle="Your personal productivity dashboard" />
            <div className={contentClass}>
              {/* Quick Stats */}
              <section className="mb-6 lg:mb-8">
                <div className="mb-3 lg:mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white">Today's Overview</h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">Your productivity snapshot</p>
                </div>
                <QuickStats />
              </section>

              {/* Main Grid — stacks on mobile, 3 cols on desktop */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-8">
                <div><PomodoroTimer /></div>
                <div><TaskManager /></div>
                <div className="md:col-span-2 lg:col-span-1"><HabitTracker /></div>
              </section>
            </div>
          </main>
        );
    }
  };

  return (
    <div className="min-h-screen transition-all duration-300">
      {/*
        key={activeSection} forces React to unmount + remount this div
        every time the active section changes, which re-triggers the
        section-enter CSS animation (fade-up + scale + blur).
      */}
      <div key={activeSection} className="section-enter">
        {renderSection()}
      </div>

      {/* Hidden audio engine */}
      <MusicPlayer />

      {/* Floating Playlist Mini Player */}
      <FloatingMiniPlayer />

      {/* Toast Notifications */}
      <ToastNotification />
    </div>
  );
}
