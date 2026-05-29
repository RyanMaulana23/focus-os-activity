#!/usr/bin/env node

/**
 * Integration Test untuk AI Flashcard Tutor API
 * Run: node scripts/test-flashcards-api.js
 */

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
}

// Sample material for testing
const SAMPLE_MATERIAL = `
Fotosintesis adalah proses biokimia yang mengubah cahaya matahari menjadi energi kimia dalam bentuk glukosa.
Proses ini terjadi di dalam kloroplas, terutama di jaringan mesofil daun.
Klorofil adalah pigmen hijau yang bertanggung jawab untuk menangkap energi cahaya.
Reaksi fotosintesis terbagi menjadi dua tahap: reaksi terang dan reaksi gelap.
Dalam reaksi terang, energi cahaya diubah menjadi ATP dan NADPH.
Dalam reaksi gelap (Siklus Calvin), ATP dan NADPH digunakan untuk membuat glukosa dari CO2.
Persamaan keseluruhan fotosintesis: 6CO2 + 6H2O + cahaya → C6H12O6 + 6O2
Fotosintesis sangat penting untuk mempertahankan kehidupan di Bumi karena menghasilkan oksigen dan makanan.
`;

async function testEndpoint(action, payload, testName, expectError = false) {
  try {
    log(`\n📝 ${testName}`, 'cyan');
    log('─'.repeat(60), 'cyan');

    const response = await fetch('http://localhost:3000/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // If we expect an error, check if we got one
    if (expectError) {
      if (!response.ok && data.error) {
        log(`✓ SUCCESS (Error handling as expected)`, 'green');
        log(`Error: ${data.error}`, 'blue');
        return { success: true, data };
      } else {
        log(`✗ FAILED: Expected error but got success`, 'red');
        return false;
      }
    }

    // Otherwise, expect success
    if (!response.ok) {
      log(`✗ FAILED: HTTP ${response.status}`, 'red');
      log(`Error: ${JSON.stringify(data, null, 2)}`, 'red');
      return false;
    }

    log(`✓ SUCCESS`, 'green');
    log(`Response: ${JSON.stringify(data, null, 2)}`, 'blue');

    return { success: true, data };
  } catch (error) {
    log(`✗ ERROR: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('\n════════════════════════════════════════════════════════════', 'cyan');
  log('  🎯 AI FLASHCARD TUTOR - INTEGRATION TEST SUITE', 'cyan');
  log('════════════════════════════════════════════════════════════\n', 'cyan');

  const tests = [
    {
      name: 'Test 1: Generate Flashcards (3 cards)',
      payload: {
        action: 'generate',
        materi: SAMPLE_MATERIAL,
        jumlah: 3,
        riwayat: ''
      },
      expectError: false
    },
    {
      name: 'Test 2: Verify Custom Flashcard (On Material)',
      payload: {
        action: 'verify_custom',
        pertanyaan_user: 'Apa itu fotosintesis?',
        jawaban_user: 'Proses mengubah cahaya menjadi energi',
        materi: SAMPLE_MATERIAL
      },
      expectError: false
    },
    {
      name: 'Test 3: Verify Custom Flashcard (Out of Material)',
      payload: {
        action: 'verify_custom',
        pertanyaan_user: 'Apa ibukota Indonesia?',
        jawaban_user: 'Jakarta',
        materi: SAMPLE_MATERIAL
      },
      expectError: false
    },
    {
      name: 'Test 4: Quiz Evaluate (Correct Answer)',
      payload: {
        action: 'quiz_evaluate',
        pertanyaan: 'Apa itu fotosintesis?',
        jawaban_benar: 'Proses mengubah cahaya matahari menjadi energi kimia',
        jawaban_user: 'Proses mengubah cahaya menjadi energi kimia'
      },
      expectError: false
    },
    {
      name: 'Test 5: Quiz Evaluate (Partial Answer)',
      payload: {
        action: 'quiz_evaluate',
        pertanyaan: 'Apa itu fotosintesis?',
        jawaban_benar: 'Proses mengubah cahaya matahari menjadi energi kimia dalam bentuk glukosa',
        jawaban_user: 'Proses mengubah cahaya'
      },
      expectError: false
    },
    {
      name: 'Test 6: Quiz Evaluate (Wrong Answer)',
      payload: {
        action: 'quiz_evaluate',
        pertanyaan: 'Apa itu fotosintesis?',
        jawaban_benar: 'Proses mengubah cahaya matahari menjadi energi kimia',
        jawaban_user: 'Proses pernapasan tumbuhan'
      },
      expectError: false
    },
    {
      name: 'Test 7: Error Handling (Missing materi)',
      payload: {
        action: 'generate',
        jumlah: 3
      },
      expectError: true
    },
    {
      name: 'Test 8: Error Handling (Invalid action)',
      payload: {
        action: 'invalid_action'
      },
      expectError: true
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await testEndpoint(test.payload.action, test.payload, test.name, test.expectError || false);
    if (result && result.success) {
      passed++;
    } else {
      failed++;
    }
    // Add small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  log('\n════════════════════════════════════════════════════════════', 'cyan');
  log('  📊 TEST SUMMARY', 'cyan');
  log('════════════════════════════════════════════════════════════', 'cyan');
  log(`Total Tests: ${tests.length}`, 'blue');
  log(`✓ Passed: ${passed}`, 'green');
  log(`✗ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`, passed === tests.length ? 'green' : 'yellow');
  log('\n═══════════════════════════════════════════════════════════════\n', 'cyan');

  if (failed > 0) {
    log('⚠️  Some tests failed. Please check the errors above.', 'yellow');
    process.exit(1);
  } else {
    log('✓ All tests passed! API is working correctly.', 'green');
    process.exit(0);
  }
}

// Check if server is running
log('\n⏳ Checking if development server is running on http://localhost:3000...', 'yellow');
fetch('http://localhost:3000')
  .then(() => {
    runTests();
  })
  .catch(() => {
    log('\n✗ ERROR: Development server not found!', 'red');
    log('Please run: npm run dev', 'yellow');
    log('Then run this test script again in another terminal.', 'yellow');
    process.exit(1);
  });
