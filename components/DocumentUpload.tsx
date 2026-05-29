'use client';

import { useState, useRef } from 'react';
import { useDocumentStore } from '@/lib/stores/documentStore';
import { Upload, File, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DocumentUpload() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addDocument = useDocumentStore((s) => s.addDocument);
  const uploadProgress = useDocumentStore((s) => s.uploadProgress);
  const addToast = useDocumentStore((s) => s.addToast);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const validateAndProcessFiles = async (files: FileList) => {
    setErrorMsg(null);
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isDoc = file.name.endsWith('.doc') || file.type === 'application/msword';

      if (!isDocx && !isDoc) {
        addToast(`File "${file.name}" ditolak. Hanya mendukung ekstensi .docx dan .doc!`, 'error');
        continue;
      }

      if (file.size > 20 * 1024 * 1024) {
        addToast(`File "${file.name}" melebihi 20MB. Ukuran terlalu besar!`, 'error');
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Process all valid files sequentially
    for (const file of validFiles) {
      try {
        await addDocument(file);
      } catch (err: any) {
        console.error('Upload failure:', err);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await validateAndProcessFiles(e.dataTransfer.files);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await validateAndProcessFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Convert uploadProgress object to array for rendering
  const activeUploads = Object.entries(uploadProgress);

  return (
    <div className="space-y-6">
      {/* ── Dropzone Container ────────────────────────────────────────────────── */}
      <motion.div
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
          isDragActive
            ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-500/10 scale-[1.01]'
            : 'border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        layout
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".docx,.doc"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Animated Glowing Upload Icon */}
          <motion.div
            animate={isDragActive ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className={`p-4 rounded-full ${
              isDragActive
                ? 'bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-600/30'
                : 'bg-slate-700/50 text-slate-400 group-hover:text-slate-300'
            }`}
          >
            <Upload className="w-8 h-8" />
          </motion.div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-lg font-bold text-white">Upload File Word</h3>
            <p className="text-sm text-slate-400">
              Drag &amp; drop file <strong className="text-violet-400">.docx</strong> atau <strong className="text-blue-400">.doc</strong> di sini, atau klik tombol di bawah untuk menelusuri folder.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onButtonClick}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-600/20 transition-all flex items-center gap-2"
          >
            Pilih Berkas Word
          </motion.button>

          <p className="text-xs text-slate-500">Mendukung multi-file upload · Ukuran maksimal 20MB per berkas</p>
        </div>

        {/* Glow decoration */}
        <div className="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-violet-600/5 blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 w-48 h-48 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />
      </motion.div>

      {/* ── Active Progress Grid ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeUploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-800/30 rounded-xl border border-slate-700 p-5 space-y-4"
          >
            <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              Memproses &amp; Menganalisis Dokumen…
            </h4>
            <div className="space-y-3">
              {activeUploads.map(([id, progress]) => (
                <div key={id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5 truncate">
                      <File className="w-3.5 h-3.5 text-blue-400" />
                      Sedang memproses dokumen…
                    </span>
                    <span className="font-semibold text-violet-400">{progress}%</span>
                  </div>
                  {/* Outer track */}
                  <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                    {/* Glowing progress line */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: 'easeOut', duration: 0.2 }}
                      className="h-full bg-gradient-to-r from-violet-600 to-blue-600 rounded-full shadow-lg shadow-violet-500/20"
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
