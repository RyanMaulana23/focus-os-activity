/**
 * Loading Skeleton Component
 * Display saat proses extraction dan summarization
 */

'use client';

import React from 'react';

interface LoadingSkeletonProps {
  message?: string;
  step?: 'extracting' | 'summarizing';
}

export function LoadingSkeleton({
  message = 'Sedang memproses PDF...',
  step = 'extracting',
}: LoadingSkeletonProps) {
  return (
    <div className="w-full space-y-4">
      {/* Header skeleton */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Progress info */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{message}</p>
        <div className="space-y-1">
          {step === 'extracting' ? (
            <>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Membaca file PDF...
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                Mengekstrak teks...
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                Mengirim ke AI...
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
                Membaca file PDF...
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
                Mengekstrak teks...
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Membuat ringkasan dengan AI...
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sections skeleton */}
      {[1, 2, 3].map((index) => (
        <div key={index} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 animate-pulse" />
            </div>
            <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
          </div>

          <div className="px-4 py-4 space-y-3">
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5 animate-pulse" />
            </div>
            <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-20 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Error state component
 */
interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  onReset?: () => void;
}

export function ErrorState({ error, onRetry, onReset }: ErrorStateProps) {
  return (
    <div className="w-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-red-900 dark:text-red-100">Error</h3>
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
          >
            Coba Lagi
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Success message component
 */
interface SuccessStateProps {
  message: string;
  onNew?: () => void;
}

export function SuccessState({ message, onNew }: SuccessStateProps) {
  return (
    <div className="w-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-green-900 dark:text-green-100">Sukses</h3>
          <p className="text-sm text-green-800 dark:text-green-200">{message}</p>
        </div>
      </div>

      {onNew && (
        <button
          onClick={onNew}
          className="w-full px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 rounded transition-colors"
        >
          Upload PDF Baru
        </button>
      )}
    </div>
  );
}
