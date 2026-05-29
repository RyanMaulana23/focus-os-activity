'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song, Playlist } from '../types/index';

// Interface definitions for Toast and Store
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface PlaylistStore {
  playlists: Playlist[];
  activePlaylistId: string | null;
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  currentTime: number;
  duration: number;
  uploadProgress: Record<string, number>; // songId -> progress (0 to 100)
  toasts: Toast[];

  // Toast Actions
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Playlist Actions
  createPlaylist: (name: string, coverFile?: File) => Promise<string>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  renamePlaylist: (playlistId: string, name: string) => void;
  updatePlaylistCover: (playlistId: string, coverFile: File) => Promise<void>;
  addSongsToPlaylist: (playlistId: string, files: File[]) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  reorderSongs: (playlistId: string, startIndex: number, endIndex: number) => void;
  setActivePlaylistId: (id: string | null) => void;

  // Player Actions
  playSong: (song: Song, playlistId?: string) => void;
  togglePlay: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
  nextSong: () => void;
  prevSong: () => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (repeat: 'none' | 'one' | 'all') => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;

  // Data persistence restoration
  restorePlaylistsFromStorage: () => Promise<void>;
}

// ── IndexedDB Configuration ──────────────────────────────────────────────────
const DB_NAME = 'vibePlaylistsDB';
const DB_VERSION = 1;
const STORE_SONGS = 'songFiles';
const STORE_COVERS = 'coverFiles';

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SONGS)) {
        db.createObjectStore(STORE_SONGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_COVERS)) {
        db.createObjectStore(STORE_COVERS, { keyPath: 'id' });
      }
    };
  });
}

