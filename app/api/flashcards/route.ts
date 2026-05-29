import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Type definitions for flashcard responses
interface FlashcardItem {
  id: number;
  pertanyaan: string;
  jawaban: string;
  tingkat: 'mudah' | 'sedang' | 'sulit';
  tipe: string;
  key_point?: string;
  difficulty?: 'mudah' | 'sedang' | 'sulit';
  type?: string;
  question?: string;
  answer?: string;
}

interface GenerateResponse {
  flashcards: FlashcardItem[];
  total: number;
  sumber_materi: string;
}

interface VerifyCustomResponse {
  pertanyaan: string;
  jawaban: string;
  tingkat: 'mudah' | 'sedang' | 'sulit';
  tipe: string;
  key_point?: string;
  diluar_materi: boolean;
  catatan: string;
}

interface QuizEvaluateResponse {
  penilaian: 'benar' | 'salah';
  skor: number;
  feedback: string;
  jawaban_benar: string;
  question?: string;
  user_answer?: string;
  correct_answer?: string;
  explanation?: string;
  status?: 'benar' | 'salah';
  key_point?: string;
}

// Helper: Clean answer from HTML, markdown, and reference metadata
function cleanAnswer(answer: string): string {
  let cleaned = answer;

  // Remove all markdown formatting characters
  cleaned = cleaned.replace(/\*\*/g, '');          // Bold **text**
  cleaned = cleaned.replace(/\*(?!\s)/g, '');      // Bold *text*
  cleaned = cleaned.replace(/__/g, '');            // Bold __text__
  cleaned = cleaned.replace(/_(?!\s)/g, '');       // Italic _text_
  cleaned = cleaned.replace(/`{3}[\s\S]*?`{3}/g, '');  // Code blocks ```code```
  cleaned = cleaned.replace(/`(?!=)/g, '');        // Inline code `code`
  cleaned = cleaned.replace(/~~/g, '');            // Strikethrough ~~text~~
  cleaned = cleaned.replace(/#+\s*/gm, '');        // Headers # ## ###
  cleaned = cleaned.replace(/>\s*/gm, '');         // Blockquotes > text
  cleaned = cleaned.replace(/\-{3,}/g, '');        // Horizontal rules ---
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'); // Links [text](url)

  // Remove HTML tags and entities
  cleaned = cleaned.replace(/<[^>]*>/g, '');       // All HTML tags
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&quot;/g, '"');

  // Remove reference metadata patterns
  const lines = cleaned.split('\n');
  const filteredLines = lines.filter(line => {
    const lowerLine = line.toLowerCase().trim();
    return !(
      !lowerLine || // Skip empty lines
      lowerLine.includes('topik pembelajaran') ||
      lowerLine.includes('kategori') ||
      lowerLine.includes('materi_lengkap') ||
      lowerLine.includes('materi_') ||
      lowerLine.includes('tugas & latihan') ||
      lowerLine.includes('tugas&latihan') ||
      lowerLine.includes('tugas dan latihan') ||
      lowerLine.includes('referensi') ||
      lowerLine.includes('sumber') ||
      lowerLine.startsWith('>') ||
      /^\s*[\*\-\+]\s*$/.test(line) || // Bullet points with no text
      /^[\*\-_]{3,}$/.test(line) // Separator lines
    );
  });

  cleaned = filteredLines.join('\n').trim();

  // Normalize whitespace
  cleaned = cleaned.replace(/\n{2,}/g, '\n');      // Multiple newlines to single
  cleaned = cleaned.replace(/\s{2,}/g, ' ');       // Multiple spaces to single
  cleaned = cleaned.trim();

  // Ensure answer is not empty
  return cleaned || 'Jawaban tidak dapat diambil dari materi.';
}

// Simple helper to parse JSON from markdown code blocks
function parseJSON(text: string): Record<string, unknown> {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response');
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Failed to parse JSON from response text:', text, e);
    throw new Error('Response is not valid JSON');
  }
}

// Post-process API responses to ensure pure text answers
function sanitizeFlashcardResponse(response: GenerateResponse): GenerateResponse {
  return {
    ...response,
    flashcards: response.flashcards.map(fc => {
      const pertanyaan = fc.pertanyaan || fc.question || '';
      const jawaban = fc.jawaban || fc.answer || '';
      const tingkat = fc.tingkat || fc.difficulty || 'mudah';
      const tipe = fc.tipe || fc.type || 'definisi';
      
      return {
        ...fc,
        pertanyaan: cleanAnswer(pertanyaan),
        jawaban: cleanAnswer(jawaban),
        tingkat: tingkat as 'mudah' | 'sedang' | 'sulit',
        tipe: tipe,
        key_point: fc.key_point ? cleanAnswer(fc.key_point) : undefined,
        question: fc.question ? cleanAnswer(fc.question) : undefined,
        answer: fc.answer ? cleanAnswer(fc.answer) : undefined,
        difficulty: fc.difficulty,
        type: fc.type
      };
    }),
  };
}

function sanitizeVerifyResponse(response: VerifyCustomResponse): VerifyCustomResponse {
  return {
    ...response,
    pertanyaan: cleanAnswer(response.pertanyaan),
    jawaban: cleanAnswer(response.jawaban),
    key_point: response.key_point ? cleanAnswer(response.key_point) : undefined,
    catatan: cleanAnswer(response.catatan),
  };
}

function sanitizeQuizResponse(response: QuizEvaluateResponse): QuizEvaluateResponse {
  return {
    ...response,
    feedback: cleanAnswer(response.feedback),
    jawaban_benar: cleanAnswer(response.jawaban_benar),
    correct_answer: response.correct_answer ? cleanAnswer(response.correct_answer) : undefined,
    explanation: response.explanation ? cleanAnswer(response.explanation) : undefined,
    key_point: response.key_point ? cleanAnswer(response.key_point) : undefined,
  };
}

// Helper to clean materi content from platform UI text, paths, or guide text
function cleanMateriContent(materi: string): string {
  return materi
    .replace(/^>\s*\*+\s*/gm, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\*\*/g, '')
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase();
      
      // Include filters from system prompt requirements
      if (
        !trimmed || // Empty lines
        lower.includes('topik pembelajaran') ||
        lower.includes('kategori') ||
        lower.includes('materi_') ||
        lower.includes('ai study assistant') ||
        lower.includes('focus os') ||
        lower.includes('keterbacaan') ||
        lower.includes('waktu belajar') ||
        lower.includes('klik untuk membalik') ||
        lower.includes('flashcard kustom') ||
        lower.includes('generate ai') ||
        lower.includes('tugas & latihan') ||
        lower.includes('tugas dan latihan') ||
        lower.includes('tugas dan') ||
        lower.includes('tugas') && lower.includes('latihan') ||
        lower.includes('referensi') ||
        lower.includes('sumber') ||
        lower.includes('terima kasih') ||
        lower.includes('thank you') ||
        lower.includes('kata penutup') ||
        lower.includes('penutup') ||
        lower.includes('daftar isi') ||
        lower.includes('daftar pustaka') ||
        lower.includes('biodata') ||
        lower.includes('identitas kampus') ||
        lower.includes('identitas') ||
        lower.includes('cover') ||
        lower.includes('halaman') ||
        lower.includes('sitasi') ||
        lower.includes('citation') ||
        lower.includes('footer') ||
        lower.includes('header') ||
        lower.includes('questions & discussion') ||
        lower.includes('questions and discussion') ||
        lower.includes('nama kelompok') ||
        lower.includes('nama anggota') ||
        lower.includes('nama anggota') ||
        trimmed.startsWith('📁') ||
        /^[📁📂📄📓]/.test(trimmed) ||
        lower.includes('gunakan panel') ||
        lower.includes('widget interaktif') ||
        lower.includes('lihat materi') ||
        lower.includes('periksa kembali') ||
        lower.includes('cari pada dokumen') ||
        trimmed.length < 5
      ) {
        return false;
      }
      return true;
    })
    .join('\n');
}

// Fallback logic when Gemini API is missing or fails
function getOfflineFlashcards(materi: string, jumlah: number): GenerateResponse {
  const cleanMateri = cleanMateriContent(materi);

  const sentences = cleanMateri
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && !s.startsWith('#') && !s.includes('$$') && !s.includes('***'));

  const flashcards: FlashcardItem[] = [];
  
  // Randomized question types to ensure variety
  const questionTypes: Array<{
    q: (topic: string) => string;
    type: string;
    diff: 'mudah' | 'sedang' | 'sulit';
    answerIndex: number;
    keyPoint: string;
  }> = [
    {
      q: (t) => `Apa pengertian atau definisi dari ${t}?`,
      type: 'definisi',
      diff: 'mudah',
      answerIndex: 0,
      keyPoint: 'Pemahaman konsep dasar dan definisi utama'
    },
    {
      q: (t) => `Jelaskan proses atau langkah-langkah dalam ${t}!`,
      type: 'proses',
      diff: 'sedang',
      answerIndex: 1,
      keyPoint: 'Urutan dan tahapan pelaksanaan suatu konsep'
    },
    {
      q: (t) => `Apa tujuan atau manfaat dari ${t}?`,
      type: 'manfaat',
      diff: 'sedang',
      answerIndex: 2,
      keyPoint: 'Kegunaan praktis dan nilai penting dari konsep'
    },
    {
      q: (t) => `Sebutkan contoh penerapan atau studi kasus tentang ${t}!`,
      type: 'contoh',
      diff: 'sedang',
      answerIndex: 3,
      keyPoint: 'Aplikasi nyata dan implementasi konsep'
    },
    {
      q: (t) => `Mengapa ${t} penting dalam pembelajaran ini?`,
      type: 'analisis',
      diff: 'sulit',
      answerIndex: 4,
      keyPoint: 'Analisis mendalam tentang relevansi dan signifikansi'
    },
  ];

  // Shuffle question types for randomization
  const shuffled = [...questionTypes].sort(() => Math.random() - 0.5).slice(0, Math.min(jumlah, questionTypes.length));

  const topic = sentences[0]?.split(/\s+/).slice(0, 3).join(' ') || 'konsep ini';

  for (let i = 0; i < shuffled.length; i++) {
    const qt = shuffled[i];
    let ans = '';
    
    if (qt.answerIndex < sentences.length) {
      ans = sentences[qt.answerIndex];
    } else {
      ans = sentences[i % sentences.length] || 'Konsep ini didefinisikan dalam materi pembelajaran.';
    }
    
    // Clean the answer
    ans = cleanAnswer(ans);
    
    flashcards.push({
      id: i + 1,
      pertanyaan: qt.q(topic),
      jawaban: ans,
      tingkat: qt.diff,
      tipe: qt.type,
      key_point: qt.keyPoint,
    });
  }

  return {
    flashcards,
    total: flashcards.length,
    sumber_materi: 'Intisari materi pembelajaran (Offline Fallback Mode)',
  };
}

function offlineVerifyCustom(pertanyaan_user: string, jawaban_user: string | undefined, materi: string): VerifyCustomResponse {
  const cleanMateri = cleanMateriContent(materi).toLowerCase();
  const cleanQ = pertanyaan_user.toLowerCase();
  
  // Simple keyword matching for relevance check
  const words = cleanQ.split(/\s+/).filter(w => w.length > 4);
  const isRelevant = words.some(w => cleanMateri.includes(w)) || words.length === 0;

  let finalAnswer = jawaban_user?.trim() || '';
  let catatan = 'kosong jika tidak ada koreksi';
  let keyPoint = 'Pahami inti konsep dari materi ini';

  if (!isRelevant) {
    return {
      pertanyaan: pertanyaan_user,
      jawaban: finalAnswer || 'Pertanyaan di luar materi referensi.',
      tingkat: 'sedang',
      tipe: 'lainnya',
      key_point: 'Pastikan pertanyaan relevan dengan materi',
      diluar_materi: true,
      catatan: 'Pertanyaan tampaknya tidak berhubungan dengan materi yang diunggah.',
    };
  }

  if (!finalAnswer) {
    // Attempt to extract a matching sentence from the note content
    const sentences = cleanMateriContent(materi).split(/(?<=[.!?])\s+|\n+/).map(s => s.trim());
    const matched = sentences.find(s => words.some(w => s.toLowerCase().includes(w)));
    finalAnswer = matched || sentences[0] || 'Konsep ini didefinisikan dalam materi pembelajaran.';
    catatan = 'Jawaban otomatis dibuat berdasarkan materi referensi.';
    keyPoint = 'Inti konsep yang dijelaskan dalam materi';
  }

  // Clean the answer from any HTML, markdown, or reference metadata
  finalAnswer = cleanAnswer(finalAnswer);

  return {
    pertanyaan: pertanyaan_user,
    jawaban: finalAnswer,
    tingkat: 'sedang',
    tipe: 'definisi',
    key_point: keyPoint,
    diluar_materi: false,
    catatan,
  };
}

function offlineQuizEvaluate(pertanyaan: string, jawaban_benar: string, jawaban_user: string): QuizEvaluateResponse {
  // Clean the correct answer from metadata/HTML
  const cleanedCorrectAnswer = cleanAnswer(jawaban_benar);
  
  const cleanUser = jawaban_user.trim().toLowerCase();
  const cleanCorrect = cleanedCorrectAnswer.trim().toLowerCase();

  let status: 'benar' | 'salah' = 'salah';
  let score = 0;
  let explanation = '';
  let keyPoint = 'Pahami konsep utama dari jawaban ini';

  if (!cleanUser) {
    explanation = 'Harap tuliskan jawaban Anda terlebih dahulu.';
  } else {
    // Count matching words
    const userWords = new Set(cleanUser.split(/\s+/).filter(w => w.length > 3));
    const correctWords = cleanCorrect.split(/\s+/).filter(w => w.length > 3);
    
    if (correctWords.length === 0) {
      status = 'benar';
      score = 100;
      explanation = 'Bagus, jawaban Anda sesuai dengan materi!';
      keyPoint = 'Pemahaman Anda sudah tepat terhadap konsep ini.';
    } else {
      let matchCount = 0;
      for (const w of correctWords) {
        if (userWords.has(w)) matchCount++;
      }

      const ratio = matchCount / correctWords.length;
      if (ratio > 0.4) { // Semantic matching tolerance
        status = 'benar';
        score = 100;
        explanation = 'Hebat! Jawaban Anda sudah sesuai dengan konsep materi.';
        keyPoint = 'Anda memahami inti materi dengan baik.';
      } else {
        status = 'salah';
        score = 0;
        explanation = 'Jawaban kurang tepat berdasarkan materi. Periksa kembali konsep utama.';
        keyPoint = 'Pelajari kembali konsep: ' + cleanedCorrectAnswer.split(/\s+/).slice(0, 5).join(' ');
      }
    }
  }

  return {
    penilaian: status,
    skor: score,
    feedback: explanation,
    jawaban_benar: cleanedCorrectAnswer,
    question: pertanyaan,
    user_answer: jawaban_user,
    correct_answer: cleanedCorrectAnswer,
    explanation: explanation,
    status: status,
    key_point: keyPoint
  };
}

// Call Google Gemini API
async function callGemini(promptText: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.3,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Gagal memanggil API Gemini');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Aksi tidak ditentukan.' }, { status: 400 });
    }

    // 1. GENERATE
    if (action === 'generate') {
      const { materi, jumlah, riwayat } = body;
      if (!materi) {
        return NextResponse.json({ error: 'Materi tidak boleh kosong untuk generate.' }, { status: 400 });
      }

      const count = Number(jumlah) || 3;

      if (!GEMINI_API_KEY) {
        console.warn('API Key Gemini tidak ditemukan, menggunakan offline fallback.');
        return NextResponse.json(getOfflineFlashcards(materi, count));
      }

      const flashcardPrompt = `Kamu adalah AI Flashcard Tutor yang bertugas membuat flashcard berkualitas tinggi berdasarkan materi pembelajaran.

TUJUAN UTAMA:
- Menghasilkan pertanyaan dan jawaban yang benar-benar berasal dari inti materi user.
- Menghapus semua bagian yang tidak penting seperti: nama kelompok, nama anggota, halaman, kata penutup, terima kasih, sitasi, cover, biodata, daftar isi, identitas kampus, teks dekoratif.
- Fokus hanya pada isi pembelajaran utama.

ATURAN PENTING:
- Jawaban HARUS berupa teks isi materi.
- Jangan pernah memberi jawaban placeholder.
- Jangan pernah memberi jawaban seperti: "Gunakan AI Study Assistant", "Lihat materi", "Periksa kembali", "Cari pada dokumen"
- Jangan gunakan HTML, markdown, atau tag apapun.
- Semua jawaban harus natural, edukatif, jelas, dan sesuai konteks materi.

ATURAN GENERATE AI:
- Pertanyaan HARUS dibuat random dan berbeda setiap kali.
- Gunakan berbagai tipe pertanyaan: definisi, proses, konsep, analisis, tujuan, manfaat, kesimpulan.
- Pertanyaan harus berasal dari poin paling penting dalam materi.
- Variasikan tingkat kesulitan: mudah, sedang, sulit.

FORMAT OUTPUT (wajib JSON, tidak ada teks lain):
{
  "flashcards": [
    {
      "id": 1,
      "difficulty": "mudah | sedang | sulit",
      "type": "definisi | proses | konsep | analisis",
      "question": "Pertanyaan berdasarkan inti materi",
      "answer": "Jawaban teks berdasarkan isi materi",
      "key_point": "Poin penting dari jawaban"
    }
  ],
  "total": ${count},
  "sumber_materi": "Ringkasan topik materi dalam 1 kalimat"
}

MATERI:
"""
${materi}
"""

RIWAYAT PERTANYAAN (hindari pengulangan):
${riwayat || 'Tidak ada riwayat'}

Buatkan ${count} flashcard pembelajaran dengan:
1. Ambil hanya inti pembelajaran, abaikan metadata dan teks non-edukatif.
2. Variasikan tipe pertanyaan dan tingkat kesulitan.
3. Semua jawaban harus teks murni dari materi, ringkas (1-3 kalimat), jelas, dan sesuai konteks.
4. Isi field "key_point" dengan inti konsep yang harus dipahami user.
5. Jangan mengulang pertanyaan dari riwayat.

Kembalikan HANYA JSON tanpa teks lain.`;

      try {
        const rawResponse = await callGemini(flashcardPrompt);
        const result = parseJSON(rawResponse) as unknown as GenerateResponse;
        const sanitized = sanitizeFlashcardResponse(result);
        return NextResponse.json(sanitized);
      } catch (err) {
        console.error('Error saat menghubungi Gemini untuk generate, menggunakan offline fallback:', err);
        const offline = getOfflineFlashcards(materi, count);
        const sanitized = sanitizeFlashcardResponse(offline);
        return NextResponse.json(sanitized);
      }
    }

    // 2. VERIFY CUSTOM CARD
    if (action === 'verify_custom') {
      const { pertanyaan_user, jawaban_user, materi } = body;
      if (!pertanyaan_user || !materi) {
        return NextResponse.json({ error: 'Pertanyaan user dan materi harus disediakan.' }, { status: 400 });
      }

      if (!GEMINI_API_KEY) {
        console.warn('API Key Gemini tidak ditemukan, menggunakan offline fallback.');
        return NextResponse.json(offlineVerifyCustom(pertanyaan_user, jawaban_user, materi));
      }

      const verifyPrompt = `Kamu adalah AI Flashcard Tutor yang memvalidasi flashcard kustom berdasarkan materi.

MATERI REFERENSI:
"""
${materi}
"""

User membuat flashcard kustom:
Pertanyaan: "${pertanyaan_user}"
Jawaban (opsional): "${jawaban_user || ''}"

TUGASMU:
1. Periksa apakah pertanyaan relevan dengan materi. Jika tidak, tandai "diluar_materi": true.
2. Jika jawaban diisi: periksa kebenarannya berdasarkan materi. Koreksi jika salah.
3. Jika jawaban kosong: buatkan jawaban tepat dari materi.
4. Jangan ubah pertanyaan user kecuali ada typo — catat perbaikan di "catatan".
5. Jawaban HARUS teks murni tanpa HTML, markdown, atau simbol formatting.
6. JANGAN memberikan jawaban seperti: "Gunakan AI Study Assistant", "Lihat materi", "Periksa kembali", "Cari pada dokumen".
7. Isi field "key_point" dengan inti konsep yang harus dipahami user.

FORMAT OUTPUT (JSON):
{
  "pertanyaan": "...",
  "jawaban": "...",
  "tingkat": "mudah | sedang | sulit",
  "tipe": "definisi | proses | konsep | analisis | tujuan | manfaat | kesimpulan | lainnya",
  "key_point": "Inti konsep yang harus dipahami",
  "diluar_materi": false,
  "catatan": "kosong jika tidak ada koreksi"
}

Kembalikan HANYA JSON tanpa teks lain.`;

      try {
        const rawResponse = await callGemini(verifyPrompt);
        const result = parseJSON(rawResponse) as unknown as VerifyCustomResponse;
        const sanitized = sanitizeVerifyResponse(result);
        return NextResponse.json(sanitized);
      } catch (err) {
        console.error('Error saat menghubungi Gemini untuk verify_custom, menggunakan offline fallback:', err);
        const offline = offlineVerifyCustom(pertanyaan_user, jawaban_user, materi);
        const sanitized = sanitizeVerifyResponse(offline);
        return NextResponse.json(sanitized);
      }
    }

    // 3. QUIZ EVALUATE
    if (action === 'quiz_evaluate') {
      const { pertanyaan, jawaban_benar, jawaban_user } = body;
      if (!pertanyaan || !jawaban_benar) {
        return NextResponse.json({ error: 'Pertanyaan dan jawaban benar harus disediakan.' }, { status: 400 });
      }

      if (!GEMINI_API_KEY) {
        console.warn('API Key Gemini tidak ditemukan, menggunakan offline fallback.');
        return NextResponse.json(offlineQuizEvaluate(pertanyaan, jawaban_benar, jawaban_user || ''));
      }

      const quizPrompt = `Kamu adalah AI Flashcard Tutor yang mengevaluasi jawaban quiz berdasarkan materi.

User menjawab quiz:
Pertanyaan: "${pertanyaan}"
Jawaban benar (referensi): "${jawaban_benar}"
Jawaban user: "${jawaban_user || ''}"

TUGASMU:
1. Bandingkan jawaban user dengan jawaban benar menggunakan semantic matching.
2. Jika jawaban mengandung inti materi atau mirip secara konsep → BENAR.
3. Status: "benar" atau "salah" (bukan sebagian_benar).
4. Penjelasan singkat (1-2 kalimat) berdasarkan materi.
5. Semua jawaban harus teks murni tanpa HTML, markdown, atau simbol formatting.
6. JANGAN memberikan jawaban seperti: "Gunakan AI Study Assistant", "Lihat materi", "Cek kembali".
7. Isi field "key_point" dengan inti konsep yang harus dipahami.

FORMAT OUTPUT (JSON):
{
  "question": "${pertanyaan}",
  "user_answer": "${jawaban_user || ''}",
  "correct_answer": "Jawaban benar dari materi (teks murni)",
  "explanation": "Penjelasan singkat (teks murni)",
  "key_point": "Inti konsep yang diharapkan dipahami",
  "status": "benar | salah"
}

Kembalikan HANYA JSON tanpa teks lain.`;

      try {
        const rawResponse = await callGemini(quizPrompt);
        const result = parseJSON(rawResponse) as any;
        
        // Map user required format to both format structures (frontend + user requirements)
        const mappedResult: QuizEvaluateResponse = {
          penilaian: result.status === 'benar' ? 'benar' : 'salah',
          skor: result.status === 'benar' ? 100 : 0,
          feedback: result.explanation || '',
          jawaban_benar: result.correct_answer || '',
          question: result.question || pertanyaan,
          user_answer: result.user_answer || jawaban_user,
          correct_answer: result.correct_answer || '',
          explanation: result.explanation || '',
          status: result.status || 'salah',
          key_point: result.key_point || ''
        };

        const sanitized = sanitizeQuizResponse(mappedResult);
        return NextResponse.json(sanitized);
      } catch (err) {
        console.error('Error saat menghubungi Gemini untuk quiz_evaluate, menggunakan offline fallback:', err);
        const offline = offlineQuizEvaluate(pertanyaan, jawaban_benar, jawaban_user || '');
        const sanitized = sanitizeQuizResponse(offline);
        return NextResponse.json(sanitized);
      }
    }

    return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server internal.';
    console.error('Error in flashcards endpoint:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
