'use client';

import { useState, useRef } from 'react';
import { 
  Sparkles, 
  UploadCloud, 
  CheckCircle2, 
  Copy, 
  Check, 
  Eye, 
  HelpCircle, 
  BookOpen, 
  FileText, 
  Info, 
  RefreshCw,
  AlertCircle,
  File,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ElementDetail {
  name: string;
  function: string;
}

interface AnalysisResult {
  elements: ElementDetail[];
  systemPurpose: string;
  academicExplanation: string;
  summary: string;
  unclearParts: string;
}

export function AIAnalyzer() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  // Document-related states
  const [activeDocType, setActiveDocType] = useState<'image' | 'pdf' | 'docx' | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [extractedImages, setExtractedImages] = useState<{ name: string; dataUrl: string }[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0);
  const [isProcessingDoc, setIsProcessingDoc] = useState<boolean>(false);
  
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'elements' | 'purpose' | 'academic' | 'summary'>('elements');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Render PDF Pages to Base64 Images
  const handlePdfUpload = async (file: File) => {
    setIsProcessingDoc(true);
    setError(null);
    setFileName(file.name);
    setFileSize((file.size / 1024 / 1024).toFixed(2) + ' MB');
    setImage(null);
    setPdfPages([]);
    setExtractedImages([]);
    setResult(null);
    setActiveDocType('pdf');
    setSelectedMediaIndex(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Load PDFJS library dynamically (browser-only)
      const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
      const pagesCount = pdf.numPages;
      const renderedPages: string[] = [];

      for (let i = 1; i <= pagesCount; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // High resolution for sharp diagrams
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;
          renderedPages.push(canvas.toDataURL('image/png'));
        }
      }

      if (renderedPages.length === 0) {
        throw new Error('Tidak dapat merender halaman dari PDF ini');
      }

      setPdfPages(renderedPages);
      setImage(renderedPages[0]); // Set first page as default
    } catch (err: any) {
      console.error('PDF Processing error:', err);
      setError(err.message || 'Terjadi kesalahan saat memproses file PDF.');
      setActiveDocType(null);
    } finally {
      setIsProcessingDoc(false);
    }
  };

  // Extract Embedded Media Images from Word (.docx) ZIP
  const handleDocxUpload = async (file: File) => {
    setIsProcessingDoc(true);
    setError(null);
    setFileName(file.name);
    setFileSize((file.size / 1024 / 1024).toFixed(2) + ' MB');
    setImage(null);
    setPdfPages([]);
    setExtractedImages([]);
    setResult(null);
    setActiveDocType('docx');
    setSelectedMediaIndex(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Look inside word/media/ folder for embedded files
      const imageFiles = Object.keys(zip.files).filter(path => 
        path.startsWith('word/media/') && 
        (path.endsWith('.png') || path.endsWith('.jpeg') || path.endsWith('.jpg') || path.endsWith('.webp') || path.endsWith('.gif'))
      );

      if (imageFiles.length === 0) {
        throw new Error('Tidak ditemukan gambar atau diagram yang tertanam (embedded) di dalam dokumen Word ini. Silakan convert diagram Anda menjadi file gambar (PNG/JPG) atau PDF lalu upload kembali.');
      }

      const extracted: { name: string; dataUrl: string }[] = [];
      for (const path of imageFiles) {
        const zipFile = zip.files[path];
        const blob = await zipFile.async('blob');
        
        // Convert blob to DataURL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Gagal mengekstrak gambar dari Word'));
          reader.readAsDataURL(blob);
        });

        const name = path.split('/').pop() || path;
        extracted.push({ name, dataUrl });
      }

      setExtractedImages(extracted);
      setImage(extracted[0].dataUrl); // Set first extracted image as default
    } catch (err: any) {
      console.error('DOCX Processing error:', err);
      setError(err.message || 'Terjadi kesalahan saat memproses file Word.');
      setActiveDocType(null);
    } finally {
      setIsProcessingDoc(false);
    }
  };

  // Convert File to Base64 (Direct Image) or Route to PDF/Word parsers
  const processFile = (file: File) => {
    if (!file) return;

    const fileType = file.type;
    const isImage = fileType.startsWith('image/');
    const isPdf = fileType === 'application/pdf';
    const isDocx = fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   file.name.endsWith('.docx');

    if (isImage) {
      setFileName(file.name);
      setFileSize((file.size / 1024 / 1024).toFixed(2) + ' MB');
      setError(null);
      setResult(null);
      setActiveDocType('image');
      setPdfPages([]);
      setExtractedImages([]);

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const b64 = e.target.result as string;
          setImage(b64);
          // Automatically trigger analysis on direct upload
          analyzeImage(b64);
        }
      };
      reader.readAsDataURL(file);
    } else if (isPdf) {
      handlePdfUpload(file);
    } else if (isDocx) {
      handleDocxUpload(file);
    } else {
      setError('Format file tidak didukung. Silakan upload file Gambar (PNG, JPG, WebP), dokumen PDF (.pdf), atau dokumen Word (.docx).');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Call API for AI Analysis
  const analyzeImage = async (base64Image: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menganalisis gambar');
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
      setActiveTab('elements');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat menghubungkan ke server AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.academicExplanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setFileName('');
    setFileSize('');
    setActiveDocType(null);
    setPdfPages([]);
    setExtractedImages([]);
    setSelectedMediaIndex(0);
  };

  const handleSelectMedia = (index: number, dataUrl: string) => {
    setSelectedMediaIndex(index);
    setImage(dataUrl);
    setResult(null); // Clear previous results when selecting a new page/image to analyze
    setError(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12">
      {/* Dynamic Laser Scanning Keyframes */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0.8; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0.2; }
        }
        .laser-line {
          animation: scan 2s infinite linear;
        }
      `}</style>

      {/* Intro Header */}
      <div className="bg-gradient-to-br from-violet-950/20 via-slate-900/40 to-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              AI Diagram & Document Analyzer
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
              Unggah Gambar (PNG/JPG), dokumen PDF, atau dokumen Word (.docx) berisi diagram, flowchart, ERD, skema arsitektur, atau tangkapan layar sistem. AI akan menganalisis komponen visual, menjelaskan fungsi, dan merumuskan **laporan akademik formal siap pakai untuk skripsi/laporan PKL** Anda.
            </p>
          </div>
        </div>
      </div>

      {!image && !isProcessingDoc ? (
        /* Upload Area (Images, PDF, Word) */
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerUpload}
          className={`group flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 relative overflow-hidden bg-slate-900/20 hover:bg-slate-800/10 min-h-[350px] ${
            dragActive
              ? 'border-violet-500 bg-violet-950/10 shadow-[0_0_30px_rgba(139,92,246,0.1)]'
              : 'border-slate-700 hover:border-slate-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]'
          }`}
        >
          {/* Ambient Glows */}
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl group-hover:bg-blue-600/10 transition-all duration-500" />
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-violet-600/5 rounded-full blur-3xl group-hover:bg-violet-600/10 transition-all duration-500" />

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
          />

          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:border-slate-600 transition-all duration-300">
              <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-violet-400 transition-colors" />
            </div>
            <div>
              <p className="text-white font-bold text-base md:text-lg">
                Drag & drop gambar atau file dokumen di sini, atau klik untuk memilih
              </p>
              <p className="text-slate-400 text-xs md:text-sm mt-1.5 leading-relaxed">
                Mendukung PNG, JPEG, WebP, PDF (.pdf), atau Word (.docx) yang berisi diagram.<br />Maksimal ukuran file 10MB.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <span className="px-3 py-1 text-xs font-semibold bg-slate-800 border border-slate-700 rounded-full text-slate-300">
                ✓ ERD & Class Diagram
              </span>
              <span className="px-3 py-1 text-xs font-semibold bg-slate-800 border border-slate-700 rounded-full text-slate-300">
                ✓ Flowchart & DFD
              </span>
              <span className="px-3 py-1 text-xs font-semibold bg-slate-800 border border-slate-700 rounded-full text-slate-300">
                ✓ Dokumen PDF / Word
              </span>
              <span className="px-3 py-1 text-xs font-semibold bg-slate-800 border border-slate-700 rounded-full text-slate-300">
                ✓ Tangkapan Layar UI
              </span>
            </div>
          </div>
        </div>
      ) : isProcessingDoc ? (
        /* Document Rendering / Extraction loading state */
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-16 text-center shadow-xl flex flex-col items-center justify-center gap-4 min-h-[350px]">
          <Loader2 className="w-12 h-12 text-violet-400 animate-spin" />
          <div className="space-y-1">
            <h3 className="text-white font-bold text-lg">Memproses Berkas Anda...</h3>
            <p className="text-slate-400 text-sm max-w-md">
              {activeDocType === 'pdf' 
                ? 'Sedang merender halaman PDF menjadi gambar beresolusi tinggi secara lokal di browser...'
                : 'Sedang mengekstrak diagram dan gambar dari dokumen Word Anda secara lokal...'}
            </p>
          </div>
        </div>
      ) : (
        /* Preview & Results Screen */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* LEFT: Image preview & Scanning animation / Multi-media selector */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
              
              {/* Main Image Viewport */}
              <div className="relative w-full rounded-xl overflow-hidden bg-slate-950 aspect-video lg:aspect-auto lg:min-h-[260px] flex items-center justify-center border border-slate-800 shadow-inner group">
                {image && (
                  <img
                    src={image}
                    alt="Pratinjau media sistem"
                    className="w-full h-auto object-contain max-h-[380px]"
                  />
                )}

                {/* Real-time laser scanning line */}
                {isLoading && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent laser-line opacity-90 shadow-[0_0_15px_rgba(74,222,128,1)] z-10" />
                )}

                {/* Processing Overlay blur */}
                {isLoading && (
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center transition-all">
                    <div className="flex flex-col items-center gap-3 px-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-2xl">
                      <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
                      <span className="text-xs text-white font-bold tracking-wide uppercase">AI Sedang Menganalisis...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button if document uploaded but not analyzed yet */}
              {activeDocType && activeDocType !== 'image' && !result && !isLoading && (
                <button
                  onClick={() => image && analyzeImage(image)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-blue-650 hover:from-violet-500 hover:to-blue-550 border border-violet-500/30 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-600/10 hover:shadow-violet-600/25 transition-all duration-300 active:scale-[0.98] group"
                >
                  <Sparkles className="w-4 h-4 text-violet-200 group-hover:animate-pulse" />
                  <span>Analisis Halaman Ini Sekarang</span>
                </button>
              )}

              {/* Image Metadata Footer */}
              <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-3 text-slate-400">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5 text-white font-semibold">
                    <File className="w-3.5 h-3.5 text-violet-450 flex-shrink-0" />
                    <p className="truncate" title={fileName}>
                      {fileName}
                    </p>
                  </div>
                  <p className="mt-0.5 pl-5">{fileSize} • {activeDocType?.toUpperCase()}</p>
                </div>
                {!isLoading && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 hover:border-slate-600 text-slate-300 rounded-lg font-medium transition-all active:scale-95 whitespace-nowrap"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Upload Baru</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error alerts */}
            {error && (
              <div className="p-4 bg-red-950/30 border border-red-800/60 rounded-xl flex gap-3 text-red-300 text-sm animate-shake">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-red-200">Gagal Menganalisis</h4>
                  <p className="mt-1 text-xs leading-relaxed">{error}</p>
                  <button
                    onClick={() => image && analyzeImage(image)}
                    className="mt-3 px-3 py-1 bg-red-900/40 border border-red-700/50 hover:bg-red-900/80 rounded text-xs font-semibold transition"
                  >
                    Coba Lagi
                  </button>
                </div>
              </div>
            )}

            {/* Multi-page / Media selector list underneath preview for PDF/Word */}
            {!isLoading && activeDocType && activeDocType !== 'image' && (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                    <span>Daftar Halaman / Gambar</span>
                  </h4>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-violet-950/40 text-violet-400 rounded-full border border-violet-850">
                    {activeDocType === 'pdf' ? `${pdfPages.length} Halaman` : `${extractedImages.length} Gambar`}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {activeDocType === 'pdf' ? (
                    pdfPages.map((pageSrc, idx) => {
                      const isSelected = selectedMediaIndex === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectMedia(idx, pageSrc)}
                          className={`relative rounded-lg overflow-hidden aspect-[3/4] bg-slate-950 border transition-all ${
                            isSelected 
                              ? 'border-violet-500 shadow-md shadow-violet-650/20 ring-1 ring-violet-500' 
                              : 'border-slate-800 hover:border-slate-650'
                          }`}
                        >
                          <img src={pageSrc} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 py-0.5 text-center text-[9px] font-bold text-slate-350">
                            Hal {idx + 1}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    extractedImages.map((imgObj, idx) => {
                      const isSelected = selectedMediaIndex === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectMedia(idx, imgObj.dataUrl)}
                          className={`relative rounded-lg overflow-hidden aspect-square bg-slate-950 border transition-all ${
                            isSelected 
                              ? 'border-violet-500 shadow-md shadow-violet-650/20 ring-1 ring-violet-500' 
                              : 'border-slate-800 hover:border-slate-650'
                          }`}
                        >
                          <img src={imgObj.dataUrl} alt={imgObj.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 py-0.5 text-center text-[9px] font-bold text-slate-350 truncate px-1" title={imgObj.name}>
                            Gbr {idx + 1}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Analysis Outputs */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {isLoading ? (
                /* Scanning Skeleton Loading Screen */
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="h-5 bg-slate-850 rounded-full w-48 animate-pulse" />
                    <div className="h-4 bg-slate-850 rounded-full w-full animate-pulse" />
                    <div className="h-4 bg-slate-850 rounded-full w-5/6 animate-pulse" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="h-28 bg-slate-850/40 border border-slate-800 rounded-xl animate-pulse" />
                    <div className="h-28 bg-slate-850/40 border border-slate-800 rounded-xl animate-pulse" />
                  </div>

                  <div className="space-y-3 mt-2">
                    <div className="h-4 bg-slate-850 rounded-full w-full animate-pulse" />
                    <div className="h-4 bg-slate-850 rounded-full w-11/12 animate-pulse" />
                    <div className="h-4 bg-slate-850 rounded-full w-3/4 animate-pulse" />
                  </div>
                </motion.div>
              ) : result ? (
                /* Final Analysis Panel */
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-900/30 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col"
                >
                  {/* Segmented Tab Headers */}
                  <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 overflow-x-auto scrollbar-none">
                    {[
                      { id: 'elements', label: '1. Identifikasi Elemen', icon: Eye },
                      { id: 'purpose', label: '2. Tujuan & Workflow', icon: Info },
                      { id: 'academic', label: '3. Penjelasan Akademis', icon: BookOpen },
                      { id: 'summary', label: '4. Ringkasan Eksekutif', icon: FileText },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const active = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
                            active
                              ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-600/20'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Body */}
                  <div className="p-6 md:p-8 flex flex-col gap-6">
                    {activeTab === 'elements' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Eye className="w-5 h-5 text-violet-400" />
                            <span>Identifikasi Semua Gambar/Elemen & Fungsinya</span>
                          </h3>
                          <span className="px-2.5 py-1 text-[10px] font-extrabold bg-violet-950/60 text-violet-400 border border-violet-800/50 rounded-full uppercase">
                            {result.elements.length} Komponen Terdeteksi
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {result.elements.map((el, i) => (
                            <div
                              key={i}
                              className="p-4 bg-slate-850/30 hover:bg-slate-850/50 border border-slate-800/70 hover:border-slate-700/60 rounded-xl transition-all duration-300 flex flex-col gap-2 group cursor-default"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-violet-650/15 border border-violet-500/25 flex items-center justify-center text-xs font-bold text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                                  {i + 1}
                                </div>
                                <span className="font-bold text-white text-sm tracking-wide">
                                  {el.name}
                                </span>
                              </div>
                              <p className="text-slate-350 text-xs leading-relaxed pl-8">
                                {el.function}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'purpose' && (
                      <div className="space-y-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                          <Info className="w-5 h-5 text-blue-400" />
                          <span>Tujuan Sistem & Workflow Proses Bisnis</span>
                        </h3>
                        <div className="bg-blue-950/15 border border-blue-900/30 rounded-xl p-5 md:p-6 shadow-inner">
                          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                            {result.systemPurpose}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'academic' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-emerald-400" />
                            <span>Penjelasan Akademis (Format Bab Skripsi / Laporan PKL)</span>
                          </h3>
                          <button
                            onClick={copyToClipboard}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all active:scale-95 ${
                              copied
                                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white'
                            }`}
                          >
                            {copied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Salin Laporan</span>
                              </>
                            )}
                          </button>
                        </div>
                        
                        <div className="relative group bg-slate-950/80 border border-slate-800/80 rounded-xl p-6 shadow-inner">
                          {/* Formal Report Layout decoration */}
                          <div className="absolute top-4 right-4 text-[9px] font-bold text-slate-500 select-none uppercase tracking-widest font-mono">
                            DRAF TULISAN - SIAP SALIN (Laporan / Skripsi)
                          </div>
                          
                          <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
                            {result.academicExplanation}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/20 border border-slate-800/60 rounded-lg p-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>Teks di atas disusun menggunakan bahasa Indonesia baku akademis, kalimat pasif formal yang rapi, metodologis, namun tetap mudah dipahami oleh dosen penguji atau pembimbing skripsi Anda.</span>
                        </div>
                      </div>
                    )}

                    {activeTab === 'summary' && (
                      <div className="space-y-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                          <FileText className="w-5 h-5 text-amber-400" />
                          <span>Ringkasan Eksekutif (Kesimpulan & Hubungan Inti)</span>
                        </h3>
                        <div className="bg-amber-950/15 border border-amber-900/30 rounded-xl p-5 md:p-6">
                          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                            {result.summary}
                          </p>
                        </div>

                        {/* Image Quality / Ambiguity analysis fallback */}
                        {result.unclearParts && (
                          <div className="p-4 bg-slate-850/40 border border-slate-805 rounded-xl flex items-start gap-3 mt-4">
                            <HelpCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Koreksi Kejelasan & Bagian Kurang Terbaca</h4>
                              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                {result.unclearParts}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* Document Onboarding panel - visible when document uploaded but no analysis triggered yet */
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-900/20 border border-slate-800/80 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 min-h-[350px]"
                >
                  <div className="w-16 h-16 rounded-full bg-violet-950/20 border border-violet-850 flex items-center justify-center text-violet-400">
                    <Sparkles className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white font-bold text-lg">Berkas Dokumen Berhasil Dimuat</h3>
                    <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                      {activeDocType === 'pdf'
                        ? 'Silakan gunakan panel navigasi di sebelah kiri untuk melihat halaman PDF Anda. Klik tombol "Analisis Halaman Ini Sekarang" untuk memulai analisis akademis mendalam.'
                        : 'Kami mendeteksi gambar/skema di dalam berkas Word Anda. Pilih gambar pada panel navigasi kiri dan klik "Analisis Halaman Ini Sekarang" untuk memulai.'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
        </div>
      )}
    </div>
  );
}
