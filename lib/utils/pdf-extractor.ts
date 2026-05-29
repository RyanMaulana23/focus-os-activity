'use client';

import * as pdfjs from 'pdfjs-dist';
import type { PDFExtractionResult } from '@/lib/types/pdf-summarizer';
import { PDFSummarizerErrorCode } from '@/lib/types/pdf-summarizer';

// Error class that should be exported from types
class PDFSummarizerError extends Error {
  public code: PDFSummarizerErrorCode;
  public details?: unknown;

  constructor(
    message: string,
    code: PDFSummarizerErrorCode,
    details?: unknown
  ) {
    super(message);
    this.name = 'PDFSummarizerError';
    this.code = code;
    this.details = details;
  }
}

// Initialize worker ONLY on client side
// Support pdfjs-dist v3 dan v4
let workerInitialized = false;

function initializePDFWorker() {
  if (typeof window === 'undefined') {
    console.warn('[PDF] Worker initialization skipped (SSR context)');
    return;
  }

  if (workerInitialized) {
    return;
  }

  try {
    // Try .mjs first (v4+)
    try {
      const workerPath = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
      console.log('[PDF] Worker initialized with .mjs:', workerPath);
      workerInitialized = true;
      return;
    } catch (e) {
      console.warn('[PDF] .mjs worker failed, trying .js fallback');
    }

    // Fallback to .js (v3)
    try {
      const workerPath = new URL(
        'pdfjs-dist/build/pdf.worker.min.js',
        import.meta.url
      ).toString();
      pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
      console.log('[PDF] Worker initialized with .js:', workerPath);
      workerInitialized = true;
      return;
    } catch (e) {
      console.warn('[PDF] .js worker also failed');
    }

    // Last resort: use public path
    console.warn('[PDF] Using public path fallback for worker');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    workerInitialized = true;
  } catch (error) {
    console.error('[PDF] Failed to initialize worker:', error);
    throw new Error(
      'Failed to initialize PDF.js worker. Check if pdfjs-dist is installed correctly.'
    );
  }
}

interface ExtractionOptions {
  onProgress?: (progress: number) => void;
  maxPages?: number;
}

/**
 * Extract text dari PDF file
 * Mendukung multi-page PDF dengan progress tracking
 * 
 * IMPORTANT: HARUS dipanggil dari CLIENT COMPONENT ONLY!
 */
