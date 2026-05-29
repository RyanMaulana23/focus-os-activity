'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useDocumentStore, WordDocument } from '@/lib/stores/documentStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { 
  FolderOpen, 
  File, 
  Download, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Plus, 
  Loader2, 
  Sparkles, 
  BookOpen,
  ArrowLeft,
  Calendar,
  Layers,
  SearchCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentUpload } from './DocumentUpload';

// Fallback text parsing for legacy .doc binary files (OLE structure)
function extractDocTextHeuristic(arrayBuffer: ArrayBuffer): string {
  const view = new DataView(arrayBuffer);
  const paragraphs: string[] = [];
  let currentWord: string[] = [];

  for (let i = 0; i < view.byteLength; i++) {
    const code = view.getUint8(i);
    // Standard printable characters, including common Indonesian/English text, accents
    if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13 || (code >= 128 && code <= 254)) {
      const char = String.fromCharCode(code);
      if (code === 10 || code === 13) {
        if (currentWord.length > 0) {
          const word = currentWord.join('').trim();
          if (word.length > 3 && /[a-zA-Z0-9]/.test(word)) {
            paragraphs.push(word);
          }
          currentWord = [];
        }
      } else {
        currentWord.push(char);
      }
    } else {
      if (currentWord.length > 0) {
        const word = currentWord.join('').trim();
        // Eliminate random binary sequence noises
        if (word.length > 3 && /[a-zA-Z0-9]/.test(word)) {
          paragraphs.push(word);
        }
        currentWord = [];
      }
    }
  }

  if (currentWord.length > 0) {
    const word = currentWord.join('').trim();
    if (word.length > 3 && /[a-zA-Z0-9]/.test(word)) {
      paragraphs.push(word);
    }
  }

  // Filter out pure noise lines containing mostly non-alphabetic characters
  const cleanParagraphs = paragraphs
    .map(p => p.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(p => {
      if (p.length < 5) return false;
      // Must contain some alphabetic letters
      const letters = p.replace(/[^a-zA-Z]/g, '').length;
      return letters > p.length * 0.4;
    });

  if (cleanParagraphs.length === 0) {
    return `[Format Berkas Biner Microsoft Word Lama (.doc)]\n\nEkstraksi teks tidak menemukan konten yang dapat dibaca. Berkas ini bertipe biner terenkripsi atau format non-XML. Silakan konversi berkas ini ke format modern (.docx) untuk preview visual penuh, atau klik tombol "Unduh Berkas Asli" di kanan atas untuk membukanya di desktop.`;
  }

  // Make structured mock headers and margins
  return cleanParagraphs.join('\n\n');
}

