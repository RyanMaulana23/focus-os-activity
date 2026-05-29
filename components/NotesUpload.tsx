'use client';

import { useState, useCallback } from 'react';
import { useNotesStore } from '@/lib/stores/notesStore';
import { Upload, X, File, CheckCircle, Loader2, Sparkles } from 'lucide-react';

type UploadStep = 'idle' | 'extracting' | 'summarizing' | 'done' | 'error';

export function NotesUpload() {
  const [title, setTitle]               = useState('');
  const [content, setContent]           = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory]         = useState<'task' | 'material'>('material');
  const [uploadMode, setUploadMode]     = useState<'text' | 'file'>('file');
  const [step, setStep]                 = useState<UploadStep>('idle');
  const [stepLabel, setStepLabel]       = useState('');
  const [error, setError]               = useState('');
  const [justUploaded, setJustUploaded] = useState(false);

  const addNote         = useNotesStore((s) => s.addNote);
  const generateSummary = useNotesStore((s) => s.generateSummary);
  const setEditing      = useNotesStore((s) => s.setEditing);

  const isLoading = step === 'extracting' || step === 'summarizing';

  // ── Extract text from file ─────────────────────────────────────────────
  const extractFile = useCallback(async (file: File): Promise<{ text: string; dataUrl: string }> => {
    const [textResult, dataUrlResult] = await Promise.all([
      // Text extraction
      (async () => {
        if (file.type === 'application/pdf') {
          const { extractTextFromPDF } = await import('@/lib/utils/fileExtractor');
          return extractTextFromPDF(file);
        }
        if (
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword'
        ) {
          const { extractTextFromWord } = await import('@/lib/utils/fileExtractor');
          return extractTextFromWord(file);
        }
        throw new Error('Format file tidak didukung');
      })(),
      // Data URL for preview
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Gagal membaca file untuk preview'));
        reader.readAsDataURL(file);
      }),
    ]);

    return { text: textResult, dataUrl: dataUrlResult };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif'
    ];

    const isImage = file.type.startsWith('image/');
    const isValidType = validMimes.includes(file.type) || isImage;

    if (!isValidType) {
      setError('Hanya file PDF, Word, atau Gambar (.pdf, .docx, .png, .jpg) yang diperbolehkan');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ''));
    setError('');
  };

  // ── Handle drag & drop ─────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  };

  // ── Main submit ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setJustUploaded(false);

    if (uploadMode === 'file' && !selectedFile) return setError('Pilih file PDF, Word, atau Gambar');
    if (uploadMode === 'text' && !content.trim()) return setError('Konten tidak boleh kosong');
    if (!title.trim()) return setError('Judul tidak boleh kosong');

    try {
      let extractedText = content;
      let fileType: 'text' | 'pdf' | 'word' | 'image' = 'text';
      let fileDataUrl: string | undefined;
      let fileMimeType: string | undefined;

      // ── Step 1: Extract / Prepare ──────────────────────────────────────
      if (uploadMode === 'file' && selectedFile) {
        setStep('extracting');
        setStepLabel('Membaca isi file…');

        const isImage = selectedFile.type.startsWith('image/');

        if (isImage) {
          // Read image as Data URL
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
            reader.readAsDataURL(selectedFile);
          });
          
          fileDataUrl = dataUrl;
          fileMimeType = selectedFile.type;
          fileType = 'image';
          extractedText = ''; // Will be populated by the AI explanation
        } else {
          // PDF or Word
          const { text, dataUrl } = await extractFile(selectedFile);
          extractedText = text;
          fileDataUrl   = dataUrl;
          fileMimeType  = selectedFile.type;
          fileType = selectedFile.type === 'application/pdf' ? 'pdf' : 'word';

          if (!extractedText.trim()) {
            throw new Error('File tidak mengandung teks yang dapat dibaca. Coba file lain.');
          }
        }
      }

      // ── Step 2: AI Summarize / Explain ──────────────────────────────────
      setStep('summarizing');
      setStepLabel(
        fileType === 'image'
          ? 'Menganalisis gambar dengan Gemini AI…'
          : 'Membuat ringkasan dengan Gemini AI…'
      );

      let aiResult = '';
      try {
        const response = await fetch('/api/analyze-note', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: fileType !== 'image' ? extractedText : undefined,
            image: fileType === 'image' ? fileDataUrl : undefined,
            title,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Gagal memanggil API Gemini');
        }

        const data = await response.json();
        aiResult = data.summary;
      } catch (err: any) {
        console.error('[NotesUpload] AI Error:', err);
        throw new Error(
          err.message || 'Gagal menganalisis dengan AI. Periksa koneksi internet atau Gemini API Key.'
        );
      }

      // For images, the note content itself is the AI's explanation of the image
      const finalContent = fileType === 'image' ? aiResult : extractedText;
      const finalSummary = aiResult;

      // ── Step 3: Save note ──────────────────────────────────────────────
      const noteId = addNote({
        title,
        content: finalContent,
        category,
        fileName:    selectedFile?.name,
        fileType,
        fileDataUrl,
        fileMimeType,
      });

      // Save summary inside note store
      generateSummary(noteId, finalSummary);

      // ── Done ───────────────────────────────────────────────────────────
      setStep('done');
      setJustUploaded(true);

      setTimeout(() => {
        setTitle('');
        setContent('');
        setSelectedFile(null);
        setUploadMode('file');
        setStep('idle');
        setJustUploaded(false);
      }, 2500);

    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Gagal memproses file');
    }
  };

  const reset = () => {
    setTitle('');
    setContent('');
    setSelectedFile(null);
    setError('');
    setStep('idle');
    setJustUploaded(false);
  };

  // ── Step indicator ─────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center gap-2 px-4 py-3 bg-violet-600/20 border border-violet-500/40 rounded-lg text-sm text-violet-300">
      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
      <span>{stepLabel}</span>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-4 sm:p-8 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-blue-600 rounded-lg">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Upload Catatan</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ringkasan otomatis dibuat saat upload</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-violet-600/30 transition text-sm active:scale-95 shadow-md hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span>Tulis Catatan Modern ✨</span>
          </button>
          
          <div className="hidden sm:flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-500/30 px-2.5 py-1.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            Auto-Ringkas
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-500 text-red-300 rounded-lg text-sm flex items-start gap-2">
          <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Success */}
      {justUploaded && (
        <div className="mb-4 p-3 bg-emerald-600/20 border border-emerald-500 text-emerald-300 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Berhasil diupload! Ringkasan otomatis sedang dibuat…
        </div>
      )}

      {/* Step progress */}
      {isLoading && <div className="mb-4"><StepIndicator /></div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mode selection */}
        <div className="flex gap-4 p-3 bg-slate-700/30 rounded-lg">
          {(['file', 'text'] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer flex-1">
              <input
                type="radio"
                name="mode"
                value={mode}
                checked={uploadMode === mode}
                onChange={() => setUploadMode(mode)}
                className="w-4 h-4 text-violet-600"
              />
              <span className="text-slate-300">
                {mode === 'file' ? 'Upload File (PDF/Word)' : 'Input Text Langsung'}
              </span>
            </label>
          ))}
        </div>

        {/* Category */}
        <div className="flex gap-4">
          {(['material', 'task'] as const).map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="category"
                value={cat}
                checked={category === cat}
                onChange={() => setCategory(cat)}
                className="w-4 h-4 text-violet-600"
              />
              <span className="text-slate-300">{cat === 'material' ? 'Materi' : 'Tugas'}</span>
            </label>
          ))}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Judul Catatan</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Matematika — Bab 5 Integral"
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition"
          />
        </div>

        {/* File or text */}
        {uploadMode === 'file' ? (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Upload File
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="notes-file-input"
            />
            <label
              htmlFor="notes-file-input"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-violet-500 hover:bg-violet-600/5 transition-all duration-200 group"
            >
              <div className="flex flex-col items-center text-center">
                {selectedFile ? (
                  <>
                    {selectedFile.type.startsWith('image/') ? (
                      <div className="relative w-16 h-16 mb-2 rounded border border-slate-600 overflow-hidden bg-slate-800 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt="preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <File className="w-10 h-10 text-emerald-400 mb-3" />
                    )}
                    <p className="text-sm font-semibold text-emerald-400 truncate max-w-[240px]">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      {' · '}
                      {selectedFile.type.startsWith('image/') ? 'Gambar' : selectedFile.type === 'application/pdf' ? 'PDF' : 'Word'}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Klik untuk ganti file</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mb-3 group-hover:text-violet-400 transition-colors" />
                    <p className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                      Klik atau drag file ke sini
                    </p>
                    <p className="text-xs text-slate-400 mt-1">PDF, Word, atau Gambar (.pdf, .docx, .png, .jpg)</p>
                  </>
                )}
              </div>
            </label>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Konten Catatan</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ketik atau paste konten catatan Anda di sini…"
              rows={8}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition resize-none"
            />
            <p className="text-xs text-slate-400 mt-2">{content.length.toLocaleString()} karakter</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              isLoading
                ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:shadow-lg hover:shadow-violet-600/40 hover:scale-[1.01]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {stepLabel}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Upload &amp; Ringkas Otomatis
              </>
            )}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={isLoading}
            className="px-4 py-3 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 transition disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
