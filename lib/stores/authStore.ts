'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../supabase';
import { useNotesStore } from './notesStore';
import { useTaskStore } from './taskStore';
import { usePlaylistStore } from './playlistStore';
import { useHabitStore } from './habitStore';
import { useDocumentStore } from './documentStore';

export interface UserAccount {
  id: number;
  nama: string;
  username: string;
  email: string;
  foto_profil?: string;
}

interface AuthStore {
  currentUser: UserAccount | null;
  isLoading: boolean;
  error: string | null;
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  register: (nama: string, username: string, email: string, password: string, fotoProfil?: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  updateProfile: (updates: Partial<UserAccount>) => void;
}

// Helper to check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url === 'your-supabase-project-url' || key === 'your-supabase-anon-key') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Clean states on logout
function clearActiveStores() {
  useNotesStore.setState({ 
    notes: [], 
    folders: [
      { id: 'f_kuliah', name: 'Kuliah & Tugas', color: '#8b5cf6' },
      { id: 'f_proyek', name: 'Proyek Pribadi', color: '#3b82f6' },
      { id: 'f_harian', name: 'Catatan Harian', color: '#10b981' }
    ]
  });
  useTaskStore.setState({ tasks: [] });
  usePlaylistStore.setState({ playlists: [], activePlaylistId: null, currentSong: null });
  useHabitStore.setState({ habits: [] });
  useDocumentStore.setState({ documents: [], activeDocumentId: null });
}

// Load user-specific storage keys
export function loadUserData(userId: number | string) {
  const prefix = `focus_os_user_${userId}_`;

  try {
    // 1. Notes Store
    const notesData = localStorage.getItem(`${prefix}notes`);
    if (notesData) {
      const parsed = JSON.parse(notesData);
      useNotesStore.setState({ notes: parsed.notes || [], folders: parsed.folders || [] });
    } else {
      useNotesStore.setState({ 
        notes: [], 
        folders: [
          { id: 'f_kuliah', name: 'Kuliah & Tugas', color: '#8b5cf6' },
          { id: 'f_proyek', name: 'Proyek Pribadi', color: '#3b82f6' },
          { id: 'f_harian', name: 'Catatan Harian', color: '#10b981' }
        ]
      });
    }

    // 2. Tasks Store
    const tasksData = localStorage.getItem(`${prefix}tasks`);
    if (tasksData) {
      useTaskStore.setState({ tasks: JSON.parse(tasksData) || [] });
    } else {
      useTaskStore.setState({ tasks: [] });
    }

    // 3. Playlists Store
    const playlistData = localStorage.getItem(`${prefix}playlists`);
    if (playlistData) {
      const parsed = JSON.parse(playlistData);
      usePlaylistStore.setState({ 
        playlists: parsed.playlists || [], 
        activePlaylistId: parsed.activePlaylistId || null, 
        currentSong: parsed.currentSong || null 
      });
      usePlaylistStore.getState().restorePlaylistsFromStorage();
    } else {
      usePlaylistStore.setState({ playlists: [], activePlaylistId: null, currentSong: null });
    }

    // 4. Habits Store
    const habitsData = localStorage.getItem(`${prefix}habits`);
    if (habitsData) {
      useHabitStore.setState({ habits: JSON.parse(habitsData) || [] });
    } else {
      useHabitStore.setState({ habits: [] });
    }

    // 5. Document Store
    const docsData = localStorage.getItem(`${prefix}documents`);
    if (docsData) {
      const parsed = JSON.parse(docsData);
      useDocumentStore.setState({ 
        documents: parsed.documents || [], 
        activeDocumentId: parsed.activeDocumentId || null 
      });
      useDocumentStore.getState().restoreDocumentsFromStorage();
    } else {
      useDocumentStore.setState({ documents: [], activeDocumentId: null });
    }
  } catch (e) {
    console.error('Failed to load user isolated data:', e);
  }
}

// Save user-specific storage keys
export function saveUserData(userId: number | string) {
  const prefix = `focus_os_user_${userId}_`;

  try {
    // 1. Notes Store
    const notesState = useNotesStore.getState();
    localStorage.setItem(`${prefix}notes`, JSON.stringify({
      notes: notesState.notes,
      folders: notesState.folders
    }));

    // 2. Tasks Store
    localStorage.setItem(`${prefix}tasks`, JSON.stringify(useTaskStore.getState().tasks));

    // 3. Playlists Store
    const playlistState = usePlaylistStore.getState();
    localStorage.setItem(`${prefix}playlists`, JSON.stringify({
      playlists: playlistState.playlists.map(p => ({
        ...p,
        coverImage: p.coverImage.startsWith('blob:') ? '' : p.coverImage,
        songs: p.songs.map(s => ({ ...s, audioUrl: '' }))
      })),
      activePlaylistId: playlistState.activePlaylistId,
      currentSong: playlistState.currentSong ? { ...playlistState.currentSong, audioUrl: '' } : null
    }));

    // 4. Habits Store
    localStorage.setItem(`${prefix}habits`, JSON.stringify(useHabitStore.getState().habits));

    // 5. Document Store
    const docState = useDocumentStore.getState();
    localStorage.setItem(`${prefix}documents`, JSON.stringify({
      documents: docState.documents.map(d => ({ ...d, fileUrl: '' })),
      activeDocumentId: docState.activeDocumentId
    }));
  } catch (e) {
    console.error('Failed to save user isolated data:', e);
  }
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isLoading: false,
      error: null,

      clearError: () => set({ error: null }),

      login: async (usernameOrEmail, password) => {
        set({ isLoading: true, error: null });
        const term = usernameOrEmail.trim();

        // ── A. SUPABASE PRODUCTION AUTH ───────────────────────────────────────
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .or(`username.eq.${term},email.eq.${term}`)
              .eq('password', password)
              .single();

            if (error || !data) {
              set({ error: 'Username/Email atau Password salah.', isLoading: false });
              return false;
            }

            const user: UserAccount = {
              id: Number(data.id),
              nama: data.nama,
              username: data.username,
              email: data.email,
              foto_profil: data.foto_profil || undefined,
            };

            set({ currentUser: user, isLoading: false });
            loadUserData(user.id);
            return true;
          } catch (err: any) {
            console.error('Supabase Login Error:', err);
            set({ error: err.message || 'Terjadi kesalahan sistem database.', isLoading: false });
            return false;
          }
        }

