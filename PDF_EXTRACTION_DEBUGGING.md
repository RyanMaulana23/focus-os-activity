# PDF Extraction Debugging Guide - Step by Step

Panduan lengkap untuk troubleshoot masalah PDF extraction jika masih ada issue.

## 📋 Quick Diagnostic Flowchart

```
Upload PDF
    ↓
1. Check worker initialization? → [PDF] Worker initialized...
    ↓
    ├─ YES ✅ → Continue
    └─ NO ❌ → Jump to "Worker Not Initializing"
    ↓
2. Check document loaded? → [PDF] Document loaded: {numPages: X}
    ↓
    ├─ YES (numPages > 0) ✅ → Continue
    └─ NO (numPages = 0 or error) ❌ → Jump to "Document Won't Load"
    ↓
3. Check page items extracted? → [PDF] Page X items count: Y
    ↓
    ├─ YES (Y > 0) ✅ → Continue
    └─ NO (Y = 0) ❌ → Jump to "No Items Extracted"
    ↓
4. Check final character count? → totalCharacters: Z
    ↓
    ├─ YES (Z > 0) ✅ → Continue
    └─ NO (Z = 0) ❌ → Jump to "No Text Extracted"
    ↓
5. Summary generated? → [Hook] Summarization success
    ↓
    ├─ YES ✅ → SUCCESS!
    └─ NO ❌ → Jump to "Summarization Failed"
```

## 🔧 Step-by-Step Debugging

### Step 1: Verify DevTools Console Access

**Do this:**
1. Open browser DevTools: `F12` atau `Ctrl+Shift+I`
2. Go to "Console" tab
3. Clear previous logs: `clear()`
4. Upload a PDF

**Should see:**
- `[PDF] Starting extraction: {...}`
- Various `[PDF]` logs

**If no logs appear:**
- Check if DevTools is connected
- Reload page (F5)
- Try a different browser
- Check if browser console is blocked

---

### Step 2: Check Worker Initialization

**Expected log:**
```
[PDF] Worker initialized with .mjs: blob:http://localhost:3000/...
```

**If you see this ✅:**
- Worker setup is correct
- Continue to Step 3

**If you see error about worker ❌:**
```
[PDF] Worker initialization skipped (SSR context)
```
- Component using extraction is SERVER-SIDE
- Add `'use client'` directive
- Make sure `extractPDFText` is only called from client

**If no worker log at all ❌:**
- pdfjs-dist not installed properly
- Run: `npm install pdfjs-dist@4.0.379`
- Restart dev server: `npm run dev`

---

### Step 3: Check Document Loading

**Expected log:**
```
[PDF] Document loaded: {
  numPages: 3,
  fingerprint: "..."
}
```

**If numPages > 0 ✅:**
- PDF loaded successfully
- Continue to Step 4

**If numPages = 0 ❌:**
- PDF is empty or corrupt
- Try different PDF file
- Verify file is valid: `file filename.pdf`

**If error instead of log ❌:**
```
[PDF] Failed to load document: Error: Invalid PDF...
```

Possible causes:
- File is not really a PDF
- File is corrupt
- File is password-protected
- PDF version not supported

**Solutions:**
- Try opening PDF with Adobe Reader first
- If it opens, try different reader
- Try different PDF file
- Check file size > 100 bytes

---

### Step 4: Check Page Items

**Expected logs (per page):**
```
[PDF] Page 1 items count: 45
[PDF] Page 1 extracted: {
  characters: 1200,
  lines: 45,
  preview: "Lorem ipsum..."
}
```

**If items count > 0 ✅:**
- Text items found on page
- Continue to Step 5

**If items count = 0 ❌:**
- No text items on this page
- Might be image-only page
- If ALL pages have 0 items → see "All Pages Empty"

**Check the character count:**
- If `characters: 0` but `items count: > 0` → Items exist but no text
  - Might be hidden text layer
  - Try different PDF

---

### Step 5: Check Total Character Count

**Expected log:**
```
[PDF] Extraction complete: {
  totalCharacters: 3250,
  trimmedCharacters: 3250,
  pages: 3,
  hasContent: true
}
```

**If totalCharacters > 0 ✅:**
- Extraction successful!
- Continue to Step 6

**If totalCharacters = 0 ❌:**
```
[PDF] NO TEXT EXTRACTED - Possible causes:
  - PDF might be image-only (scanned document)
  - PDF has empty pages
  - Text extraction failed
  - PDF is corrupt
```

**How to fix:**
- **If scanned PDF:** Need OCR (not supported yet)
- **If empty PDF:** Fill with actual content
- **If corrupt:** Try opening with reader
- **If parsing failed:** Update pdfjs-dist

---

### Step 6: Check Summarization

