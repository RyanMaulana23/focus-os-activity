/**
 * Advanced Examples - PDF Summarizer Integration Patterns
 */

// ============================================
// EXAMPLE 1: Custom Hooks dengan Analytics
// ============================================

import { usePDFSummarizer } from '@/lib/hooks/usePDFSummarizer';

export function PDFSummarizerWithAnalytics() {
  const { handleFileSelect, summary, isLoading, error } = usePDFSummarizer({
    aiProvider: 'openai',
    onSuccess: (result) => {
      // Track analytics event
      fetch('/api/analytics', {
        method: 'POST',
        body: JSON.stringify({
          event: 'pdf_summarized',
          provider: result.provider,
          timestamp: new Date(),
        }),
      });
    },
    onError: (error) => {
      // Track error
      fetch('/api/analytics', {
        method: 'POST',
        body: JSON.stringify({
          event: 'pdf_error',
          error: error.message,
          timestamp: new Date(),
        }),
      });
    },
  });

  return (
    <div>
      {/* Render UI */}
    </div>
  );
}

// ============================================
// EXAMPLE 2: Database Integration
// ============================================

import { supabase } from '@/lib/supabase';
import type { SummarizationResult, PDFExtractionResult } from '@/lib/types/pdf-summarizer';

export async function saveSummaryToDatabase(
  extraction: PDFExtractionResult,
  summary: SummarizationResult,
  userId: string
) {
  const { data, error } = await supabase
    .from('pdf_summaries')
    .insert([
      {
        user_id: userId,
        file_name: extraction.fileName,
        page_count: extraction.pageCount,
        file_size: extraction.size,
        summary_text: summary.summary,
        key_points: summary.keyPoints,
        purpose: summary.documentPurpose,
        conclusion: summary.conclusion,
        provider: summary.provider,
        created_at: new Date(),
      },
    ]);

  if (error) throw error;
  return data;
}

