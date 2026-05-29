# PDF Summarizer - Testing & Verification Checklist

Complete checklist untuk memastikan PDF Summarizer berfungsi dengan benar setelah fixes diterapkan.

## 📋 Pre-Test Setup

### Environment Check
- [ ] Node.js installed: `node --version` (v18+)
- [ ] npm installed: `npm --version` (v9+)
- [ ] Dependencies installed: `npm install` completed
- [ ] `.env.local` exists dengan API keys
- [ ] Dev server can start: `npm run dev` (no errors)

### Files Verification
- [ ] `lib/utils/pdf-extractor.ts` - extraction logic ✅
- [ ] `lib/hooks/usePDFSummarizer.ts` - hook with validation ✅
- [ ] `components/PDFSummarizer.tsx` - main component ✅
- [ ] `app/summarize/page.tsx` - demo page exists ✅

---

## 🚀 Quick Start Test

### 1. Start Development Server
```bash
npm run dev
```

**Expected output:**
```
> next dev

  ▲ Next.js 16.2.6
  - Local:        http://localhost:3000
  - Environments: .env.local
  ✓ Ready in 1234ms
```

**If error appears:**
- Check `.env.local` file
- Verify all dependencies installed
- Try: `npm install` again

---

### 2. Navigate to Feature
- [ ] Open browser: `http://localhost:3000/summarize`
- [ ] Should see PDF upload UI
- [ ] Upload button visible
- [ ] Drag & drop area visible

**If page doesn't load:**
- Check DevTools (F12) → Console for errors
- Check Network tab for failed requests
- Reload page

---

### 3. Test Basic Upload

**Do:**
1. Prepare test PDF file (any PDF, 1-10 pages)
2. Drag & drop into upload area OR click to select
3. Watch browser console (F12)

**Expected flow:**
- [ ] File selected successfully
- [ ] `[PDF] Starting extraction` log appears
- [ ] Progress updates in UI
- [ ] `[PDF] Extraction complete` log appears
- [ ] Character count shows > 0
- [ ] Loading skeleton shows (while AI summarizes)
- [ ] Summary appears (after ~2-5 seconds)

---

## 🧪 Comprehensive Test Cases

### Test 1: Simple Text PDF ✓ Should Pass

**Setup:**
1. Create PDF with plain text (or use sample)
2. 2-3 pages, regular document

**Steps:**
1. Navigate to `/summarize`
2. Upload PDF
3. Watch console logs

**Console Should Show:**
```
[PDF] Starting extraction: {fileName: "test.pdf", ...}
[PDF] Worker initialized with .mjs: blob:...
[PDF] Document loaded: {numPages: 2, ...}
[PDF] Page 1 items count: 40
[PDF] Page 1 extracted: {characters: 1200, ...}
[PDF] Page 2 items count: 35
[PDF] Page 2 extracted: {characters: 1100, ...}
[PDF] Extraction complete: {totalCharacters: 2300, ...}
[Hook] Extraction success: {pageCount: 2, textLength: 2300, ...}
[Hook] Starting summarization...
[Hook] Summarization success: {summaryLength: 450, ...}
```

**UI Should Show:**
- [ ] File uploaded with progress bar
- [ ] File info displayed (name, pages)
- [ ] Extracted text shows
- [ ] Summary appears
- [ ] Key points list displayed
- [ ] Copy buttons work
- [ ] No error messages

**Verification:**
- [ ] Summary is relevant to PDF content
- [ ] Key points are accurate
- [ ] Text extraction matches original
- [ ] All content visible and readable

**Result:** ✅ PASS / ❌ FAIL

---

### Test 2: Multi-Page PDF ✓ Should Pass

**Setup:**
1. PDF with 5-10 pages
2. Mix of content (text, maybe images)
3. Realistic document

**Steps:**
1. Upload to `/summarize`
2. Monitor console for page processing

**Console Should Show:**
```
[PDF] Page 1 extracted: {characters: 1200, ...}
[PDF] Page 2 extracted: {characters: 1100, ...}
[PDF] Page 3 extracted: {characters: 950, ...}
...
[PDF] Extraction complete: {totalCharacters: 8500, pages: 10, ...}
```

**Key Checks:**
- [ ] All pages logged (`[PDF] Page 1`, `[PDF] Page 2`, etc.)
- [ ] totalCharacters is sum of all pages
- [ ] No pages skipped
- [ ] Summary comprehensive (covers all pages)

