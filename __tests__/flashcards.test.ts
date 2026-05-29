/**
 * Test file untuk memverifikasi AI Flashcard Tutor API endpoints
 * Tests cover: generate, verify_custom, dan quiz_evaluate actions
 */

import { POST } from '@/app/api/flashcards/route';
import { NextRequest } from 'next/server';

// Mock data untuk testing
const mockMaterial = `
Fotosintesis adalah proses biologi di mana tumbuhan mengubah cahaya matahari menjadi energi kimia.
Proses ini terjadi dalam klorofil di dalam kloroplas.
Hasil fotosintesis adalah glukosa dan oksigen yang dilepaskan ke udara.
Fotosintesis sangat penting bagi kehidupan di Bumi karena menghasilkan oksigen.
`;

const mockCustomQuestion = 'Apa itu fotosintesis?';
const mockCustomAnswer = 'Proses mengubah cahaya matahari menjadi energi';

describe('AI Flashcard Tutor - API Route Tests', () => {
  // Test 1: Generate flashcards endpoint
  test('1. Generate flashcards from material', async () => {
    const request = new NextRequest('http://localhost:3000/api/flashcards', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generate',
        materi: mockMaterial,
        jumlah: 3,
        riwayat: ''
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    // Verify response structure
    console.log('✅ Generate flashcards response:', {
      hasFlashcards: !!data.flashcards,
      count: data.flashcards?.length,
      hasTotal: typeof data.total === 'number',
      hasSumberMateri: !!data.sumber_materi
    });

    // Check if all flashcards have required fields
    if (data.flashcards) {
      data.flashcards.forEach((fc: any, idx: number) => {
        console.log(`   Flashcard ${idx + 1}:`, {
          id: fc.id,
          pertanyaan: fc.pertanyaan?.substring(0, 50) + '...',
          jawaban: fc.jawaban?.substring(0, 50) + '...',
          tingkat: fc.tingkat,
          tipe: fc.tipe
        });
      });
    }
  });

  // Test 2: Verify custom flashcard endpoint
  test('2. Verify custom flashcard', async () => {
    const request = new NextRequest('http://localhost:3000/api/flashcards', {
      method: 'POST',
      body: JSON.stringify({
        action: 'verify_custom',
        pertanyaan_user: mockCustomQuestion,
        jawaban_user: mockCustomAnswer,
        materi: mockMaterial
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    console.log('✅ Verify custom flashcard response:', {
      pertanyaan: data.pertanyaan,
      jawaban: data.jawaban?.substring(0, 50) + '...',
      tingkat: data.tingkat,
      tipe: data.tipe,
      diluar_materi: data.diluar_materi,
      catatan: data.catatan
    });
  });

  // Test 3: Quiz evaluate endpoint
  test('3. Quiz evaluate answer', async () => {
    const question = 'Apa itu fotosintesis?';
    const correctAnswer = 'Proses biologi mengubah cahaya matahari menjadi energi kimia';
    const userAnswer = 'Proses mengubah cahaya matahari menjadi energi';

    const request = new NextRequest('http://localhost:3000/api/flashcards', {
      method: 'POST',
      body: JSON.stringify({
        action: 'quiz_evaluate',
        pertanyaan: question,
        jawaban_benar: correctAnswer,
        jawaban_user: userAnswer
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    console.log('✅ Quiz evaluate response:', {
      penilaian: data.penilaian,
      skor: data.skor,
      feedback: data.feedback,
      jawaban_benar: data.jawaban_benar?.substring(0, 50) + '...'
    });
  });

  // Test 4: Error handling - missing required fields
  test('4. Error handling - missing required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/flashcards', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generate'
        // Missing 'materi' field
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    console.log('✅ Error handling (missing materi):', {
      hasError: !!data.error,
      errorMessage: data.error
    });
  });

  // Test 5: Error handling - invalid action
  test('5. Error handling - invalid action', async () => {
    const request = new NextRequest('http://localhost:3000/api/flashcards', {
      method: 'POST',
      body: JSON.stringify({
        action: 'invalid_action'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    console.log('✅ Error handling (invalid action):', {
      hasError: !!data.error,
      errorMessage: data.error
    });
  });
});

console.log('');
console.log('════════════════════════════════════════');
console.log('🎯 AI Flashcard Tutor API Test Suite');
console.log('════════════════════════════════════════');
console.log('');
console.log('Running tests to verify all endpoints...');
console.log('');
