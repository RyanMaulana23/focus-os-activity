'use client';

import { useState } from 'react';
import { usePlaylistStore, getDefaultCover } from '@/lib/stores/playlistStore';
import { Plus, Trash2, Edit2, Check, X, FolderHeart } from 'lucide-react';

interface PlaylistSidebarProps {
  onSelectPlaylist?: () => void;
}

export function PlaylistSidebar({ onSelectPlaylist }: PlaylistSidebarProps) {
  const {
    playlists,
    activePlaylistId,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    setActivePlaylistId,
  } = usePlaylistStore();

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsCreating(false);
  };

  const startRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingName(currentName);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditingName('');
  };

  const saveRename = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editingName.trim()) return;
    renamePlaylist(id, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Apakah Anda yakin ingin menghapus playlist ini beserta semua lagunya?')) {
      await deletePlaylist(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 text-white">
          <FolderHeart className="w-5 h-5 text-violet-400" />
          <h2 className="text-base font-bold">Koleksi Playlist</h2>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95"
          title="Buat Playlist Baru"
        >
          <Plus className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="flex-shrink-0 flex gap-2 animate-fade-up">
          <input
            type="text"
            placeholder="Nama playlist..."
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            className="flex-1 text-xs sm:text-sm px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition"
          >
            Buat
          </button>
        </form>
      )}

      {/* Playlist List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {playlists.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-slate-500 leading-5">Belum ada playlist.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-2 text-xs text-violet-400 hover:text-violet-300 font-semibold"
            >
              Buat playlist pertama kamu!
            </button>
          </div>
        ) : (
          playlists.map((playlist) => {
            const isActive = activePlaylistId === playlist.id;
            const isEditing = editingId === playlist.id;

            return (
              <div
                key={playlist.id}
                onClick={() => {
                  if (!isEditing) {
                    usePlaylistStore.setState({ activePlaylistId: playlist.id });
                    onSelectPlaylist?.();
                  }
                }}
                className={`group flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'border-violet-500/40 bg-violet-950/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                    : 'border-transparent hover:border-slate-800 hover:bg-slate-800/30 text-slate-400 hover:text-white'
                }`}
              >
                {/* Playlist Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={playlist.coverImage || getDefaultCover(playlist.id)}
                    alt={playlist.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-800/80 group-hover:scale-105 transition-transform"
                  />
                  {isEditing ? (
                    <form
                      onSubmit={(e) => saveRename(playlist.id, e)}
                      className="flex items-center gap-1 flex-1 min-w-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full text-xs px-2 py-1 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-violet-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="p-1 text-emerald-400 hover:bg-slate-950 rounded transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="p-1 text-slate-500 hover:bg-slate-950 rounded transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate text-white">
                        {playlist.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {playlist.songs.length} lagu
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startRename(playlist.id, playlist.name, e)}
                      className="p-1 hover:bg-slate-800/60 rounded text-slate-400 hover:text-slate-200 transition"
                      title="Ganti Nama"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(playlist.id, e)}
                      className="p-1 hover:bg-rose-950/40 rounded text-slate-400 hover:text-rose-400 transition"
                      title="Hapus Playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
