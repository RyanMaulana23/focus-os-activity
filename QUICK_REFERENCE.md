# PDF Summarizer - Quick Reference Guide

Panduan singkat untuk developers yang ingin menggunakan PDF Summarizer feature.

## 🚀 Super Quick Start (2 menit)

```bash
# 1. Setup environment
cp .env.local.example .env.local
# Edit .env.local dengan API key

# 2. Start server
npm run dev

# 3. Open browser
# http://localhost:3000/summarize
```

## 📦 Import Components

### Main Component
```tsx
import { PDFSummarizer } from '@/components/PDFSummarizer';

// Usage
<PDFSummarizer aiProvider="openai" />
```

### With History
```tsx
import { PDFSummarizerWithHistory } from '@/components/PDFSummarizerWithHistory';

<PDFSummarizerWithHistory />
```

### Individual Components
```tsx
import { PDFUpload } from '@/components/PDFUpload';
import { PDFSummaryDisplay } from '@/components/PDFSummaryDisplay';
import { LoadingSkeleton, ErrorState, SuccessState } from '@/components/LoadingSkeleton';
```

## 🔌 Custom Hooks

### Main Hook
```tsx
import { usePDFSummarizer } from '@/lib/hooks/usePDFSummarizer';

const {
  // State
  file,              // Current file
  extractedText,     // Extraction result
  summary,           // Summarization result
  isLoading,         // Loading state
  error,             // Error message
  progress,          // Progress 0-100
  
  // Actions
  handleFileSelect,  // Handle file upload
  triggerSummarize,  // Manual summarize
  reset,             // Reset state
  cancel,            // Cancel operation
} = usePDFSummarizer({
  aiProvider: 'openai',
  onSuccess: (result) => {},
  onError: (error) => {},
});
```

### Store Hooks
```tsx
import {
  usePDFSummarizerStore,        // Main store
  usePDFSummarizerCurrent,       // Current summary
  usePDFSummarizerHistory,       // History management
  useGenerateId,                 // Generate unique ID
} from '@/lib/stores/pdfSummarizerStore';
```

## 🛠️ Utility Functions

```tsx
import {
  extractPDFText,       // Extract text from PDF
  chunkText,            // Split text into chunks
  estimateTokenCount,   // Estimate tokens
  isPDFFile,            // Validate file
  formatFileSize,       // Format bytes to readable
} from '@/lib/utils/pdf-extractor';

// Usage examples
const result = await extractPDFText(file, {
  onProgress: (progress) => console.log(progress + '%')
});

const chunks = chunkText(text, 4000, 200);
const tokens = estimateTokenCount(text);
```

## 📝 API Endpoint

### POST /api/summarize

**Request:**
```typescript
{
  text: string;              // Required: PDF text
  pageCount: number;         // Required: Page count
  fileName: string;          // Required: File name
  aiProvider?: 'openai' | 'gemini';  // Optional
}
```

**Response:**
```typescript
{
  summary: string;           // Main summary
  keyPoints: string[];       // 3-5 key points
  documentPurpose: string;   // Document purpose
  conclusion: string;        // Conclusion & recommendations
  provider: 'openai' | 'gemini';
  generatedAt: Date;
}
```

## 🎨 Common Integrations

### Dalam Page
```tsx
'use client';
import { PDFSummarizer } from '@/components/PDFSummarizer';

export default function Page() {
  return (
    <div className="container mx-auto py-8">
      <PDFSummarizer aiProvider="openai" />
    </div>
  );
}
```

### Dalam Modal
```tsx
import { useState } from 'react';
import { PDFSummarizer } from '@/components/PDFSummarizer';

export function PDFModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Upload PDF</button>
      {open && (
        <div className="modal">
          <PDFSummarizer aiProvider="openai" />
          <button onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </>
  );
}
```

### Dengan Database
```tsx
import { usePDFSummarizer } from '@/lib/hooks/usePDFSummarizer';

export function SaveSummaryExample() {
  const { summary, extractedText } = usePDFSummarizer({
    onSuccess: async (result) => {
      // Save to database
      await fetch('/api/summaries', {
        method: 'POST',
        body: JSON.stringify({
          fileName: extractedText.fileName,
          summary: result.summary,
          keyPoints: result.keyPoints,
        }),
      });
    },
  });
}
```

## ⚙️ Configuration

### Switch AI Provider
```tsx
// OpenAI (default)
<PDFSummarizer aiProvider="openai" />

// Google Gemini
<PDFSummarizer aiProvider="gemini" />
```

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk_live_xxxxx
# OR
GEMINI_API_KEY=AIzaSyD_xxxxx

# Optional (can add if needed)
# NEXT_PUBLIC_PDF_MAX_SIZE=52428800
# NEXT_PUBLIC_SUMMARIZER_PROVIDER=openai
```

## 🐛 Error Handling

### Common Error Codes
```typescript
import { PDFSummarizerErrorCode } from '@/lib/types/pdf-summarizer';

