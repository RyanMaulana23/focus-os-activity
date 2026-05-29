'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Music } from '../types/index';

interface MusicStore {
  currentMusic: Music | null;
  isPlaying: boolean;
  volume: number;
  customMusics: Music[];
  selectedMusicId: string | null;
  isMusicMenuOpen: boolean;

  // Actions
  setCurrentMusic: (music: Music | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  addCustomMusic: (music: Music, file: File) => void;
  removeCustomMusic: (musicId: string) => void;
  setSelectedMusicId: (musicId: string | null) => void;
  setIsMusicMenuOpen: (isOpen: boolean) => void;
  restoreMusicFromStorage: () => Promise<void>;
}

// IndexedDB helper functions
const DB_NAME = 'vibeMusicDB';
const STORE_NAME = 'customMusic';
const DB_VERSION = 1;

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function saveFileToIndexedDB(
  musicId: string,
  file: File
): Promise<void> {
  const db = await getDB();
  const arrayBuffer = await file.arrayBuffer();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      id: musicId,
      data: arrayBuffer,
      type: file.type,
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getFileFromIndexedDB(
  musicId: string
): Promise<{ data: ArrayBuffer; type: string } | null> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(musicId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

async function deleteFileFromIndexedDB(musicId: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(musicId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export const useMusicStore = create<MusicStore>()(
  persist(
    (set, get) => ({
      currentMusic: null,
      isPlaying: false,
      volume: 0.7,
      customMusics: [],
      selectedMusicId: null,
      isMusicMenuOpen: false,

      setCurrentMusic: (music) => {
        // Always pause when changing music to avoid play/pause conflicts
        set({ currentMusic: music, isPlaying: false });
      },
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setVolume: (volume) =>
        set({ volume: Math.max(0, Math.min(1, volume)) }),

      addCustomMusic: async (music, file) => {
        try {
          // Save file to IndexedDB
          await saveFileToIndexedDB(music.id, file);

          // Update store
          set((state) => ({
            customMusics: [...state.customMusics, music],
          }));

          console.log('[Music Store] Music saved successfully:', music.id);
        } catch (error) {
          console.error('[Music Store] Error saving music:', error);
        }
      },

      removeCustomMusic: async (musicId) => {
        try {
          // Delete from IndexedDB
          await deleteFileFromIndexedDB(musicId);

          // Update store
          set((state) => ({
            customMusics: state.customMusics.filter((m) => m.id !== musicId),
          }));

          // Clear if currently playing
          const state = get();
          if (state.selectedMusicId === musicId) {
            set({ isPlaying: false, currentMusic: null, selectedMusicId: null });
          }

          console.log('[Music Store] Music deleted:', musicId);
        } catch (error) {
          console.error('[Music Store] Error deleting music:', error);
        }
      },

      setSelectedMusicId: (musicId) => set({ selectedMusicId: musicId }),
      setIsMusicMenuOpen: (isOpen) => set({ isMusicMenuOpen: isOpen }),

      restoreMusicFromStorage: async () => {
        try {
          const state = get();

          // Build a NEW array with restored blob URLs — never mutate objects in place
          const restoredMusics = await Promise.all(
            state.customMusics.map(async (music) => {
              if (!music.id.startsWith('custom-')) return music;

              try {
                const fileData = await getFileFromIndexedDB(music.id);
                if (!fileData) {
                  console.warn('[Music Store] File not found in IndexedDB:', music.id);
                  return music;
                }
                const blob = new Blob([fileData.data], { type: fileData.type });
                const newBlobUrl = URL.createObjectURL(blob);
                // Return a NEW object — immutable update
                return { ...music, url: newBlobUrl };
              } catch (err) {
                console.error('[Music Store] Error restoring music from IndexedDB:', err);
                return music;
              }
            })
          );

          set({ customMusics: restoredMusics });
          console.log('[Music Store] Restored', restoredMusics.length, 'custom music(s) from storage');
        } catch (error) {
          console.error('[Music Store] Error restoring music:', error);
        }
      },
    }),
    {
      name: 'music-store',
    }
  )
);
