'use client';

import { useRef, useState, useCallback } from 'react';
import { usePlaylistStore, getDefaultCover } from '@/lib/stores/playlistStore';
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const playlist = playlists.find((p) => p.id === activePlaylistId);

  // Drag & drop file upload event handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (!playlist) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      await addSongsToPlaylist(playlist.id, filesArray);
    }
  }, [playlist, addSongsToPlaylist]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playlist) return;
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      await addSongsToPlaylist(playlist.id, filesArray);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playlist) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Check format
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      addToast('Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.', 'error');
      return;
    }

    // Limit 5MB
    if (file.size > 5 * 1024 * 1024) {
      addToast('Ukuran gambar maksimal adalah 5MB.', 'error');
      return;
    }

    await updatePlaylistCover(playlist.id, file);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handlePlayAll = () => {
    if (!playlist || playlist.songs.length === 0) return;
    playSong(playlist.songs[0], playlist.id);
  };

  const handleShufflePlay = () => {
    if (!playlist || playlist.songs.length === 0) return;
    setShuffle(true);
    const randomIndex = Math.floor(Math.random() * playlist.songs.length);
    playSong(playlist.songs[randomIndex], playlist.id);
  };

  const formatTotalDuration = () => {
    if (!playlist) return '0 menit';
    const totalSeconds = playlist.songs.reduce((acc, song) => acc + (song.duration || 0), 0);
    const mins = Math.floor(totalSeconds / 60);
    return `${mins} menit`;
  };

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-[400px] border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
        <Music4 className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <p className="text-slate-400 text-sm font-medium">Pilih playlist dari sidebar atau buat playlist baru.</p>
      </div>
    );
  }

  // Check if there are active uploads
  const uploadingSongs = Object.keys(uploadProgress);
  const isUploading = uploadingSongs.length > 0;

  return (
    <div className="flex flex-col h-auto md:h-full space-y-6 md:overflow-hidden">
      {/* Cover / Details Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 bg-gradient-to-b from-slate-800/20 to-transparent p-4 rounded-2xl border border-slate-800/40">
        {/* Mobile back button */}
        {onBackToSidebar && (
          <button
            onClick={onBackToSidebar}
            className="sm:hidden self-start flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2"
          >
            <ChevronLeft className="w-4 h-4" /> Kembali
          </button>
        )}

        {/* Playlist Cover Art */}
        <div className="relative group w-36 h-36 sm:w-40 sm:h-40 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 border border-slate-800">
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
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg, image/png, image/webp"
            onChange={handleCoverSelect}
            className="hidden"
          />
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400">Playlist</span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-white truncate drop-shadow-md">
            {playlist.name}
          </h2>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400 font-medium">
            <span>{playlist.songs.length} lagu</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>{formatTotalDuration()}</span>
          </div>

          {/* Action buttons */}
          {playlist.songs.length > 0 && (
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 pt-3">
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm py-2 px-5 rounded-full shadow-lg shadow-violet-600/35 hover:shadow-violet-600/50 hover:scale-[1.02] transition active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" /> Putar Semua
              </button>
              <button
                onClick={handleShufflePlay}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm py-2 px-4 rounded-full border border-slate-700/60 hover:scale-[1.02] transition active:scale-95 cursor-pointer"
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
        className={`relative flex flex-col items-center justify-center p-6 text-center border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 min-h-[140px] ${
          isDragActive
            ? 'border-violet-500 bg-violet-950/10 shadow-[0_0_20px_rgba(139,92,246,0.1)]'
            : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/10'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,audio/mpeg,.wav,audio/wav,audio/x-wav,.ogg,audio/ogg"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <UploadCloud className="w-8 h-8 text-slate-500 mb-2 group-hover:scale-105 transition-transform" />
        <p className="text-xs sm:text-sm text-slate-300 font-semibold">
          Tarik & Lepas file musik di sini, atau klik untuk memilih
        </p>
        <p className="text-[10px] text-slate-500 mt-1">
          Mendukung format MP3, WAV, OGG (Bisa pilih banyak sekaligus)
        </p>

        {/* Uploading loading indicators overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2 p-4 animate-fade-up">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-xs sm:text-sm font-semibold text-white">Sedang mengupload lagu...</p>
            <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-gradient-to-r from-violet-600 to-blue-600 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(
                    Object.values(uploadProgress).reduce((acc, p) => acc + p, 0) / uploadingSongs.length
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Song List Component */}
      <div className="flex-1 md:overflow-hidden min-h-[200px]">
        {playlist.songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <p className="text-sm text-slate-500">Belum ada lagu di playlist ini.</p>
            <p className="text-xs text-slate-600 mt-1">Silakan upload lagu di atas untuk memulai mendengarkan.</p>
          </div>
        ) : (
          <SongList songs={playlist.songs} playlistId={playlist.id} />
        )}
      </div>
    </div>
  );
}