**Result:** ✅ PASS / ❌ FAIL

---

### Test 3: Large Character PDF ✓ Should Pass

**Setup:**
1. PDF with 10,000+ characters
2. Long document or book chapter
3. Tests chunking logic

**Steps:**
1. Upload to `/summarize`
2. Note extraction time (should be < 5 seconds)
3. Note summarization time (should be < 10 seconds)

**Console Should Show:**
```
[PDF] Extraction complete: {totalCharacters: 15000, ...}
[Hook] Summarization success: {summaryLength: 800, ...}
```

**Key Checks:**
- [ ] Large character count handled
- [ ] No timeout errors
- [ ] Summary still accurate
- [ ] No memory issues

**Result:** ✅ PASS / ❌ FAIL

---

### Test 4: PDF with Images ✓ Should Pass

**Setup:**
1. PDF with both text and images
2. Charts, photos, diagrams
3. Only text should be extracted

**Steps:**
1. Upload PDF with images
2. Check extraction

**Expected:**
- [ ] Text portions extracted correctly
- [ ] Character count reflects text only
- [ ] Images ignored (not in text)
- [ ] Summary based on text content
- [ ] No image processing errors

**Result:** ✅ PASS / ❌ FAIL

---

### Test 5: Scanned PDF (Image-Only) ✗ Should Show Error

**Setup:**
1. Image-only PDF (scanned document without OCR)
2. No selectable text layer
3. Tests error handling

**Steps:**
1. Upload scanned PDF
2. Check console and UI

**Expected Behavior:**
```
[PDF] Page 1 items count: 0
[PDF] NO TEXT EXTRACTED - Possible causes:
  - PDF might be image-only (scanned document)
```

**UI Should Show:**
- [ ] Error message displayed
- [ ] Message says "image-only" or similar
- [ ] No summary attempted
- [ ] User can try different file

**Result:** ✅ PASS / ❌ FAIL (This is correct behavior!)

---

### Test 6: Empty PDF ✗ Should Show Error

**Setup:**
1. PDF with blank pages (no content)
2. Tests edge case

**Steps:**
1. Upload empty PDF
2. Check error handling

**Expected:**
- [ ] Error shown: "PDF tidak memiliki text"
- [ ] Extraction correctly returns 0 characters
- [ ] No attempt to summarize empty text

**Result:** ✅ PASS / ❌ FAIL

---

### Test 7: Invalid File ✗ Should Show Error

**Setup:**
1. Try uploading non-PDF (image, text, word doc)
2. Tests file validation

**Steps:**
1. Attempt upload of `.jpg` or `.txt` file
2. Check validation

**Expected:**
- [ ] Error: "File harus berformat PDF"
- [ ] File not processed
- [ ] UI shows clear rejection message

**Result:** ✅ PASS / ❌ FAIL

---

### Test 8: File Size Check ✓ Should Pass

**Setup:**
1. Very large PDF (10-50 MB)
2. Tests performance

**Steps:**
1. Upload large file
2. Monitor extraction time
3. Check for memory issues

**Expected:**
- [ ] Extraction completes (within 30 seconds)
- [ ] No browser crash
- [ ] Character count accurate
- [ ] Summary generated

**Note:** If extraction > 30s, this is still okay, just slower.

**Result:** ✅ PASS / ❌ FAIL

---

### Test 9: Console Logging ✓ Verify Details

**Setup:**
1. Any PDF upload
2. Focus on console output

**DevTools Console Should Show:**
- [ ] `[PDF]` prefixed logs for extraction
- [ ] `[Hook]` prefixed logs for hook operations
- [ ] Clear progression through steps
- [ ] No cryptic errors
- [ ] Character counts visible

**Verify Each Log:**

```
[PDF] Starting extraction ← File received
[PDF] Worker initialized ← Worker ready
[PDF] Document loaded ← PDF parsed
[PDF] Page X extracted ← Per-page data
[PDF] Extraction complete ← Total results
[Hook] File selected ← Hook started
[Hook] Extraction success ← Text ready
[Hook] Starting summarization ← AI prep
[Hook] Sending to /api/summarize ← API call
[Hook] Summarization success ← Result received
```

**Result:** ✅ PASS / ❌ FAIL

---

### Test 10: API Integration ✓ Should Work

**Setup:**
1. `.env.local` has valid API keys
2. OpenAI or Gemini account active

**Steps:**
1. Upload PDF
2. Watch for API call
3. Verify summarization

