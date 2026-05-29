import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper: Clean analysis text from markdown and HTML formatting
function cleanAnalysisText(text: string): string {
  let cleaned = text;

  // Remove markdown formatting
  cleaned = cleaned.replace(/\*\*/g, '');          // Bold **text**
  cleaned = cleaned.replace(/\*(?!\s)/g, '');      // Bold *text*
  cleaned = cleaned.replace(/__/g, '');            // Bold __text__
  cleaned = cleaned.replace(/_(?!\s)/g, '');       // Italic _text_
  cleaned = cleaned.replace(/`{3}[\s\S]*?`{3}/g, '');  // Code blocks
  cleaned = cleaned.replace(/`(?!=)/g, '');        // Inline code
  cleaned = cleaned.replace(/~~/g, '');            // Strikethrough
  cleaned = cleaned.replace(/#+\s*/gm, '');        // Headers
  cleaned = cleaned.replace(/>\s*/gm, '');         // Blockquotes
  cleaned = cleaned.replace(/\-{3,}/g, '');        // Horizontal rules
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'); // Links

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&quot;/g, '"');

  // Normalize whitespace
  cleaned = cleaned.replace(/\n{2,}/g, '\n');      // Multiple newlines
  cleaned = cleaned.replace(/\s{2,}/g, ' ');       // Multiple spaces

  return cleaned.trim();
}

// Helper: Clean analysis response object
function cleanAnalysisResponse(response: any): any {
  return {
    elements: Array.isArray(response.elements) ? response.elements.map((el: any) => ({
      name: cleanAnalysisText(el.name || ''),
      function: cleanAnalysisText(el.function || ''),
    })) : [],
    systemPurpose: cleanAnalysisText(response.systemPurpose || ''),
    academicExplanation: cleanAnalysisText(response.academicExplanation || ''),
    summary: cleanAnalysisText(response.summary || ''),
    unclearParts: cleanAnalysisText(response.unclearParts || ''),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body; // Base64 data URL

    if (!image) {
      return NextResponse.json(
        { error: 'Data gambar tidak boleh kosong' },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API Key belum dikonfigurasi di server.' },
        { status: 500 }
      );
    }

    // Extract MIME type and base64 content
    const base64Data = image.split(',')[1] || image;
    const mimeType = image.split(';')[0].split(':')[1] || 'image/png';

    // Call Google Gemini API
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
                  text: `Analisis gambar sistem, diagram, ERD, arsitektur, atau tangkapan layar antarmuka aplikasi yang diupload ini secara sangat detail. Berikan penjelasan yang terstruktur, rapi, dan mudah dipahami oleh mahasiswa dalam Bahasa Indonesia yang formal.
                  
                  INSTRUKSI PENTING - SEMUA TEKS HARUS TEKS MURNI:
                  - Jangan gunakan *, >, -, #, atau simbol formatting lainnya dalam jawaban
                  - Jangan gunakan HTML tags atau markdown formatting
                  - Semua penjelasan harus berupa teks biasa yang jelas dan akademis
                  - Hindari format seperti "- item1" atau "* item2" — gunakan kalimat lengkap
                  
                  Harap analisis dan format hasilnya menjadi JSON yang valid sesuai dengan struktur di bawah ini. Anda WAJIB menjawab kelima kriteria berikut:
                  
                  1. IDENTIFIKASI SEMUA ELEMEN/GAMBAR/KOMPONEN (elements)
                     - Sebutkan nama setiap komponen, bagian, tabel, antarmuka, tombol, atau teks penting yang terlihat pada gambar.
                     - Jelaskan fungsi rinci dari masing-masing elemen/komponen tersebut dalam konteks sistem yang digambarkan.
                     - Format: gunakan teks biasa tanpa bullet points atau simbol
                  
                  2. TUJUAN SISTEM (systemPurpose)
                     - Berdasarkan elemen-elemen tersebut, simpulkan sistem/aplikasi ini kemungkinan besar digunakan untuk apa.
                     - Jelaskan alur kerja (workflow) atau proses bisnis yang tergambar secara runtut dan jelas dalam bentuk paragraf lengkap.
                  
                  3. PENJELASAN AKADEMIS - FORMAT LAPORAN/SKRIPSI/PKL (academicExplanation)
                     - Tuliskan penjelasan teoretis, konseptual, dan fungsional dari gambar ini dalam format penulisan akademis formal.
                     - Gunakan kalimat pasif formal yang rapi, ilmiah, metodologis, namun tetap mudah dipahami.
                     - Disusun dalam 2-3 paragraf terstruktur yang mendalam, tanpa simbol atau formatting khusus.
                  
                  4. RINGKASAN EKSEKUTIF (summary)
                     - Buat kesimpulan ringkas dari diagram/gambar ini dalam bentuk paragraf singkat.
                     - Sebutkan fungsi utama sistem dan hubungan inti antar entitas/bagian.
                  
                  5. IDENTIFIKASI KETIDAKJELASAN (unclearParts)
                     - Jika ada bagian gambar, teks, relasi garis, atau detail terkecil yang buram, kurang jelas, atau tidak terbaca, sebutkan di bagian ini.
                     - Berikan asumsi akademis terbaik Anda berdasarkan elemen di sekitarnya.
                     - Jika gambar sangat bersih dan terbaca jelas semuanya, tulis: Seluruh bagian gambar terbaca dengan sangat jelas dan tajam tanpa ada ambiguitas
                  
                  Format response Anda HARUS berupa JSON murni dengan format persis seperti ini:
                  {
                    "elements": [
                      { "name": "Nama Elemen 1", "function": "Fungsi dari elemen 1 dalam sistem yang dijelaskan dalam kalimat lengkap tanpa simbol" },
                      { "name": "Nama Elemen 2", "function": "Fungsi dari elemen 2 dalam sistem yang dijelaskan dalam kalimat lengkap tanpa simbol" }
                    ],
                    "systemPurpose": "Penjelasan tujuan sistem dan alur kerja workflow secara detail dalam bentuk paragraf...",
                    "academicExplanation": "Paragraf 1 penjelasan akademis formal tanpa simbol...\\n\\nParagraf 2 penjelasan akademis formal tanpa simbol...",
                    "summary": "Ringkasan kesimpulan dan hubungan inti dalam bentuk teks murni tanpa simbol...",
                    "unclearParts": "Identifikasi bagian yang tidak terbaca jika ada atau konfirmasi kejelasan dalam teks murni..."
                  }
                  
                  SANGAT PENTING: Semua teks dalam semua field harus TEKS MURNI tanpa *, >, -, #, atau simbol formatting apapun!`,
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 2500,
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
    const contentText = data.candidates[0].content.parts[0].text;

    // Safely parse JSON from markdown code blocks
    let parsedResult;
    try {
      const jsonMatch = contentText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Objek JSON tidak ditemukan dalam respon AI');
      parsedResult = JSON.parse(jsonMatch[0]);
      // Clean the parsed result to ensure pure text
      parsedResult = cleanAnalysisResponse(parsedResult);
    } catch (e) {
      // Fallback
      console.warn('Gagal memparsing JSON dari Gemini response:', contentText);
      parsedResult = {
        elements: [
          { name: "Komponen Gambar", function: "Gagal memparsing detail elemen secara otomatis, silakan baca laporan akademis di bawah." }
        ],
        systemPurpose: "Menganalisis sistem gambar secara holistik.",
        academicExplanation: cleanAnalysisText(contentText),
        summary: "Analisis selesai dilakukan namun response tidak terformat sebagai JSON.",
        unclearParts: "Deteksi kejelasan gambar dapat dibaca pada laporan di bawah."
      };
    }

    return NextResponse.json(parsedResult);
  } catch (error: any) {
    console.error('Error in analyze route:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan internal server' },
      { status: 500 }
    );
  }
}
