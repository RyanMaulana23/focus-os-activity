/**
 * fileExtractor.ts
 * Robust text extraction for PDF and Word (.docx) files.
 *
 * Word extraction strategy (no mammoth dependency issue):
 * .docx is a ZIP archive containing word/document.xml.
 * We extract that XML directly using JSZip, then strip XML tags.
 * This is more reliable than mammoth in Next.js/Turbopack environments.
 */

// ── PDF Extraction ────────────────────────────────────────────────────────────
export async function extractTextFromPDF(file: File): Promise<string> {
  if (typeof window === 'undefined') throw new Error('Browser only');

  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) pages.push(`[Halaman ${i}]\n${pageText}`);
  }

  return pages.join('\n\n');
}

// ── Word (.docx) Extraction — pure ZIP+XML, no mammoth ──────────────────────
/**
 * .docx is a ZIP file. We read word/document.xml and strip XML tags.
 * Works in any browser without external dependencies.
 */
async function extractDocxNative(arrayBuffer: ArrayBuffer): Promise<string> {
  // Use JSZip to unzip the .docx
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(arrayBuffer);

  // word/document.xml contains the main body text
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) throw new Error('Tidak dapat membaca document.xml dari file Word');

  // Strip XML tags and decode entities, preserving paragraph breaks
  let text = docXml
    // Paragraph end tags → newline
    .replace(/<\/w:p>/gi, '\n')
    // Table row end → newline
    .replace(/<\/w:tr>/gi, '\n')
    // Tab character
    .replace(/<w:tab[^>]*\/>/gi, '\t')
    // Remove all other XML tags
    .replace(/<[^>]+>/g, '')
    // Decode common XML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    // Collapse excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

// ── Word (.doc legacy) fallback — read as binary text ────────────────────────
async function extractDocLegacy(file: File): Promise<string> {
  // Old .doc format — try reading as text, extract printable chars
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chars: string[] = [];

  // Extract sequences of printable ASCII/Latin characters (heuristic)
  let run = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if ((b >= 32 && b < 127) || b === 9 || b === 10 || b === 13) {
      run += String.fromCharCode(b);
    } else {
      if (run.length > 4) chars.push(run.trim());
      run = '';
    }
  }
  if (run.length > 4) chars.push(run.trim());

  const raw = chars
    .filter((s) => s.length > 3 && /[a-zA-Z\u00C0-\u024F]/.test(s))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (raw.length < 50) {
    throw new Error(
      'File .doc (lama) tidak dapat dibaca secara otomatis. Silakan simpan ulang sebagai .docx dan upload kembali.'
    );
  }
  return raw;
}

// ── Word Extraction Entry Point ───────────────────────────────────────────────
export async function extractTextFromWord(file: File): Promise<string> {
  if (typeof window === 'undefined') throw new Error('Browser only');

  const arrayBuffer = await file.arrayBuffer();

  // .docx files start with PK (ZIP magic bytes 0x50 0x4B)
  const magic = new Uint8Array(arrayBuffer.slice(0, 2));
  const isDocx = magic[0] === 0x50 && magic[1] === 0x4b;

  if (isDocx) {
    try {
      return await extractDocxNative(arrayBuffer);
    } catch (err) {
      console.warn('[fileExtractor] Native DOCX extraction failed, trying mammoth fallback:', err);
      // Try mammoth as last resort with robust import handling
      return await extractWithMammothFallback(arrayBuffer);
    }
  }

  // Legacy .doc
  return extractDocLegacy(file);
}

