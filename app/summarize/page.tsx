/**
 * PDF Summarizer Page
 * Contoh integrasi PDF Summarizer feature di page
 * 
 * Akses: /summarize
 */

import { PDFSummarizer } from '@/components/PDFSummarizer';

export const metadata = {
  title: 'AI PDF Summarizer',
  description: 'Upload PDF dan AI akan otomatis membuat ringkasan dokumen',
};

export default function SummarizePage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <PDFSummarizer
          aiProvider="openai"
        />
      </div>
    </main>
  );
}