export async function getSummaryHistory(userId: string) {
  const { data, error } = await supabase
    .from('pdf_summaries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ============================================
// EXAMPLE 3: Custom AI Prompt
// ============================================

/**
 * Customize AI summarization prompt
 * Modifier /api/summarize/route.ts dengan custom prompt ini
 */

export const CUSTOM_PROMPTS = {
  academic: `Analisis paper akademik berikut dan berikan:
1. Ringkasan metodologi dan hasil (300-400 kata)
2. Temuan utama (5 poin)
3. Novelty/kontribusi penelitian
4. Limitations dan saran penelitian lanjutan
Format: JSON`,

  business: `Analisis dokumen bisnis berikut dan berikan:
1. Executive summary (200-300 kata)
2. Key metrics dan KPIs (5 poin)
3. Business objectives/goals
4. Recommended actions
Format: JSON`,

  legal: `Analisis dokumen legal berikut dan berikan:
1. Ringkasan terms & conditions (300-400 kata)
2. Klausul penting (5 poin)
3. Potential risks
4. Recommendations
Format: JSON`,

  technical: `Analisis dokumentasi teknis berikut dan berikan:
1. Technical overview dan architecture (300-400 kata)
2. Key components dan dependencies (5 poin)
3. Implementation guidelines
4. Troubleshooting guide
Format: JSON`,
};

// ============================================
// EXAMPLE 4: Batch Processing Multiple PDFs
// ============================================

import { extractPDFText, chunkText } from '@/lib/utils/pdf-extractor';

export async function batchSummarizePDFs(files: File[]) {
  const results = [];

  for (const file of files) {
    try {
      // Extract text
      const extracted = await extractPDFText(file);

      // Summarize
      const response = await fetch('/api/summarize', {
        method: 'POST',
        body: JSON.stringify({
          text: extracted.text,
          pageCount: extracted.pageCount,
          fileName: extracted.fileName,
          aiProvider: 'openai',
        }),
      });

      if (!response.ok) throw new Error('Summarization failed');

      const summary = await response.json();

      results.push({
        fileName: file.name,
        status: 'success',
        summary,
      });
    } catch (error) {
      results.push({
        fileName: file.name,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

// ============================================
// EXAMPLE 5: Export Results Format
// ============================================

import type { SummarizationResult, PDFExtractionResult } from '@/lib/types/pdf-summarizer';

export function exportAsJSON(
  extraction: PDFExtractionResult,
  summary: SummarizationResult
) {
  const data = {
    metadata: {
      fileName: extraction.fileName,
      pageCount: extraction.pageCount,
      fileSize: extraction.size,
      extractedAt: extraction.extractedAt,
      summarizedAt: summary.generatedAt,
      provider: summary.provider,
    },
    summary: {
      overview: summary.summary,
      keyPoints: summary.keyPoints,
      purpose: summary.documentPurpose,
      conclusion: summary.conclusion,
    },
  };

  const element = document.createElement('a');
  element.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)]));
  element.download = `${extraction.fileName.replace('.pdf', '')}_summary.json`;
  element.click();
}

export function exportAsMarkdown(
  extraction: PDFExtractionResult,
  summary: SummarizationResult
) {
  const md = `# ${extraction.fileName.replace('.pdf', '')}

## Metadata
- **Pages:** ${extraction.pageCount}
- **Size:** ${Math.round(extraction.size / 1024)}KB
- **Generated:** ${new Date(summary.generatedAt).toLocaleString()}
- **Provider:** ${summary.provider}

## Summary
${summary.summary}

## Key Points
${summary.keyPoints.map(point => `- ${point}`).join('\n')}

## Document Purpose
${summary.documentPurpose}

## Conclusion
${summary.conclusion}

---
Generated by AI PDF Summarizer`;

  const element = document.createElement('a');
  element.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  element.download = `${extraction.fileName.replace('.pdf', '')}_summary.md`;
  element.click();
}

// ============================================
// EXAMPLE 6: Error Recovery & Retry Logic
// ============================================

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffFactor?: number;
}

export async function summarizeWithRetry(
  text: string,
  pageCount: number,
  fileName: string,
  options: RetryOptions = {}
) {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffFactor = 2,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        body: JSON.stringify({
          text,
          pageCount,
          fileName,
          aiProvider: 'openai',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt < maxRetries - 1) {
        const delay = delayMs * Math.pow(backoffFactor, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed to summarize after ${maxRetries} attempts: ${lastError?.message}`
  );
}

// ============================================
// EXAMPLE 7: Zustand Store Advanced Usage
// ============================================

import { usePDFSummarizerStore, useGenerateId } from '@/lib/stores/pdfSummarizerStore';

export function usePDFSummarizerAdvanced() {
  const store = usePDFSummarizerStore();
  const id = useGenerateId();

  // Save new summary
  const saveSummary = (extraction: any, summary: any) => {
    store.addSummary({
      id,
      fileName: extraction.fileName,
      extraction,
      summary,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  // Search in summaries
  const searchSummaries = (query: string) => {
    return store.getAllSummaries().filter(s =>
      s.fileName.toLowerCase().includes(query.toLowerCase()) ||
      s.summary.summary.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Get summaries by date range
  const getSummariesByDateRange = (startDate: Date, endDate: Date) => {
    return store.getAllSummaries().filter(s =>
      s.createdAt >= startDate && s.createdAt <= endDate
    );
  };

  // Export all summaries
  const exportAllSummaries = () => {
    const data = store.getAllSummaries().map(s => ({
      fileName: s.fileName,
      summary: s.summary.summary,
      keyPoints: s.summary.keyPoints,
      createdAt: s.createdAt,
    }));

    const element = document.createElement('a');
    element.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)])
    );
    element.download = `pdf-summaries-${new Date().toISOString()}.json`;
    element.click();
  };

  return {
    ...store,
    saveSummary,
    searchSummaries,
    getSummariesByDateRange,
    exportAllSummaries,
  };
}

// ============================================
// EXAMPLE 8: Custom Hook dengan Caching
// ============================================

const summaryCache = new Map<string, any>();

export async function getCachedSummary(fileHash: string) {
  return summaryCache.get(fileHash);
}

export async function cacheSummary(fileHash: string, summary: any) {
  summaryCache.set(fileHash, {
    ...summary,
    cachedAt: new Date(),
  });
}

export async function clearSummaryCache() {
  summaryCache.clear();
}

// ============================================
// EXAMPLE 9: Real-time Stream Processing
// ============================================

export async function summarizeWithStreaming(
  text: string,
  onChunk: (chunk: string) => void
) {
  const response = await fetch('/api/summarize-stream', {
    method: 'POST',
    body: JSON.stringify({ text, aiProvider: 'openai' }),
  });

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');

    // Process complete lines
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        onChunk(data);
      }
    }

    // Keep incomplete line in buffer
    buffer = lines[lines.length - 1];
  }
}

// ============================================
// EXAMPLE 10: Integration dengan Next.js Middleware
// ============================================

/**
 * Tambah di middleware.ts untuk authentication/logging
 */

export async function pdfSummarizerMiddleware(
  request: any,
  next: any
) {
  // Log PDF summarizer requests
  if (request.nextUrl.pathname.includes('/api/summarize')) {
    console.log('[PDF Summarizer] Request:', {
      timestamp: new Date(),
      method: request.method,
      path: request.nextUrl.pathname,
      ip: request.headers.get('x-forwarded-for'),
    });
  }

  // Add auth check
  const token = request.headers.get('authorization');
  if (!token && request.nextUrl.pathname.includes('/api/summarize')) {
    // Require auth untuk production
    // return new Response('Unauthorized', { status: 401 });
  }

  return next();
}
