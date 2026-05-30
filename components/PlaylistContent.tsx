'use client';

import { useRef, useState, useCallback } from 'react';
import { usePlaylistStore, getDefaultCover } from '@/lib/stores/playlistStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { SongList } from '@/components/SongList';
import {
  UploadCloud,
  Play,
  Shuffle,
  Camera,
  Music4,
  Loader2,
  ChevronLeft
} from 'lucide-react';

interface PlaylistContentProps {
  onBackToSidebar?: () => void;
}

export function PlaylistContent({ onBackToSidebar }: PlaylistContentProps) {
  const {
    playlists,
    activePlaylistId,
    updatePlaylistCover,
    addSongsToPlaylist,
    uploadProgress,
    playSong,
    shuffle,
    setShuffle,
    addToast
  } = usePlaylistStore();
  const isLightMode = useUIStore((s) => s.isLightMode);

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const playlist = playlists.find((p) => p.id === activePlaylistId);
  const LM = isLightMode;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else if (e.type === 'dragleave') setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragActive(false);
    if (!playlist) return;
    if (e.dataTransfer.files?.length > 0) {
      await addSongsToPlaylist(playlist.id, Array.from(e.dataTransfer.files));
    }
  }, [playlist, addSongsToPlaylist]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playlist || !e.target.files?.length) return;
    await addSongsToPlaylist(playlist.id, Array.from(e.target.files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playlist) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      addToast('Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Ukuran gambar maksimal adalah 5MB.', 'error');
      return;
    }
    await updatePlaylistCover(playlist.id, file);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handlePlayAll = () => {
    if (!playlist?.songs.length) return;
    playSong(playlist.songs[0], playlist.id);
  };

  const handleShufflePlay = () => {
    if (!playlist?.songs.length) return;
    setShuffle(true);
    playSong(playlist.songs[Math.floor(Math.random() * playlist.songs.length)], playlist.id);
  };

  const formatTotalDuration = () => {
    if (!playlist) return '0 menit';
    const totalSec = playlist.songs.reduce((a, s) => a + (s.duration || 0), 0);
    return `${Math.floor(totalSec / 60)} menit`;
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!playlist) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center h-[400px] rounded-2xl border-2 border-dashed"
        style={LM
          ? { background: '#FAFBFF', borderColor: '#CBD5E1' }
          : { background: 'rgba(15,23,42,0.1)', borderColor: '#1e293b' }
        }
      >
        <Music4 className="w-12 h-12 mb-3 animate-pulse" style={{ color: LM ? '#CBD5E1' : '#334155' }} />
        <p className="text-sm font-medium" style={{ color: LM ? '#94A3B8' : '#64748B' }}>
          Pilih playlist dari sidebar atau buat playlist baru.
        </p>
      </div>
    );
  }

  const uploadingSongs = Object.keys(uploadProgress);
  const isUploading   = uploadingSongs.length > 0;

  return (
    <div className="flex flex-col h-auto md:h-full space-y-6 md:overflow-hidden">
      {/* Cover / Header */}
      <div
        className="flex flex-col sm:flex-row items-center sm:items-end gap-5 p-4 rounded-2xl"
        style={LM
          ? { background: '#F8FAFC', border: '1px solid #E4E8F0' }
          : { background: 'linear-gradient(to bottom, rgba(30,41,59,0.3), transparent)', border: '1px solid rgba(30,41,59,0.4)' }
        }
      >
        {/* Back button (mobile) */}
        {onBackToSidebar && (
          <button
            onClick={onBackToSidebar}
            className="sm:hidden self-start flex items-center gap-1 text-xs mb-2 transition-colors"
            style={{ color: LM ? '#94A3B8' : '#64748B' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = LM ? '#5B50F0' : '#FFFFFF')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = LM ? '#94A3B8' : '#64748B')}
          >
            <ChevronLeft className="w-4 h-4" /> Kembali
          </button>
        )}

        {/* Cover Art */}
        <div
          className="relative group w-36 h-36 sm:w-40 sm:h-40 rounded-xl overflow-hidden shadow-2xl flex-shrink-0"
          style={{ border: LM ? '1px solid #E4E8F0' : '1px solid #1e293b' }}
        >
          <img
            src={playlist.coverImage || getDefaultCover(playlist.id)}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-300 cursor-pointer"
          >
            <Camera className="w-6 h-6 mb-1 text-slate-200" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Ubah Cover</span>
          </button>
          <input ref={coverInputRef} type="file" accept="image/jpeg, image/png, image/webp" onChange={handleCoverSelect} className="hidden" />
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
          <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#5B50F0' }}>Playlist</span>
          <h2
            className="text-xl sm:text-3xl font-extrabold truncate drop-shadow-md"
            style={{ color: LM ? '#0F172A' : '#FFFFFF' }}
          >
            {playlist.name}
          </h2>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-medium" style={{ color: '#94A3B8' }}>
            <span>{playlist.songs.length} lagu</span>
            <span className="w-1 h-1 rounded-full" style={{ background: '#94A3B8' }} />
            <span>{formatTotalDuration()}</span>
          </div>

          {/* Play / Shuffle buttons */}
          {playlist.songs.length > 0 && (
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 pt-3">
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 font-semibold text-xs sm:text-sm py-2 px-5 rounded-full shadow-lg hover:scale-[1.02] transition active:scale-95 cursor-pointer text-white"
                style={{
                  background: '#5B50F0',
                  boxShadow: '0 4px 14px rgba(91,80,240,0.35)',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#4A40E0')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#5B50F0')}
              >
                <Play className="w-4 h-4 fill-white" /> Putar Semua
              </button>
              <button
                onClick={handleShufflePlay}
                className="flex items-center gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-full hover:scale-[1.02] transition active:scale-95 cursor-pointer"
                style={LM
                  ? { background: '#F1F5F9', border: '1px solid #E4E8F0', color: '#475569' }
                  : { background: '#1e293b', border: '1px solid #334155', color: '#CBD5E1' }
                }
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = LM ? '#FFFFFF' : '#334155';
                  (e.currentTarget as HTMLButtonElement).style.color = LM ? '#0F172A' : '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = LM ? '#F1F5F9' : '#1e293b';
                  (e.currentTarget as HTMLButtonElement).style.color = LM ? '#475569' : '#CBD5E1';
                }}
              >
                <Shuffle className="w-4 h-4" /> Acak
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="relative flex flex-col items-center justify-center p-6 text-center border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 min-h-[140px]"
        style={isDragActive
          ? { borderColor: '#5B50F0', background: LM ? 'rgba(91,80,240,0.04)' : 'rgba(91,80,240,0.08)' }
          : LM
            ? { borderColor: '#CBD5E1', background: '#FAFBFF' }
            : { borderColor: '#1e293b', background: 'rgba(15,23,42,0.1)' }
        }
        onMouseEnter={(e) => {
          if (!isDragActive) {
            (e.currentTarget as HTMLDivElement).style.borderColor = LM ? '#5B50F0' : '#334155';
            (e.currentTarget as HTMLDivElement).style.background  = LM ? 'rgba(91,80,240,0.02)' : 'rgba(30,41,59,0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragActive) {
            (e.currentTarget as HTMLDivElement).style.borderColor = LM ? '#CBD5E1' : '#1e293b';
            (e.currentTarget as HTMLDivElement).style.background  = LM ? '#FAFBFF' : 'rgba(15,23,42,0.1)';
          }
        }}
      >
        <input ref={fileInputRef} type="file" accept=".mp3,audio/mpeg,.wav,audio/wav,audio/x-wav,.ogg,audio/ogg" multiple onChange={handleFileSelect} className="hidden" />

        <UploadCloud className="w-8 h-8 mb-2 transition-transform" style={{ color: LM ? '#CBD5E1' : '#334155' }} />
        <p className="text-xs sm:text-sm font-semibold" style={{ color: LM ? '#475569' : '#94A3B8' }}>
          Tarik &amp; Lepas file musik di sini, atau klik untuk memilih
        </p>
        <p className="text-[10px] mt-1" style={{ color: '#94A3B8' }}>
          Mendukung format MP3, WAV, OGG (Bisa pilih banyak sekaligus)
        </p>

        {/* Upload overlay */}
        {isUploading && (
          <div
            className="absolute inset-0 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2 p-4"
            style={{ background: LM ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.95)' }}
          >
            <Loader2 className="w-8 h-8 text-[#5B50F0] animate-spin" />
            <p className="text-xs sm:text-sm font-semibold" style={{ color: LM ? '#0F172A' : '#FFFFFF' }}>Sedang mengupload lagu...</p>
            <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: LM ? '#E4E8F0' : '#1e293b' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(Object.values(uploadProgress).reduce((a, p) => a + p, 0) / uploadingSongs.length)}%`,
                  background: '#5B50F0',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Song List */}
      <div className="flex-1 md:overflow-hidden min-h-[200px]">
        {playlist.songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <p className="text-sm" style={{ color: '#94A3B8' }}>Belum ada lagu di playlist ini.</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Silakan upload lagu di atas untuk memulai mendengarkan.</p>
          </div>
        ) : (
          <SongList songs={playlist.songs} playlistId={playlist.id} />
        )}
      </div>
    </div>
  );
}
