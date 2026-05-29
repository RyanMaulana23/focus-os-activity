# Setup & Installation Guide - AI PDF Summarizer

## 📋 Prerequisites

- Node.js 18+ 
- npm atau yarn
- API key untuk OpenAI ATAU Google Gemini (atau keduanya)

## 🔧 Installation Steps

### Step 1: Dependencies sudah terinstall ✓

```bash
# pdfjs-dist sudah ada di project
npm list pdfjs-dist
# Output: pdfjs-dist@4.0.379
```

### Step 2: Setup Environment Variables

1. **Copy file template:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Edit `.env.local` dengan API keys Anda:**

   **Option A: Menggunakan OpenAI**
   ```
   OPENAI_API_KEY=your_openai_api_key
   # Dapatkan dari: https://platform.openai.com/api-keys
   ```

   **Option B: Menggunakan Google Gemini**
   ```
   GEMINI_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxx
   # Dapatkan dari: https://makersuite.google.com/app/apikey
   ```

   **Option C: Dua-duanya (recommended untuk redundancy)**
   ```
   OPENAI_API_KEY=your_openai_api_key
   GEMINI_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Step 3: Verify File Structure

Pastikan semua file telah dibuat di lokasi yang benar:

```
✓ lib/types/pdf-summarizer.ts
✓ lib/utils/pdf-extractor.ts
✓ lib/hooks/usePDFSummarizer.ts
✓ lib/stores/pdfSummarizerStore.ts
✓ components/PDFSummarizer.tsx
✓ components/PDFUpload.tsx
✓ components/PDFSummaryDisplay.tsx
✓ components/LoadingSkeleton.tsx
✓ components/PDFSummarizerWithHistory.tsx
✓ app/api/summarize/route.ts
✓ app/summarize/page.tsx
✓ .env.local (dengan API key)
✓ PDF_SUMMARIZER_GUIDE.md
```

### Step 4: Start Development Server

```bash
npm run dev
# Server akan jalan di http://localhost:3000
```

### Step 5: Test Feature

1. Buka browser di `http://localhost:3000/summarize`
2. Upload file PDF dengan cara:
   - Drag & drop ke upload area
   - Atau klik untuk file picker
3. Tunggu extraction dan summarization selesai
4. Lihat hasil ringkasan yang dihasilkan

## 🚀 Quick Usage

### Minimal Setup (Single API)

**Jika hanya punya OpenAI:**
```bash
# .env.local
OPENAI_API_KEY=your_openai_api_key
```

**Jika hanya punya Gemini:**
```bash
# .env.local
GEMINI_API_KEY=AIzaSyD_xxxxx
```

### Integrate ke Page Existing

```tsx
// app/dashboard/page.tsx
import { PDFSummarizer } from '@/components/PDFSummarizer';

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <PDFSummarizer aiProvider="openai" />
    </div>
  );
}
```

### Dengan History/Storage

```tsx
// app/documents/page.tsx
import { PDFSummarizerWithHistory } from '@/components/PDFSummarizerWithHistory';

export default function DocumentsPage() {
  return <PDFSummarizerWithHistory />;
}
```

## 🔑 Cara Mendapatkan API Keys

### OpenAI API Key

1. **Buat akun di OpenAI:**
   - Pergi ke https://platform.openai.com/
   - Sign up dengan email
   - Verify email

2. **Setup billing:**
   - Pergi ke https://platform.openai.com/account/billing/overview
   - Add payment method (credit card)
   - Set usage limit (recommended: $5/bulan)

3. **Generate API Key:**
   - Pergi ke https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Copy dan save ke `.env.local`

4. **Cost estimate:**
   - Rp 0.15 per 1000 input tokens
   - Rp 0.60 per 1000 output tokens
   - Dokumen 10 halaman ≈ Rp 200-500

### Google Gemini API Key

1. **Enable API:**
   - Pergi ke https://makersuite.google.com/app/apikey
   - Click "Create API Key"
   - Copy dan save

2. **Limits:**
   - Free tier: 60 requests/minute
   - No credit card required untuk free tier
   - Cocok untuk testing/development

3. **Cost:**
   - Free untuk basic usage
   - Paid plan untuk production volume

## ✅ Verification Checklist

Setelah setup, pastikan:

- [ ] File `.env.local` sudah dibuat dengan API key
- [ ] `npm run dev` berjalan tanpa error
- [ ] Page `/summarize` terbuka tanpa error di console
- [ ] Upload PDF test berjalan
- [ ] Summarization berhasil dan tampil hasil