**Expected log:**
```
[Hook] Summarization success: {
  summaryLength: 450,
  keyPointsCount: 4,
  provider: "openai"
}
```

**If success ✅:**
- Everything working!
- Check UI for summary display

**If error about API ❌:**
```
[Hook] API error: 401 Unauthorized
```

**Causes & solutions:**
- **401 Unauthorized:** API key missing or invalid
  - Check `.env.local` has correct key
  - Restart dev server
- **402 Payment Required:** Account out of credits
  - Add payment method to OpenAI
  - Or use Gemini instead
- **429 Too Many Requests:** Rate limit exceeded
  - Wait a few minutes
  - Or upgrade API tier

**If error about text length ❌:**
```
[Hook] API error: Text terlalu panjang (max 500000 characters)
```

**Solutions:**
- PDF has > 500,000 characters
- System should auto-chunk
- If still error, file might be corrupted
- Try smaller PDF first

---

## 🐛 Common Issues & Solutions

### Issue 1: Worker Not Initializing

**Symptom:**
```
[PDF] Worker initialization skipped (SSR context)
```

**Root Cause:**
- `extractPDFText` called from SERVER component

**Solution:**
```tsx
// BEFORE (SERVER component)
import { extractPDFText } from '@/lib/utils/pdf-extractor';
export default function Page() {
  const handleUpload = async (file: File) => {
    const result = await extractPDFText(file); // ❌ ERROR
  };
}

// AFTER (CLIENT component)
'use client'; // ← Add this!
import { extractPDFText } from '@/lib/utils/pdf-extractor';
export default function Page() {
  const handleUpload = async (file: File) => {
    const result = await extractPDFText(file); // ✅ OK
  };
}
```

---

### Issue 2: No Text Extracted (0 characters)

**Symptom:**
```
[PDF] Extraction complete: {totalCharacters: 0, ...}
```

**Likely Causes:**

| Cause | Evidence | Solution |
|-------|----------|----------|
| **Scanned PDF** | `items count > 0` but `characters: 0` | Use OCR software first, then upload |
| **Empty PDF** | `items count = 0` for all pages | Use different PDF with actual content |
| **Corrupt File** | Error during load or parsing | Open in Adobe Reader, save as new PDF |
| **Text hidden/white** | `items count > 0` but parsing fails | Try opening in different reader |

**Quick Test:**
1. Open PDF in Adobe Reader
2. Try to select & copy text
3. If can't copy → scanned/image PDF
4. If can copy → should work with our system

---

### Issue 3: Worker Path Error

**Symptom:**
```
Failed to initialize worker: TypeError: Cannot read property 'workerSrc'
```

**Root Cause:**
- pdfjs-dist not installed
- Wrong version installed

**Solution:**
```bash
# Check what's installed
npm list pdfjs-dist

# If not found or wrong version:
npm install pdfjs-dist@4.0.379
npm run dev
```

---

### Issue 4: "document is not defined"

**Symptom:**
```
ReferenceError: document is not defined
```

**Root Cause:**
- Code running on server side
- Or import happening on server

**Solution:**
```tsx
// ❌ WRONG - This runs on server
import { extractPDFText } from '@/lib/utils/pdf-extractor';
export default function Page() { ... }

// ✅ RIGHT - Add 'use client'
'use client';
import { extractPDFText } from '@/lib/utils/pdf-extractor';
export default function Page() { ... }
```

---

### Issue 5: API Error - Invalid API Key

**Symptom:**
```
[Hook] API error: 401 Unauthorized
```

**Solutions:**

**For OpenAI:**
1. Check `.env.local` exists
2. Verify key format: `sk_live_...` (not `sk_...`)
3. Check key is active: https://platform.openai.com/api-keys
4. Restart server: `npm run dev`

**For Gemini:**
1. Check `.env.local` has `GEMINI_API_KEY`
2. Verify key format: starts with `AIzaSy...`
3. Check key is active: https://makersuite.google.com/app/apikey
4. Restart server

---

### Issue 6: API Error - Account Issue

**Symptom:**
```
[Hook] API error: You exceeded your current quota
```

**Solutions:**

**For OpenAI:**
1. Go to https://platform.openai.com/account/billing/overview
2. Add payment method or increase quota
3. Check available balance
4. Might take 5 min to activate

**For Gemini:**
- Free tier has limits
- Try again after some time
- Or upgrade to paid plan

---

### Issue 7: Very Large PDF Times Out

**Symptom:**
```
[Hook] API error: timeout
```

**Root Cause:**
- PDF > 500KB with lots of complex formatting
- Network slow
- AI service slow

**Solutions:**
- Try with smaller PDF first
- Check internet connection
- Increase timeout in API route (default 60s)
- Split large PDF into parts

---

