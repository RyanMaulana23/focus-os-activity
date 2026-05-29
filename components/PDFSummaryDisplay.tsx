/**
 * PDF Summary Result Component
 * Menampilkan hasil ringkasan dengan UI modern dan responsive
 */

'use client';

import React from 'react';
import {
  FileText,
  Lightbulb,
  Target,
  BookMarked,
  Copy,
  Download,
  ChevronDown,
} from 'lucide-react';
import type { PDFExtractionResult, SummarizationResult } from '@/lib/types/pdf-summarizer';

interface PDFSummaryDisplayProps {
  extraction: PDFExtractionResult;
  summary: SummarizationResult;
  onDownload?: () => void;
  onCopy?: (text: string) => void;
}

export function PDFSummaryDisplay({
  extraction,
  summary,
  onDownload,
  onCopy,
}: PDFSummaryDisplayProps) {
  const [expandedSection, setExpandedSection] = React.useState<string | null>(
    'summary'
  );

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onCopy?.(text);
    // Show toast notification (bisa integrate dengan toast library)
    console.log(`${label} copied to clipboard`);
  };

  return (
    <div className="w-full space-y-4">
      {/* File Info Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {extraction.fileName}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {extraction.pageCount} halaman • {Math.round(extraction.size / 1024)} KB •{' '}
                {summary.provider === 'openai' ? 'OpenAI GPT' : 'Google Gemini'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Download summary"
              >
                <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Summary Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <button
          onClick={() => toggleSection('summary')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold text-gray-900 dark:text-white">Ringkasan</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${
              expandedSection === 'summary' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expandedSection === 'summary' && (
          <div className="px-4 py-4 space-y-3">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
              {summary.summary}
            </p>
            <button
              onClick={() => copyToClipboard(summary.summary, 'Ringkasan')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Salin ringkasan
            </button>
          </div>
        )}
      </div>

      {/* Key Points Section */}
      {summary.keyPoints.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <button
            onClick={() => toggleSection('keypoints')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-purple-500" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Poin-Poin Kunci ({summary.keyPoints.length})
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                expandedSection === 'keypoints' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSection === 'keypoints' && (
            <div className="px-4 py-4 space-y-3">
              <ul className="space-y-2">
                {summary.keyPoints.map((point, index) => (
                  <li key={index} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-purple-500 font-semibold flex-shrink-0">
                      {index + 1}.
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() =>
                  copyToClipboard(summary.keyPoints.join('\n'), 'Poin-poin kunci')
                }
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                Salin semua poin
              </button>
            </div>
          )}
        </div>
      )}

      {/* Document Purpose Section */}
      {summary.documentPurpose && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <button
            onClick={() => toggleSection('purpose')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-500" />
              <span className="font-semibold text-gray-900 dark:text-white">Tujuan Dokumen</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                expandedSection === 'purpose' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSection === 'purpose' && (
            <div className="px-4 py-4 space-y-3">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {summary.documentPurpose}
              </p>
              <button
                onClick={() => copyToClipboard(summary.documentPurpose, 'Tujuan dokumen')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                Salin tujuan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Conclusion Section */}
      {summary.conclusion && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <button
            onClick={() => toggleSection('conclusion')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Kesimpulan & Rekomendasi
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                expandedSection === 'conclusion' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSection === 'conclusion' && (
            <div className="px-4 py-4 space-y-3">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {summary.conclusion}
              </p>
              <button
                onClick={() => copyToClipboard(summary.conclusion, 'Kesimpulan')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                Salin kesimpulan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Metadata Footer */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Dihasilkan dengan {summary.provider === 'openai' ? 'OpenAI GPT' : 'Google Gemini'} pada{' '}
        {new Date(summary.generatedAt).toLocaleString('id-ID')}
      </div>
    </div>
  );
}
