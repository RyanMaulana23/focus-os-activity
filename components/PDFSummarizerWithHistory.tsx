/**
 * PDF Summarizer dengan History
 * Contoh integrasi dengan Zustand store untuk history/bookmarking
 */

'use client';

import React, { useState } from 'react';
import { PDFSummarizer } from './PDFSummarizer';
import {
  usePDFSummarizerStore,
  usePDFSummarizerHistory,
  useGenerateId,
} from '@/lib/stores/pdfSummarizerStore';
import { Trash2, Clock, Maximize2, Minimize2 } from 'lucide-react';

export function PDFSummarizerWithHistory() {
  const [showHistory, setShowHistory] = useState(false);
  const { summaries, removeSummary, clearAll, setCurrentSummary, count } =
    usePDFSummarizerHistory();
  const addSummary = usePDFSummarizerStore((state) => state.addSummary);
  const generateId = useGenerateId();

  const handleSummaryComplete = (extraction: any, summary: any) => {
    const newSummary = {
      id: generateId,
      fileName: extraction.fileName,
      extraction,
      summary,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addSummary(newSummary);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header dengan toggle history */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          AI PDF Summarizer
        </h1>

        {count > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span>History ({count})</span>
            {showHistory ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <PDFSummarizer aiProvider="openai" />
          </div>
        </div>

        {/* History sidebar */}
        {showHistory && (
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sticky top-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Riwayat Ringkasan
                  </h3>
                  {count > 0 && (
                    <button
                      onClick={() => clearAll()}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      Hapus Semua
                    </button>
                  )}
                </div>

                {/* History list */}
                {count === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Tidak ada riwayat
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {summaries.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                        onClick={() => setCurrentSummary(item.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {item.fileName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {item.extraction.pageCount} hal •{' '}
                              {new Date(item.createdAt).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSummary(item.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
