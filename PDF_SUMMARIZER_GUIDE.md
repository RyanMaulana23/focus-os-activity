# AI PDF Summarizer Feature

Sistem production-ready untuk ekstraksi teks PDF dan ringkasan otomatis menggunakan AI.

## 🎯 Fitur Utama

- **Upload PDF** dengan drag & drop support
- **Ekstraksi Teks Otomatis** dari semua halaman PDF
- **AI Summarization** dengan OpenAI GPT atau Google Gemini
- **Multi-page Support** untuk dokumen panjang dengan chunking otomatis
- **Error Handling** komprehensif untuk berbagai skenario
- **Modern UI** dengan dark mode support
- **Responsive Design** untuk semua device
- **Copy & Download** hasil ringkasan

## 📦 Struktur File

```
lib/
├── types/
│   └── pdf-summarizer.ts          # Type definitions
├── utils/
│   └── pdf-extractor.ts           # PDF text extraction logic
├── hooks/
│   └── usePDFSummarizer.ts        # Custom hook untuk state management
└── stores/
    └── pdfSummarizerStore.ts      # (Optional) Zustand store jika diperlukan

components/
├── PDFSummarizer.tsx              # Main feature component
├── PDFUpload.tsx                  # Upload component dengan drag & drop
├── PDFSummaryDisplay.tsx          # Summary result display
└── LoadingSkeleton.tsx            # Loading & error states

app/
└── api/
    └── summarize/
        └── route.ts               # API endpoint untuk AI summarization

.env.local.example                 # Environment variables template
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install pdfjs-dist
# Sudah terinstall di project
```

### 2. Setup Environment Variables

```bash
# Copy dan edit .env.local
cp .env.local.example .env.local
```

**Untuk OpenAI:**
1. Pergi ke https://platform.openai.com/api-keys
2. Buat API key baru
3. Masukkan ke `OPENAI_API_KEY`

**Untuk Google Gemini:**
1. Pergi ke https://makersuite.google.com/app/apikey
2. Buat API key baru
3. Masukkan ke `GEMINI_API_KEY`

### 3. Gunakan Component di Page

```tsx
// app/page.tsx atau page mana saja
import { PDFSummarizer } from '@/components/PDFSummarizer';

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <PDFSummarizer aiProvider="openai" />
    </main>
  );
}
```

## 🔧 API Reference

### POST `/api/summarize`

**Request:**
```typescript
{
  text: string;              // Extracted PDF text
  pageCount: number;         // Total pages
  fileName: string;          // Original filename
  aiProvider?: 'openai' | 'gemini';  // AI provider
}
```

**Response:**
```typescript
{
  summary: string;           // Ringkasan komprehensif
  keyPoints: string[];       // 3-5 poin kunci
  documentPurpose: string;   // Tujuan dokumen
  conclusion: string;        // Kesimpulan & rekomendasi
  provider: 'openai' | 'gemini';
  generatedAt: Date;
}
```

### Custom Hook: `usePDFSummarizer`

```typescript
const {
  // State
  file,              // File yang diupload
  extractedText,     // Hasil ekstraksi text
  summary,           // Hasil summarization
  isLoading,         // Loading state
  isExtracting,      // Extracting state
  isSummarizing,     // Summarizing state
  error,             // Error message
  progress,          // Progress 0-100
  
  // Actions
  handleFileSelect,  // Handle file selection
  triggerSummarize,  // Manual summarize
  reset,             // Reset state
  cancel,            // Cancel operation
} = usePDFSummarizer({
  aiProvider: 'openai',
  onSuccess: (result) => {},
  onError: (error) => {},
});
```

### Utility Functions

#### `extractPDFText(file, options)`
Extract teks dari PDF file dengan progress tracking.

```typescript
import { extractPDFText } from '@/lib/utils/pdf-extractor';

const result = await extractPDFText(file, {
  onProgress: (progress) => console.log(`${progress}%`),
});
```

#### `chunkText(text, chunkSize, overlap)`
Split text menjadi chunks untuk large documents.

```typescript
import { chunkText } from '@/lib/utils/pdf-extractor';

const chunks = chunkText(text, 4000, 200);
```

#### `estimateTokenCount(text)`
Estimate jumlah tokens untuk API cost calculation.

```typescript
import { estimateTokenCount } from '@/lib/utils/pdf-extractor';

const tokens = estimateTokenCount(text);
```

## ⚙️ Configuration

### PDF Extraction
- **Max file size:** 50MB
- **Supported format:** PDF (application/pdf)
- **Worker:** Local pdfjs-dist worker (no CDN required)

### AI Summarization
- **Max text length:** 500,000 characters
- **Timeout:** 60 seconds per request
- **Chunking threshold:** 
  - OpenAI: 6000 tokens (≈24KB)
  - Gemini: 10000 tokens (≈40KB)

### Models Used
- **OpenAI:** gpt-4o-mini (cost-effective, good quality)
- **Gemini:** gemini-1.5-flash (free tier available)

## 🛡️ Error Handling

Sistem menangani berbagai error scenarios:

