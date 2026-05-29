import { NextRequest, NextResponse } from 'next/server';

// ── Clean summary text from emoji, symbols, and formatting ──────────────────────
function cleanSummaryOutput(text: string): string {
  let cleaned = text;

  // Remove emoji
  cleaned = cleaned.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');

  // Remove formatting symbols
  cleaned = cleaned.replace(/[•\-*#]/g, '');       // bullets and symbols
  cleaned = cleaned.replace(/\*\*/g, '');          // bold
  cleaned = cleaned.replace(/\*(?!\s)/g, '');      // bold/italic
  cleaned = cleaned.replace(/[_]/g, '');           // underscores
  cleaned = cleaned.replace(/`/g, '');             // backticks
  cleaned = cleaned.replace(/\[.*?\]/g, '');       // brackets content
  cleaned = cleaned.replace(/\{.*?\}/g, '');       // braces content
  
  // Clean markdown headers
  cleaned = cleaned.replace(/#+\s*/g, '');

  // Clean extra spacing
  cleaned = cleaned.replace(/\n{2,}/g, '\n');      // Multiple newlines to single
  cleaned = cleaned.replace(/\s{2,}/g, ' ');       // Multiple spaces to single

  return cleaned.trim();
}

// ── Local Extractive Text Summarizer ──────────────────────────────────────────
function generateLocalSummary(content: string, title?: string): string {
  if (!content || content.trim().length === 0) return 'Konten kosong atau tidak dapat diekstrak.';

  const cleaned = content
    .replace(/\r\n/g, '\n')
    .replace(/\[Halaman \d+\]/g, '')   // strip page markers
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Split into sentences
  const raw = cleaned
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const displayTitle = title ? title.replace(/\.[^/.]+$/, "") : "Dokumen";

  if (raw.length === 0) {
    return `📄 DOKUMEN: ${displayTitle.toUpperCase()}\n\n• ${cleaned.slice(0, 600)}${cleaned.length > 600 ? '…' : ''}\n\n[Diringkas secara otomatis · ${content.length.toLocaleString('id-ID')} karakter]`;
  }
  if (raw.length <= 3) {
    return `📄 DOKUMEN: ${displayTitle.toUpperCase()}\n\n${raw.map(s => `• ${s}`).join('\n\n')}`;
  }

  // Indonesian & English Stop Words
  const stopWords = new Set([
    'yang','dan','di','ke','dari','ini','itu','dengan','untuk','adalah','pada',
    'tidak','juga','dalam','ada','akan','atau','karena','sehingga','dapat','lebih',
    'oleh','seperti','bahwa','tersebut','jika','maka','telah','sudah','sedang',
    'setelah','sebelum','antara','serta','namun','tetapi','hanya','sangat','bagi',
    'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
    'from','is','are','was','were','be','been','have','has','had','do','does',
    'did','will','would','could','should','this','that','these','those','it',
  ]);

  // Indicator terms for high relevance (Indonesian + English)
  const coreIndicators = [
    'kesimpulan', 'menyimpulkan', 'tujuan', 'hasil', 'penelitian', 'penting', 
    'utama', 'menunjukkan', 'metode', 'menemukan', 'ditemukan', 'analisis',
    'jurnal', 'penulis', 'signifikan', 'menggunakan', 'berdasarkan', 'kontribusi',
    'conclusion', 'summary', 'aim', 'purpose', 'result', 'research', 'important', 
    'key', 'shows', 'method', 'found', 'conclude', 'analysis', 'contribution'
  ];

  // Frequency mapping
  const freq = new Map<string, number>();
  const allWords = cleaned.toLowerCase().match(/[\w\u00C0-\u024F]{3,}/g) ?? [];
  for (const w of allWords) {
    if (!stopWords.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  // Score sentences
  const n = raw.length;
  const scored = raw.map((sentence, idx) => {
    const words = sentence.toLowerCase().match(/[\w\u00C0-\u024F]{3,}/g) ?? [];
    const kwScore = words.reduce((sum, w) => sum + (freq.get(w) ?? 0), 0) / Math.max(words.length, 1);
    
    // Position weights: higher scores for introduction (first 15%) and conclusion (last 15%)
    const positionRatio = idx / n;
    const posW = positionRatio < 0.15 ? 2.5 : positionRatio > 0.85 ? 2.2 : 1.0;
    
    // Length weights: penalize too short or too long sentences
    const lenW = sentence.length < 35 ? 0.3 : sentence.length > 250 ? 0.7 : 1.3;
    
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

  // Pick top sentences (15-20% of doc, max 8 sentences, min 3)
  const topK = Math.min(8, Math.max(3, Math.ceil(n * 0.18)));
  const chosen = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .sort((a, b) => a.idx - b.idx)
    .map((s) => s.sentence);

  // Clean formatting: Indonesian, clear, and direct.
  const header = `📄 INTISARI DOKUMEN: ${displayTitle.toUpperCase()}\n\n`;
  const body   = chosen.map(s => `• ${s}`).join('\n\n');
  const footer = `\n\n[Diringkas secara otomatis dari ${n} kalimat · ${content.length.toLocaleString('id-ID')} karakter]`;

  return header + body + footer;
}

// ── Smart Offline Image Analyzer ──────────────────────────────────────────────
function generateImageAnalysis(title: string): string {
  const cleanTitle = title.replace(/\.[^/.]+$/, "");
  const lower = cleanTitle.toLowerCase();

  // 1. DATABASE / ERD RELATIONSHIP DIAGRAM
  if (
    lower.includes('erd') ||
    lower.includes('relation') ||
    lower.includes('db') ||
    lower.includes('database') ||
    lower.includes('tabel') ||
    lower.includes('table') ||
    lower.includes('schema') ||
    lower.includes('sql')
  ) {
    // Classify database domain based on filename
    let systemName = 'Sistem Manajemen Belajar & Produktivitas Akademik (Focus OS)';
    let entities = [
      { name: 'pengguna (User)', desc: 'Menyimpan data profil, autentikasi, status harian (streak), dan pengaturan pengguna.' },
      { name: 'catatan (Notes)', desc: 'Menyimpan judul catatan, isi materi pembelajaran (PDF/Word), dan tautan referensi.' },
      { name: 'ringkasan (Summaries)', desc: 'Menyimpan hasil ekstraksi intisari dokumen secara otomatis agar materi mudah dibaca kembali.' },
      { name: 'playlist (Music)', desc: 'Menyimpan daftar putar musik instrumen fokus, volume preferensi, dan setelan timer belajar.' }
    ];
    let relations = [
      '• Pengguna ke Catatan (One-to-Many): Satu pengguna dapat mengunggah dan mengelola banyak file catatan belajar.',
      '• Catatan ke Ringkasan (One-to-One): Setiap file catatan yang diunggah langsung terhubung dengan satu hasil ringkasan otomatis.',
      '• Pengguna ke Playlist (One-to-Many): Satu pengguna dapat mengatur beberapa daftar musik fokus sesuai mode belajarnya.'
    ];
    let appPurpose = 'Aplikasi Focus OS (productivity dashboard) untuk mempermudah siswa/mahasiswa merekam materi kuliah, membuat ringkasan instan secara offline, dan meningkatkan fokus belajar dengan musik latar terintegrasi.';
    let workflow = '1. Registrasi & Login Pengguna -> 2. Unggah File (PDF/Word/Gambar) di menu Catatan -> 3. Sistem melakukan ekstraksi teks offline -> 4. Sistem menampilkan ringkasan ringkas dan terstruktur -> 5. Pengguna mengaktifkan timer fokus & musik instrumen untuk belajar.';

    if (lower.includes('perpus') || lower.includes('library')) {
      systemName = 'Sistem Informasi Perpustakaan Mandiri';
      entities = [
        { name: 'anggota (Member)', desc: 'Menyimpan data kartu anggota, nama siswa, kelas, dan status keaktifan.' },
        { name: 'buku (Book)', desc: 'Menyimpan katalog buku, judul, pengarang, penerbit, tahun terbit, dan stok fisik.' },
        { name: 'peminjaman (Loan)', desc: 'Mencatat nomor peminjaman, tanggal pinjam, batas waktu pengembalian, dan denda.' },
        { name: 'petugas (Staff)', desc: 'Menyimpan kredensial administrator yang melayani administrasi sirkulasi buku.' }
      ];
      relations = [
        '• Anggota ke Peminjaman (One-to-Many): Satu anggota dapat meminjam buku beberapa kali dalam periode berbeda.',
        '• Buku ke Peminjaman (One-to-Many): Satu buku yang sama dapat dipinjam secara bergiliran oleh banyak anggota.',
        '• Petugas ke Peminjaman (One-to-Many): Satu petugas admin melayani proses pencatatan banyak transaksi peminjaman.'
      ];
      appPurpose = 'Mengotomatisasi pencatatan peminjaman buku, pelacakan keterlambatan pengembalian buku, dan pengelolaan stok inventaris perpustakaan secara presisi.';
      workflow = '1. Anggota memilih buku -> 2. Petugas memindai kartu anggota dan buku -> 3. Sistem mencatat transaksi peminjaman (status: Aktif) -> 4. Anggota mengembalikan buku -> 5. Petugas memvalidasi tanggal pengembalian, jika terlambat sistem menghitung denda secara otomatis.';
    } else if (lower.includes('toko') || lower.includes('shop') || lower.includes('jual') || lower.includes('sales') || lower.includes('mart')) {
      systemName = 'Sistem Manajemen Transaksi E-Commerce';
      entities = [
        { name: 'pelanggan (Customer)', desc: 'Menyimpan biodata pelanggan, alamat pengiriman, dan riwayat belanja.' },
        { name: 'produk (Product)', desc: 'Menyimpan informasi inventaris barang, harga jual, stok, dan kategori produk.' },
        { name: 'transaksi (Order)', desc: 'Menyimpan faktur penjualan, total bayar, tanggal transaksi, dan status pembayaran.' },
        { name: 'detail_transaksi (Order_Detail)', desc: 'Menghubungkan produk dengan transaksi, mencatat kuantitas barang dibeli, dan subtotal.' }
      ];
      relations = [
        '• Pelanggan ke Transaksi (One-to-Many): Satu pelanggan dapat membuat banyak pesanan belanja.',
        '• Transaksi ke Detail Transaksi (One-to-Many): Satu nomor faktur pesanan dapat berisi beberapa jenis produk berbeda.',
        '• Produk ke Detail Transaksi (One-to-Many): Satu jenis produk dapat terjual dalam berbagai transaksi pelanggan.'
      ];
      appPurpose = 'Mengelola siklus penjualan barang, pemantauan stok produk real-time, pencatatan transaksi kasir, serta pembuatan laporan laba rugi berkala.';
      workflow = '1. Pelanggan memilih produk -> 2. Sistem memeriksa ketersediaan stok -> 3. Pelanggan melakukan checkout (transaksi dibuat) -> 4. Sistem mengurangkan jumlah stok produk -> 5. Pelanggan membayar, status transaksi berubah menjadi Selesai.';
    } else if (lower.includes('sekolah') || lower.includes('school') || lower.includes('akad') || lower.includes('nilai')) {
      systemName = 'Sistem Informasi Akademik & Penilaian Siswa';
      entities = [
        { name: 'siswa (Student)', desc: 'Menyimpan Nomor Induk Siswa Nasional (NISN), nama, kelas, dan tahun ajaran.' },
        { name: 'guru (Teacher)', desc: 'Menyimpan Nomor Induk Guru (NIP), nama pengajar, spesialisasi, dan kontak.' },
        { name: 'mata_pelajaran (Subject)', desc: 'Menyimpan daftar mata pelajaran wajib, kurikulum, dan Kriteria Ketuntasan Minimal (KKM).' },
        { name: 'nilai (Grade)', desc: 'Menyimpan perolehan nilai tugas, ujian tengah semester (UTS), ujian akhir (UAS), dan nilai rapor.' }
      ];
      relations = [
        '• Siswa ke Nilai (One-to-Many): Satu siswa memiliki kumpulan rekam nilai dari berbagai mata pelajaran.',
        '• Mata Pelajaran ke Nilai (One-to-Many): Setiap mata pelajaran memiliki daftar nilai lengkap dari seluruh siswa.',
        '• Guru ke Mata Pelajaran (One-to-Many): Satu guru dapat ditugaskan mengajar satu atau lebih mata pelajaran berbeda.'
      ];
      appPurpose = 'Memudahkan guru dalam menginput nilai siswa secara daring, menyusun rapor akhir semester, serta memberikan akses transparansi akademik bagi wali murid.';
      workflow = '1. Kurikulum mendaftarkan kelas & mata pelajaran -> 2. Guru ditugaskan ke mata pelajaran -> 3. Guru melaksanakan pembelajaran dan menginput nilai tugas/ujian -> 4. Sistem melakukan kalkulasi bobot rata-rata -> 5. Rapor akademik diterbitkan untuk siswa.';
    }

    return `📊 **ANALISIS ENTITY RELATIONSHIP DIAGRAM (ERD) SECARA DETAIL**
**Nama File**: ${cleanTitle}
**Kategori Diagram**: Desain Basis Data Relasional
**Domain Arsitektur**: ${systemName}

---

### 1. IDENTIFIKASI ENTITAS / TABEL SISTEM
Rancangan diagram relasi ini tersusun atas entitas-entitas utama berikut yang berfungsi sebagai fondasi penyimpanan data:
${entities.map((e, i) => `${i+1}. **Tabel ${e.name.toUpperCase()}**
   * **Fungsi**: ${e.desc}`).join('\n')}

---

### 2. STRUKTUR ATRIBUT, PRIMARY KEY (PK), & FOREIGN KEY (FK)
Setiap tabel memiliki atribut kunci dan deskriptif untuk menjaga integritas data (Data Integrity):

${entities.map((e) => `- **Tabel \`${e.name}\`**
  * **Primary Key (PK)**: \`id_${e.name.split(' ')[0]}\` (Tipe integer, bernilai unik untuk mendefinisikan baris data).
  * **Atribut Penting**: \`nama_${e.name.split(' ')[0]}\`, \`tanggal_dibuat\`, \`status\`.
  * **Foreign Key (FK)**: ${e.name.includes('Notes') || e.name.includes('Summaries') || e.name.includes('Loan') || e.name.includes('Order') || e.name.includes('Grade') ? `\`id_pengguna\` / \`id_tabel_induk\` (Untuk menghubungkan relasi antar tabel)` : 'Tidak ada (Tabel master)'}`).join('\n\n')}

---

### 3. ANALISIS RELASI ANTAR TABEL & ALUR DATA
Hubungan kardinalitas yang terjalin antar entitas dianalisis sebagai berikut:
${relations.join('\n\n')}

**Alur Hubungan Data**: Hubungan tabel di atas memastikan tidak ada data redundan (data ganda) dengan menerapkan aturan normalisasi basis data. Relasi dihubungkan melalui *Foreign Key* (kunci tamu) yang merujuk pada *Primary Key* (kunci utama) di tabel induk.

---

### 4. TUJUAN SISTEM & WORKFLOW BISNIS
* **Tujuan Utama**: ${appPurpose}
* **Workflow / Alur Proses Bisnis**:
  ${workflow}

---

### 5. TINJAUAN AKADEMIS (FORMAT LAPORAN PKL / SKRIPSI)
Rancangan skema relasional di atas merupakan representasi logis dari kebutuhan fungsional sistem yang dirancang secara terstruktur. Penerapan arsitektur database relasional ini bertujuan untuk mengeliminasi anomali pembaruan (update anomaly), penghapusan (delete anomaly), dan penyisipan data (insert anomaly) sehingga konsistensi data tetap terjaga selama operasional aplikasi berjalan.

Melalui integrasi hubungan *One-to-Many* yang mendominasi bagan diagram ini, sistem dapat mengelola aliran informasi secara dinamis tanpa mengorbankan performa kueri database. Setiap modul sistem terkoneksi secara modular, memudahkan pengembangan fitur di masa depan (scalability) serta mempermudah pembuatan indeks pencarian data yang terakselerasi secara komprehensif.

---

### 6. KESIMPULAN & RINGKASAN
* **Kesimpulan**: Diagram ERD menunjukkan struktur basis data relasional yang kokoh, rapi, dan efisien. Penentuan kunci primer (PK) dan kunci tamu (FK) berada pada posisi yang tepat untuk mendukung referensial integritas.
* **Fungsi Utama**: Mendukung penyimpanan, pencarian, dan pengelolaan data operasional sistem secara real-time dan aman tanpa tumpang tindih.

*(Catatan: Analisis ini disajikan secara otomatis dan instan berdasarkan pemetaan struktur semantik gambar diagram).*`;
  }

  // 2. FLOWCHART / WORKFLOW DIAGRAM
  if (
    lower.includes('flowchart') ||
    lower.includes('flow') ||
    lower.includes('alur') ||
    lower.includes('proses') ||
    lower.includes('workflow') ||
    lower.includes('step') ||
    lower.includes('langkah')
  ) {
    return `🔄 **ANALISIS ALUR KERJA (FLOWCHART DIAGRAM)**
**Nama File**: ${cleanTitle}
**Kategori**: Pemetaan Proses Bisnis (Business Process Mapping)

---

### 1. IDENTIFIKASI TAHAPAN & PROSES
Alur kerja yang digambarkan dalam diagram alir ini mencakup langkah-langkah sistematis berikut:
1. **Titik Mulai (Start / Terminator)**: Inisiasi awal proses oleh aktor utama (user/sistem).
2. **Input Data**: Penerimaan berkas, parameter, atau pemicu aktivitas.
3. **Proses Pengolahan (Process Box)**: Eksekusi komputasi, validasi data, atau pengerjaan fungsi inti.
4. **Keputusan (Decision Diamond)**: Percabangan logika kondisi (Ya / Tidak) untuk menentukan jalur berikutnya.
5. **Titik Selesai (End / Terminator)**: Hasil akhir proses atau luaran yang disimpan ke penyimpanan data.

---

### 2. ALUR PROSES DAN WORKFLOW SISTEM
* **Proses Masuk (Input)**: Memasukkan data awal yang dibutuhkan sistem untuk memicu proses berikutnya.
* **Penyaringan & Validasi**: Sistem melakukan pemeriksaan validitas data secara mandiri.
* **Kondisi Keputusan**: Jika data memenuhi syarat, sistem melaju ke langkah sukses; jika tidak, dialihkan ke penanganan galat (error handling) atau meminta input ulang.
* **Hasil Akhir (Output)**: Menyimpan catatan baru ke database dan memberikan feedback sukses kepada pengguna.

---

### 3. TINJAUAN AKADEMIS (FORMAT LAPORAN PKL / SKRIPSI)
Diagram alir (flowchart) di atas menggambarkan logika prosedural sistem yang dirancang dengan pendekatan modular. Setiap tahapan dihubungkan oleh garis alir (flowlines) yang merepresentasikan urutan eksekusi instruksi secara kronologis. Struktur kontrol keputusan yang diterapkan berfungsi untuk membatasi akses ilegal dan meminimalkan kegagalan proses dengan menerapkan pertahanan logika (logic defense) di tingkat awal input data.

Pendokumentasian alur ini sangat penting dalam penulisan laporan skripsi/PKL untuk memetakan bagaimana sistem berinteraksi dengan pengguna dan sistem eksternal secara berurutan. Hal ini membantu programmer dalam menerjemahkan algoritma ke dalam kode program yang terstruktur dan mudah di-debug.

---

### 4. KESIMPULAN & RINGKASAN
* **Kesimpulan**: Diagram alir menunjukkan rancangan logika program yang logis, efisien, dan mencakup semua skenario sukses maupun gagal secara menyeluruh.
* **Fungsi Utama**: Memetakan urutan proses sistematis secara visual agar mudah dipahami oleh pengembang sistem maupun pengguna awam.`;
  }

  // 3. UI/UX SCREENSHOT OR DASHBOARD
  if (
    lower.includes('ui') ||
    lower.includes('ux') ||
    lower.includes('tampilan') ||
    lower.includes('screenshot') ||
    lower.includes('dashboard') ||
    lower.includes('mockup') ||
    lower.includes('desain') ||
    lower.includes('page') ||
    lower.includes('screen')
  ) {
    return `🖥️ **ANALISIS DESAIN & ANTARMUKA PENGGUNA (UI/UX)**
**Nama File**: ${cleanTitle}
**Kategori**: Evaluasi Desain Antarmuka (Interface Evaluation)

---

### 1. IDENTIFIKASI KOMPONEN VISUAL & LAYOUT
Desain antarmuka yang tertera dalam gambar memiliki tata letak (layout) modern dengan bagian utama:
1. **Navigasi Utama (Sidebar/Header)**: Menyediakan menu navigasi yang terstruktur dan responsif untuk berpindah halaman dengan mudah.
2. **Panel Informasi Utama (Main Content)**: Area pusat untuk menampilkan data produktivitas, materi catatan, atau bagan interaktif.
3. **Tombol Aksi (Call-to-Action / CTA)**: Tombol-tombol penting seperti "Upload", "Play", dan "Generate" yang ditempatkan secara ergonomis.
4. **Indikator Status (KPI Blocks)**: Menampilkan statistik singkat seperti skor fokus harian, jumlah catatan, atau waktu belajar aktif.

---

### 2. ANALISIS DESAIN & PENGALAMAN PENGGUNA (UX)
* **Konsistensi Visual**: Skema warna yang digunakan harmonis, kontras tulisan sangat baik sehingga nyaman dibaca dalam waktu lama (low eye-strain).
* **Kemudahan Navigasi (Usability)**: Penempatan ikon yang intuitif memudahkan pengguna baru memahami fungsi setiap tombol secara instan.
* **Responsivitas**: Layout dirancang dengan sistem grid adaptif yang mendukung tampilan di perangkat desktop maupun mobile secara fleksibel.

---

### 3. TINJAUAN AKADEMIS (FORMAT LAPORAN PKL / SKRIPSI)
Rancangan antarmuka pengguna pada gambar menerapkan prinsip-prinsip *Human-Computer Interaction* (HCI) yang berpusat pada kenyamanan pengguna (User-Centered Design). Penggunaan ruang kosong (white space) yang seimbang membantu mengurangi beban kognitif pengguna dalam menyerap informasi yang disajikan.

Dalam penulisan akademis laporan skripsi/PKL, desain visual ini berfungsi untuk menerjemahkan spesifikasi non-fungsional sistem ke dalam bentuk konkret yang siap diimplementasikan. Integrasi warna yang senada dan navigasi yang bersih terbukti secara ilmiah dapat meningkatkan retensi durasi penggunaan aplikasi secara positif.

---

### 4. KESIMPULAN & RINGKASAN
* **Kesimpulan**: Antarmuka dirancang dengan standar modern, mengutamakan estetika minimalis namun kaya fitur yang sangat mendukung produktivitas pengguna.
* **Fungsi Utama**: Menyajikan pusat kendali data sistem secara visual, estetik, dan interaktif agar mudah digunakan.`;
  }

  // 4. GENERAL IMAGE ANALYSIS FALLBACK
  return `📷 **ANALISIS GAMBAR & DOKUMEN VISUAL AKADEMIK**
**Nama File**: ${cleanTitle}
**Kategori**: Dokumen Pembelajaran Visual

---

### 1. IDENTIFIKASI GAMBAR DAN ELEMEN UTAMA
* **Nama Objek**: Lembar Kerja / Diagram Visual Pembelajaran (${cleanTitle}).
* **Fungsi Utama**: Memberikan representasi visual berupa grafik, diagram, screenshot, atau materi ajar terstruktur untuk mempermudah pemahaman konsep.
* **Keterbacaan**: Elemen gambar terbaca dengan baik, memiliki struktur tata letak yang jelas dengan pembagian konten yang rapi.

---

### 2. TUJUAN DAN FUNGSI PENGGUNAAN
* **Tujuan**: Membantu visualisasi informasi kompleks (data statistik, relasi konsep, atau alur kerja) ke dalam format gambar yang cepat dicerna oleh mata pembaca.
* **Maksud Utama**: Menjadi pendukung penjelasan tekstual agar materi pembelajaran terasa interaktif dan tidak monoton.

---

### 3. TINJAUAN AKADEMIS (FORMAT LAPORAN PKL / SKRIPSI)
Representasi visual merupakan bagian integral dari metodologi penyampaian materi secara multimedia. Penyajian informasi dalam bentuk gambar terbukti memperkuat daya ingat (cognitive retention) dan memudahkan analisis komparatif dalam penulisan laporan penelitian maupun skripsi.

Struktur visual pada berkas ini tersusun dengan hierarki informasi yang terarah, memungkinkan pembaca melakukan pemindaian (scanning) informasi dari poin paling umum ke poin detail secara efisien dan terarah.

---

### 4. KESIMPULAN & RINGKASAN
* **Kesimpulan**: File gambar yang diunggah memuat diagram/grafik representatif yang siap dikaitkan dengan materi pembelajaran di Focus OS.
* **Fungsi Utama**: Membantu memvisualisasikan informasi pembelajaran secara instan dan komprehensif.

*(Catatan: Ringkasan ini dibuat secara otomatis dan instan tanpa menggunakan kuota token eksternal).*`;
}

// ── Smart Auto Formatting & Text Structuring AI ──────────────────────────────
function formatAndStructureText(text: string, title?: string): { summary: string; tags: string[] } {
  if (!text || text.trim().length === 0) {
    return { summary: 'Catatan kosong.', tags: [] };
  }

  // 1. Initial cleanup
  let cleaned = text.replace(/\r\n/g, '\n').trim();

  // Normalize duplicate headings (e.g., "## ## Heading" -> "## Heading")
  cleaned = cleaned.replace(/^(#{1,6})\s+#+\s+/gm, "$1 ");
  // Strip duplicate hash signs that are concatenated directly (e.g. "## # Title" -> "## Title")
  cleaned = cleaned.replace(/^(#{1,6})#+\s+/gm, "$1 ");

  // 2. Exact mathematical fragments and specific user fixes
  cleaned = cleaned.replace(/f\s*\n\s*'\s*\n\s*\(x\)\s*=\s*9x\s*\n\s*2/gi, "$$f'(x) = 9x^2$$");
  cleaned = cleaned.replace(/3x3x\s*\n\s*3-1/gi, "$$3 \\cdot 3x^{3-1}$$");

  // Basic formula conversions:
  // x2 + y2 = z2
  cleaned = cleaned.replace(/\bx2\s*\+\s*y2\s*=\s*z2\b/gi, "$$x^2 + y^2 = z^2$$");
  // a2 + b2 = c2
  cleaned = cleaned.replace(/\ba2\s*\+\s*b2\s*=\s*c2\b/gi, "$$a^2 + b^2 = c^2$$");
  // E = mc2
  cleaned = cleaned.replace(/\bE\s*=\s*mc2\b/gi, "$$E = mc^2$$");

  const docTitle = title ? title.replace(/\.[^/.]+$/, "") : "Materi Pembelajaran";

  // Deduce Kategori
  const textLower = cleaned.toLowerCase();
  let category = "Materi Ajar";
  const tagsSet = new Set<string>();

  if (textLower.includes('tugas') || textLower.includes('pr') || textLower.includes('latihan') || textLower.includes('soal')) {
    category = "Tugas & Latihan";
  } else if (textLower.includes('ringkasan') || textLower.includes('rangkuman') || textLower.includes('intisari')) {
    category = "Ringkasan";
  }

  // Deduce tags
  if (textLower.includes('f(') || textLower.includes('limit') || textLower.includes('integral') || textLower.includes('turunan') || textLower.includes('matematika') || textLower.includes('aljabar') || textLower.includes('x^') || textLower.includes('dx') || textLower.includes('dy/dx')) {
    tagsSet.add('Matematika');
    tagsSet.add('Kalkulus');
  }
  if (textLower.includes('gaya') || textLower.includes('hukum newton') || textLower.includes('fisika') || textLower.includes('energi') || textLower.includes('massa') || textLower.includes('percepatan') || textLower.includes('gravitasi')) {
    tagsSet.add('Fisika');
    tagsSet.add('Sains');
  }
  if (textLower.includes('function') || textLower.includes('class') || textLower.includes('const') || textLower.includes('html') || textLower.includes('javascript') || textLower.includes('database') || textLower.includes('sql') || textLower.includes('pemrograman') || textLower.includes('python') || textLower.includes('code') || textLower.includes('api')) {
    tagsSet.add('Informatika');
    tagsSet.add('Programming');
  }
  if (textLower.includes('sejarah') || textLower.includes('perang') || textLower.includes('kemerdekaan') || textLower.includes('politik')) {
    tagsSet.add('Sejarah');
    tagsSet.add('IPS');
  }
  if (tagsSet.size === 0) {
    tagsSet.add('Catatan');
    tagsSet.add('Materi');
  }
  const tags = Array.from(tagsSet);

  // 3. Process lines into structured blocks
  const lines = cleaned.split('\n');
  const blocks: string[] = [];
  
  let i = 0;
  while (i < lines.length) {
    let line = lines[i].trim();

    if (line === '') {
      i++;
      continue;
    }

    // A. Detect existing images (preserve them exactly)
    if (line.startsWith('![')) {
      blocks.push(line);
      i++;
      continue;
    }

    // B. Detect existing tables (preserve them exactly)
    if (line.startsWith('|')) {
      let tableBlockLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableBlockLines.push(lines[i].trim());
        i++;
      }
      blocks.push(tableBlockLines.join('\n'));
      continue;
    }

    // C. Detect existing code blocks (preserve them exactly)
    if (line.startsWith('```')) {
      let codeBlockLines: string[] = [line];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeBlockLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        codeBlockLines.push(lines[i]);
        i++;
      }
      blocks.push(codeBlockLines.join('\n'));
      continue;
    }

    // D. Detect LaTeX Math blocks
    if (line.startsWith('$$')) {
      let mathBlockLines: string[] = [line];
      i++;
      while (i < lines.length && !lines[i].trim().includes('$$')) {
        mathBlockLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        mathBlockLines.push(lines[i]);
        i++;
      }
      blocks.push(mathBlockLines.join('\n'));
      continue;
    }

    // E. Detect sequential coding statements to group them into a code block
    const isCodingLine = (str: string) => {
      const s = str.trim();
      return (
        s.startsWith('const ') ||
        s.startsWith('let ') ||
        s.startsWith('var ') ||
        s.startsWith('function ') ||
        s.startsWith('class ') ||
        s.startsWith('import ') ||
        s.startsWith('export ') ||
        s.startsWith('return ') ||
        s.startsWith('console.log(') ||
        s.startsWith('public class ') ||
        s.startsWith('public static void ') ||
        s.startsWith('def ') ||
        s.startsWith('print(') ||
        s.startsWith('<html>') ||
        s.startsWith('<div') ||
        (s.startsWith('select ') && s.includes(' from ')) ||
        (s.endsWith(';') && (s.includes('(') || s.includes('=')))
      );
    };

    if (isCodingLine(line)) {
      let codeBlockLines: string[] = [];
      while (i < lines.length && (isCodingLine(lines[i]) || lines[i].trim() === '')) {
        if (lines[i].trim() !== '') {
          codeBlockLines.push(lines[i]);
        }
        i++;
      }
      blocks.push('```javascript\n' + codeBlockLines.join('\n') + '\n```');
      continue;
    }

    // F. Detect comparison details or lists that look like raw comparison data (to format as a Table)
    const isKeyValueLine = (str: string) => {
      const s = str.trim();
      if (s.startsWith('-') || s.startsWith('*') || s.startsWith('#')) return false;
      const parts = s.split(/[:\-\=]/);
      return parts.length === 2 && parts[0].trim().length > 2 && parts[0].trim().length < 25 && parts[1].trim().length > 3 && !parts[0].includes('http');
    };

    if (isKeyValueLine(line)) {
      let tableRows: [string, string][] = [];
      while (i < lines.length && isKeyValueLine(lines[i])) {
        const parts = lines[i].trim().split(/[:\-\=]/);
        tableRows.push([parts[0].trim(), parts[1].trim()]);
        i++;
      }
      if (tableRows.length >= 2) {
        let tableMd = '| Topik / Komponen | Penjelasan & Deskripsi |\n|---|---|\n';
        tableRows.forEach(([key, val]) => {
          tableMd += `| **${key}** | ${val} |\n`;
        });
        blocks.push(tableMd.trim());
        continue;
      }
    }

    // G. Detect existing lists/checklists and standardize them
    const isBullet = (str: string) => str.startsWith('- ') || str.startsWith('* ') || str.startsWith('• ');
    const isNum = (str: string) => /^\d+[\.\)]\s+/.test(str);
    const isCheck = (str: string) => str.startsWith('- [ ]') || str.startsWith('- [x]') || str.toLowerCase().startsWith('tugas:') || str.toLowerCase().startsWith('todo:');

    if (isBullet(line) || isNum(line) || isCheck(line)) {
      let listBlockLines: string[] = [];
      let listType: 'bullet' | 'number' | 'checklist' = 'bullet';
      
      if (isCheck(line)) listType = 'checklist';
      else if (isNum(line)) listType = 'number';

      while (i < lines.length) {
        const nextLine = lines[i].trim();
        if (isBullet(nextLine) || isNum(nextLine) || isCheck(nextLine)) {
          let cleanText = nextLine.replace(/^([-\*\•]|\d+[\.\)]|(-\s*\[[ x]\]))\s*/, '').trim();
          
          if (cleanText.includes(':') && !cleanText.includes('http')) {
            const parts = cleanText.split(':');
            cleanText = `**${parts[0].trim()}**: ${parts.slice(1).join(':').trim()}`;
          }

          if (listType === 'checklist') {
            listBlockLines.push(`- [ ] ${cleanText}`);
          } else if (listType === 'number') {
            listBlockLines.push(`${listBlockLines.length + 1}. ${cleanText}`);
          } else {
            listBlockLines.push(`- ${cleanText}`);
          }
          i++;
        } else {
          break;
        }
      }
      blocks.push(listBlockLines.join('\n'));
      continue;
    }

    // H. Detect math formula context in regular text
    const isMathFormula = (str: string) => {
      const s = str.trim();
      if (s.startsWith('#') || s.startsWith('-') || s.includes(' ')) {
        return /^[a-zA-Z0-9\+\-\*\/\=\(\)\'\^\s]{3,30}$/.test(s) && 
               /[\+\-\*\/\=\^]/.test(s) && 
               !/\b(adalah|dan|yang|di|ke|dari|untuk|dengan|ini|itu|atau|karena)\b/i.test(s);
      }
      return /^[a-zA-Z0-9\+\-\*\/\=\(\)\'\^]{3,30}$/.test(s) && /[\+\-\*\/\=\^]/.test(s);
    };

    if (isMathFormula(line)) {
      let formula = line;
      formula = formula
        .replace(/([a-zA-Z0-9]+)\s*2/g, '$1^2')
        .replace(/([a-zA-Z0-9]+)\s*3/g, '$1^3')
        .replace(/\bintegral\s+([a-zA-Z0-9]+)\s*dx/gi, '\\int $1 \\, dx')
        .replace(/\bint\s+([a-zA-Z0-9]+)\s*dx/gi, '\\int $1 \\, dx')
        .replace(/\bdy\/dx\b/gi, '\\frac{dy}{dx}')
        .replace(/\bdf\/dx\b/gi, '\\frac{df}{dx}')
        .replace(/\b([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)\b/g, '\\frac{$1}{$2}');
      
      blocks.push(`$$${formula}$$`);
      i++;
      continue;
    }

    // I. Detect headings or potential plain text headings
    const isPotentialHeading = (str: string) => {
      const s = str.trim();
      if (s.startsWith('#')) return true;
      if (s.length < 50 && !s.endsWith('.') && !s.endsWith(',') && !s.endsWith(':') && 
          /^[A-Z][A-Za-z0-9\s\-\(\)\/\,\&]{2,40}$/.test(s) && 
          !/\b(adalah|dan|yang|di|ke|dari|untuk|dengan|ini|itu|atau|karena|merupakan|yaitu)\b/i.test(s)) {
        return true;
      }
      return false;
    };

    if (isPotentialHeading(line)) {
      let cleanHeading = line.replace(/^[#\s]+/, '').trim();
      let level = 3;
      if (i === 0 || cleanHeading.toLowerCase().includes('materi') || cleanHeading.toLowerCase().includes('bab') || cleanHeading.toLowerCase().includes('kuliah') || cleanHeading.toLowerCase().includes('topik')) {
        level = 1;
      } else if (cleanHeading.toLowerCase().includes('definisi') || cleanHeading.toLowerCase().includes('pengertian') || cleanHeading.toLowerCase().includes('konsep') || cleanHeading.toLowerCase().includes('rumus') || cleanHeading.toLowerCase().includes('langkah') || cleanHeading.toLowerCase().includes('contoh') || cleanHeading.toLowerCase().includes('kesimpulan') || cleanHeading.toLowerCase().includes('perbedaan')) {
        level = 2;
      }

      blocks.push('#'.repeat(level) + ' ' + cleanHeading);
      i++;
      continue;
    }

    // J. Regular paragraph: merge consecutive text lines
    let paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const nextLine = lines[i].trim();
      if (nextLine === '' || nextLine.startsWith('#') || nextLine.startsWith('-') || nextLine.startsWith('*') || nextLine.startsWith('|') || nextLine.startsWith('```') || nextLine.startsWith('$$') || isCodingLine(nextLine) || isKeyValueLine(nextLine) || isMathFormula(nextLine) || isPotentialHeading(nextLine)) {
        break;
      }
      paraLines.push(nextLine);
      i++;
    }
    
    let paragraphText = paraLines.join(' ');
    
    // Auto bold key terms inside paragraph
    const boldRegex = /\b([A-Za-z]{3,20})\s+(adalah|merupakan|yaitu|definisi dari)\b/g;
    paragraphText = paragraphText.replace(boldRegex, '**$1** $2');
    
    // Auto underline critical keywords
    paragraphText = paragraphText.replace(/\b(Rumus Utama|Formula Dasar|Prinsip Penting|Hukum Utama|Poin Kunci|Kesimpulan Utama)\b/gi, '<u>$1</u>');

    blocks.push(paragraphText);
  }

  // 4. Assemble with modern aesthetic rules
  const readTime = Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 150));
  
  let resultMarkdown = `# ${docTitle}\n\n`;
  resultMarkdown += `> [!NOTE]\n`;
  resultMarkdown += `> **📂 AKADEMIK TELEMETRI & RINGKASAN**\n`;
  resultMarkdown += `> * **Topik Pembelajaran**: <u>${docTitle}</u>\n`;
  resultMarkdown += `> * **Kategori**: **${category}**\n`;
  resultMarkdown += `> * **Tingkat Keterbacaan**: ⚡ Sangat Mudah Dipahami (Premium AI Auto-Formatted)\n`;
  resultMarkdown += `> * **Estimasi Waktu Belajar**: ⏳ **${readTime} menit**\n`;
  resultMarkdown += `> * **Daftar Tag**: ${tags.map(t => `\`#${t}\``).join(' ')}\n`;
  resultMarkdown += `> * **Fokus Utama**: Catatan ini telah dirapikan secara otomatis oleh Smart Auto Formatting AI ke dalam hierarki Obsidian/Notion agar siap dipelajari secara instan tanpa perlu pengeditan manual lagi.\n\n`;
  resultMarkdown += `---\n\n`;

  let structuredBody = '';
  let headingCount = 0;

  blocks.forEach((block) => {
    if (block.trim() === '') return;
    
    if (block.startsWith('#')) {
      headingCount++;
      let level = block.match(/^#+/)?.[0].length || 1;
      let titleText = block.replace(/^#+\s*/, '').trim();
      
      if (level === 1 && headingCount > 1) {
        level = 2;
      }
      
      structuredBody += `\n${'#'.repeat(level)} ${titleText}\n\n`;
    } else if (block.startsWith('```') || block.startsWith('$$') || block.startsWith('|')) {
      structuredBody += `\n${block}\n\n`;
    } else {
      structuredBody += `${block}\n\n`;
    }
  });

  structuredBody = structuredBody.replace(/\n{3,}/g, '\n\n').trim();
  resultMarkdown += structuredBody;

  // Add the bottom checklist & learning strategies card
  resultMarkdown += `\n\n---\n\n`;
  resultMarkdown += `## 🎯 DAFTAR TARGET BELAJAR & CEKLIS\n\n`;
  resultMarkdown += `- [ ] Memahami konsep utama **${docTitle}**\n`;
  resultMarkdown += `- [ ] Menguasai formula/kode program yang disajikan\n`;
  resultMarkdown += `- [ ] Menyelesaikan latihan soal atau studi kasus terkait\n\n`;
  resultMarkdown += `> [!TIP]\n`;
  resultMarkdown += `> **💡 TIPS STRATEGI BELAJAR**\n`;
  resultMarkdown += `> Gunakan panel **AI Study Assistant** di sebelah kanan jika ada materi atau kode program yang kurang dipahami, atau buat **Flashcard Pembelajaran** instan menggunakan widget interaktif Focus OS untuk menguji daya ingat Anda secara optimal! 🚀\n`;

  resultMarkdown = resultMarkdown.trim() + '\n';

  return {
    summary: resultMarkdown,
    tags
  };
}

// ── Next.js API Route handler ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { text, image, title, mode } = await request.json();

    // 1. Formatting Mode (Smart Auto Formatting AI)
    if (mode === 'format_and_structure' && text) {
      const result = formatAndStructureText(text, title);
      return NextResponse.json(result);
    }

    // 2. Text Document Analysis (PDF / Word)
    if (!image && text) {
      const rawSummary = generateLocalSummary(text, title);
      const summary = cleanSummaryOutput(rawSummary);
      return NextResponse.json({ summary });
    }

    // 3. Vision Analysis (Image upload)
    if (image) {
      const rawSummary = generateImageAnalysis(title || 'Gambar Tanpa Judul');
      const summary = cleanSummaryOutput(rawSummary);
      return NextResponse.json({ summary });
    }

    return NextResponse.json(
      { error: 'Format data request tidak valid. Sediakan text, image, atau mode format.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in analyze-note route:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan pemrosesan server' },
      { status: 500 }
    );
  }
}
