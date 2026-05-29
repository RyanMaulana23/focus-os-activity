/**
 * Types untuk PDF Summarizer Feature
 */

export interface PDFFile {
  file: File;
  name: string;
  size: number;
}

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  fileName: string;
  size: number;
  extractedAt: Date;
}

export interface SummarizationRequest {
  text: string;
  pageCount: number;
  fileName: string;
  aiProvider?: 'openai' | 'gemini';
}

export interface SummarizationResult {
  summary: string;
  keyPoints: string[];
  documentPurpose: string;
  conclusion: string;
  totalTokensUsed?: number;
  provider: 'openai' | 'gemini';
  generatedAt: Date;
}

export interface PDFSummarizerState {
  file: PDFFile | null;
  extractedText: PDFExtractionResult | null;
  summary: SummarizationResult | null;
  isExtracting: boolean;
  isSummarizing: boolean;
  isLoading: boolean;
  error: string | null;
  progress: number; // 0-100
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type SummarizationProvider = 'openai' | 'gemini' | 'local';

export interface SummarizationConfig {
  provider: SummarizationProvider;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  chunkSize?: number; // untuk large documents
}

export class PDFSummarizerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PDFSummarizerError';
  }
}

export enum PDFSummarizerErrorCode {
  INVALID_FILE = 'INVALID_FILE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  WORKER_ERROR = 'WORKER_ERROR',
  EMPTY_PDF = 'EMPTY_PDF',
  SUMMARIZATION_FAILED = 'SUMMARIZATION_FAILED',
  API_ERROR = 'API_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_PDF = 'INVALID_PDF',
}
