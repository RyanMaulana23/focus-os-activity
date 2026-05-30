'use client';

import { useState, useRef } from 'react';
import { useDocumentStore } from '@/lib/stores/documentStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { Upload, File, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DocumentUpload() {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addDocument    = useDocumentStore((s) => s.addDocument);
  const uploadProgress = useDocumentStore((s) => s.uploadProgress);
  const addToast       = useDocumentStore((s) => s.addToast);
  const isLightMode    = useUIStore((s) => s.isLightMode);
  const LM = isLightMode;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else if (e.type === 'dragleave') setIsDragActive(false);
  };

  const validateAndProcessFiles = async (files: FileList) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isDoc  = file.name.endsWith('.doc')  || file.type === 'application/msword';
      if (!isDocx && !isDoc) { addToast(`File "${file.name}" ditolak. Hanya mendukung .docx dan .doc!`, 'error'); continue; }
      if (file.size > 20 * 1024 * 1024) { addToast(`File "${file.name}" melebihi 20MB!`, 'error'); continue; }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;
    for (const file of validFiles) {
      try { await addDocument(file); } catch (err) { console.error('Upload failure:', err); }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) await validateAndProcessFiles(e.dataTransfer.files);
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files?.[0]) await validateAndProcessFiles(e.target.files);
  };

  const activeUploads = Object.entries(uploadProgress);

  return (
    <div className="space-y-6">
      {/* ── Dropzone ──────────────────────────────────────────────────────────── */}
      <motion.div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        layout
        className="relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 cursor-pointer"
        style={isDragActive
          ? { borderColor: '#5B50F0', background: LM ? 'rgba(91,80,240,0.04)' : 'rgba(91,80,240,0.1)', transform: 'scale(1.01)' }
          : LM
            ? { borderColor: '#CBD5E1', background: '#FFFFFF' }
            : { borderColor: '#334155', background: 'rgba(30,41,59,0.4)' }
        }
        onMouseEnter={(e) => {
          if (!isDragActive) {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#5B50F0';
            (e.currentTarget as HTMLDivElement).style.background = LM ? 'rgba(91,80,240,0.02)' : 'rgba(30,41,59,0.6)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragActive) {
            (e.currentTarget as HTMLDivElement).style.borderColor = LM ? '#CBD5E1' : '#334155';
            (e.currentTarget as HTMLDivElement).style.background = LM ? '#FFFFFF' : 'rgba(30,41,59,0.4)';
          }
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" multiple accept=".docx,.doc" onChange={handleChange} className="hidden" />

        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Upload Icon */}
          <motion.div
            animate={isDragActive ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="p-4 rounded-full"
            style={isDragActive
              ? { background: '#5B50F0', color: '#FFFFFF', boxShadow: '0 8px 24px rgba(91,80,240,0.3)' }
              : LM
                ? { background: '#EEF0FF', color: '#5B50F0' }
                : { background: 'rgba(51,65,85,0.5)', color: '#94A3B8' }
            }
          >
            <Upload className="w-8 h-8" />
          </motion.div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-lg font-bold" style={{ color: LM ? '#0F172A' : '#FFFFFF' }}>Upload File Word</h3>
            <p className="text-sm" style={{ color: LM ? '#64748B' : '#94A3B8' }}>
              Drag &amp; drop file{' '}
              <strong style={{ color: '#5B50F0' }}>.docx</strong>{' '}
              atau{' '}
              <strong style={{ color: LM ? '#2563EB' : '#60A5FA' }}>.doc</strong>{' '}
              di sini, atau klik tombol di bawah untuk menelusuri folder.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="px-6 py-2.5 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2 transition-all"
            style={{ background: '#5B50F0', boxShadow: '0 4px 14px rgba(91,80,240,0.3)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#4A40E0')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#5B50F0')}
          >
            Pilih Berkas Word
          </motion.button>

          <p className="text-xs" style={{ color: '#94A3B8' }}>Mendukung multi-file upload · Ukuran maksimal 20MB per berkas</p>
        </div>

        {/* Subtle glow decorations */}
        {!LM && (
          <>
            <div className="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-violet-600/5 blur-3xl pointer-events-none" />
            <div className="absolute -left-24 -bottom-24 w-48 h-48 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />
          </>
        )}
      </motion.div>

      {/* ── Privacy Notice ────────────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl text-sm"
        style={LM
          ? { background: '#EEF0FF', border: '1px solid #C7D2FE' }
          : { background: 'rgba(91,80,240,0.08)', border: '1px solid rgba(91,80,240,0.2)' }
        }
      >
        <span className="text-lg mt-0.5">🔒</span>
        <div>
          <p className="font-semibold" style={{ color: LM ? '#0F172A' : '#E0E7FF' }}>Privasi Terjamin Penuh</p>
          <p className="text-xs mt-0.5" style={{ color: LM ? '#64748B' : '#94A3B8' }}>
            Semua pemrosesan, visualisasi, dan ekstraksi teks dilakukan secara lokal 100% di browser Anda. Tidak ada data berkas yang dikirim ke server luar.
          </p>
        </div>
      </div>

      {/* ── Active Progress ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeUploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl p-5 space-y-4"
            style={LM
              ? { background: '#F8FAFC', border: '1px solid #E4E8F0' }
              : { background: 'rgba(30,41,59,0.3)', border: '1px solid #334155' }
            }
          >
            <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: LM ? '#0F172A' : '#CBD5E1' }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#5B50F0' }} />
              Memproses &amp; Menganalisis Dokumen…
            </h4>
            <div className="space-y-3">
              {activeUploads.map(([id, progress]) => (
                <div key={id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 truncate" style={{ color: LM ? '#475569' : '#94A3B8' }}>
                      <File className="w-3.5 h-3.5" style={{ color: '#5B50F0' }} />
                      Sedang memproses dokumen…
                    </span>
                    <span className="font-semibold" style={{ color: '#5B50F0' }}>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: LM ? '#E4E8F0' : '#1e293b' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: 'easeOut', duration: 0.2 }}
                      className="h-full rounded-full"
                      style={{ background: '#5B50F0', boxShadow: '0 0 8px rgba(91,80,240,0.4)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
