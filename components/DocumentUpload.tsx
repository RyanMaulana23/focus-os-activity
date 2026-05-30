'use client';

import { useState, useRef } from 'react';
import { useDocumentStore } from '@/lib/stores/documentStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { Upload, File, Loader2 } from 'lucide-react';
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

  // ── Color tokens per mode ───────────────────────────────────────────────
  // In light mode: indigo gradient header + white text on it.
  // Drop zone stays clean white with soft border.
  const dropzoneBg     = isDragActive
    ? (LM ? 'rgba(91,80,240,0.06)' : 'rgba(91,80,240,0.15)')
    : (LM ? '#FFFFFF' : 'rgba(30,41,59,0.4)');
  const dropzoneBorder = isDragActive ? '#5B50F0' : (LM ? '#CBD5E1' : '#334155');

  return (
    <div className="space-y-5">
      {/* ── Drop Zone ──────────────────────────────────────────────────────── */}
      <motion.div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        layout
        className="relative overflow-hidden rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300"
        style={{ background: dropzoneBg, borderColor: dropzoneBorder }}
        onClick={() => fileInputRef.current?.click()}
        onMouseEnter={(e) => {
          if (!isDragActive) {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#5B50F0';
            (e.currentTarget as HTMLDivElement).style.background = LM ? 'rgba(91,80,240,0.03)' : 'rgba(30,41,59,0.6)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragActive) {
            (e.currentTarget as HTMLDivElement).style.borderColor = LM ? '#CBD5E1' : '#334155';
            (e.currentTarget as HTMLDivElement).style.background = LM ? '#FFFFFF' : 'rgba(30,41,59,0.4)';
          }
        }}
      >
        <input ref={fileInputRef} type="file" multiple accept=".docx,.doc" onChange={handleChange} className="hidden" />

        {/* ── Inner gradient header band ─────────────────────────────────── */}
        <div
          className="px-8 pt-8 pb-6 flex flex-col items-center gap-4"
          style={{ background: LM ? 'linear-gradient(135deg, #5B50F0 0%, #7C3AED 100%)' : 'transparent' }}
        >
          {/* Upload icon */}
          <motion.div
            animate={isDragActive ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="p-4 rounded-full"
            style={isDragActive
              ? { background: LM ? 'rgba(255,255,255,0.25)' : '#5B50F0', color: '#FFFFFF', boxShadow: '0 8px 24px rgba(255,255,255,0.2)' }
              : LM
                ? { background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }
                : { background: 'rgba(51,65,85,0.5)', color: '#94A3B8' }
            }
          >
            <Upload className="w-8 h-8" />
          </motion.div>

          <div className="space-y-1.5 text-center max-w-sm">
            <h3 className="text-lg font-bold" style={{ color: LM ? '#FFFFFF' : '#FFFFFF' }}>
              Upload File Word
            </h3>
            <p className="text-sm" style={{ color: LM ? 'rgba(255,255,255,0.75)' : '#94A3B8' }}>
              Drag &amp; drop file{' '}
              <strong style={{ color: LM ? '#FDE68A' : '#A78BFA' }}>.docx</strong>{' '}
              atau{' '}
              <strong style={{ color: LM ? '#BAE6FD' : '#60A5FA' }}>.doc</strong>{' '}
              di sini, atau klik tombol di bawah untuk menelusuri folder.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="px-6 py-2.5 font-semibold rounded-xl flex items-center gap-2 transition-all"
            style={LM
              ? { background: '#FFFFFF', color: '#5B50F0', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }
              : { background: '#5B50F0', color: '#FFFFFF', boxShadow: '0 4px 14px rgba(91,80,240,0.3)' }
            }
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = LM ? '#F5F3FF' : '#4A40E0';
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = LM ? '#FFFFFF' : '#5B50F0';
            }}
          >
            Pilih Berkas Word
          </motion.button>
        </div>

        {/* ── Footer hint ───────────────────────────────────────────────── */}
        <div
          className="px-8 py-3 text-center text-xs"
          style={LM
            ? { background: '#F8FAFC', borderTop: '1px solid #E4E8F0', color: '#94A3B8' }
            : { color: '#64748B' }
          }
        >
          Mendukung multi-file upload · Ukuran maksimal 20MB per berkas
        </div>
      </motion.div>

      {/* ── Privacy Notice ─────────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl text-sm"
        style={LM
          ? { background: '#EEF0FF', border: '1px solid #C7D2FE' }
          : { background: 'rgba(91,80,240,0.08)', border: '1px solid rgba(91,80,240,0.2)' }
        }
      >
        <span className="text-lg mt-0.5">🔒</span>
        <div>
          <p className="font-semibold" style={{ color: LM ? '#3730A3' : '#E0E7FF' }}>Privasi Terjamin Penuh</p>
          <p className="text-xs mt-0.5" style={{ color: LM ? '#6366F1' : '#94A3B8' }}>
            Semua pemrosesan dilakukan secara lokal 100% di browser Anda. Tidak ada data berkas yang dikirim ke server luar.
          </p>
        </div>
      </div>

      {/* ── Upload Progress ─────────────────────────────────────────────────── */}
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