// IndexedDB generic helper routines
async function saveFileToIndexedDB(storeName: string, id: string, file: File): Promise<void> {
  const db = await getDB();
  const arrayBuffer = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put({
      id,
      data: arrayBuffer,
      type: file.type,
    });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getFileFromIndexedDB(storeName: string, id: string): Promise<{ data: ArrayBuffer; type: string } | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

async function deleteFileFromIndexedDB(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Default dynamic gradients generator based on name hash
export function getDefaultCover(id: string): string {
  const gradients = [
    { from: '#7c3aed', to: '#2563eb' }, // violet to blue
    { from: '#ec4899', to: '#f43f5e' }, // pink to rose
    { from: '#06b6d4', to: '#3b82f6' }, // cyan to blue
    { from: '#10b981', to: '#3b82f6' }, // emerald to blue
    { from: '#f59e0b', to: '#e11d48' }, // amber to rose
  ];
  const index = Math.abs(id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % gradients.length;
  const grad = gradients[index];
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${encodeURIComponent(grad.from)}"/><stop offset="100%" stop-color="${encodeURIComponent(grad.to)}"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g)"/></svg>`;
}

// Extract audio duration
async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
      URL.revokeObjectURL(objectUrl);
    });
    audio.addEventListener('error', () => {
      resolve(0);
      URL.revokeObjectURL(objectUrl);
    });
  });
}

// ── Zustand Store Core ────────────────────────────────────────────────────────
export const usePlaylistStore = create<PlaylistStore>()(
  persist(
    (set, get) => ({
      playlists: [],
      activePlaylistId: null,
      currentSong: null,
      isPlaying: false,
      volume: 0.7,
      shuffle: false,
      repeat: 'none',
      currentTime: 0,
      duration: 0,
      uploadProgress: {},
      toasts: [],

      // ── Toast Logic ────────────────────────────────────────────────────────
      addToast: (message, type = 'info') => {
        const id = `toast-${Date.now()}`;
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => {
          get().removeToast(id);
        }, 4000);
      },

      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      },

      // ── Playlist CRUD Operations ───────────────────────────────────────────
      createPlaylist: async (name, coverFile) => {
        const id = `playlist-${Date.now()}`;
        let coverImage = getDefaultCover(id);

        if (coverFile) {
          try {
            await saveFileToIndexedDB(STORE_COVERS, id, coverFile);
            const blob = new Blob([await coverFile.arrayBuffer()], { type: coverFile.type });
            coverImage = URL.createObjectURL(blob);
          } catch (e) {
            console.error('Error saving cover image:', e);
          }
        }

        const newPlaylist: Playlist = {
          id,
          name,
          coverImage,
          createdAt: Date.now(),
          songs: [],
        };

        set((state) => ({
          playlists: [...state.playlists, newPlaylist],
          activePlaylistId: id,
        }));

        get().addToast(`Playlist "${name}" berhasil dibuat!`, 'success');
        return id;
      },

      deletePlaylist: async (playlistId) => {
        const playlist = get().playlists.find((p) => p.id === playlistId);
        if (!playlist) return;

        // Delete playlist cover
        try {
          await deleteFileFromIndexedDB(STORE_COVERS, playlistId);
        } catch (e) {
          console.warn('Cover not found or fail to delete:', e);
        }

        // Delete all songs binary in this playlist
        for (const song of playlist.songs) {
          try {
            await deleteFileFromIndexedDB(STORE_SONGS, song.id);
            await deleteFileFromIndexedDB(STORE_COVERS, song.id);
          } catch (e) {
            console.warn(`Error deleting files for song ${song.id}:`, e);
          }
        }

        // Check if currently playing a song from this playlist
        const currentSong = get().currentSong;
        const isPlayingThisPlaylist = playlist.songs.some((s) => s.id === currentSong?.id);

        set((state) => ({
          playlists: state.playlists.filter((p) => p.id !== playlistId),
          activePlaylistId: state.activePlaylistId === playlistId ? null : state.activePlaylistId,
          ...(isPlayingThisPlaylist ? { currentSong: null, isPlaying: false, currentTime: 0, duration: 0 } : {}),
        }));

        get().addToast(`Playlist "${playlist.name}" berhasil dihapus.`, 'success');
      },

      renamePlaylist: (playlistId, name) => {
        set((state) => ({
          playlists: state.playlists.map((p) => (p.id === playlistId ? { ...p, name } : p)),
        }));
        get().addToast(`Nama playlist diubah menjadi "${name}"`, 'success');
      },

      updatePlaylistCover: async (playlistId, coverFile) => {
        try {
          await saveFileToIndexedDB(STORE_COVERS, playlistId, coverFile);
          const blob = new Blob([await coverFile.arrayBuffer()], { type: coverFile.type });
          const coverImage = URL.createObjectURL(blob);

          set((state) => ({
            playlists: state.playlists.map((p) => (p.id === playlistId ? { ...p, coverImage } : p)),
          }));
          get().addToast('Cover playlist berhasil diperbarui!', 'success');
        } catch (error) {
          console.error(error);
          get().addToast('Gagal mengupload cover playlist.', 'error');
        }
      },

      // ── Song Operations ────────────────────────────────────────────────────
      addSongsToPlaylist: async (playlistId, files) => {
        const playlist = get().playlists.find((p) => p.id === playlistId);
        if (!playlist) return;

        let successCount = 0;
        let failCount = 0;

        for (const file of files) {
          const songId = `song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // 1. Simulasikan progress loading realtime
          set((state) => ({
            uploadProgress: { ...state.uploadProgress, [songId]: 10 },
          }));

          try {
            // Check format
            const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-wav'];
            if (!validTypes.includes(file.type) && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav') && !file.name.endsWith('.ogg')) {
              throw new Error('Format file tidak didukung. Harus MP3, WAV, atau OGG.');
            }

            // Save binary to IndexedDB
            await saveFileToIndexedDB(STORE_SONGS, songId, file);

            set((state) => ({
              uploadProgress: { ...state.uploadProgress, [songId]: 60 },
            }));

            // Get duration
            const duration = await getAudioDuration(file);

            set((state) => ({
              uploadProgress: { ...state.uploadProgress, [songId]: 90 },
            }));

            // Create blob URL for direct playing without refresh
            const blob = new Blob([await file.arrayBuffer()], { type: file.type });
            const audioUrl = URL.createObjectURL(blob);

            const newSong: Song = {
              id: songId,
              title: file.name.replace(/\.[^/.]+$/, ''),
              artist: 'Unknown Artist',
              audioUrl,
              duration: duration || 0,
              coverImage: getDefaultCover(songId),
              uploadedAt: Date.now(),
            };

            // Update store state
            set((state) => ({
              playlists: state.playlists.map((p) =>
                p.id === playlistId ? { ...p, songs: [...p.songs, newSong] } : p
              ),
              uploadProgress: { ...state.uploadProgress, [songId]: 100 },
            }));

            successCount++;

            // Autoplay if it's the first song and no audio is currently playing
            if (!get().currentSong && playlist.songs.length === 0) {
              get().playSong(newSong, playlistId);
            }
          } catch (e: any) {
            failCount++;
            console.error('Error uploading track:', e);
            get().addToast(`Gagal upload "${file.name}": ${e.message}`, 'error');
          } finally {
            // Clear progress after short delay
            setTimeout(() => {
              set((state) => {
                const nextProgress = { ...state.uploadProgress };
                delete nextProgress[songId];
                return { uploadProgress: nextProgress };
              });
            }, 1000);
          }
        }

        if (successCount > 0) {
          get().addToast(`Berhasil menambahkan ${successCount} lagu ke playlist.`, 'success');
        }
      },

      removeSongFromPlaylist: async (playlistId, songId) => {
        try {
          await deleteFileFromIndexedDB(STORE_SONGS, songId);
          await deleteFileFromIndexedDB(STORE_COVERS, songId);
        } catch (e) {
          console.warn('Binary not found in IndexedDB:', e);
        }

        // If currently playing, stop it
        const currentSong = get().currentSong;
        const isPlayingThis = currentSong?.id === songId;

        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId ? { ...p, songs: p.songs.filter((s) => s.id !== songId) } : p
          ),
          ...(isPlayingThis ? { currentSong: null, isPlaying: false, currentTime: 0, duration: 0 } : {}),
        }));

        get().addToast('Lagu berhasil dihapus dari playlist', 'success');
      },

      reorderSongs: (playlistId, startIndex, endIndex) => {
        set((state) => {
          const playlist = state.playlists.find((p) => p.id === playlistId);
          if (!playlist) return state;

          const reorderedSongs = [...playlist.songs];
          const [removed] = reorderedSongs.splice(startIndex, 1);
          reorderedSongs.splice(endIndex, 0, removed);

          return {
            playlists: state.playlists.map((p) =>
              p.id === playlistId ? { ...p, songs: reorderedSongs } : p
            ),
          };
        });
      },

      setActivePlaylistId: (id) => set({ activePlaylistId: id }),

      // ── Player Actions ─────────────────────────────────────────────────────
      playSong: (song, playlistId) => {
        // Coordinated playback check: Pause the regular focus ambient player
        try {
          // Dynamically check if we have window/document and import useMusicStore state to pause
          const ambientStore = (window as any).__NEXT_ZUSTAND_STORE__?.musicStore || require('./musicStore').useMusicStore;
          if (ambientStore && typeof ambientStore.getState === 'function') {
            ambientStore.getState().setIsPlaying(false);
          }
        } catch (err) {
          console.log('Ambient audio synchronization skipped or handled.');
        }

        set({
          currentSong: song,
          isPlaying: true,
          currentTime: 0,
          duration: song.duration,
          ...(playlistId ? { activePlaylistId: playlistId } : {}),
        });
      },

      togglePlay: () => {
        const { currentSong, isPlaying } = get();
        if (!currentSong) return;
        set({ isPlaying: !isPlaying });
      },

      setIsPlaying: (isPlaying) => set({ isPlaying }),

      nextSong: () => {
        const { playlists, activePlaylistId, currentSong, shuffle, repeat } = get();
        const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
        if (!activePlaylist || activePlaylist.songs.length === 0) return;

        const songs = activePlaylist.songs;
        const currentIndex = songs.findIndex((s) => s.id === currentSong?.id);

        if (repeat === 'one' && currentSong) {
          // Play current song again (reset position)
          set({ isPlaying: true, currentTime: 0 });
          return;
        }

        let nextIndex = 0;
        if (shuffle) {
          nextIndex = Math.floor(Math.random() * songs.length);
        } else if (currentIndex !== -1) {
          nextIndex = currentIndex + 1;
          if (nextIndex >= songs.length) {
            nextIndex = repeat === 'all' ? 0 : -1;
          }
        }

        if (nextIndex !== -1 && songs[nextIndex]) {
          get().playSong(songs[nextIndex]);
        } else {
          set({ isPlaying: false, currentTime: 0 });
        }
      },

      prevSong: () => {
        const { playlists, activePlaylistId, currentSong, shuffle } = get();
        const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
        if (!activePlaylist || activePlaylist.songs.length === 0) return;

        const songs = activePlaylist.songs;
        const currentIndex = songs.findIndex((s) => s.id === currentSong?.id);

        let prevIndex = 0;
        if (shuffle) {
          prevIndex = Math.floor(Math.random() * songs.length);
        } else if (currentIndex !== -1) {
          prevIndex = currentIndex - 1;
          if (prevIndex < 0) {
            prevIndex = songs.length - 1; // loop back to end
          }
        }

        if (songs[prevIndex]) {
          get().playSong(songs[prevIndex]);
        }
      },

      setShuffle: (shuffle) => set({ shuffle }),
      setRepeat: (repeat) => set({ repeat }),
      setVolume: (volume) => set({ volume }),
      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),

      // ── Database Restoring on Mount ────────────────────────────────────────
      restorePlaylistsFromStorage: async () => {
        try {
          const state = get();
          if (state.playlists.length === 0) return;

          const restoredPlaylists = await Promise.all(
            state.playlists.map(async (playlist) => {
              // 1. Restore playlist cover
              let restoredCover = playlist.coverImage;
              if (playlist.id.startsWith('playlist-')) {
                try {
                  const coverData = await getFileFromIndexedDB(STORE_COVERS, playlist.id);
                  if (coverData) {
                    const blob = new Blob([coverData.data], { type: coverData.type });
                    restoredCover = URL.createObjectURL(blob);
                  }
                } catch (e) {
                  console.warn(`Cover not restored for playlist ${playlist.id}`, e);
                }
              }

              // 2. Restore all songs inside
              const restoredSongs = await Promise.all(
                playlist.songs.map(async (song) => {
                  let restoredAudioUrl = song.audioUrl;
                  let restoredSongCover = song.coverImage;

                  // Restore Audio URL
                  try {
                    const fileData = await getFileFromIndexedDB(STORE_SONGS, song.id);
                    if (fileData) {
                      const blob = new Blob([fileData.data], { type: fileData.type });
                      restoredAudioUrl = URL.createObjectURL(blob);
                    }
                  } catch (e) {
                    console.warn(`Audio data not restored for song ${song.id}`, e);
                  }

                  // Restore Song Custom Cover (if any)
                  try {
                    const songCoverData = await getFileFromIndexedDB(STORE_COVERS, song.id);
                    if (songCoverData) {
                      const blob = new Blob([songCoverData.data], { type: songCoverData.type });
                      restoredSongCover = URL.createObjectURL(blob);
                    }
                  } catch (e) {
                    // Suppress warning (default cover fallback)
                  }

                  return {
                    ...song,
                    audioUrl: restoredAudioUrl,
                    coverImage: restoredSongCover,
                  };
                })
              );

              return {
                ...playlist,
                coverImage: restoredCover,
                songs: restoredSongs,
              };
            })
          );

          // Restore current song if last played exists and sync URL
          let restoredCurrentSong = state.currentSong;
          if (restoredCurrentSong) {
            const allSongs = restoredPlaylists.flatMap((p) => p.songs);
            const matchingSong = allSongs.find((s) => s.id === restoredCurrentSong?.id);
            if (matchingSong) {
              restoredCurrentSong = matchingSong;
            }
          }

          set({
            playlists: restoredPlaylists,
            currentSong: restoredCurrentSong,
          });

          console.log('[Playlist Store] Restored successfully from DB storage.');
        } catch (error) {
          console.error('[Playlist Store] Restoring failed:', error);
        }
      },
    }),
    {
      name: 'vibe-playlists-store',
      partialize: (state) => ({
        playlists: state.playlists.map((p) => ({
          ...p,
          coverImage: p.coverImage.startsWith('blob:') ? getDefaultCover(p.id) : p.coverImage,
          songs: p.songs.map((s) => ({
            ...s,
            audioUrl: '', // Clear blob URL before saving to localStorage
            coverImage: s.coverImage.startsWith('blob:') ? getDefaultCover(s.id) : s.coverImage,
          })),
        })),
        activePlaylistId: state.activePlaylistId,
        currentSong: state.currentSong
          ? { ...state.currentSong, audioUrl: '' }
          : null,
        volume: state.volume,
        shuffle: state.shuffle,
        repeat: state.repeat,
        currentTime: state.currentTime,
      }),
    }
  )
);