        // ── B. OFFLINE BACKUP LOCAL AUTH MOCK ─────────────────────────────────
        else {
          console.log('[Auth] Running in Local Storage Fallback simulation mode.');
          try {
            const usersMockStr = localStorage.getItem('focus_os_fallback_users') || '[]';
            const users = JSON.parse(usersMockStr) as Array<UserAccount & { password?: string }>;

            const match = users.find(
              u => (u.username.toLowerCase() === term.toLowerCase() || u.email.toLowerCase() === term.toLowerCase()) && 
                   u.password === password
            );

            if (!match) {
              // Create default mock admin user if database empty to allow instant demo
              if (users.length === 0 && term.toLowerCase() === 'admin' && password === 'admin') {
                const defaultAdmin: UserAccount & { password?: string } = {
                  id: 1,
                  nama: 'Administrator Focus OS',
                  username: 'admin',
                  email: 'admin@focusos.com',
                  password: 'admin'
                };
                localStorage.setItem('focus_os_fallback_users', JSON.stringify([defaultAdmin]));
                set({ currentUser: defaultAdmin, isLoading: false });
                loadUserData(1);
                return true;
              }

              set({ error: 'Akun tidak ditemukan atau password salah. (Gunakan admin/admin jika offline)', isLoading: false });
              return false;
            }

            const user: UserAccount = {
              id: match.id,
              nama: match.nama,
              username: match.username,
              email: match.email,
              foto_profil: match.foto_profil
            };

            set({ currentUser: user, isLoading: false });
            loadUserData(user.id);
            return true;
          } catch (e: any) {
            set({ error: 'Gagal melakukan pemrosesan login lokal.', isLoading: false });
            return false;
          }
        }
      },

      register: async (nama, username, email, password, fotoProfil) => {
        set({ isLoading: true, error: null });

        const newUsername = username.trim().toLowerCase();
        const newEmail = email.trim().toLowerCase();

        if (!nama.trim() || !username.trim() || !email.trim() || !password.trim()) {
          set({ error: 'Mohon isi semua field formulir pendaftaran.', isLoading: false });
          return false;
        }

        // ── A. SUPABASE PRODUCTION REGISTRATION ───────────────────────────────
        if (isSupabaseConfigured()) {
          try {
            // Check uniqueness of username or email first
            const { data: existingUser } = await supabase
              .from('users')
              .select('id, username, email')
              .or(`username.eq.${newUsername},email.eq.${newEmail}`);

            if (existingUser && existingUser.length > 0) {
              const matchesUser = existingUser.some(u => u.username.toLowerCase() === newUsername);
              set({ 
                error: matchesUser 
                  ? 'Username tersebut sudah terdaftar.' 
                  : 'Alamat Email tersebut sudah terdaftar.', 
                isLoading: false 
              });
              return false;
            }

            // Insert new user
            const { data, error } = await supabase
              .from('users')
              .insert({
                nama: nama.trim(),
                username: newUsername,
                email: newEmail,
                password: password, // Raw text mapping matching target Supabase table visual
                foto_profil: fotoProfil || null,
              })
              .select('*')
              .single();

            if (error || !data) {
              throw new Error(error?.message || 'Gagal menyimpan data registrasi.');
            }

            const user: UserAccount = {
              id: Number(data.id),
              nama: data.nama,
              username: data.username,
              email: data.email,
              foto_profil: data.foto_profil || undefined,
            };

            set({ currentUser: user, isLoading: false });
            clearActiveStores(); // Clean fresh workspaces
            saveUserData(user.id); // Save clean structure
            return true;
          } catch (err: any) {
            console.error('Supabase Register Error:', err);
            set({ error: err.message || 'Gagal melakukan pendaftaran akun.', isLoading: false });
            return false;
          }
        }

        // ── B. OFFLINE BACKUP LOCAL REGISTRATION MOCK ─────────────────────────
        else {
          try {
            const usersMockStr = localStorage.getItem('focus_os_fallback_users') || '[]';
            const users = JSON.parse(usersMockStr) as Array<UserAccount & { password?: string }>;

            const matchExist = users.some(
              u => u.username.toLowerCase() === newUsername || u.email.toLowerCase() === newEmail
            );

            if (matchExist) {
              set({ error: 'Username atau Email sudah terdaftar secara lokal.', isLoading: false });
              return false;
            }

            const newId = Date.now();
            const newUser = {
              id: newId,
              nama: nama.trim(),
              username: newUsername,
              email: newEmail,
              password,
              foto_profil: fotoProfil
            };

            users.push(newUser);
            localStorage.setItem('focus_os_fallback_users', JSON.stringify(users));

            set({ currentUser: newUser, isLoading: false });
            clearActiveStores(); // Clean fresh workspace
            saveUserData(newUser.id); // Save empty structure
            return true;
          } catch (e: any) {
            set({ error: 'Gagal melakukan registrasi lokal.', isLoading: false });
            return false;
          }
        }
      },

      logout: () => {
        const { currentUser } = get();
        if (currentUser) {
          saveUserData(currentUser.id);
        }
        set({ currentUser: null, error: null });
        clearActiveStores();
      },

      updateProfile: (updates) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const updated = { ...currentUser, ...updates };
        set({ currentUser: updated });

        // Update fallback db too if offline
        if (!isSupabaseConfigured()) {
          const usersMockStr = localStorage.getItem('focus_os_fallback_users') || '[]';
          const users = JSON.parse(usersMockStr) as Array<UserAccount & { password?: string }>;
          const nextUsers = users.map(u => u.id === currentUser.id ? { ...u, ...updates } : u);
          localStorage.setItem('focus_os_fallback_users', JSON.stringify(nextUsers));
        }
      }
    }),
    {
      name: 'focus-auth-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
      }),
    }
  )
);