## 🐛 Common Issues & Solutions

### Issue: "OPENAI_API_KEY is not configured"

**Solusi:**
```bash
# 1. Check file .env.local ada
cat .env.local

# 2. Verify format benar (tanpa kutip):
OPENAI_API_KEY=sk_live_xxxxx  # ✓ Benar
OPENAI_API_KEY="sk_live_xxxxx" # ✗ Salah

# 3. Restart dev server
npm run dev
```

### Issue: "PDF Worker Failed to Initialize"

**Solusi:**
```bash
# 1. Verify pdfjs-dist installed
npm list pdfjs-dist

# 2. Jika error, reinstall
npm install pdfjs-dist@4.0.379

# 3. Check file structure
ls -la node_modules/pdfjs-dist/build/pdf.worker.min.mjs

# 4. Restart dev server
npm run dev
```

### Issue: "API Rate Limit Exceeded"

**OpenAI:**
- Upgrade API tier di https://platform.openai.com/account/billing/overview
- Atau gunakan Gemini sebagai fallback

**Gemini:**
- Switch ke OpenAI atau
- Wait 60 seconds (free tier limit)

### Issue: "Large PDF Makes Browser Freeze"

**Solusi:**
- Sistem sudah handle chunking otomatis
- Jika masih freeze, split PDF menjadi parts
- Update browser ke versi terbaru

## 📚 API Keys Security Best Practices

⚠️ **PENTING:**
```bash
# ✓ DO: Keep API key di environment variable
OPENAI_API_KEY=sk_live_xxxxx

# ✗ DON'T: Hardcode di source code
const apiKey = "sk_live_xxxxx"; // JANGAN!

# ✗ DON'T: Commit .env.local ke Git
git rm --cached .env.local
```

**Setup `.gitignore`:**
```
# Sudah ada di .gitignore atau tambah:
.env
.env.local
.env.*.local
```

## 🚀 Production Deployment

### Sebelum Deploy ke Production:

1. **Set environment variables di platform hosting:**
   - Vercel: Settings > Environment Variables
   - Netlify: Site settings > Build & deploy > Environment
   - Railway: Variables
   - Render: Environment

2. **Test di staging:**
   ```bash
   npm run build
   npm start
   ```

3. **Monitor costs:**
   - Setup alerts di OpenAI/Gemini console
   - Track API usage regularly

4. **Add rate limiting:**
   ```typescript
   // Tambah di API route
   import { rateLimit } from '@/lib/utils/rate-limit';
   
   export async function POST(req: NextRequest) {
     const ip = req.headers.get('x-forwarded-for');
     const { success } = await rateLimit(ip);
     if (!success) return new Response('Too many requests', { status: 429 });
     // ... rest of code
   }
   ```

5. **Add monitoring:**
   - Implement error tracking (Sentry, LogRocket)
   - Add analytics untuk track usage
   - Monitor API costs

## 📖 Next Steps

1. **Explore dokumentasi lengkap:**
   - Baca `PDF_SUMMARIZER_GUIDE.md`

2. **Customize component:**
   - Edit colors, fonts, layout di components
   - Add custom prompts di `app/api/summarize/route.ts`

3. **Integrate dengan features existing:**
   - Add ke dashboard
   - Save summaries ke database
   - Share summaries dengan users lain

4. **Advanced features:**
   - Add export ke PDF/Word
   - Multi-language support
   - Custom summarization templates
   - Batch processing multiple PDFs

## 🆘 Support Resources

- **PDF.js Documentation:** https://mozilla.github.io/pdf.js/
- **OpenAI API Docs:** https://platform.openai.com/docs/api-reference
- **Google Gemini Docs:** https://ai.google.dev/docs
- **Next.js Docs:** https://nextjs.org/docs
- **TailwindCSS:** https://tailwindcss.com/docs

## ✨ Success Checklist

Jika ini berhasil, Anda sekarang punya:

- ✓ Production-ready PDF text extraction
- ✓ AI-powered summarization (OpenAI atau Gemini)
- ✓ Modern UI dengan React components
- ✓ Proper error handling
- ✓ Loading states & progress tracking
- ✓ Drag & drop upload
- ✓ History/storage (optional)
- ✓ Dark mode support
- ✓ Responsive design
- ✓ TypeScript strict mode

🎉 **Selamat! PDF Summarizer Anda siap digunakan!**