export async function extractPDFText(
  file: File,
  options: ExtractionOptions = {}
): Promise<PDFExtractionResult> {
  try {
    // Initialize worker terlebih dahulu
    initializePDFWorker();

    console.log('[PDF] Starting extraction:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    // Validasi file
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      throw createPDFError(
        'File harus berformat PDF',
        PDFSummarizerErrorCode.INVALID_FILE,
        { receivedType: file.type }
      );
    }

    if (file.size < 100) {
      // Min 100 bytes
      throw createPDFError(
        'File PDF terlalu kecil (corrupt file)',
        PDFSummarizerErrorCode.INVALID_PDF,
        { fileSize: file.size }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      // Max 50MB
      throw createPDFError(
        'File PDF terlalu besar (max 50MB)',
        PDFSummarizerErrorCode.FILE_TOO_LARGE,
        { fileSize: file.size }
      );
    }

    // Convert File ke ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('[PDF] ArrayBuffer created:', arrayBuffer.byteLength, 'bytes');

    // Load PDF document dengan detailed options
    let pdf;
    try {
      pdf = await pdfjs.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true, // Better font handling
        cMapUrl: '/cmaps/', // Optional: for CJK support
        cMapPacked: true,
      }).promise;
    } catch (loadError) {
      console.error('[PDF] Failed to load document:', loadError);
      throw createPDFError(
        'Gagal membaca file PDF (file mungkin corrupt)',
        PDFSummarizerErrorCode.INVALID_PDF,
        { originalError: loadError instanceof Error ? loadError.message : String(loadError) }
      );
    }

    console.log('[PDF] Document loaded:', {
      numPages: pdf.numPages,
      fingerprint: (pdf as any).fingerprint,
    });

    if (pdf.numPages === 0) {
      throw createPDFError(
        'PDF kosong (0 halaman)',
        PDFSummarizerErrorCode.EMPTY_PDF
      );
    }

    // Extract text dari semua halaman
    const textParts: string[] = [];
    const maxPages = options.maxPages || pdf.numPages;
    let totalCharacters = 0;

    for (let pageNum = 1; pageNum <= Math.min(maxPages, pdf.numPages); pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        if (!textContent || !textContent.items) {
          console.warn(`[PDF] Page ${pageNum} has no text content`);
          continue;
        }

        console.log(`[PDF] Page ${pageNum} items count:`, textContent.items.length);

        // Extract text dari semua items - handle berbagai tipe
        const pageTextLines: string[] = [];
        
        for (const item of textContent.items) {
          let itemText = '';
          
          // Handle TextItem (tipe string)
          if ((item as any).str !== undefined) {
            itemText = (item as any).str;
          }
          // Handle other potential text properties
          else if ((item as any).text !== undefined) {
            itemText = (item as any).text;
          }
          // Handle whitespace marker
          else if ((item as any).hasEOL) {
            itemText = '\n';
          }

          if (itemText) {
            pageTextLines.push(itemText);
          }
        }

        const pageText = pageTextLines.join('');
        const pageCharCount = pageText.length;
        totalCharacters += pageCharCount;

        console.log(`[PDF] Page ${pageNum} extracted:`, {
          characters: pageCharCount,
          lines: pageTextLines.length,
          preview: pageText.substring(0, 100),
        });

        textParts.push(pageText);

        // Report progress
        if (options.onProgress) {
          const progress = Math.round((pageNum / Math.min(maxPages, pdf.numPages)) * 100);
          options.onProgress(progress);
        }
      } catch (pageError) {
        console.error(`[PDF] Error on page ${pageNum}:`, pageError);
        // Continue dengan halaman berikutnya
        continue;
      }
    }

    const fullText = textParts.join('\n\n');
    const trimmedText = fullText.trim();

    console.log('[PDF] Extraction complete:', {
      totalCharacters: fullText.length,
      trimmedCharacters: trimmedText.length,
      pages: Math.min(maxPages, pdf.numPages),
      hasContent: trimmedText.length > 0,
    });

    if (!trimmedText || trimmedText.length === 0) {
      console.error('[PDF] NO TEXT EXTRACTED - Possible causes:');
      console.error('  - PDF might be image-only (scanned document)');
      console.error('  - PDF has empty pages');
      console.error('  - Text extraction failed');
      console.error('  - PDF is corrupt');

      throw createPDFError(
        'Tidak dapat mengekstrak text dari PDF. PDF mungkin merupakan dokumen terpindai (image-only). Gunakan OCR jika diperlukan.',
        PDFSummarizerErrorCode.EXTRACTION_FAILED,
        { 
          pages: Math.min(maxPages, pdf.numPages),
          totalItems: textParts.length,
          suggestion: 'Kemungkinan PDF berisi gambar tanpa text layer. Gunakan OCR.'
        }
      );
    }

    // Cleanup memory
    try {
      pdf.cleanup();
    } catch (e) {
      console.warn('[PDF] Error during cleanup:', e);
    }

    return {
      text: fullText,
      pageCount: pdf.numPages,
      fileName: file.name,
      size: file.size,
      extractedAt: new Date(),
    };
  } catch (error) {
    console.error('[PDF] Extraction error:', error);

    // Re-throw jika sudah PDFSummarizerError
    if (error instanceof Error && error.name === 'PDFSummarizerError') {
      throw error;
    }

    // Handle worker errors
    if (error instanceof Error && (
      error.message.includes('Worker') || 
      error.message.includes('worker') ||
      error.message.includes('fetch')
    )) {
      throw createPDFError(
        'Error pada PDF worker process. Pastikan pdfjs-dist terinstall dengan benar.',
        PDFSummarizerErrorCode.WORKER_ERROR,
        { originalError: error.message }
      );
    }

    // Handle document errors
    if (error instanceof Error && error.message.includes('Invalid PDF')) {
      throw createPDFError(
        'File PDF tidak valid atau corrupt',
        PDFSummarizerErrorCode.INVALID_PDF,
        { originalError: error.message }
      );
    }

    // Generic error
    throw createPDFError(
      `Error ekstraksi PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      PDFSummarizerErrorCode.EXTRACTION_FAILED,
      { originalError: error }
    );
  }
}

/**
 * Chunk text untuk large documents
 * Gunakan untuk text yang terlalu panjang sebelum AI summarization
 */
export function chunkText(
  text: string,
  chunkSize: number = 4000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));

    // Jika bukan chunk terakhir, overlap untuk context
    if (end < text.length) {
      start = end - overlap;
    } else {
      break;
    }
  }

  return chunks;
}

/**
 * Count tokens secara approximation
 * Useful untuk estimate API cost
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Helper function untuk create error
 */
function createPDFError(
  message: string,
  code: PDFSummarizerErrorCode,
  details?: unknown
): PDFSummarizerError {
  return new PDFSummarizerError(message, code, details);
}

/**
 * Validasi apakah file adalah PDF
 */
export function isPDFFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

/**
 * Format file size ke readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