enum errors {
  INVALID_FILE = 'File bukan PDF',
  FILE_TOO_LARGE = 'File > 50MB',
  EXTRACTION_FAILED = 'Gagal extract teks',
  EMPTY_PDF = 'PDF kosong',
  SUMMARIZATION_FAILED = 'AI summarization error',
  TIMEOUT = 'Request timeout',
}
```

### Handle Errors
```tsx
const { error } = usePDFSummarizer({
  onError: (error) => {
    if (error.message.includes('INVALID_FILE')) {
      console.log('Please upload valid PDF');
    } else if (error.message.includes('FILE_TOO_LARGE')) {
      console.log('PDF terlalu besar');
    }
  },
});
```

## 💾 State Management

### Zustand Store
```tsx
import { usePDFSummarizerStore } from '@/lib/stores/pdfSummarizerStore';

const store = usePDFSummarizerStore();

// Add summary
store.addSummary({
  id: 'unique-id',
  fileName: 'document.pdf',
  extraction: { /* ... */ },
  summary: { /* ... */ },
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Get all summaries
const summaries = store.getAllSummaries();

// Clear all
store.clearAll();
```

## 📊 Performance Tips

### For Large PDFs
```tsx
// Automatically chunked & processed in stages
<PDFSummarizer aiProvider="openai" />
// System handles: extraction → chunking → multi-request summarization
```

### For Multiple PDFs
```tsx
// Sequential processing recommended
for (const file of files) {
  await processPDF(file);
  // Wait between requests to avoid rate limiting
  await new Promise(r => setTimeout(r, 2000));
}
```

### Caching
```tsx
// Implement simple caching
const cache = new Map();

async function getSummaryWithCache(text: string) {
  const key = hashText(text);
  if (cache.has(key)) return cache.get(key);
  
  const result = await summarizeAPI(text);
  cache.set(key, result);
  return result;
}
```

## 🔐 Security Tips

✅ **DO:**
```tsx
// Use environment variables
const apiKey = process.env.OPENAI_API_KEY;

// Validate file type
if (!isPDFFile(file)) return;

// Validate file size
if (file.size > 50 * 1024 * 1024) return;
```

❌ **DON'T:**
```tsx
// Don't hardcode API keys
const apiKey = 'sk_live_xxxxx'; // WRONG!

// Don't expose API key to frontend
export const apiKey = process.env.OPENAI_API_KEY; // WRONG!

// Don't skip validation
handleFileSelect(file); // Without validation
```

## 📱 Responsive Design

Components already responsive:
- ✅ Mobile (< 640px)
- ✅ Tablet (640px - 1024px)
- ✅ Desktop (> 1024px)

Example custom sizing:
```tsx
<div className="max-w-2xl md:max-w-4xl mx-auto">
  <PDFSummarizer aiProvider="openai" />
</div>
```

## 🎨 Dark Mode

Already supported via Tailwind dark mode:
```tsx
// Automatic via system preference
// Or set manually in layout.tsx
export default function RootLayout({ children }) {
  return (
    <html className="dark"> {/* Force dark mode */}
      <body>{children}</body>
    </html>
  );
}
```

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `PDF_SUMMARIZER_GUIDE.md` | Complete feature guide & API reference |
| `SETUP_PDF_SUMMARIZER.md` | Installation guide & troubleshooting |
| `PDF_SUMMARIZER_EXAMPLES.md` | 10 advanced integration examples |
| `FILE_STRUCTURE.md` | Complete file structure overview |
| `QUICK_REFERENCE.md` | This file! |

## ❓ FAQ

**Q: Bagaimana cara mengubah AI provider?**
A: Pass `aiProvider="gemini"` ke component atau hook

**Q: Berapa max file size?**
A: 50MB (bisa diubah di pdf-extractor.ts)

**Q: Apakah data disimpan?**
A: Default tidak. Implement database jika diperlukan.

**Q: Gimana cara caching results?**
A: Lihat PDF_SUMMARIZER_EXAMPLES.md bagian caching

**Q: Support multiple languages?**
A: AI akan summarize dalam bahasa dokumen

**Q: Bisa di-deploy ke Vercel?**
A: Ya, set environment variables di Vercel dashboard

## 🚀 Quick Deploy Checklist

- [ ] Setup API keys di platform hosting
- [ ] Run `npm run build` locally (verify no errors)
- [ ] Deploy to Vercel/Netlify/Railway
- [ ] Set environment variables
- [ ] Test /summarize page
- [ ] Monitor costs
- [ ] Setup error tracking
- [ ] Add analytics

## 📞 Need Help?

1. Check PDF_SUMMARIZER_GUIDE.md
2. Review PDF_SUMMARIZER_EXAMPLES.md
3. Check browser console for errors
4. Verify environment variables set
5. Check API key is valid
6. Test with different PDF

---

**Happy summarizing! 🎉**
