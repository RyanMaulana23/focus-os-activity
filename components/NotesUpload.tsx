'use client';

import { useState, useCallback } from 'react';
import { useNotesStore } from '@/lib/stores/notesStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { Upload, X, File, CheckCircle, Loader2, Sparkles } from 'lucide-react';

type UploadStep = 'idle' | 'extracting' | 'summarizing' | 'done' | 'error';

export function NotesUpload() {
  const [title,        setTitle]        = useState('');
  const [content,      setContent]      = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category,     setCategory]     = useState<'task' | 'material'>('material');
  const [uploadMode,   setUploadMode]   = useState<'text' | 'file'>('file');
  const [step,         setStep]         = useState<UploadStep>('idle');
  const [stepLabel,    setStepLabel]    = useState('');
  const [error,        setError]        = useState('');
  const [justUploaded, setJustUploaded] = useState(false);

  const addNote         = useNotesStore((s) => s.addNote);
  const generateSummary = useNotesStore((s) => s.generateSummary);
  const setEditing      = useNotesStore((s) => s.setEditing);
  const isLightMode     = useUIStore((s) => s.isLightMode);

  const isLoading = step === 'extracting' || step === 'summarizing';
  const LM = isLightMode;

  const extractFile = useCallback(async (file: File): Promise<{ text: string; dataUrl: string }> => {
    const [textResult, dataUrlResult] = await Promise.all([
      (async () => {
        if (file.type === 'application/pdf') {
          const { extractTextFromPDF } = await import('@/lib/utils/fileExtractor');
          return extractTextFromPDF(file);
        }
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
          const { extractTextFromWord } = await import('@/lib/utils/fileExtractor');
          return extractTextFromWord(file);
        }
        throw new Error('Format file tidak didukung');
      })(),
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
    const validMimes = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','image/png','image/jpeg','image/jpg','image/webp','image/gif'];
    const isImage = file.type.startsWith('image/');
    if (!validMimes.includes(file.type) && !isImage) {
      setError('Hanya file PDF, Word, atau Gambar (.pdf, .docx, .png, .jpg) yang diperbolehkan');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ''));
    setError('');
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  };

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

      if (uploadMode === 'file' && selectedFile) {
        setStep('extracting'); setStepLabel('Membaca isi file…');
        const isImage = selectedFile.type.startsWith('image/');
        if (isImage) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
            reader.readAsDataURL(selectedFile);
          });
          fileDataUrl = dataUrl; fileMimeType = selectedFile.type; fileType = 'image'; extractedText = '';
        } else {
          const { text, dataUrl } = await extractFile(selectedFile);
          extractedText = text; fileDataUrl = dataUrl; fileMimeType = selectedFile.type;
          fileType = selectedFile.type === 'application/pdf' ? 'pdf' : 'word';
          if (!extractedText.trim()) throw new Error('File tidak mengandung teks yang dapat dibaca. Coba file lain.');
        }
      }

      setStep('summarizing');
      setStepLabel(fileType === 'image' ? 'Menganalisis gambar dengan Gemini AI…' : 'Membuat ringkasan dengan Gemini AI…');

      let aiResult = '';
      try {
        const response = await fetch('/api/analyze-note', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: fileType !== 'image' ? extractedText : undefined, image: fileType === 'image' ? fileDataUrl : undefined, title }),
        });
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Gagal memanggil API Gemini'); }
        const data = await response.json();
        aiResult = data.summary;
      } catch (err: any) {
        throw new Error(err.message || 'Gagal menganalisis dengan AI.');
      }

      const finalContent = fileType === 'image' ? aiResult : extractedText;
      const noteId = addNote({ title, content: finalContent, category, fileName: selectedFile?.name, fileType, fileDataUrl, fileMimeType });
      generateSummary(noteId, aiResult);
      setStep('done'); setJustUploaded(true);
      setTimeout(() => { setTitle(''); setContent(''); setSelectedFile(null); setUploadMode('file'); setStep('idle'); setJustUploaded(false); }, 2500);
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Gagal memproses file');
    }
  };

  const reset = () => { setTitle(''); setContent(''); setSelectedFile(null); setError(''); setStep('idle'); setJustUploaded(false); };

  const inputStyle: React.CSSProperties = LM
    ? { background: '#F8FAFC', border: '1px solid #E4E8F0', borderRadius: '10px', color: '#0F172A', fontSize: '14px', padding: '10px 14px', width: '100%', outline: 'none' }
    : { background: 'rgba(51,65,85,0.5)', border: '1px solid #475569', borderRadius: '10px', color: '#FFFFFF', fontSize: '14px', padding: '10px 14px', width: '100%', outline: 'none' };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#5B50F0';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,80,240,0.12)';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = LM ? '#E4E8F0' : '#475569';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div
      className="rounded-xl p-4 sm:p-8 shadow-lg"
      style={LM
        ? { background: '#FFFFFF', border: '1px solid #E4E8F0', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }
        : { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid #334155' }
      }
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: '#5B50F0' }}>
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: LM ? '#0F172A' : '#FFFFFF' }}>Upload Catatan</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Ringkasan otomatis dibuat saat upload</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-4 py-2 rounded-xl text-white font-bold flex items-center gap-2 hover:shadow-lg transition text-sm active:scale-95 shadow-md hover:scale-[1.02]"
            style={{ background: '#5B50F0' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#4A40E0')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#5B50F0')}
          >
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span>Tulis Catatan Modern ✨</span>
          </button>
          <div
            className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full"
            style={LM
              ? { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }
              : { background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }
            }
          >
            <Sparkles className="w-3 h-3" /> Auto-Ringkas
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2"
          style={LM
            ? { background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48' }
            : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', color: '#FCA5A5' }
          }
        >
          <X className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
        </div>
      )}

      {/* Success */}
      {justUploaded && (
        <div className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
          style={LM
            ? { background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669' }
            : { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', color: '#6EE7B7' }
          }
        >
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Berhasil diupload! Ringkasan otomatis sedang dibuat…
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
          style={LM
            ? { background: '#EEF0FF', border: '1px solid #C7D2FE', color: '#5B50F0' }
            : { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#C4B5FD' }
          }
        >
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>{stepLabel}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mode selection */}
        <div className="flex gap-4 p-3 rounded-lg" style={LM ? { background: '#F8FAFC', border: '1px solid #E4E8F0' } : { background: 'rgba(51,65,85,0.3)' }}>
          {(['file', 'text'] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer flex-1">
              <input type="radio" name="mode" value={mode} checked={uploadMode === mode} onChange={() => setUploadMode(mode)} className="w-4 h-4" style={{ accentColor: '#5B50F0' }} />
              <span className="text-sm" style={{ color: LM ? '#475569' : '#CBD5E1' }}>
                {mode === 'file' ? 'Upload File (PDF/Word)' : 'Input Text Langsung'}
              </span>
            </label>
          ))}
        </div>

        {/* Category */}
        <div className="flex gap-4">
          {(['material', 'task'] as const).map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="category" value={cat} checked={category === cat} onChange={() => setCategory(cat)} className="w-4 h-4" style={{ accentColor: '#5B50F0' }} />
              <span className="text-sm" style={{ color: LM ? '#475569' : '#CBD5E1' }}>{cat === 'material' ? 'Materi' : 'Tugas'}</span>
            </label>
          ))}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: LM ? '#475569' : '#CBD5E1' }}>Judul Catatan</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Matematika — Bab 5 Integral"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        {/* File or Text */}
        {uploadMode === 'file' ? (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: LM ? '#475569' : '#CBD5E1' }}>Upload File</label>
            <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={handleFileSelect} className="hidden" id="notes-file-input" />
            <label
              htmlFor="notes-file-input"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 group"
              style={LM
                ? { borderColor: '#CBD5E1', background: '#F8FAFC' }
                : { borderColor: '#475569', background: 'transparent' }
              }
              onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.borderColor = '#5B50F0'; (e.currentTarget as HTMLLabelElement).style.background = LM ? 'rgba(91,80,240,0.02)' : 'rgba(91,80,240,0.05)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.borderColor = LM ? '#CBD5E1' : '#475569'; (e.currentTarget as HTMLLabelElement).style.background = LM ? '#F8FAFC' : 'transparent'; }}
            >
              <div className="flex flex-col items-center text-center">
                {selectedFile ? (
                  <>
                    {selectedFile.type.startsWith('image/') ? (
                      <div className="relative w-16 h-16 mb-2 rounded overflow-hidden flex items-center justify-center" style={{ background: LM ? '#F1F5F9' : '#1e293b', border: LM ? '1px solid #E4E8F0' : '1px solid #334155' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(selectedFile)} alt="preview" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <File className="w-10 h-10 mb-3" style={{ color: '#059669' }} />
                    )}
                    <p className="text-sm font-semibold truncate max-w-[240px]" style={{ color: '#059669' }}>{selectedFile.name}</p>
                    <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · {selectedFile.type.startsWith('image/') ? 'Gambar' : selectedFile.type === 'application/pdf' ? 'PDF' : 'Word'}
                    </p>
                    <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>Klik untuk ganti file</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mb-3 transition-colors" style={{ color: LM ? '#CBD5E1' : '#64748B' }} />
                    <p className="text-sm font-semibold transition-colors" style={{ color: LM ? '#475569' : '#94A3B8' }}>Klik atau drag file ke sini</p>
                    <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>PDF, Word, atau Gambar (.pdf, .docx, .png, .jpg)</p>
                  </>
                )}
              </div>
            </label>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: LM ? '#475569' : '#CBD5E1' }}>Konten Catatan</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ketik atau paste konten catatan Anda di sini…"
              rows={8}
              style={{ ...inputStyle, resize: 'none', height: 'auto' }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>{content.length.toLocaleString()} karakter</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            style={isLoading
              ? { background: LM ? '#F1F5F9' : '#334155', color: '#94A3B8', cursor: 'not-allowed' }
              : { background: '#5B50F0', color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 2px 8px rgba(91,80,240,0.25)' }
            }
            onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#4A40E0'; }}
            onMouseLeave={(e) => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#5B50F0'; }}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{stepLabel}</>
            ) : (
              <><Sparkles className="w-4 h-4" />Upload &amp; Ringkas Otomatis</>
            )}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={isLoading}
            className="px-4 py-3 rounded-lg transition disabled:opacity-40"
            style={LM
              ? { background: '#F1F5F9', color: '#64748B', border: '1px solid #E4E8F0' }
              : { background: 'rgba(51,65,85,0.5)', color: '#94A3B8', border: '1px solid #334155' }
            }
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
