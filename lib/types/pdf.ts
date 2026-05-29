/**
 * PDF Summarizer Types
 * Comprehensive type definitions for PDF processing and summarization
 */

export interface PDFFile {
  file: File;
  name: string;
  size: number;
  uploadedAt: Date;
}

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  metadata?: {
    author?: string;
    title?: string;
    subject?: string;
    creator?: string;
  };
}

export interface PDFChunk {
  text: string;
  chunkIndex: number;
  totalChunks: number;
  wordCount: number;
}

export interface SummaryResult {
  id: string;
  fileName: string;
  pageCount: number;
  summary: string;
  summaryLength: number; // character count
  keyPoints: string[];
  processedAt: Date;
  processingTimeMs: number;
  model: 'openai' | 'gemini' | 'local';
  originalTextLength: number;
  compressionRatio: number; // original text length / summary length
}

export interface PDFSummarizerState {
  // File state
  currentFile: PDFFile | null;
  isUploading: boolean;
  uploadProgress: number;

  // Processing state
  isProcessing: boolean;
  processingStep: 'uploading' | 'extracting' | 'summarizing' | 'complete' | null;
  processingError: string | null;

  // Result state
  results: SummaryResult[];
  currentResult: SummaryResult | null;

  // Actions
  setCurrentFile: (file: PDFFile | null) => void;
  setIsUploading: (isUploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setProcessingStep: (step: 'uploading' | 'extracting' | 'summarizing' | 'complete' | null) => void;
  setProcessingError: (error: string | null) => void;
  addResult: (result: SummaryResult) => void;
  setCurrentResult: (result: SummaryResult | null) => void;
  clearState: () => void;
}

export interface AIConfig {
  provider: 'openai' | 'gemini';
  model?: string;
  apiKey?: string;
  maxTokens?: number;
}

export interface SummarizeRequestPayload {
  extractedText: string;
  fileName: string;
  pageCount: number;
  provider: 'openai' | 'gemini';
  model?: string;
}

export interface SummarizeResponsePayload {
  success: boolean;
  summary?: string;
  keyPoints?: string[];
  processingTimeMs?: number;
  model?: string;
  error?: string;
}

export const CHUNK_CONFIG = {
  MAX_CHUNK_SIZE: 3000, // characters per chunk
  CHUNK_OVERLAP: 200, // overlap untuk konteks
  MAX_TOTAL_LENGTH: 50000, // max total characters untuk di-summarize
} as const;

export const PDF_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_MIME_TYPES: ['application/pdf'],
  MAX_PAGES: 500,
} as const;

export const PROCESSING_TIMEOUTS = {
  EXTRACTION_TIMEOUT: 30000, // 30 seconds
  SUMMARIZATION_TIMEOUT: 60000, // 60 seconds
  TOTAL_TIMEOUT: 120000, // 2 minutes
} as const;