## 🧪 Test Yourself

### Test Case 1: Simple Text PDF

**File:** Create test PDF
```
Simply text document, 1-2 pages, plain text
```

**Expected:**
- All logs show successful
- totalCharacters > 100
- Summary generated

---

### Test Case 2: Multi-page PDF

**File:** 5-10 pages, normal text PDF
```
Book chapter, article, or document
```

**Expected:**
- [PDF] Page 1, Page 2, ... Page N logs
- totalCharacters > 1000
- All pages extracted

---

### Test Case 3: PDF with Images

**File:** Mix of text and images
```
Document with photos, charts, text
```

**Expected:**
- Only text parts extracted
- Images ignored
- totalCharacters > 0 (if text present)

---

### Test Case 4: Scanned PDF (Should Fail)

**File:** Image-only, scanned document
```
Printed document scanned without OCR
```

**Expected:**
- [PDF] Page 1 items count: 0 (or very few)
- totalCharacters: 0
- Error: "image-only PDF"

This is EXPECTED and correct!

---

## 📊 Debug Output Examples

### ✅ Successful Extraction
```
[PDF] Starting extraction: {
  fileName: "document.pdf",
  fileSize: 245680,
  fileType: "application/pdf"
}
[PDF] ArrayBuffer created: 245680 bytes
[PDF] Worker initialized with .mjs: blob:http://localhost:3000/...
[PDF] Document loaded: {
  numPages: 5,
  fingerprint: "abc123..."
}
[PDF] Page 1 items count: 45
[PDF] Page 1 extracted: {
  characters: 1234,
  lines: 45,
  preview: "Lorem ipsum dolor sit amet..."
}
[PDF] Page 2 items count: 42
[PDF] Page 2 extracted: {
  characters: 1150,
  lines: 42,
  preview: "Consectetur adipiscing elit..."
}
[PDF] Page 3 items count: 38
[PDF] Page 3 extracted: {
  characters: 1100,
  lines: 38,
  preview: "Sed do eiusmod tempor..."
}
[PDF] Page 4 items count: 41
[PDF] Page 4 extracted: {
  characters: 1080,
  lines: 41,
  preview: "Incididunt ut labore..."
}
[PDF] Page 5 items count: 39
[PDF] Page 5 extracted: {
  characters: 950,
  lines: 39,
  preview: "Et dolore magna aliqua..."
}
[PDF] Extraction complete: {
  totalCharacters: 5514,
  trimmedCharacters: 5514,
  pages: 5,
  hasContent: true
}
[Hook] Extraction success: {
  pageCount: 5,
  textLength: 5514,
  preview: "Lorem ipsum dolor sit amet..."
}
[Hook] Starting summarization...
[Hook] Sending to /api/summarize...
[Hook] Summarization success: {
  summaryLength: 487,
  keyPointsCount: 4,
  provider: "openai"
}
```

### ❌ Failed Extraction (Image-only PDF)
```
[PDF] Starting extraction: {
  fileName: "scanned.pdf",
  fileSize: 892456,
  fileType: "application/pdf"
}
[PDF] Document loaded: {
  numPages: 3,
  fingerprint: "xyz789..."
}
[PDF] Page 1 items count: 0
[PDF] Page 1 extracted: {
  characters: 0,
  lines: 0,
  preview: ""
}
[PDF] Page 2 items count: 0
[PDF] Page 2 extracted: {
  characters: 0,
  lines: 0,
  preview: ""
}
[PDF] Page 3 items count: 0
[PDF] Page 3 extracted: {
  characters: 0,
  lines: 0,
  preview: ""
}
[PDF] NO TEXT EXTRACTED - Possible causes:
  - PDF might be image-only (scanned document)
  - PDF has empty pages
  - Text extraction failed
  - PDF is corrupt
```

---

## 📞 Still Having Issues?

### Checklist Before Asking:

1. **Collected Debug Info:**
   - [ ] Copied console logs (from F12)
   - [ ] PDF file name and size
   - [ ] Have you tested with 2+ different PDFs?
   - [ ] Which browser and version?

2. **Tried Basic Fixes:**
   - [ ] Restarted dev server (`npm run dev`)
   - [ ] Cleared browser cache (Ctrl+Shift+Delete)
   - [ ] Tried different PDF
   - [ ] Checked `.env.local` has API key
   - [ ] Opened DevTools Console (F12)

3. **Verified File:**
   - [ ] PDF opens in Adobe Reader
   - [ ] Can select & copy text from it
   - [ ] File size > 100 bytes
   - [ ] File not corrupted

**Share with your issue:**
- Screenshot of console logs
- PDF file name & size
- Exact error message
- What you've already tried

---

**With this guide, you should be able to identify and fix any PDF extraction issue!**
