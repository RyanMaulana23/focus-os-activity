'use client';

import { useState } from 'react';
import { usePlaylistStore, getDefaultCover } from '@/lib/stores/playlistStore';
import { useUIStore } from '@/lib/stores/uiStore';
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
  const isLightMode = useUIStore((s) => s.isLightMode);

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingId,       setEditingId]       = useState<string | null>(null);
  const [editingName,     setEditingName]      = useState('');
  const [isCreating,      setIsCreating]       = useState(false);

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

  // ── Light Mode Tokens ────────────────────────────────────────────────────
  const LM = isLightMode;

  return (
    <div
      className="flex flex-col h-full rounded-2xl p-4 space-y-4 overflow-hidden"
      style={LM
        ? { background: '#FFFFFF', border: '1px solid #E4E8F0', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }
        : { background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(12px)', border: '1px solid #1e293b' }
      }
    >
      {/* Header */}
      <div
        className="flex items-center justify-between flex-shrink-0 pb-3"
        style={{ borderBottom: LM ? '1px solid #E4E8F0' : '1px solid rgba(30,41,59,0.8)' }}
      >
        <div className="flex items-center gap-2" style={{ color: LM ? '#0F172A' : '#FFFFFF' }}>
          <FolderHeart className="w-5 h-5" style={{ color: '#5B50F0' }} />
          <h2 className="text-base font-bold">Koleksi Playlist</h2>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="p-1.5 rounded-lg transition active:scale-95"
          style={LM
            ? { background: '#F1F5F9', color: '#64748B', border: '1px solid #E4E8F0' }
            : { background: '#1e293b', color: '#94A3B8', border: '1px solid #334155' }
          }
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#EEF0FF';
            (e.currentTarget as HTMLButtonElement).style.color = '#5B50F0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = LM ? '#F1F5F9' : '#1e293b';
            (e.currentTarget as HTMLButtonElement).style.color = LM ? '#64748B' : '#94A3B8';
          }}
          title="Buat Playlist Baru"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="flex-shrink-0 flex gap-2">
          <input
            type="text"
            placeholder="Nama playlist..."
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            className="flex-1 text-xs sm:text-sm px-3 py-1.5 rounded-lg focus:outline-none transition"
            style={LM
              ? { background: '#F8FAFC', border: '1px solid #E4E8F0', color: '#0F172A' }
              : { background: '#0f172a', border: '1px solid #1e293b', color: '#FFFFFF' }
            }
            onFocus={(e) => { e.currentTarget.style.borderColor = '#5B50F0'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,80,240,0.12)'; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = LM ? '#E4E8F0' : '#1e293b'; e.currentTarget.style.boxShadow = 'none'; }}
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-white rounded-lg text-xs font-bold transition active:scale-95"
            style={{ background: '#5B50F0' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#4A40E0')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#5B50F0')}
          >
            Buat
          </button>
        </form>
      )}

      {/* Playlist List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {playlists.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs leading-5" style={{ color: '#94A3B8' }}>Belum ada playlist.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-2 text-xs font-semibold transition-colors"
              style={{ color: '#5B50F0' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4A40E0')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#5B50F0')}
            >
              Buat playlist pertama kamu!
            </button>
          </div>
        ) : (
          playlists.map((playlist) => {
            const isActive  = activePlaylistId === playlist.id;
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
                className="group flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all cursor-pointer"
                style={isActive
                  ? LM
                    ? { background: '#EEF0FF', borderColor: '#C7D2FE', color: '#0F172A' }
                    : { background: 'rgba(91,80,240,0.12)', borderColor: 'rgba(91,80,240,0.3)', color: '#FFFFFF', boxShadow: '0 0 15px rgba(91,80,240,0.15)' }
                  : LM
                    ? { background: 'transparent', borderColor: 'transparent', color: '#64748B' }
                    : { background: 'transparent', borderColor: 'transparent', color: '#94A3B8' }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLDivElement).style.background = LM ? '#F8FAFC' : 'rgba(30,41,59,0.4)';
                    (e.currentTarget as HTMLDivElement).style.borderColor = LM ? '#E4E8F0' : '#334155';
                    (e.currentTarget as HTMLDivElement).style.color = LM ? '#0F172A' : '#FFFFFF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
                    (e.currentTarget as HTMLDivElement).style.color = LM ? '#64748B' : '#94A3B8';
                  }
                }}
              >
                {/* Playlist Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={playlist.coverImage || getDefaultCover(playlist.id)}
                    alt={playlist.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                    style={{ border: LM ? '1px solid #E4E8F0' : '1px solid rgba(30,41,59,0.8)' }}
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
                        className="w-full text-xs px-2 py-1 rounded focus:outline-none"
                        style={LM
                          ? { background: '#F8FAFC', border: '1px solid #5B50F0', color: '#0F172A' }
                          : { background: '#0f172a', border: '1px solid #334155', color: '#FFFFFF' }
                        }
                        autoFocus
                      />
                      <button type="submit" className="p-1 rounded transition" style={{ color: '#059669' }}>
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={cancelRename} className="p-1 rounded transition" style={{ color: '#94A3B8' }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: LM ? '#0F172A' : '#FFFFFF' }}>
                        {playlist.name}
                      </p>
                      <p className="text-[10px]" style={{ color: '#94A3B8' }}>
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
                      className="p-1 rounded transition"
                      style={{ color: '#94A3B8' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = LM ? '#5B50F0' : '#FFFFFF'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; }}
                      title="Ganti Nama"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(playlist.id, e)}
                      className="p-1 rounded transition"
                      style={{ color: '#94A3B8' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#E11D48'; (e.currentTarget as HTMLButtonElement).style.background = LM ? '#FFF1F2' : 'rgba(225,29,72,0.1)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
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
