/**
 * Optional: Zustand Store untuk PDF Summarizer
 * Gunakan jika ingin persist state across pages
 * 
 * Usage:
 * import { usePDFSummarizerStore } from '@/lib/stores/pdfSummarizerStore';
 * 
 * const { summaries, addSummary, getSummary } = usePDFSummarizerStore();
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SummarizationResult, PDFExtractionResult } from '@/lib/types/pdf-summarizer';

interface PDFSummary {
  id: string;
  fileName: string;
  extraction: PDFExtractionResult;
  summary: SummarizationResult;
  createdAt: Date;
  updatedAt: Date;
}

interface PDFSummarizerStore {
  // State
  summaries: PDFSummary[];
  currentSummaryId: string | null;

  // Actions
  addSummary: (summary: PDFSummary) => void;
  updateSummary: (id: string, summary: Partial<PDFSummary>) => void;
  removeSummary: (id: string) => void;
  getSummary: (id: string) => PDFSummary | null;
  getCurrentSummary: () => PDFSummary | null;
  setCurrentSummary: (id: string | null) => void;
  clearAll: () => void;
  getAllSummaries: () => PDFSummary[];
}

export const usePDFSummarizerStore = create<PDFSummarizerStore>()(
  persist(
    (set, get) => ({
      summaries: [],
      currentSummaryId: null,

      addSummary: (summary: PDFSummary) =>
        set((state) => ({
          summaries: [summary, ...state.summaries],
          currentSummaryId: summary.id,
        })),

      updateSummary: (id: string, updates: Partial<PDFSummary>) =>
        set((state) => ({
          summaries: state.summaries.map((s) =>
            s.id === id
              ? { ...s, ...updates, updatedAt: new Date() }
              : s
          ),
        })),

      removeSummary: (id: string) =>
        set((state) => {
          const newSummaries = state.summaries.filter((s) => s.id !== id);
          return {
            summaries: newSummaries,
            currentSummaryId:
              state.currentSummaryId === id
                ? newSummaries[0]?.id || null
                : state.currentSummaryId,
          };
        }),

      getSummary: (id: string) => {
        const summary = get().summaries.find((s) => s.id === id);
        return summary || null;
      },

      getCurrentSummary: () => {
        const id = get().currentSummaryId;
        if (!id) return null;
        return get().getSummary(id);
      },

      setCurrentSummary: (id: string | null) =>
        set({ currentSummaryId: id }),

      clearAll: () =>
        set({
          summaries: [],
          currentSummaryId: null,
        }),

      getAllSummaries: () => get().summaries,
    }),
    {
      name: 'pdf-summarizer-storage', // localStorage key
      version: 1,
      // Optional: implement custom serialization
      // serialize: (state) => JSON.stringify(state),
      // deserialize: (str) => JSON.parse(str),
    }
  )
);

/**
 * Hook helper untuk generate unique ID
 */
export function useGenerateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook untuk quick access ke current summary
 */
export function usePDFSummarizerCurrent() {
  const currentSummary = usePDFSummarizerStore((state) => state.getCurrentSummary());
  const setCurrentSummary = usePDFSummarizerStore((state) => state.setCurrentSummary);
  const removeSummary = usePDFSummarizerStore((state) => state.removeSummary);

  return {
    currentSummary,
    setCurrentSummary,
    removeSummary,
  };
}

/**
 * Hook untuk manage history/list dari summaries
 */
export function usePDFSummarizerHistory() {
  const summaries = usePDFSummarizerStore((state) => state.getAllSummaries());
  const getSummary = usePDFSummarizerStore((state) => state.getSummary);
  const removeSummary = usePDFSummarizerStore((state) => state.removeSummary);
  const clearAll = usePDFSummarizerStore((state) => state.clearAll);
  const setCurrentSummary = usePDFSummarizerStore((state) => state.setCurrentSummary);

  return {
    summaries,
    getSummary,
    removeSummary,
    clearAll,
    setCurrentSummary,
    count: summaries.length,
  };
}