/** Mammoth fallback — handles all possible module shapes in Next.js */
async function extractWithMammothFallback(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const mod = await import('mammoth');
    // mammoth can expose its API as default, named, or nested default
    const mammoth = (mod as any).default ?? mod;
    const fn =
      mammoth.convertArrayBuffer ??
      mammoth.default?.convertArrayBuffer;

    if (typeof fn !== 'function') {
      throw new Error('mammoth API not available');
    }

    const result = await fn({ arrayBuffer });
    return (result.value as string) || '';
  } catch (err) {
    throw new Error(
      `Gagal membaca file Word: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// ── Generic Extractor ─────────────────────────────────────────────────────────
export async function extractTextFromFile(file: File): Promise<string> {
  if (typeof window === 'undefined') throw new Error('Browser only');

  if (file.type === 'application/pdf') return extractTextFromPDF(file);

  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword' ||
    file.name.endsWith('.docx') ||
    file.name.endsWith('.doc')
  ) {
    return extractTextFromWord(file);
  }

  return file.text();
}

// ── Smart Summary Generator ───────────────────────────────────────────────────
/**
 * TF-IDF-style extractive summarizer.
 * Scores each sentence by keyword frequency + position + length.
 * Returns top-N sentences in original order with metadata.
 */
export function generateSummary(content: string, title?: string): string {
  if (!content || content.trim().length === 0) return '';

  const cleaned = content
    .replace(/\r\n/g, '\n')
    .replace(/\[Halaman \d+\]/g, '')   // strip page markers
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // ── Split into sentences ────────────────────────────────────────────────
  const raw = cleaned
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (raw.length === 0) {
    return (title ? `📄 ${title}\n\n` : '') + cleaned.slice(0, 600) + (cleaned.length > 600 ? '…' : '');
  }
  if (raw.length <= 3) {
    return (title ? `📄 ${title}\n\n` : '') + raw.join(' ');
  }

  // ── Stop words (Indonesian + English) ──────────────────────────────────
  const stopWords = new Set([
    'yang','dan','di','ke','dari','ini','itu','dengan','untuk','adalah','pada',
    'tidak','juga','dalam','ada','akan','atau','karena','sehingga','dapat','lebih',
    'oleh','seperti','bahwa','tersebut','jika','maka','telah','sudah','sedang',
    'setelah','sebelum','antara','serta','namun','tetapi','hanya','sangat','bagi',
    'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
    'from','is','are','was','were','be','been','have','has','had','do','does',
    'did','will','would','could','should','this','that','these','those','it',
  ]);

  // Heuristic indicator words for "core points" (Bahasa Indonesia & English)
  const coreIndicators = [
    'kesimpulan', 'menyimpulkan', 'tujuan', 'hasil', 'penelitian', 'penting', 
    'utama', 'menunjukkan', 'metode', 'menemukan', 'ditemukan', 'analisis',
    'conclusion', 'summary', 'aim', 'purpose', 'result', 'research', 'important', 
    'key', 'shows', 'method', 'found', 'conclude', 'analysis'
  ];

  // ── Keyword frequency ───────────────────────────────────────────────────
  const freq = new Map<string, number>();
  const allWords = cleaned.toLowerCase().match(/[\w\u00C0-\u024F]{3,}/g) ?? [];
  for (const w of allWords) {
    if (!stopWords.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  // ── Score sentences ─────────────────────────────────────────────────────
  const n = raw.length;
  const scored = raw.map((sentence, idx) => {
    const words = sentence.toLowerCase().match(/[\w\u00C0-\u024F]{3,}/g) ?? [];
    const kwScore = words.reduce((sum, w) => sum + (freq.get(w) ?? 0), 0) / Math.max(words.length, 1);
    const posW = idx < 3 ? 2.5 : idx >= n - 3 ? 2.0 : 1.0;
    const lenW = sentence.length < 35 ? 0.3 : sentence.length > 300 ? 0.7 : 1.2;
    
    // Core indicator boost
    let indicatorBoost = 1.0;
    const lowerSentence = sentence.toLowerCase();
    for (const indicator of coreIndicators) {
      if (lowerSentence.includes(indicator)) {
        indicatorBoost += 0.5;
      }
    }

    return { sentence, score: kwScore * posW * lenW * indicatorBoost, idx };
  });

  // ── Pick top sentences ──────────────────────────────────────────────────
  const topK = Math.min(8, Math.max(3, Math.ceil(n * 0.20)));
  const chosen = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .sort((a, b) => a.idx - b.idx)
    .map((s) => s.sentence);

  // ── Format output ───────────────────────────────────────────────────────
  const header = title ? `📄 INTISARI DOKUMEN: ${title.toUpperCase()}\n\n` : '';
  const body   = chosen.map(s => `• ${s}`).join('\n\n');
  const footer = `\n\n[Diringkas secara otomatis dari ${n} kalimat · ${content.length.toLocaleString('id-ID')} karakter]`;

  return header + body + footer;
}
