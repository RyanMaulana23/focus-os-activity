/**
 * PDF Summarizer Feature Component
 * Main component yang mengintegrasikan semua parts
 */

'use client';

import React, { useEffect } from 'react';
import { usePDFSummarizer } from '@/lib/hooks/usePDFSummarizer';
import { PDFUpload } from './PDFUpload';
import { PDFSummaryDisplay } from './PDFSummaryDisplay';
import { LoadingSkeleton, ErrorState, SuccessState } from './LoadingSkeleton';
import { FileText } from 'lucide-react';

interface PDFSummarizerProps {
  aiProvider?: 'openai' | 'gemini';
  onSummaryComplete?: () => void;
}

export function PDFSummarizer({
  aiProvider = 'openai',
  onSummaryComplete,
}: PDFSummarizerProps) {
  const {
    file,
    extractedText,
    summary,
    isLoading,
    isExtracting,
    isSummarizing,
    error,
    progress,
    handleFileSelect,
    triggerSummarize,
    reset,
    cancel,
  } = usePDFSummarizer({
    aiProvider,
    onSuccess: onSummaryComplete,
  });

  const hasContent = !isLoading && (extractedText || summary);

  return (
    <div className="w-full h-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI PDF Summarizer
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Upload file PDF dan AI akan otomatis membuat ringkasan isi dokumen
        </p>
      </div>

      {/* Main content */}
      <div className="space-y-4">
        {/* Upload section */}
        {!hasContent || summary === null ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <PDFUpload
              onFileSelect={handleFileSelect}
              isLoading={isLoading}
              progress={progress}
              disabled={isLoading}
            />
          </div>
        ) : null}

        {/* Loading state */}
        {isLoading && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <LoadingSkeleton
              message={
                isExtracting
                  ? `Mengekstrak teks dari PDF... (${progress}%)`
                  : 'Membuat ringkasan dengan AI...'
              }
              step={isExtracting ? 'extracting' : 'summarizing'}
            />

            {/* Cancel button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={cancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Batalkan
              </button>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <ErrorState
              error={error}
              onRetry={triggerSummarize}
              onReset={reset}
            />
          </div>
        )}

        {/* Success - Show summary result */}
        {!isLoading && !error && summary && extractedText && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <PDFSummaryDisplay
              extraction={extractedText}
              summary={summary}
              onDownload={() => downloadSummary(extractedText, summary)}
              onCopy={(text) => {
                console.log('Text copied:', text);
              }}
            />

            {/* Action buttons */}
            <div className="mt-6 flex gap-3 justify-center border-t border-gray-200 dark:border-gray-800 pt-6">
              <button
                onClick={reset}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Upload PDF Baru
              </button>
              <button
                onClick={() => downloadSummary(extractedText, summary)}
                className="px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Download Ringkasan
              </button>
            </div>
          </div>
        )}

        {/* Info section */}
        {!isLoading && !hasContent && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Fitur yang tersedia:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>✓ Upload PDF dengan drag & drop</li>
              <li>✓ Ekstraksi teks otomatis dari semua halaman</li>
              <li>✓ Ringkasan AI yang komprehensif</li>
              <li>✓ Identifikasi poin-poin kunci dokumen</li>
              <li>✓ Analisis tujuan dan kesimpulan dokumen</li>
              <li>✓ Salin dan download hasil ringkasan</li>
              <li>✓ Mendukung dokumen hingga 50MB</li>
            </ul>
          </div>
        )}
      </div>

      {/* Tech info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4 border-t border-gray-200 dark:border-gray-800">
        <p>
          Powered by {aiProvider === 'openai' ? 'OpenAI GPT-4' : 'Google Gemini'} •{' '}
          Text extraction dengan pdf.js
        </p>
      </div>
    </div>
  );
}

/**
 * Download summary sebagai text file
 */
function downloadSummary(extraction: any, summary: any) {
  const content = `
PDF SUMMARY REPORT
==================

File: ${extraction.fileName}
Pages: ${extraction.pageCount}
Generated: ${new Date(summary.generatedAt).toLocaleString('id-ID')}
Provider: ${summary.provider === 'openai' ? 'OpenAI GPT' : 'Google Gemini'}

---

RINGKASAN
---------
${summary.summary}

---

POIN-POIN KUNCI
---------------
${summary.keyPoints.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n')}

---

TUJUAN DOKUMEN
--------------
${summary.documentPurpose}

---

KESIMPULAN & REKOMENDASI
------------------------
${summary.conclusion}

==================
Generated by AI PDF Summarizer
`.trim();

  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', `${extraction.fileName.replace('.pdf', '')}_summary.txt`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
