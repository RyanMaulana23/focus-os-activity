'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NoteImage {
  id: string;
  imageUrl: string; // base64 data URL
  caption?: string;
  position?: number;
  uploadedAt: string;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  tingkat?: 'mudah' | 'sedang' | 'sulit';
  tipe?: string;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  formattedContent?: string;
  summary?: string;
  images?: NoteImage[];
  createdAt?: string;
  updatedAt?: string;
  
  // Backwards compatibility and categorization
  category: 'task' | 'material' | 'summary';
  uploadedAt: string;
  originalNoteId?: string;
  fileName?: string;
  fileType?: 'text' | 'pdf' | 'word' | 'image';
  fileDataUrl?: string;
  fileMimeType?: string;
  
  // Custom workspace options
  isBookmarked?: boolean;
  tags?: string[];
  folderId?: string;
  flashcards?: Flashcard[];
}

interface NotesStore {
  notes: Note[];
  folders: Folder[];
  addNote: (note: Omit<Note, 'id' | 'uploadedAt' | 'createdAt' | 'updatedAt'> & { createdAt?: string }) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  getNoteById: (id: string) => Note | undefined;
  getNotesByCategory: (category: 'task' | 'material' | 'summary') => Note[];
  generateSummary: (noteId: string, summaryText: string) => void;
  addSummaryNote: (originalNoteId: string, summaryContent: string) => void;
  
  activeNoteId?: string;
  isEditing: boolean;
  setEditing: (isEditing: boolean, noteId?: string) => void;
  
  // Workspace controls
  addFolder: (name: string, color?: string) => string;
  deleteFolder: (folderId: string) => void;
  toggleBookmark: (noteId: string) => void;
  addFlashcard: (noteId: string, question: string, answer: string, tingkat?: 'mudah' | 'sedang' | 'sulit', tipe?: string) => void;
  deleteFlashcard: (noteId: string, cardId: string) => void;
  addTag: (noteId: string, tag: string) => void;
  removeTag: (noteId: string, tag: string) => void;
  updateNoteFolder: (noteId: string, folderId: string | undefined) => void;
}

export const useNotesStore = create<NotesStore>()(
  persist(
    (set, get) => ({
      notes: [],
      folders: [
        { id: 'f_kuliah', name: 'Kuliah & Tugas', color: '#8b5cf6' },
        { id: 'f_proyek', name: 'Proyek Pribadi', color: '#3b82f6' },
        { id: 'f_harian', name: 'Catatan Harian', color: '#10b981' }
      ],
      activeNoteId: undefined,
      isEditing: false,
      setEditing: (isEditing, noteId) => set({ isEditing, activeNoteId: noteId }),

      addNote: (note) => {
        const id = `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const nowIso = new Date().toISOString();
        const newNote: Note = {
          ...note,
          id,
          uploadedAt: nowIso,
          createdAt: note.createdAt || nowIso,
          updatedAt: nowIso,
          isBookmarked: false,
          tags: note.tags || [],
          images: note.images || [],
          flashcards: note.flashcards || []
        };
        set((state) => ({
          notes: [...state.notes, newNote],
        }));
        return id;
      },

      updateNote: (id, updates) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? { ...note, ...updates, updatedAt: new Date().toISOString() }
              : note
          ),
        })),

      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
        })),

      getNoteById: (id) => get().notes.find((note) => note.id === id),

      getNotesByCategory: (category) =>
        get().notes.filter((note) => note.category === category),

      generateSummary: (noteId, summaryText) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId ? { ...note, summary: summaryText } : note
          ),
        })),

      addSummaryNote: (originalNoteId, summaryContent) =>
        set((state) => {
          const original = state.notes.find((n) => n.id === originalNoteId);
          const id = `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const nowIso = new Date().toISOString();
          return {
            notes: [
              ...state.notes,
              {
                id,
                title: `Ringkasan: ${original?.title ?? 'Untitled'}`,
                content: summaryContent,
                category: 'summary',
                uploadedAt: nowIso,
                createdAt: nowIso,
                updatedAt: nowIso,
                originalNoteId,
                isBookmarked: false,
                tags: ['Ringkasan', ...(original?.tags || [])],
                images: [],
                flashcards: []
              },
            ],
          };
        }),

      // Workspace folders, bookmarks, tags, flashcards
      addFolder: (name, color) => {
        const id = `folder_${Date.now()}`;
        set((state) => ({
          folders: [...state.folders, { id, name, color: color || '#64748b' }]
        }));
        return id;
      },

      deleteFolder: (folderId) =>
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== folderId),
          notes: state.notes.map((n) =>
            n.folderId === folderId ? { ...n, folderId: undefined } : n
          )
        })),

      toggleBookmark: (noteId) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId
              ? { ...note, isBookmarked: !note.isBookmarked, updatedAt: new Date().toISOString() }
              : note
          )
        })),

      addFlashcard: (noteId, question, answer, tingkat, tipe) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  flashcards: [
                    ...(note.flashcards || []),
                    {
                      id: `fc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                      question,
                      answer,
                      tingkat,
                      tipe
                    }
                  ],
                  updatedAt: new Date().toISOString()
                }
              : note
          )
        })),

      deleteFlashcard: (noteId, cardId) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  flashcards: (note.flashcards || []).filter((fc) => fc.id !== cardId),
                  updatedAt: new Date().toISOString()
                }
              : note
          )
        })),

      addTag: (noteId, tag) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId && !(note.tags || []).includes(tag)
              ? { ...note, tags: [...(note.tags || []), tag], updatedAt: new Date().toISOString() }
              : note
          )
        })),

      removeTag: (noteId, tag) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId
              ? { ...note, tags: (note.tags || []).filter((t) => t !== tag), updatedAt: new Date().toISOString() }
              : note
          )
        })),

      updateNoteFolder: (noteId, folderId) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId ? { ...note, folderId, updatedAt: new Date().toISOString() } : note
          )
        }))
    }),
    {
      name: 'notes-store',
      partialize: (state) => ({
        folders: state.folders,
        notes: state.notes.map((n) => ({
          ...n,
          // Truncate data URLs > 1.5 MB to avoid localStorage quota errors
          fileDataUrl:
            n.fileDataUrl && n.fileDataUrl.length > 1_500_000
              ? undefined
              : n.fileDataUrl,
        })),
      }),
    }
  )
);