// Passive transparent automatic state-saver to ensure 100% active state persistence
if (typeof window !== 'undefined') {
  useNotesStore.subscribe((state) => {
    const user = useAuthStore.getState().currentUser;
    if (user) {
      localStorage.setItem(`focus_os_user_${user.id}_notes`, JSON.stringify({
        notes: state.notes,
        folders: state.folders
      }));
    }
  });

  useTaskStore.subscribe((state) => {
    const user = useAuthStore.getState().currentUser;
    if (user) {
      localStorage.setItem(`focus_os_user_${user.id}_tasks`, JSON.stringify(state.tasks));
    }
  });

  usePlaylistStore.subscribe((state) => {
    const user = useAuthStore.getState().currentUser;
    if (user) {
      localStorage.setItem(`focus_os_user_${user.id}_playlists`, JSON.stringify({
        playlists: state.playlists.map(p => ({
          ...p,
          coverImage: p.coverImage.startsWith('blob:') ? '' : p.coverImage,
          songs: p.songs.map(s => ({ ...s, audioUrl: '' }))
        })),
        activePlaylistId: state.activePlaylistId,
        currentSong: state.currentSong ? { ...state.currentSong, audioUrl: '' } : null
      }));
    }
  });

  useHabitStore.subscribe((state) => {
    const user = useAuthStore.getState().currentUser;
    if (user) {
      localStorage.setItem(`focus_os_user_${user.id}_habits`, JSON.stringify(state.habits));
    }
  });

  useDocumentStore.subscribe((state) => {
    const user = useAuthStore.getState().currentUser;
    if (user) {
      localStorage.setItem(`focus_os_user_${user.id}_documents`, JSON.stringify({
        documents: state.documents.map(d => ({ ...d, fileUrl: '' })),
        activeDocumentId: state.activeDocumentId
      }));
    }
  });
}
