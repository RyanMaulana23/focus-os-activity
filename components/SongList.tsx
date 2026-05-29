'use client';

import { useState } from 'react';
import { usePlaylistStore, getDefaultCover } from '@/lib/stores/playlistStore';
import { Song } from '@/lib/types/index';
import { Play, Pause, Trash2, GripVertical } from 'lucide-react';

interface SongListProps {
  songs: Song[];
  playlistId: string;
}

export function SongList({ songs, playlistId }: SongListProps) {
  const { currentSong, isPlaying, playSong, togglePlay, removeSongFromPlaylist, reorderSongs } = usePlaylistStore();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // HTML5 Drag & Drop states
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Format Duration helper
  const formatDuration = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Drag & drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === index) return;
    setDragOverIdx(index);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDrop = (index: number) => {
    if (draggedIdx !== null && draggedIdx !== index) {
      reorderSongs(playlistId, draggedIdx, index);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleRowClick = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, playlistId);
    }
  };

  const handleRemove = (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Hapus lagu ini dari playlist?')) {
      removeSongFromPlaylist(playlistId, songId);
    }
  };

  return (
    <div className="flex flex-col h-auto md:h-full bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Table Header */}
      <div className="flex items-center text-xs uppercase font-bold text-slate-500 tracking-wider px-4 py-3 border-b border-slate-800 flex-shrink-0 bg-slate-950/20">
        <span className="w-8 text-center">#</span>
        <span className="flex-1 pl-4">Judul Lagu</span>
        <span className="w-20 text-right pr-6">Durasi</span>
        <span className="w-20 text-center">Aksi</span>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {songs.map((song, index) => {
          const isCurrent = currentSong?.id === song.id;
          const isHovered = hoveredIdx === index;
          const isDragOver = dragOverIdx === index;

          return (
            <div
              key={song.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(index)}
              onMouseEnter={() => setHoveredIdx(index)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => handleRowClick(song)}
              className={`flex items-center px-4 py-3 cursor-pointer group transition-all duration-250 select-none ${
                isCurrent
                  ? 'bg-violet-950/10 text-white'
                  : 'hover:bg-slate-800/40 text-slate-300 hover:text-white'
              } ${isDragOver ? 'border-t-2 border-violet-500 bg-violet-950/20' : ''} ${
                draggedIdx === index ? 'opacity-40 bg-slate-800/20' : ''
              }`}
            >
              {/* Drag Handle & Play/Pause controls */}
              <div
                className="w-8 flex items-center justify-center flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {isHovered ? (
                  <button
                    onClick={() => handleRowClick(song)}
                    className="p-1 hover:bg-slate-800 rounded transition text-white"
                  >
                    {isCurrent && isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-white" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    )}
                  </button>
                ) : isCurrent && isPlaying ? (
                  /* Floating premium Equalizer Bars */
                  <div className="flex items-end gap-[2.5px] w-3 h-3 mb-0.5">
                    <span className="w-[2px] bg-violet-400 rounded-full animate-pulse h-2" style={{ animationDuration: '0.6s' }} />
                    <span className="w-[2px] bg-blue-400 rounded-full animate-pulse h-3" style={{ animationDuration: '0.8s' }} />
                    <span className="w-[2px] bg-cyan-400 rounded-full animate-pulse h-1.5" style={{ animationDuration: '0.5s' }} />
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 font-medium">{index + 1}</span>
                )}
              </div>

              {/* Title & Artist info */}
              <div className="flex-1 flex items-center min-w-0 pl-4">
                <div className="relative w-8 h-8 rounded overflow-hidden mr-3 border border-slate-800 flex-shrink-0">
                  <img
                    src={song.coverImage || getDefaultCover(song.id)}
                    alt={song.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs sm:text-sm font-semibold truncate ${
                    isCurrent ? 'text-violet-400' : 'text-white'
                  }`}>
                    {song.title}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 truncate mt-0.5">
                    {song.artist || 'Unknown Artist'}
                  </p>
                </div>
              </div>

              {/* Duration */}
              <div className="w-20 text-right text-xs text-slate-500 font-medium pr-6 flex-shrink-0">
                {formatDuration(song.duration)}
              </div>

              {/* Action Handles */}
              <div
                className="w-20 flex items-center justify-center gap-1 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  {/* Grip drag handle */}
                  <div
                    className="p-1 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing rounded"
                    title="Geser untuk menyusun ulang"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                  {/* Remove Button */}
                  <button
                    onClick={(e) => handleRemove(song.id, e)}
                    className="p-1 hover:bg-rose-950/40 rounded text-slate-500 hover:text-rose-400 transition"
                    title="Hapus dari playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
