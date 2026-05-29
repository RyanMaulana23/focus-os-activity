/**
 * API Route untuk AI Summarization
 * Mendukung OpenAI dan Google Gemini
 * POST /api/summarize
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SummarizationRequest, SummarizationResult } from '@/lib/types/pdf-summarizer';
import { chunkText, estimateTokenCount } from '@/lib/utils/pdf-extractor';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Configuration
const MAX_CHUNK_SIZE = 6000; // Characters per chunk untuk large documents
const SUMMARIZATION_TIMEOUT = 60000; // 60 seconds
const MAX_TEXT_LENGTH = 500000; // 500k characters max

// Helper: Clean summarization output from formatting symbols
function cleanSummarizationOutput(result: {
  summary: string;
  keyPoints: string[];
  purpose: string;
  conclusion: string;
}): {
  summary: string;
  keyPoints: string[];
  purpose: string;
  conclusion: string;
} {
  const cleanText = (text: string): string => {
    let cleaned = text;
    
    // Remove markdown formatting
    cleaned = cleaned.replace(/\*\*/g, '');          // Bold **text**
    cleaned = cleaned.replace(/\*(?!\s)/g, '');      // Bold *text*
    cleaned = cleaned.replace(/__/g, '');            // Bold __text__
    cleaned = cleaned.replace(/_(?!\s)/g, '');       // Italic _text_
    cleaned = cleaned.replace(/`{3}[\s\S]*?`{3}/g, '');  // Code blocks
    cleaned = cleaned.replace(/`(?!=)/g, '');        // Inline code
    cleaned = cleaned.replace(/~~/g, '');            // Strikethrough
    
    // Remove bullet points and symbols at start of lines
    cleaned = cleaned.replace(/^\s*[•\-*#]\s+/gm, '');
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');
    
    // Clean whitespace
    cleaned = cleaned.replace(/\n{2,}/g, '\n');      // Multiple newlines
    cleaned = cleaned.replace(/\s{2,}/g, ' ');       // Multiple spaces
    
    return cleaned.trim();
  };

  return {
    summary: cleanText(result.summary),
    keyPoints: result.keyPoints.map(cleanText).filter(kp => kp.length > 0),
    purpose: cleanText(result.purpose),
    conclusion: cleanText(result.conclusion),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SummarizationRequest = await request.json();
    const { text, pageCount, fileName, aiProvider = 'openai' } = body;

    // Validasi input
    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Text tidak boleh kosong' },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { 
          error: `Text terlalu panjang (max ${MAX_TEXT_LENGTH} characters)`,
          maxLength: MAX_TEXT_LENGTH,
          currentLength: text.length
        },
        { status: 400 }
      );
    }

    // Check API key berdasarkan provider
    if (aiProvider === 'openai' && !OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key tidak dikonfigurasi' },
        { status: 500 }
      );
    }

    if (aiProvider === 'gemini' && !GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key tidak dikonfigurasi' },
        { status: 500 }
      );
    }

    // Summarize dengan timeout
    const result = await Promise.race([
      aiProvider === 'openai' 
        ? summarizeWithOpenAI(text, pageCount, fileName)
        : summarizeWithGemini(text, pageCount, fileName),
      timeoutPromise(SUMMARIZATION_TIMEOUT)
    ]) as SummarizationResult;

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Summarization error:', error);

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Summarization timeout, coba dengan dokumen yang lebih pendek' },
          { status: 504 }
        );
      }

      if (error.message.includes('API')) {
        return NextResponse.json(
          { error: `API Error: ${error.message}` },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Error processing summarization' },
      { status: 500 }
    );
  }
}

/**
 * Summarize dengan OpenAI GPT
 */
async function summarizeWithOpenAI(
  text: string,
  pageCount: number,
  fileName: string
): Promise<SummarizationResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const tokenCount = estimateTokenCount(text);
  const shouldChunk = tokenCount > 6000; // Approximate, adjust based on your needs

  let summary: string;
  let keyPoints: string[] = [];
  let documentPurpose: string;
  let conclusion: string;

  if (shouldChunk) {
    // Process in chunks untuk large documents
    const chunks = chunkText(text, MAX_CHUNK_SIZE);
    const chunkSummaries = await Promise.all(
      chunks.map(chunk => summarizeChunkOpenAI(chunk))
    );

    // Combine chunk summaries
    const combinedText = chunkSummaries.join('\n\n');
    const finalResult = await performSummarizationOpenAI(combinedText, true);

    summary = finalResult.summary;
    keyPoints = finalResult.keyPoints;
    documentPurpose = finalResult.purpose;
    conclusion = finalResult.conclusion;
  } else {
    // Process langsung untuk small documents
    const result = await performSummarizationOpenAI(text, false);

    summary = result.summary;
    keyPoints = result.keyPoints;
    documentPurpose = result.purpose;
    conclusion = result.conclusion;
  }

  // Clean the output to ensure pure text
  const cleaned = cleanSummarizationOutput({
    summary,
    keyPoints,
    purpose: documentPurpose,
    conclusion,
  });

  return {
    summary: cleaned.summary,
    keyPoints: cleaned.keyPoints,
    documentPurpose: cleaned.purpose,
    conclusion: cleaned.conclusion,
    provider: 'openai',
    generatedAt: new Date(),
  };
}

/**
 * Summarize chunk dengan OpenAI
 */
async function summarizeChunkOpenAI(chunk: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Ringkas teks berikut secara singkat dalam 150-200 kata:\n\n${chunk}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data: any = await response.json();
  return data.choices[0].message.content;
}

/**
 * Perform detailed summarization dengan OpenAI
 */
async function performSummarizationOpenAI(
  text: string,
  isChunked: boolean
): Promise<{
  summary: string;
  keyPoints: string[];
  purpose: string;
  conclusion: string;
}> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Analisis dokumen berikut dan berikan:
1. Ringkasan komprehensif (300-500 kata) - gunakan paragraf lengkap tanpa bullet points
2. Poin-poin kunci (3-5 poin) - setiap poin harus kalimat lengkap tanpa *, -, atau simbol
3. Tujuan dokumen (1 kalimat lengkap)
4. Kesimpulan atau rekomendasi (2-3 kalimat lengkap)

PENTING - SEMUA TEKS HARUS TEKS MURNI:
- Jangan gunakan *, -, #, >, atau simbol formatting lainnya
- Jangan gunakan bullet points, numbering, atau daftar dengan simbol
- Semua poin harus ditulis sebagai kalimat lengkap yang jelas
- Hindari HTML tags atau markdown formatting

Format response sebagai JSON dengan struktur:
{
  "summary": "Teks ringkasan dalam paragraf lengkap tanpa simbol...",
  "keyPoints": ["Poin kunci 1 sebagai kalimat lengkap", "Poin kunci 2 sebagai kalimat lengkap", "Poin kunci 3 sebagai kalimat lengkap"],
  "purpose": "Tujuan dokumen dalam kalimat lengkap...",
  "conclusion": "Kesimpulan dalam bentuk paragraf lengkap tanpa simbol..."
}

Dokumen:
${isChunked ? '(Ini adalah kombinasi dari beberapa ringkasan chunk)' : ''}
${text}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data: any = await response.json();
  const content = data.choices[0].message.content;

  // Parse JSON response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON format');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      purpose: parsed.purpose || '',
      conclusion: parsed.conclusion || '',
    };
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Summarize dengan Google Gemini
 */
async function summarizeWithGemini(
  text: string,
  pageCount: number,
  fileName: string
): Promise<SummarizationResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const tokenCount = estimateTokenCount(text);
  const shouldChunk = tokenCount > 10000; // Gemini has higher context window

  let summary: string;
  let keyPoints: string[] = [];
  let documentPurpose: string;
  let conclusion: string;

  if (shouldChunk) {
    const chunks = chunkText(text, MAX_CHUNK_SIZE);
    const chunkSummaries = await Promise.all(
      chunks.map(chunk => summarizeChunkGemini(chunk))
    );

    const combinedText = chunkSummaries.join('\n\n');
    const finalResult = await performSummarizationGemini(combinedText, true);

    summary = finalResult.summary;
    keyPoints = finalResult.keyPoints;
    documentPurpose = finalResult.purpose;
    conclusion = finalResult.conclusion;
  } else {
    const result = await performSummarizationGemini(text, false);

    summary = result.summary;
    keyPoints = result.keyPoints;
    documentPurpose = result.purpose;
    conclusion = result.conclusion;
  }

  // Clean the output to ensure pure text
  const cleaned = cleanSummarizationOutput({
    summary,
    keyPoints,
    purpose: documentPurpose,
    conclusion,
  });

  return {
    summary: cleaned.summary,
    keyPoints: cleaned.keyPoints,
    documentPurpose: cleaned.purpose,
    conclusion: cleaned.conclusion,
    provider: 'gemini',
    generatedAt: new Date(),
  };
}

async function summarizeChunkGemini(chunk: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

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
                text: `Ringkas teks berikut secara singkat dalam 150-200 kata:\n\n${chunk}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data: any = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Perform detailed summarization dengan Gemini
 */
async function performSummarizationGemini(
  text: string,
  isChunked: boolean
): Promise<{
  summary: string;
  keyPoints: string[];
  purpose: string;
  conclusion: string;
}> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = `Analisis dokumen berikut dan berikan:
1. Ringkasan komprehensif (300-500 kata) - gunakan paragraf lengkap tanpa bullet points
2. Poin-poin kunci (3-5 poin) - setiap poin harus kalimat lengkap tanpa *, -, atau simbol
3. Tujuan dokumen (1 kalimat lengkap)
4. Kesimpulan atau rekomendasi (2-3 kalimat lengkap)

PENTING - SEMUA TEKS HARUS TEKS MURNI:
- Jangan gunakan *, -, #, >, atau simbol formatting lainnya
- Jangan gunakan bullet points, numbering, atau daftar dengan simbol
- Semua poin harus ditulis sebagai kalimat lengkap yang jelas
- Hindari HTML tags atau markdown formatting

Format response sebagai JSON dengan struktur:
{
  "summary": "Teks ringkasan dalam paragraf lengkap tanpa simbol...",
  "keyPoints": ["Poin kunci 1 sebagai kalimat lengkap", "Poin kunci 2 sebagai kalimat lengkap", "Poin kunci 3 sebagai kalimat lengkap"],
  "purpose": "Tujuan dokumen dalam kalimat lengkap...",
  "conclusion": "Kesimpulan dalam bentuk paragraf lengkap tanpa simbol..."
}

Dokumen:
${isChunked ? '(Ini adalah kombinasi dari beberapa ringkasan chunk)' : ''}
${text}`;

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
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data: any = await response.json();
  const content = data.candidates[0].content.parts[0].text;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON format');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      purpose: parsed.purpose || '',
      conclusion: parsed.conclusion || '',
    };
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Timeout promise helper
 */
function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms)
  );
}
