/**
 * Custom Hook untuk PDF Summarization
 * Mengelola state, extraction, dan summarization logic
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  PDFFile,
  PDFExtractionResult,
  SummarizationResult,
  PDFSummarizerState,
} from '@/lib/types/pdf-summarizer';
import { extractPDFText, isPDFFile } from '@/lib/utils/pdf-extractor';

interface UsePDFSummarizerOptions {
  onSuccess?: (result: SummarizationResult) => void;
  onError?: (error: Error) => void;
  aiProvider?: 'openai' | 'gemini';
}

export function usePDFSummarizer(options: UsePDFSummarizerOptions = {}) {
  const { onSuccess, onError, aiProvider = 'openai' } = options;
  const abortControllerRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<PDFSummarizerState>({
    file: null,
    extractedText: null,
    summary: null,
    isExtracting: false,
    isSummarizing: false,
    isLoading: false,
    error: null,
    progress: 0,
  });

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    async (file: File) => {
      console.log('[Hook] File selected:', { name: file.name, size: file.size, type: file.type });

      // Validasi file
      if (!isPDFFile(file)) {
        const error = new Error('File harus berformat PDF');
        console.error('[Hook] File validation failed:', error);
        setState(prev => ({ ...prev, error: error.message }));
        onError?.(error);
        return;
      }

      // Reset state
      setState(prev => ({
        ...prev,
        file: {
          file,
          name: file.name,
          size: file.size,
        },
        extractedText: null,
        summary: null,
        error: null,
        isExtracting: true,
        progress: 0,
      }));

      try {
        console.log('[Hook] Starting PDF extraction...');
        
        // Extract text dengan progress tracking
        const extracted = await extractPDFText(file, {
          onProgress: (progress) => {
            console.log('[Hook] Extraction progress:', progress + '%');
            setState(prev => ({ ...prev, progress }));
          },
        });

        console.log('[Hook] Extraction success:', {
          pageCount: extracted.pageCount,
          textLength: extracted.text.length,
          preview: extracted.text.substring(0, 100),
        });

        setState(prev => ({
          ...prev,
          extractedText: extracted,
          isExtracting: false,
          progress: 100,
        }));

        // Validate extracted text before summarization
        if (!extracted.text || extracted.text.trim().length === 0) {
          const error = new Error(
            'Ekstraksi berhasil tapi PDF tidak memiliki text yang dapat dibaca. Kemungkinan PDF berisi gambar saja (scanned document).'
          );
          console.error('[Hook] Extracted text is empty:', error);
          setState(prev => ({
            ...prev,
            error: error.message,
            isExtracting: false,
          }));
          onError?.(error);
          return;
        }

        console.log('[Hook] Starting summarization...');
        
        // Otomatis summarize setelah extract selesai
        await summarize(extracted.text, extracted.pageCount, extracted.fileName);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Error mengekstrak PDF';
        console.error('[Hook] Extraction error:', message, error);
        setState(prev => ({
          ...prev,
          error: message,
          isExtracting: false,
        }));
        onError?.(error instanceof Error ? error : new Error(message));
      }
    },
    [onError]
  );

  /**
   * Summarize extracted text dengan AI
   */
  const summarize = useCallback(
    async (text: string, pageCount: number, fileName: string) => {
      console.log('[Hook] Summarize called:', {
        textLength: text.length,
        pageCount,
        fileName,
        aiProvider,
      });

      // Cancel previous request jika ada
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setState(prev => ({
        ...prev,
        isSummarizing: true,
        error: null,
      }));

      try {
        console.log('[Hook] Sending to /api/summarize...');
        
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            pageCount,
            fileName,
            aiProvider,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          const errorMessage = error.error || `HTTP ${response.status}`;
          console.error('[Hook] API error:', errorMessage, error);
          throw new Error(errorMessage);
        }

        const result: SummarizationResult = await response.json();

        console.log('[Hook] Summarization success:', {
          summaryLength: result.summary.length,
          keyPointsCount: result.keyPoints.length,
          provider: result.provider,
        });

        setState(prev => ({
          ...prev,
          summary: result,
          isSummarizing: false,
        }));

        onSuccess?.(result);
      } catch (error) {
        // Skip error jika di-abort
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[Hook] Summarization aborted');
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Error summarization';
        console.error('[Hook] Summarization error:', message, error);
        setState(prev => ({
          ...prev,
          error: message,
          isSummarizing: false,
        }));
        onError?.(error instanceof Error ? error : new Error(message));
      }
    },
    [aiProvider, onSuccess, onError]
  );

  /**
   * Manual summarize trigger
   */
  const triggerSummarize = useCallback(async () => {
    if (!state.extractedText) {
      const error = new Error('Tidak ada text yang diextract');
      onError?.(error);
      return;
    }

    await summarize(
      state.extractedText.text,
      state.extractedText.pageCount,
      state.extractedText.fileName
    );
  }, [state.extractedText, summarize, onError]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState({
      file: null,
      extractedText: null,
      summary: null,
      isExtracting: false,
      isSummarizing: false,
      isLoading: false,
      error: null,
      progress: 0,
    });
  }, []);

  /**
   * Cancel current operation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({
      ...prev,
      isExtracting: false,
      isSummarizing: false,
      error: 'Operasi dibatalkan',
    }));
  }, []);

  return {
    // State
    ...state,
    isLoading: state.isExtracting || state.isSummarizing,

    // Actions
    handleFileSelect,
    triggerSummarize,
    reset,
    cancel,
  };
}
