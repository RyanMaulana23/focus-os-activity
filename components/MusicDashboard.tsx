'use client';

import { useState, useEffect } from 'react';
import { usePlaylistStore } from '@/lib/stores/playlistStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { PlaylistSidebar } from './PlaylistSidebar';
import { PlaylistContent } from './PlaylistContent';

export function MusicDashboard() {
  const { activePlaylistId } = usePlaylistStore();
  const isLightMode = useUIStore((s) => s.isLightMode);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  useEffect(() => {
    if (activePlaylistId) setMobileView('detail');
  }, [activePlaylistId]);

  return (
    <div className="w-full h-[calc(100vh-200px)] min-h-[480px] grid grid-cols-1 md:grid-cols-4 gap-6 select-none pb-24 md:pb-6">
      {/* Sidebar */}
      <div
        className={`${mobileView === 'list' ? 'block' : 'hidden'} md:block md:col-span-1 h-full overflow-hidden`}
      >
        <PlaylistSidebar onSelectPlaylist={() => setMobileView('detail')} />
      </div>

      {/* Main Content */}
      <div
        className={`${mobileView === 'detail' ? 'block' : 'hidden'} md:block md:col-span-3 overflow-y-auto h-full relative`}
        style={isLightMode
          ? {
              background: '#FFFFFF',
              border: '1px solid #E4E8F0',
              borderRadius: '16px',
              boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
              padding: '24px',
            }
          : {
              background: 'rgba(15,23,42,0.4)',
              backdropFilter: 'blur(12px)',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '24px',
            }
        }
      >
        <PlaylistContent onBackToSidebar={() => setMobileView('list')} />
      </div>
    </div>
  );
}