```typescript
enum PDFSummarizerErrorCode {
  INVALID_FILE = 'INVALID_FILE',           // Bukan PDF
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',       // > 50MB
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',  // Extract error
  WORKER_ERROR = 'WORKER_ERROR',           // PDF.js worker error
  EMPTY_PDF = 'EMPTY_PDF',                 // PDF kosong
  SUMMARIZATION_FAILED = 'SUMMARIZATION_FAILED',  // AI error
  API_ERROR = 'API_ERROR',                 // OpenAI/Gemini error
  TIMEOUT = 'TIMEOUT',                     // Request timeout
  INVALID_PDF = 'INVALID_PDF',             // Corrupt PDF
}
```

## 🎨 Component Usage Examples

### Basic Usage
```tsx
import { PDFSummarizer } from '@/components/PDFSummarizer';

export default function Page() {
  return <PDFSummarizer aiProvider="openai" />;
}
```

### With Callbacks
```tsx
<PDFSummarizer
  aiProvider="gemini"
  onSummaryComplete={() => {
    console.log('Summary complete!');
  }}
/>
```

### Individual Components
```tsx
import { PDFUpload } from '@/components/PDFUpload';
import { PDFSummaryDisplay } from '@/components/PDFSummaryDisplay';
import { usePDFSummarizer } from '@/lib/hooks/usePDFSummarizer';

export function CustomPDFSummarizer() {
  const {
    file,
    extractedText,
    summary,
    isLoading,
    handleFileSelect,
    reset,
  } = usePDFSummarizer();

  return (
    <div className="space-y-4">
      <PDFUpload
        onFileSelect={handleFileSelect}
        isLoading={isLoading}
      />
      
      {summary && extractedText && (
        <PDFSummaryDisplay
          extraction={extractedText}
          summary={summary}
          onDownload={() => {}}
        />
      )}
    </div>
  );
}
```

## 📊 Performance Considerations

### Optimization Tips
1. **Large Documents:** Otomatis di-chunk dan di-process bertahap
2. **Progress Tracking:** UI update saat extraction berjalan
3. **Worker Management:** Local worker menghindari CDN latency
4. **Memory Cleanup:** PDF.js resources di-cleanup setelah selesai
5. **Request Cancellation:** Support untuk cancel operation

### Load Times
- **Small PDF (< 5MB):** 2-5 detik
- **Medium PDF (5-20MB):** 5-15 detik
- **Large PDF (20-50MB):** 15-30 detik (tergantung kompleksitas)

## 🔐 Security

- ✓ Input validation untuk file type dan size
- ✓ No data persistence (process in-memory)
- ✓ API keys tidak exposed di frontend
- ✓ Sanitized error messages
- ✓ CORS protected API endpoints
- ✓ Timeout protection untuk long-running requests

## 🚨 Troubleshooting

### "Worker failed to initialize"
```
Solusi:
1. Check bahwa file /public/pdf.worker.min.mjs tersedia
2. Verify pdfjs-dist terinstall dengan benar
3. Restart dev server
```

### "PDF file is corrupted"
```
Solusi:
1. Coba buka PDF dengan reader lain (verify integritas)
2. Coba dengan PDF yang berbeda
3. Check file size tidak > 50MB
```

### "API rate limit exceeded"
```
Solusi (OpenAI):
- Upgrade API key tier di https://platform.openai.com/account/billing/overview
- Implementasikan request queuing

Solusi (Gemini):
- Gunakan free tier hanya untuk testing
- Upgrade ke paid plan untuk production
```

### "Memory issues dengan large PDF"
```
Solusi:
1. Chunk size dikurangi otomatis
2. Process PDF page-by-page
3. Monitor browser memory usage
```

## 📈 Scaling untuk Production

### Tips untuk Scale
1. **Add caching:** Cache PDF extractions dengan Redis
2. **Queue system:** Implementasikan Bull/RabbitMQ untuk summarization
3. **Database:** Store summaries untuk reuse
4. **CDN:** Host static files di CDN
5. **API management:** Rate limiting, authentication
6. **Monitoring:** Add logging dan error tracking (e.g., Sentry)

### Example dengan Caching
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const cacheKey = `pdf:${hash(body.text)}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return NextResponse.json(JSON.parse(cached));
  
  // Process dan cache
  const result = await summarizeWithAI(body);
  await redis.setex(cacheKey, 86400, JSON.stringify(result)); // 1 day
  
  return NextResponse.json(result);
}
```

## 🤝 Contributing & Maintenance

### Adding New Features
1. Add types di `lib/types/pdf-summarizer.ts`
2. Implement logic di appropriate utils/hooks
3. Create/update components
4. Update tests dan documentation
5. Test dengan berbagai PDF sizes

### Testing
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test dengan berbagai PDF
npm run test:pdf
```

## 📄 License

MIT License - Free to use dalam project

## 📞 Support

Untuk issues atau questions:
1. Check Troubleshooting section
2. Review API documentation
3. Check console untuk detailed error messages
4. Implement proper error handling dan logging
