'use client';

import { useState, useEffect } from 'react';
import { usePlaylistStore } from '@/lib/stores/playlistStore';
import { PlaylistSidebar } from './PlaylistSidebar';
import { PlaylistContent } from './PlaylistContent';

export function MusicDashboard() {
  const { activePlaylistId } = usePlaylistStore();
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  // Automatically switch to detail view on mobile when activePlaylistId changes
  useEffect(() => {
    if (activePlaylistId) {
      setMobileView('detail');
    }
  }, [activePlaylistId]);

  return (
    <div className="w-full h-[calc(100vh-200px)] min-h-[480px] grid grid-cols-1 md:grid-cols-4 gap-6 select-none pb-24 md:pb-6">
      {/* Sidebar - list of playlists */}
      <div
        className={`${
          mobileView === 'list' ? 'block' : 'hidden'
        } md:block md:col-span-1 h-full overflow-hidden`}
      >
        <PlaylistSidebar onSelectPlaylist={() => setMobileView('detail')} />
      </div>

      {/* Main Content - selected playlist tracks, edit cover, upload dropzone */}
      <div
        className={`${
          mobileView === 'detail' ? 'block' : 'hidden'
        } md:block md:col-span-3 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-4 sm:p-6 overflow-y-auto h-full relative`}
      >
        <PlaylistContent onBackToSidebar={() => setMobileView('list')} />
      </div>
    </div>
  );
}