**Expected:**
- [ ] No 401/403 API errors
- [ ] API call completes
- [ ] Summary appears in 5-10 seconds
- [ ] No "quota exceeded" errors

**If API error:**
- Verify API key in `.env.local`
- Check account has credits
- Check key is active in console
- Restart dev server

**Result:** ✅ PASS / ❌ FAIL

---

## 🎯 Expected Behavior Checklist

### Upload Behavior
- [ ] Drag & drop accepted
- [ ] File input button works
- [ ] Only PDF files accepted
- [ ] File size shows correctly
- [ ] Progress bar updates

### Extraction Behavior
- [ ] Extraction starts immediately after selection
- [ ] Progress shown in UI
- [ ] Console logs visible
- [ ] Completes in < 5 seconds (typical)
- [ ] Character count > 0 (for valid PDFs)

### Summarization Behavior
- [ ] Starts after extraction complete
- [ ] Loading state shown
- [ ] API call logs visible
- [ ] Completes in < 10 seconds (typical)
- [ ] Summary displayed
- [ ] Key points listed

### Display Behavior
- [ ] Extracted text shows with scrolling
- [ ] Summary expandable/collapsible
- [ ] Key points in nice list format
- [ ] Copy buttons work
- [ ] UI responsive on all sizes

### Error Handling
- [ ] Wrong file type → Clear error
- [ ] Empty PDF → Clear error
- [ ] Scanned PDF → Clear error
- [ ] API key missing → Clear error
- [ ] API quota exceeded → Clear error
- [ ] No confusing "undefined" errors

---

## 🐛 Issue Verification Matrix

If something fails, use this matrix to diagnose:

| Test Failed | Check These | Solution |
|-------------|------------|----------|
| Upload doesn't work | File type, browser permissions | Reload page, try PNG first to test upload |
| No console logs | DevTools open, F12, Console tab | Refresh, clear cache, hard reload |
| Extraction shows 0 chars | PDF type, file validity | Try different PDF, open in reader first |
| Worker error | pdfjs-dist installed | `npm install pdfjs-dist@4.0.379` |
| API error 401 | `.env.local` has key | Add API key, restart dev server |
| Summary doesn't appear | API response, network | Check Network tab, verify API key |
| UI looks broken | CSS loaded, TailwindCSS | Clear cache, restart server |

---

## 📊 Test Summary Template

Copy & fill this after running all tests:

```markdown
## Test Run Summary - [DATE]

**Environment:**
- Next.js: [version]
- Browser: [name/version]
- pdfjs-dist: [version]
- API Provider: OpenAI/Gemini

**Results:**
- Test 1 (Simple PDF): PASS/FAIL
- Test 2 (Multi-page): PASS/FAIL
- Test 3 (Large PDF): PASS/FAIL
- Test 4 (Images): PASS/FAIL
- Test 5 (Scanned): PASS/FAIL
- Test 6 (Empty): PASS/FAIL
- Test 7 (Invalid): PASS/FAIL
- Test 8 (Large file): PASS/FAIL
- Test 9 (Logging): PASS/FAIL
- Test 10 (API): PASS/FAIL

**Overall:** ✅ READY FOR PRODUCTION / ❌ NEEDS FIXES

**Issues Found:** [list any]
**Fixes Applied:** [list any]
```

---

## 🚀 Deployment Readiness

After all tests pass:

- [ ] All console logs show `[PDF]` and `[Hook]` prefixes
- [ ] No `undefined` errors
- [ ] No `document is not defined` errors
- [ ] No worker initialization errors
- [ ] Character counts > 0 for valid PDFs
- [ ] API integration working
- [ ] Summaries generating correctly
- [ ] Error messages helpful and clear
- [ ] UI responsive and professional

**Status:** ✅ READY / ⏳ PARTIAL / ❌ NOT READY

---

## 📞 Support

**If test fails, provide:**
1. Which test number failed
2. Screenshot of console (F12)
3. Error message (exact text)
4. PDF file details (size, type, pages)
5. What you've already tried

**Quick fix checklist:**
- [ ] Restarted dev server: `npm run dev`
- [ ] Cleared browser cache: Ctrl+Shift+Delete
- [ ] Verified `.env.local` exists
- [ ] Ran `npm install` again
- [ ] Tried different PDF
- [ ] Checked DevTools console (F12)

---

**Status: Ready for comprehensive testing!**
