/**
 * PDF Upload Component
 * Drag & Drop, validasi, loading state
 */

'use client';

import React, { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { formatFileSize } from '@/lib/utils/pdf-extractor';

interface PDFUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  progress?: number;
  disabled?: boolean;
}

export function PDFUpload({
  onFileSelect,
  isLoading = false,
  progress = 0,
  disabled = false,
}: PDFUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isLoading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    setSelectedFile(null);

    // Validasi type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('File harus berformat PDF');
      return;
    }

    // Validasi size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`File terlalu besar (max ${formatFileSize(MAX_SIZE)})`);
      return;
    }

    setSelectedFile(file);
    setError(null);
    onFileSelect(file);
  };

  const handleClick = () => {
    if (!disabled && !isLoading) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Input tersembunyi */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        disabled={disabled || isLoading}
        className="hidden"
      />

      {/* Upload area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full p-8 border-2 border-dashed rounded-lg
          transition-all duration-200 cursor-pointer
          ${
            disabled || isLoading
              ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
              : isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : selectedFile
              ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
          }
        `}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          {isLoading ? (
            <>
              <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 animate-spin" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sedang memproses...
              </p>
            </>
          ) : selectedFile ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(selectedFile.size)}
              </p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Drag & drop file PDF di sini
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                atau klik untuk memilih file
              </p>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isLoading && progress > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Info text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Format: PDF • Max: 50MB
      </p>
    </div>
  );
}
