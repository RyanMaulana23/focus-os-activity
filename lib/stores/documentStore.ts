'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WordDocument {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  fileUrl: string;      // Browser-active blob URL for direct rendering & downloading
  previewHtml?: string;  // Parsed HTML string (cached for faster subsequent loads)
  thumbnail?: string;    // CSS/SVG fallback thumbnail background
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface DocumentStore {
  documents: WordDocument[];
  activeDocumentId: string | null;
  toasts: Toast[];
  uploadProgress: Record<string, number>; // docId -> progress (0 to 100)

  // Toast actions
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Document actions
  addDocument: (file: File) => Promise<string>;
  deleteDocument: (id: string) => Promise<void>;
  setActiveDocumentId: (id: string | null) => void;
  setPreviewHtml: (id: string, html: string) => void;

  // Persistence restoration
  restoreDocumentsFromStorage: () => Promise<void>;
}

// ── IndexedDB Configuration ──────────────────────────────────────────────────
const DB_NAME = 'vibeDocumentsDB';
const DB_VERSION = 1;
const STORE_FILES = 'documentFiles';

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB only available in browser'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
    };
  });
}

// Save raw array buffer to IndexedDB
async function saveFileToIndexedDB(id: string, file: File): Promise<void> {
  const db = await getDB();
  const arrayBuffer = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_FILES], 'readwrite');
    const store = transaction.objectStore(STORE_FILES);
    const request = store.put({
      id,
      data: arrayBuffer,
      name: file.name,
      type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Fetch raw array buffer and details from IndexedDB
async function getFileFromIndexedDB(id: string): Promise<{ data: ArrayBuffer; name: string; type: string } | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_FILES], 'readonly');
    const store = transaction.objectStore(STORE_FILES);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// Delete from IndexedDB
async function deleteFileFromIndexedDB(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_FILES], 'readwrite');
    const store = transaction.objectStore(STORE_FILES);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Helper to generate dynamic premium preview thumbnail gradients
export function getDocumentThumbnail(id: string): string {
  const gradients = [
    { from: '#4f46e5', to: '#06b6d4' }, // indigo to cyan
    { from: '#0284c7', to: '#0d9488' }, // sky to teal
    { from: '#2563eb', to: '#1d4ed8' }, // blue to dark blue
    { from: '#7c3aed', to: '#4f46e5' }, // violet to indigo
  ];
  const index = Math.abs(id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % gradients.length;
  const grad = gradients[index];
  return `linear-gradient(135deg, ${grad.from}, ${grad.to})`;
}

// ── Zustand Store Core ────────────────────────────────────────────────────────
export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      documents: [],
      activeDocumentId: null,
      toasts: [],
      uploadProgress: {},

      // ── Toast Logic ────────────────────────────────────────────────────────
      addToast: (message, type = 'info') => {
        const id = `toast-doc-${Date.now()}`;
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => {
          get().removeToast(id);
        }, 4000);
      },

      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      },

      // ── Document Operations ────────────────────────────────────────────────
      addDocument: async (file: File) => {
        const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 1. Initialize real-time mock upload progress to show parsing ingestion
        set((state) => ({
          uploadProgress: { ...state.uploadProgress, [docId]: 15 },
        }));

        try {
          // Extension validation
          const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          const isDoc = file.name.endsWith('.doc') || file.type === 'application/msword';

          if (!isDocx && !isDoc) {
            throw new Error('Format file tidak didukung. Unggah file .docx atau .doc saja.');
          }

          // 2. Save actual binary data to IndexedDB
          await saveFileToIndexedDB(docId, file);
          
          set((state) => ({
            uploadProgress: { ...state.uploadProgress, [docId]: 60 },
          }));

          // 3. Create dynamic blob URL for current browser session rendering
          const blob = new Blob([await file.arrayBuffer()], { type: file.type });
          const fileUrl = URL.createObjectURL(blob);

          set((state) => ({
            uploadProgress: { ...state.uploadProgress, [docId]: 90 },
          }));

          const newDoc: WordDocument = {
            id: docId,
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: Date.now(),
            fileUrl,
            thumbnail: getDocumentThumbnail(docId),
          };

          // 4. Update store state
          set((state) => ({
            documents: [newDoc, ...state.documents],
            activeDocumentId: docId,
            uploadProgress: { ...state.uploadProgress, [docId]: 100 },
          }));

          get().addToast(`File "${file.name}" berhasil diunggah!`, 'success');
          return docId;
        } catch (e: any) {
          console.error('[DocumentStore] Ingestion failure:', e);
          get().addToast(e.message || 'Gagal mengunggah file.', 'error');
          throw e;
        } finally {
          // Clear progress indicator after short delay
          setTimeout(() => {
            set((state) => {
              const nextProgress = { ...state.uploadProgress };
              delete nextProgress[docId];
              return { uploadProgress: nextProgress };
            });
          }, 800);
        }
      },

      deleteDocument: async (id) => {
        const doc = get().documents.find((d) => d.id === id);
        if (!doc) return;

        try {
          // Revoke Blob URL to free memory
          if (doc.fileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(doc.fileUrl);
          }
          // Remove binary from IndexedDB
          await deleteFileFromIndexedDB(id);
        } catch (e) {
          console.warn('[DocumentStore] Error releasing resources:', e);
        }

        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
          activeDocumentId: state.activeDocumentId === id ? (state.documents[1]?.id || null) : state.activeDocumentId,
        }));

        get().addToast(`Dokumen "${doc.fileName}" berhasil dihapus.`, 'success');
      },

      setActiveDocumentId: (id) => set({ activeDocumentId: id }),

      setPreviewHtml: (id, html) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, previewHtml: html } : d
          ),
        }));
      },

      // ── Database Restoring on Page Refresh/Mount ───────────────────────────
      restoreDocumentsFromStorage: async () => {
        try {
          const state = get();
          if (state.documents.length === 0) return;

          const restoredDocs = await Promise.all(
            state.documents.map(async (doc) => {
              let restoredUrl = doc.fileUrl;
              try {
                // Restore the binary from IndexedDB
                const fileData = await getFileFromIndexedDB(doc.id);
                if (fileData) {
                  const blob = new Blob([fileData.data], { type: fileData.type });
                  restoredUrl = URL.createObjectURL(blob);
                }
              } catch (e) {
                console.warn(`[DocumentStore] Could not restore binary for ${doc.fileName}:`, e);
              }

              return {
                ...doc,
                fileUrl: restoredUrl,
              };
            })
          );

          set({
            documents: restoredDocs,
          });

          console.log('[DocumentStore] Restored all document links from IndexedDB.');
        } catch (error) {
          console.error('[DocumentStore] Restoring failed:', error);
        }
      },
    }),
    {
      name: 'vibe-documents-store',
      partialize: (state) => ({
        // Persist metadata array and active selection only (clearing active blob URLs)
        documents: state.documents.map((d) => ({
          ...d,
          fileUrl: '', // Reset local Blob url, will be re-synthesized on mount
        })),
        activeDocumentId: state.activeDocumentId,
      }),
    }
  )
);