export function DocumentViewer() {
  const { 
    documents, 
    activeDocumentId, 
    setActiveDocumentId, 
    deleteDocument,
    restoreDocumentsFromStorage
  } = useDocumentStore();

  // States
  const [zoom, setZoom] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isRenderLoading, setIsRenderLoading] = useState(false);
  const [isUploadingNew, setIsUploadingNew] = useState(false);
  const [docTextContent, setDocTextContent] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Responsive fits
  const [containerWidth, setContainerWidth] = useState(800);
  const [contentHeight, setContentHeight] = useState(1120);

  // Refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mainLayoutRef = useRef<HTMLDivElement>(null);
  const legacyDocRef = useRef<HTMLDivElement>(null);

  // Active doc computed object
  const activeDoc = useMemo(() => {
    return documents.find((d) => d.id === activeDocumentId) || null;
  }, [documents, activeDocumentId]);

  // ── Measure Container Width (Responsive fit) ───────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !scrollContainerRef.current) return;

    const updateWidth = () => {
      if (scrollContainerRef.current) {
        // Safe padding calculation: subtract padding and a small tolerance gap
        const padding = window.innerWidth < 768 ? 24 : 48;
        const width = scrollContainerRef.current.clientWidth - padding;
        setContainerWidth(width > 0 ? width : 800);
      }
    };

    updateWidth();

    // Use ResizeObserver for absolute precise dimensions
    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    
    if (scrollContainerRef.current) {
      observer.observe(scrollContainerRef.current);
    }

    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [activeDoc, isUploadingNew]);

  // ── Calculate dynamic scale factor to prevent squishing ────────────────────
  const dynamicScale = useMemo(() => {
    const baseWidth = 800; // Fixed standard A4 workspace reference
    const fitScale = containerWidth < baseWidth ? containerWidth / baseWidth : 1;
    return fitScale * (zoom / 100);
  }, [containerWidth, zoom]);

  // ── Measure actual content scroll height for scaling wrapper ──────────────
  useEffect(() => {
    const activeRef = docTextContent ? legacyDocRef.current : canvasContainerRef.current;
    if (!activeRef) return;

    const updateHeight = () => {
      if (activeRef) {
        setContentHeight(activeRef.scrollHeight);
      }
    };

    // Perform immediately
    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    
    observer.observe(activeRef);
    
    // Fallback delay to capture late rendering images
    const timer = setTimeout(updateHeight, 500);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [activeDoc, docTextContent, isRenderLoading]);

  // Restore IndexedDB binaries on mount
  useEffect(() => {
    restoreDocumentsFromStorage();
  }, [restoreDocumentsFromStorage]);

  // Document renderer effect
  useEffect(() => {
    if (!activeDoc || typeof window === 'undefined') {
      setDocTextContent(null);
      setTotalPages(1);
      setCurrentPage(1);
      return;
    }

    let isSubscribed = true;
    setIsRenderLoading(true);
    setDocTextContent(null);

    const renderDocument = async () => {
      try {
        const response = await fetch(activeDoc.fileUrl);
        const arrayBuffer = await response.arrayBuffer();

        if (!isSubscribed) return;

        const isDocx = activeDoc.fileName.endsWith('.docx');

        if (isDocx) {
          // Client-side docx rendering
          const docx = await import('docx-preview');
          if (canvasContainerRef.current) {
            canvasContainerRef.current.innerHTML = '';
            
            await docx.renderAsync(arrayBuffer, canvasContainerRef.current, undefined, {
              className: 'docx-rendered',
              inWrapper: false,
              ignoreWidth: true,
              ignoreHeight: true,
              breakPages: true,
              experimental: true,
              renderOfficeMath: true,
            } as any);
            
            if (!isSubscribed || !canvasContainerRef.current) return;
            
            // Adjust visual formatting on rendered elements for extreme premium styling
            const renderedEl = canvasContainerRef.current;
            renderedEl.querySelectorAll('table').forEach((table) => {
              table.className = 'w-full my-4 border-collapse border border-slate-300 text-sm';
              table.querySelectorAll('td, th').forEach((cell) => {
                cell.className = 'p-2.5 border border-slate-300 min-w-[50px]';
              });
            });
            
            renderedEl.querySelectorAll('img').forEach((img) => {
              img.className = 'max-w-full h-auto mx-auto my-4 rounded shadow-sm';
            });

            // Calculate pages
            const pages = renderedEl.querySelectorAll('section, .docx-rendered-section, .page');
            setTotalPages(pages.length || 1);
            setCurrentPage(1);
          }
        } else {
          // Legacy .doc format text fallback
          const extractedText = extractDocTextHeuristic(arrayBuffer);
          if (canvasContainerRef.current) {
            canvasContainerRef.current.innerHTML = '';
          }
          setDocTextContent(extractedText);
          setTotalPages(1);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error('Failed to parse or render document:', err);
        if (canvasContainerRef.current) {
          canvasContainerRef.current.innerHTML = `<div class="p-8 text-center text-red-500 font-semibold flex flex-col items-center gap-3">
            <span className="text-xl">⚠️ Gagal Memuat Dokumen</span>
            <span className="text-sm font-normal text-slate-600">Terjadi kesalahan saat memproses berkas ini secara lokal di browser. Format data berkas mungkin rusak atau tidak didukung secara penuh.</span>
          </div>`;
        }
      } finally {
        if (isSubscribed) {
          setIsRenderLoading(false);
        }
      }
    };

    renderDocument();

    return () => {
      isSubscribed = false;
    };
  }, [activeDoc]);

  // Fullscreen trigger handler
  const toggleFullscreen = () => {
    if (!mainLayoutRef.current) return;
    
    if (!isFullscreen) {
      if (mainLayoutRef.current.requestFullscreen) {
        mainLayoutRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Sync fullscreen change with escape key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Text search highlighter effect
  useEffect(() => {
    if (!canvasContainerRef.current || isRenderLoading) return;
    
    // Reset query status if empty
    if (!searchQuery.trim()) {
      removeHighlights(canvasContainerRef.current);
      setTotalMatches(0);
      setActiveMatchIndex(0);
      return;
    }

    const count = highlightText(canvasContainerRef.current, searchQuery);
    setTotalMatches(count);
    setActiveMatchIndex(0);

    if (count > 0) {
      // Scroll to the first match
      scrollToMatch(0);
    }
  }, [searchQuery, isRenderLoading, activeDoc, docTextContent]);

  // Scroll indicator calculation
  const handleScroll = () => {
    if (!canvasContainerRef.current || !scrollContainerRef.current) return;
    
    // docx-preview renders sections
    const pages = canvasContainerRef.current.querySelectorAll('section, .docx-rendered-section');
    if (pages.length === 0) return;

    const containerRect = scrollContainerRef.current.getBoundingClientRect();
    let closestIdx = 0;
    let minDistance = Infinity;

    pages.forEach((page, idx) => {
      const rect = page.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerRect.top);
      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = idx;
      }
    });

    setCurrentPage(closestIdx + 1);
  };

  // Navigating between matches
  const scrollToMatch = (index: number) => {
    if (!canvasContainerRef.current) return;
    const matches = canvasContainerRef.current.querySelectorAll('.docx-search-match');
    if (matches.length === 0) return;

    // Remove active highlight from all
    matches.forEach(m => m.classList.remove('bg-orange-400', 'ring-2', 'ring-orange-600'));

    // Secure boundary
    const targetIdx = (index + matches.length) % matches.length;
    const targetEl = matches[targetIdx] as HTMLElement;
    
    if (targetEl) {
      targetEl.classList.add('bg-orange-400', 'ring-2', 'ring-orange-600');
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveMatchIndex(targetIdx);
    }
  };

  const handleNextMatch = () => {
    if (totalMatches === 0) return;
    scrollToMatch(activeMatchIndex + 1);
  };

  const handlePrevMatch = () => {
    if (totalMatches === 0) return;
    scrollToMatch(activeMatchIndex - 1);
  };

  // Helper formatting size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const decimals = 1;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  };

  // Highlight execution functions
  function highlightText(element: HTMLElement, query: string): number {
    removeHighlights(element);
    if (!query || !query.trim()) return 0;

    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    let matchCount = 0;

    function recurse(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue || '';
        if (regex.test(text)) {
          const parent = node.parentNode;
          if (parent && parent.nodeName !== 'MARK' && parent.nodeName !== 'SCRIPT' && parent.nodeName !== 'STYLE') {
            const span = document.createElement('span');
            span.className = 'docx-search-highlight-wrapper';

            const parts = text.split(regex);
            parts.forEach((part) => {
              if (regex.test(part)) {
                const mark = document.createElement('mark');
                mark.className = 'bg-yellow-300 text-black px-0.5 rounded shadow-sm docx-search-match transition-all duration-150';
                mark.textContent = part;
                span.appendChild(mark);
                matchCount++;
              } else {
                span.appendChild(document.createTextNode(part));
              }
            });

            parent.replaceChild(span, node);
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement;
        if (elem.tagName !== 'MARK' && elem.tagName !== 'STYLE' && elem.tagName !== 'SCRIPT') {
          const children = Array.from(elem.childNodes);
          children.forEach(recurse);
        }
      }
    }

    recurse(element);
    return matchCount;
  }

  function removeHighlights(element: HTMLElement) {
    const marks = element.querySelectorAll('.docx-search-match');
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        const textNode = document.createTextNode(mark.textContent || '');
        parent.replaceChild(textNode, mark);
      }
    });

    const wrappers = element.querySelectorAll('.docx-search-highlight-wrapper');
    wrappers.forEach((wrapper) => {
      const parent = wrapper.parentNode;
      if (parent) {
        const textNode = document.createTextNode(wrapper.textContent || '');
        parent.replaceChild(textNode, wrapper);
      }
    });

    element.normalize();
  }

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Pre-calculated stats
  const totalUploadedSize = useMemo(() => {
    return formatBytes(documents.reduce((acc, curr) => acc + curr.fileSize, 0));
  }, [documents]);

  return (
    <div ref={mainLayoutRef} className={`w-full flex overflow-hidden h-[calc(100vh-124px)] md:h-screen relative ${isFullscreen ? 'fixed inset-0 z-50 h-screen' : ''}`}>
      {/* ── Background gradient ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 -z-10 pointer-events-none" />

      {/* ── LEFT SIDEBAR: Document History ── */}
      <AnimatePresence initial={false}>
        {(!isFullscreen || isUploadingNew) && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="hidden md:flex flex-col bg-slate-900/60 border-r border-slate-800/80 backdrop-blur-md overflow-hidden shrink-0"
          >
            {/* Sidebar header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-violet-400" />
                <span className="font-bold text-white text-sm">Dokumen Tersimpan</span>
              </div>
              <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                {documents.length} File
              </span>
            </div>

            {/* Quick stats banner */}
            {documents.length > 0 && (
              <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-violet-950/20 to-blue-950/20 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-violet-400" /> Total Data:</span>
                <span className="font-bold text-slate-300">{totalUploadedSize}</span>
              </div>
            )}

            {/* Document list */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {documents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-300">Belum Ada Dokumen</p>
                    <p className="text-xs text-slate-500">Unggah berkas Word Anda untuk memulai analisis dan preview.</p>
                  </div>
                </div>
              ) : (
                documents.map((doc) => {
                  const isActive = doc.id === activeDocumentId;
                  const isDocx = doc.fileName.endsWith('.docx');
                  
                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`relative group rounded-xl p-3 cursor-pointer transition-all duration-300 flex items-center gap-3 border ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-600/15 to-blue-600/10 border-violet-500/80 shadow-md shadow-violet-500/5 text-white'
                          : 'bg-slate-800/20 border-slate-800/60 hover:bg-slate-800/40 hover:border-slate-700/60 text-slate-300'
                      }`}
                      onClick={() => {
                        setActiveDocumentId(doc.id);
                        setIsUploadingNew(false);
                      }}
                    >
                      {/* Premium Document Preview Mini-Thumb */}
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-semibold text-xs shadow-inner"
                        style={{ background: doc.thumbnail }}
                      >
                        {isDocx ? '.DOCX' : '.DOC'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate pr-6 group-hover:text-white transition-colors duration-200">
                          {doc.fileName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                          <span className="font-medium text-slate-400">{formatBytes(doc.fileSize)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>

                      {/* Trash action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDocument(doc.id);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-950/40 hover:text-red-400 text-slate-500 transition-all duration-200"
                        title="Hapus berkas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Upload item sidebar button */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40">
              <button
                type="button"
                onClick={() => setIsUploadingNew(true)}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700/60 shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 text-violet-400" />
                Unggah Berkas Baru
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MOBILE SIDEBAR DRAWER ── */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-y-0 left-0 w-[300px] bg-slate-950 border-r border-slate-800 flex flex-col z-50 h-full shadow-2xl"
            >
              {/* Drawer header */}
              <div className="p-4 border-b border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-violet-400" />
                  <span className="font-bold text-white text-sm">Dokumen Tersimpan</span>
                </div>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Total data banner */}
              {documents.length > 0 && (
                <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-violet-950/20 to-blue-950/20 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-violet-400" /> Total Data:</span>
                  <span className="font-bold text-slate-300">{totalUploadedSize}</span>
                </div>
              )}

              {/* Saved document list */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {documents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-300">Belum Ada Dokumen</p>
                      <p className="text-xs text-slate-500">Unggah berkas Word Anda untuk memulai.</p>
                    </div>
                  </div>
                ) : (
                  documents.map((doc) => {
                    const isActive = doc.id === activeDocumentId;
                    const isDocx = doc.fileName.endsWith('.docx');
                    
                    return (
                      <div
                        key={doc.id}
                        className={`relative rounded-xl p-3 cursor-pointer transition-all duration-300 flex items-center gap-3 border ${
                          isActive
                            ? 'bg-gradient-to-r from-violet-600/15 to-blue-600/10 border-violet-500/80 shadow-md shadow-violet-500/5 text-white'
                            : 'bg-slate-800/20 border-slate-800/60 hover:bg-slate-800/40 hover:border-slate-700/60 text-slate-300'
                        }`}
                        onClick={() => {
                          setActiveDocumentId(doc.id);
                          setIsUploadingNew(false);
                          setIsMobileSidebarOpen(false); // Auto close
                        }}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-semibold text-xs shadow-inner"
                          style={{ background: doc.thumbnail }}
                        >
                          {isDocx ? '.DOCX' : '.DOC'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate pr-6 text-white">
                            {doc.fileName}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                            <span className="font-medium text-slate-400">{formatBytes(doc.fileSize)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDocument(doc.id);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-red-950/40 hover:text-red-400 text-slate-500 transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Upload action */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadingNew(true);
                    setIsMobileSidebarOpen(false);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700/60 shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4 text-violet-400" />
                  Unggah Berkas Baru
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── RIGHT MAIN WORKSPACE: Visual Viewer ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 1. Header Toolbar Controls */}
        <AnimatePresence mode="wait">
          {activeDoc && !isUploadingNew ? (
            <motion.header 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md"
            >
              {/* Back button (Mobile only) */}
              <div className="flex items-center gap-3">
                {/* Folder drawer toggle on mobile */}
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="md:hidden p-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl hover:bg-slate-800 transition flex items-center gap-1.5"
                  title="Lihat berkas tersimpan"
                >
                  <FolderOpen className="w-4 h-4 text-violet-400" />
                  {documents.length > 0 && (
                    <span className="bg-violet-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      {documents.length}
                    </span>
                  )}
                </button>

                {/* Back/Upload new trigger on mobile */}
                <button
                  onClick={() => setIsUploadingNew(true)}
                  className="md:hidden p-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl hover:bg-slate-800 transition"
                  title="Unggah dokumen baru"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                </button>

                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0 font-bold text-xs shadow-md">
                    W
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-[150px] lg:max-w-xs" title={activeDoc.fileName}>
                      {activeDoc.fileName}
                    </h3>
                    <p className="text-[9px] text-slate-500">{formatBytes(activeDoc.fileSize)} · Real-time Preview</p>
                  </div>
                </div>
              </div>

              {/* Toolbar mid controls: Search & Zoom */}
              <div className="flex items-center flex-wrap gap-2 md:gap-4">
                {/* Text Search Input (Ctrl+F representation) */}
                <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-violet-500/80 transition-all duration-300 w-full sm:w-auto max-w-[220px]">
                  <Search className="w-4 h-4 text-slate-500 flex-shrink-0 mr-2" />
                  <input
                    type="text"
                    placeholder="Cari teks di dokumen…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 w-full pr-12"
                  />
                  
                  {/* Total search occurrences found indicator */}
                  {searchQuery && (
                    <div className="absolute right-2 flex items-center gap-1.5 text-[9px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/80">
                      <span className="text-slate-400 font-medium">
                        {totalMatches > 0 ? `${activeMatchIndex + 1}/${totalMatches}` : '0'}
                      </span>
                      {totalMatches > 0 && (
                        <div className="flex items-center gap-0.5 ml-1 border-l border-slate-700 pl-1">
                          <button onClick={handlePrevMatch} className="hover:text-violet-400 transition" title="Match sebelumnya">
                            <ChevronLeft className="w-2.5 h-2.5" />
                          </button>
                          <button onClick={handleNextMatch} className="hover:text-violet-400 transition" title="Match berikutnya">
                            <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
                  <button
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Perkecil"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold text-slate-300 px-2 min-w-[42px] text-center">
                    {zoom}%
                  </span>
                  <button
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Perbesar"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Page Indicator (Bottom or toolbar based) */}
                <div className="hidden lg:flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-400">
                  Halaman {currentPage} dari {totalPages}
                </div>
              </div>

              {/* Toolbar right actions: Fullscreen & Download */}
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                {/* Fullscreen toggle */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition hover:bg-slate-800"
                  title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Download Original File */}
                <a
                  href={activeDoc.fileUrl}
                  download={activeDoc.fileName}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/10 flex items-center gap-2 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh Berkas</span>
                </a>
              </div>
            </motion.header>
          ) : null}
        </AnimatePresence>

        {/* 2. Document Realistic White Paper Canvas Container */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          <AnimatePresence mode="wait">
            {isUploadingNew || !activeDoc ? (
              // ── UPLOADER DISPLAY STATE ──
              <motion.div 
                key="uploader-tab"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 overflow-y-auto p-6 sm:p-12 flex flex-col justify-center max-w-4xl mx-auto w-full"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {activeDoc && (
                        <button
                          onClick={() => setIsUploadingNew(false)}
                          className="p-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                      )}
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                          Unggah Dokumen Word
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">
                          Unggah berkas Microsoft Word untuk ditampilkan secara instan dengan layout premium aslinya.
                        </p>
                      </div>
                    </div>

                    {/* Mobile only toggle on upload screen */}
                    <button
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className="md:hidden p-2.5 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-xl transition flex items-center gap-2"
                      title="Lihat dokumen tersimpan"
                    >
                      <FolderOpen className="w-4 h-4 text-violet-400" />
                      {documents.length > 0 && (
                        <span className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {documents.length}
                        </span>
                      )}
                    </button>
                  </div>

                  <DocumentUpload />
                  
                  {/* Custom tip */}
                  <div className="p-4 bg-violet-950/15 border border-violet-900/30 rounded-2xl flex gap-3 text-xs text-violet-300">
                    <Sparkles className="w-5 h-5 shrink-0 text-violet-400" />
                    <div>
                      <strong className="block font-bold mb-0.5 text-white">Privasi Terjamin Penuh</strong>
                      Semua pemrosesan, visualisasi, dan ekstraksi teks dilakukan secara lokal 100% di browser Anda. Tidak ada data berkas yang dikirim ke server luar.
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              // ── DOCUMENT VIEWING STATE ──
              <motion.div 
                key="viewer-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col min-h-0 relative"
              >
                {/* Background watermarked grid container for physical feel */}
                <div 
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-auto bg-slate-950/60 p-4 sm:p-8 flex justify-center scroll-smooth relative"
                >
                  {/* Mock Skeletons/Spinner while rendering */}
                  {isRenderLoading && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-4">
                      <div className="relative">
                        <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
                        <File className="w-5 h-5 text-blue-400 absolute inset-0 m-auto" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-bold text-white">Merender Tampilan Word…</p>
                        <p className="text-xs text-slate-400">Menyusun layout, tabel, font, dan elemen dokumen.</p>
                      </div>
                    </div>
                  )}

                  {/* Document Canvas Wrapper (Paper sheet container with dynamic scaling) */}
                  <div 
                    className="relative transition-all duration-200 shrink-0"
                    style={{ 
                      width: `${800 * dynamicScale}px`, 
                      height: `${contentHeight * dynamicScale}px`,
                      minHeight: `${1120 * dynamicScale}px`
                    }}
                  >
                    <div
                      ref={canvasContainerRef}
                      className="shadow-[0_20px_50px_rgba(0,0,0,0.35)] bg-white text-black select-text border border-slate-300 rounded docx-rendered-host absolute top-0 left-0 transition-transform duration-200 origin-top-left"
                      style={{
                        width: '800px',
                        padding: '2.5cm 2cm',
                        transform: `scale(${dynamicScale})`,
                        display: docTextContent ? 'none' : 'block'
                      }}
                    />

                    {docTextContent && (
                      <div 
                        ref={legacyDocRef}
                        className="shadow-[0_20px_50px_rgba(0,0,0,0.35)] bg-white text-black select-text border border-slate-300 rounded font-serif text-base leading-relaxed text-justify space-y-6 absolute top-0 left-0 transition-transform duration-200 origin-top-left"
                        style={{
                          width: '800px',
                          padding: '2.5cm 2cm',
                          transform: `scale(${dynamicScale})`,
                        }}
                      >
                        {/* Word Legacy Banner */}
                        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-sans text-blue-800/90 leading-normal flex items-start gap-2.5 mb-8">
                          <SearchCode className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-blue-900 font-bold mb-0.5">Penampil Teks Microsoft Word (.doc)</strong>
                            Berkas ini menggunakan format biner lama. Kami telah memulihkan teks mentah di bawah ini agar Anda tetap dapat membacanya langsung dengan nyaman pada kanvas kertas.
                          </div>
                        </div>

                        {/* Title Header Block */}
                        <div className="border-b-2 border-slate-900 pb-4 mb-8 text-center font-sans">
                          <h1 className="text-2xl font-bold tracking-tight uppercase">{activeDoc.fileName.replace(/\.doc$/i, '')}</h1>
                          <p className="text-[10px] text-slate-500 mt-2 font-medium italic">Diunggah: {new Date(activeDoc.uploadedAt).toLocaleString('id-ID')} · Mode Baca Biner</p>
                        </div>

                        {/* Text Paragraphs */}
                        <div className="whitespace-pre-wrap select-text docx-search-container font-serif text-[15px] leading-[1.8] text-slate-800">
                          {docTextContent}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed floating page/scroll navigator inside viewer */}
                <div className="absolute bottom-6 right-6 bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl px-4 py-2 text-xs font-bold text-slate-300 shadow-xl flex items-center gap-3 z-20">
                  <span className="text-slate-400">Halaman</span>
                  <span className="text-violet-400 bg-slate-800 px-2 py-0.5 rounded">{currentPage}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-400">{totalPages}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Dynamic docx-preview styling overrides to mimic native paper bounds beautifully */}
      <style jsx global>{`
        .docx-rendered-host {
          font-family: 'Calibri', 'Arial', 'Times New Roman', sans-serif !important;
          color: #1a1a1a !important;
        }
        .docx-rendered-host section {
          background: white !important;
          color: black !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 0 4rem 0 !important;
          border-bottom: 2px dashed #e2e8f0;
        }
        .docx-rendered-host section:last-child {
          margin-bottom: 0 !important;
          border-bottom: none !important;
        }
        .docx-rendered-host p {
          margin-bottom: 1rem !important;
          line-height: 1.6 !important;
          font-size: 11pt !important;
        }
        .docx-rendered-host h1, .docx-rendered-host h2, .docx-rendered-host h3 {
          font-family: 'Calibri Light', 'Arial', sans-serif !important;
          font-weight: bold !important;
          color: #2b579a !important; /* Word iconic classic blue header */
          margin-top: 1.5rem !important;
          margin-bottom: 0.75rem !important;
          line-height: 1.25 !important;
        }
        .docx-rendered-host h1 { font-size: 18pt !important; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3rem; }
        .docx-rendered-host h2 { font-size: 14pt !important; }
        .docx-rendered-host h3 { font-size: 12pt !important; }
        .docx-rendered-host ul, .docx-rendered-host ol {
          margin-left: 2rem !important;
          margin-bottom: 1rem !important;
        }
        .docx-rendered-host li {
          margin-bottom: 0.25rem !important;
        }
        .docx-rendered-host table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 1.5rem 0 !important;
        }
        .docx-rendered-host th, .docx-rendered-host td {
          border: 1px solid #c8c8c8 !important;
          padding: 8px 12px !important;
        }
        .docx-rendered-host th {
          background-color: #f3f2f1 !important;
          font-weight: bold !important;
        }
      `}</style>
    </div>
  );
}
