'use client';

import { useState, useEffect } from 'react';

import { useNotesStore } from '@/lib/stores/notesStore';
import { useDocumentStore } from '@/lib/stores/documentStore';
import {
  Trash2, FileText, ChevronDown, ChevronUp,
  Eye, X, Sparkles, BookOpen, Edit2, Bookmark, BookmarkCheck,
  Download, Send, Search, Folder
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { renderMarkdownAndKatex } from '@/lib/utils/markdownParser';
import { exportMarkdownToPDF } from '@/lib/utils/exportToPDF';
import { exportMarkdownToDocx } from '@/lib/utils/exportToDOCX';


// ── File Viewer Modal ──────────────────────────────────────────────────────────
function FileViewerModal({
  note,
  onClose,
}: {
  note: { title: string; fileDataUrl?: string; fileMimeType?: string; content: string; fileName?: string };
  onClose: () => void;
}) {
  const isPdf = note.fileMimeType === 'application/pdf';
  const isImage = note.fileMimeType?.startsWith('image/');
  const hasDataUrl = !!note.fileDataUrl;
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    if (isPdf && note.fileDataUrl) {
      let url = note.fileDataUrl;
      let isBlobCreated = false;

      if (note.fileDataUrl.startsWith('data:')) {
        try {
          const arr = note.fileDataUrl.split(',');
          const mimeMatch = arr[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          url = URL.createObjectURL(blob);
          isBlobCreated = true;
        } catch (e) {
          console.error('Failed to convert base64 to blob url:', e);
        }
      }
      setPdfUrl(url);

      return () => {
        if (isBlobCreated && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      };
    }
  }, [note.fileDataUrl, isPdf]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-violet-600/20 rounded-lg">
              <FileText className="w-4 h-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{note.title}</p>
              {note.fileName && (
                <p className="text-xs text-slate-400 truncate">{note.fileName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {hasDataUrl && isPdf ? (
            // PDF Viewer via <iframe>
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={`Preview: ${note.title}`}
            />
          ) : hasDataUrl && isImage ? (

            // Image Viewer
            <div className="h-full overflow-auto flex items-center justify-center p-6 bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={note.fileDataUrl}
                alt={note.title}
                className="max-w-full max-h-full object-contain rounded border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200"
              />
            </div>
          ) : hasDataUrl && !isPdf ? (
            // Word or other: show extracted text
            <div className="h-full overflow-y-auto p-6 bg-slate-950/20">
              <div className="max-w-3xl mx-auto prose prose-invert">
                <div className="flex items-center gap-2 mb-4 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 not-prose">
                  <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  Word file ditampilkan sebagai teks yang diekstrak. Format asli tidak dapat ditampilkan di browser.
                </div>
                <div className="text-slate-200">
                  {renderMarkdownAndKatex(note.content)}
                </div>
              </div>
            </div>
          ) : (
            // No data URL (file too large to store, or text note)
            <div className="h-full overflow-y-auto p-6 bg-slate-950/20">
              <div className="max-w-3xl mx-auto prose prose-invert">
                {!hasDataUrl && note.fileName && (
                  <div className="flex items-center gap-2 mb-4 text-xs text-slate-400 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 not-prose">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    File terlalu besar untuk preview langsung. Menampilkan teks yang diekstrak.
                  </div>
                )}
                <div className="text-slate-200">
                  {renderMarkdownAndKatex(note.content)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Offline simple semantic Q&A solver following AI STUDY ASSISTANT OFFLINE rules
export function getAIResponse(query: string, noteContent: string): string {
  const q = query.toLowerCase().trim();
  if (!q) return 'Tulis pertanyaan Anda terlebih dahulu.';

  // 1. Clean the note content from typical PDF extraction boilerplate
  const cleanedContent = noteContent
    .replace(/<[^>]*>/g, '') // remove HTML tags if any
    .replace(/\[Halaman \d+\]/gi, '') // remove page markers
    .replace(/\r/g, '');

  // 2. Split into sentences or lines
  const sentences = cleanedContent
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  // 3. Extract core keywords from query, filtering out common stop words / question words
  const stopWords = new Set([
    'apa', 'itu', 'adalah', 'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 
    'pada', 'ini', 'itu', 'atau', 'karena', 'maka', 'jika', 'bagaimana', 'siapa', 
    'mengapa', 'jelaskan', 'tentang', 'apakah', 'sih', 'dong', 'ya', 'kah', 'perbedaan',
    'persamaan', 'tutor', 'belajar', 'materi', 'tuliskan', 'sebutkan'
  ]);
  const queryWords = q
    .split(/[^a-zA-Z0-9\u00C0-\u024F]/)
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 2 && !stopWords.has(w));

  // If no keywords left, use words from original query split
  const searchWords = queryWords.length > 0 
    ? queryWords 
    : q.split(/\s+/).map(w => w.trim().toLowerCase()).filter(w => w.length > 2);

  // 4. Score each sentence based on keyword match density
  const scored = sentences.map((sentence, index) => {
    const sLower = sentence.toLowerCase();
    let score = 0;
    
    searchWords.forEach(word => {
      if (sLower.includes(word)) {
        score += 10;
        // Exact word boundary match
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(sLower)) {
          score += 10;
        }
      }
    });

    // Boost if the sentence contains definitions
    if (sLower.includes('adalah') || sLower.includes('merupakan') || sLower.includes('yaitu')) {
      score += 5;
    }

    // Penalize bullet symbols inside the raw text score so we don't prefer them over actual sentences
    if (sLower.startsWith('•') || sLower.startsWith('-') || sLower.startsWith('*')) {
      score -= 2;
    }

    return { sentence, score, index };
  });

  // 5. Select the highest scoring sentences
  const candidates = scored
    .filter(c => c.score > 1)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return 'Informasi tersebut tidak ditemukan pada materi yang diberikan.';
  }

  // Pick the top matched candidate
  const cleanAnswer = (text: string): string => {
    return text
      .replace(/[\*\#\`\_\>]/g, '') // remove markdown symbols
      .replace(/^[•\-\*\s\d\.\)]+/, '') // remove bullet points or numbers at the start of sentence
      .replace(/<\/?[^>]+(>|$)/g, '') // remove remaining HTML tags
      .replace(/\s+/g, ' ') // normalize spaces
      .trim();
  };

  // Build natural tutor response (clean paragraph directly answering user)
  // Let's get up to 2 high-scoring candidates and sort them by original index to preserve reading flow
  const topCandidates = [candidates[0]];
  if (candidates.length > 1 && candidates[1].score > (candidates[0].score * 0.7)) {
    topCandidates.push(candidates[1]);
  }

  const uniqueSentences: string[] = [];
  topCandidates.sort((a, b) => a.index - b.index).forEach(c => {
    const cleaned = cleanAnswer(c.sentence);
    if (cleaned && !uniqueSentences.some(existing => existing.toLowerCase().includes(cleaned.toLowerCase()) || cleaned.toLowerCase().includes(existing.toLowerCase()))) {
      uniqueSentences.push(cleaned);
    }
  });

  const finalAnswer = uniqueSentences.join(' ');

  // Ensure first char is capitalized and ends with a period
  let formattedAnswer = finalAnswer.charAt(0).toUpperCase() + finalAnswer.slice(1);
  if (formattedAnswer && !formattedAnswer.endsWith('.') && !formattedAnswer.endsWith('?') && !formattedAnswer.endsWith('!')) {
    formattedAnswer += '.';
  }

  return formattedAnswer;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function NotesViewer() {
  const notes = useNotesStore((s) => s.notes);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const setEditing = useNotesStore((s) => s.setEditing);
  const toggleBookmark = useNotesStore((s) => s.toggleBookmark);
  const folders = useNotesStore((s) => s.folders);
  const documents = useDocumentStore((s) => s.documents);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<typeof notes[0] | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'task' | 'material' | 'summary'>('all');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('all');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [selectedTag, setSelectedTag] = useState('all');

  // AI Assistant Chat state (per noteId)
  const [chats, setChats] = useState<Record<string, { sender: 'user' | 'ai'; text: string }[]>>({});
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});



  // Dynamic tags list in all notes
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));

  // Filter application
  const filtered = notes.filter((n) => {
    const matchesCategory = filterCategory === 'all' || n.category === filterCategory;
    const matchesFolder = selectedFolderId === 'all' || n.folderId === selectedFolderId;
    const matchesBookmark = !onlyBookmarked || n.isBookmarked;
    const matchesTag = selectedTag === 'all' || (n.tags && n.tags.includes(selectedTag));
    const matchesSearch = searchQuery.trim() === '' || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesFolder && matchesBookmark && matchesTag && matchesSearch;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );

  const categoryColor = (cat: string) => {
    switch (cat) {
      case 'task':     return 'from-orange-600 to-red-600';
      case 'material': return 'from-violet-600 to-blue-600';
      case 'summary':  return 'from-green-600 to-emerald-600';
      default:         return 'from-slate-600 to-slate-700';
    }
  };

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'task':     return 'Tugas';
      case 'material': return 'Materi';
      case 'summary':  return 'Ringkas';
      default:         return 'Lainnya';
    }
  };

  // ── Document Actions ────────────────────────────────────────────────
  const handleExportPdf = async (note: typeof notes[0]) => {
    try {
      await exportMarkdownToPDF(
        note.content,
        note.title,
        `${note.title.replace(/\s+/g, '_')}.pdf`,
        {
          category: categoryLabel(note.category),
          createdAt: new Date(note.uploadedAt),
        },
        note.summary
      );
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Gagal mengekspor PDF. Silakan coba lagi.');
    }
  };

  const handleExportDocx = async (note: typeof notes[0]) => {
    try {
      await exportMarkdownToDocx(
        note.content,
        note.title,
        `${note.title.replace(/\s+/g, '_')}.docx`,
        {
          category: categoryLabel(note.category),
          createdAt: new Date(note.uploadedAt),
        },
        note.summary
      );
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      alert('Gagal mengekspor DOCX. Silakan coba lagi.');
    }
  };

  // ── AI Study Assistant Chat logic ───────────────────────────────────
  const handleSendChat = (noteId: string, noteContent: string) => {
    const input = chatInputs[noteId] || '';
    if (!input.trim()) return;

    const currentHistory = chats[noteId] || [];
    const userMessage = { sender: 'user' as const, text: input };
    const nextHistory = [...currentHistory, userMessage];

    setChats(prev => ({ ...prev, [noteId]: nextHistory }));
    setChatInputs(prev => ({ ...prev, [noteId]: '' }));

    // Local heuristic reply after small typing delay
    setTimeout(() => {
      const reply = getAIResponse(input, noteContent);
      setChats(prev => ({
        ...prev,
        [noteId]: [...(prev[noteId] || []), { sender: 'ai' as const, text: reply }]
      }));
    }, 500);
  };



  const filtersList: Array<'all' | 'task' | 'material' | 'summary'> = ['all', 'task', 'material', 'summary'];

  return (
    <>
      {/* File Viewer Modal */}
      {viewingNote && (
        <FileViewerModal note={viewingNote} onClose={() => setViewingNote(null)} />
      )}

      <div className="space-y-6">
        {/* Total Documents Stats Header */}
        <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
          <div className="text-center p-3 bg-slate-900/60 rounded-xl border border-slate-800/50 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Catatan Belajar</span>
            <span className="text-2xl font-extrabold text-white mt-1 select-all">{notes.length} data</span>
          </div>
          <div className="text-center p-3 bg-slate-900/60 rounded-xl border border-slate-800/50 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Dokumen Word</span>
            <span className="text-2xl font-extrabold text-white mt-1 select-all">{documents.length} file</span>
          </div>
        </div>

        {/* Header Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-blue-600 rounded-lg shadow-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Catatan Saya</h2>
          <span className="ml-auto text-xs text-slate-400 font-semibold bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            {sorted.length} hasil
          </span>
        </div>

        {/* Realtime Search & Database Filters */}
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cari kata kunci dalam materi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
            />
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            {/* Folder selection dropdown */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5">
              <Folder className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="bg-transparent border-none text-slate-300 text-xs font-semibold focus:ring-0 outline-none cursor-pointer py-1 max-w-[140px]"
              >
                <option value="all" className="bg-slate-900 text-slate-300">Semua Folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id} className="bg-slate-900 text-slate-300">📂 {f.name}</option>
                ))}
              </select>
            </div>

            {/* Bookmark button filter */}
            <button
              onClick={() => setOnlyBookmarked(!onlyBookmarked)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                onlyBookmarked
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {onlyBookmarked ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{onlyBookmarked ? 'Hanya Bookmark' : 'Semua'}</span>
            </button>
          </div>

          {/* Dynamic Tag Filter Panel */}
          {allTags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap py-1.5 border-b border-slate-850 select-none">
              <span
                onClick={() => setSelectedTag('all')}
                className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold cursor-pointer transition-all border uppercase tracking-wider ${
                  selectedTag === 'all'
                    ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                    : 'bg-slate-800/30 border-slate-700/40 text-slate-500 hover:text-slate-300'
                }`}
              >
                Semua Tag
              </span>
              {allTags.map((tag) => (
                <span
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold cursor-pointer transition-all border uppercase tracking-wider ${
                    selectedTag === tag
                      ? 'bg-blue-600/30 border-blue-500/50 text-blue-300 font-bold'
                      : 'bg-slate-800/30 border-slate-700/40 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 bg-slate-950/40 p-0.5 rounded-xl border border-slate-800">
          {filtersList.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`flex-1 px-3 py-2 rounded-lg font-bold transition text-xs uppercase tracking-wider ${
                filterCategory === cat
                  ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'all' ? 'Semua' : categoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Notes Grid */}
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
            <div className="p-3 bg-slate-800/40 rounded-xl mb-3">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            </div>
            <p className="text-slate-400 text-sm font-semibold">Hasil tidak ditemukan</p>
            <p className="text-slate-600 text-xs mt-1">Coba ubah kata kunci pencarian atau bersihkan filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((note) => {
              const isExpanded = expandedId === note.id;
              const canPreview = !!(note.fileDataUrl || note.content);
              const noteChats = chats[note.id] || [];

              return (
                <div
                  key={note.id}
                  className="bg-gradient-to-br from-slate-900 to-slate-955 rounded-2xl border border-slate-800/80 overflow-hidden hover:border-slate-600/50 hover:shadow-2xl transition-all duration-300 relative group"
                >
                  {/* Bookmark ribbon indicator */}
                  {note.isBookmarked && (
                    <div className="absolute top-0 right-12 w-6 h-6 bg-gradient-to-b from-amber-500 to-yellow-600 rounded-b shadow-md flex items-center justify-center z-10">
                      <Bookmark className="w-3.5 h-3.5 text-white fill-white" />
                    </div>
                  )}

                  {/* Card Header Banner */}
                  <div className={`bg-gradient-to-r ${categoryColor(note.category)} px-5 py-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-extrabold text-base truncate">{note.title}</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[9px] bg-black/30 text-white font-extrabold uppercase px-2 py-0.5 rounded">
                            {categoryLabel(note.category)}
                          </span>
                          {note.fileType && note.fileType !== 'text' && (
                            <span className="text-[9px] bg-black/30 text-white font-extrabold uppercase px-2 py-0.5 rounded flex items-center gap-1">
                              📄 {note.fileType}
                            </span>
                          )}
                          <span className="text-[10px] text-white/70 font-medium">
                            {formatDistanceToNow(new Date(note.uploadedAt), { addSuffix: true, locale: id })}
                          </span>
                        </div>
                      </div>

                      {/* Top action controls */}
                      <div className="flex items-center gap-1 flex-shrink-0 relative z-10">
                        {/* Bookmark trigger */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(note.id);
                          }}
                          className="p-2 bg-black/30 hover:bg-black/50 rounded-lg transition text-white/80 hover:text-white"
                          title="Tandai Materi"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${note.isBookmarked ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        </button>

                        {/* Edit Pencil Action */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(true, note.id);
                          }}
                          className="p-2 bg-black/30 hover:bg-black/50 rounded-lg transition text-white/80 hover:text-white"
                          title="Edit Catatan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick View */}
                        {canPreview && (
                          <button
                            onClick={() => setViewingNote(note)}
                            className="p-2 bg-black/30 hover:bg-black/50 rounded-lg transition text-white/80 hover:text-white"
                            title="Pratinjau visual"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (expandedId === note.id) setExpandedId(null);
                            deleteNote(note.id);
                          }}
                          className="p-2 bg-black/30 hover:bg-red-600 rounded-lg transition text-white/80 hover:text-white"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body content preview */}
                  <div className="px-5 py-4 space-y-4">
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : note.id)}
                      className="cursor-pointer"
                    >
                      <p className="text-slate-300 text-sm line-clamp-2 leading-relaxed hover:text-slate-200 transition-colors">
                        {note.content.substring(0, 180)}{note.content.length > 180 ? '…' : ''}
                      </p>
                    </div>

                    {/* Meta indicator row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-800/80 pt-3">
                      {/* Tags list */}
                      {note.tags && note.tags.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {note.tags.map(t => (
                            <span key={t} className="bg-slate-800/60 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-bold border border-slate-700/50">
                              #{t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[10px]">Tanpa tag</span>
                      )}

                      {/* Expand / collapse trigger */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : note.id)}
                        className="flex items-center gap-1 font-semibold text-[11px] text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-wider"
                      >
                        {isExpanded ? (
                          <><ChevronUp className="w-3.5 h-3.5" />Tutup</>
                        ) : (
                          <><ChevronDown className="w-3.5 h-3.5" />Buka Detail &amp; AI Workspace</>
                        )}
                      </button>
                    </div>

                    {/* EXPANDED ACTIVE CONTENT & TOOLS */}
                    {isExpanded && (
                      <div className="border-t border-slate-800 pt-4 space-y-5 animate-in fade-in slide-in-from-top-3 duration-250">
                        
                        {/* 1. Full Note Content Screen */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-violet-400" /> Konten Catatan Lengkap
                          </p>
                          <div className="max-h-96 overflow-y-auto rounded-xl bg-slate-950/60 border border-slate-800 p-4 shadow-inner prose prose-invert max-w-none">
                            {renderMarkdownAndKatex(note.content)}
                          </div>
                        </div>

                        {/* 2. Structured AI Summary Banner */}
                        {note.summary ? (
                          <div className="bg-gradient-to-br from-emerald-950/40 to-teal-950/20 rounded-xl border border-emerald-500/30 p-4 shadow-lg shadow-emerald-950/10 prose prose-invert max-w-none">
                            <div className="flex items-center gap-2 mb-2 not-prose">
                              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                                Ringkasan Instan AI
                              </p>
                            </div>
                            <div className="text-slate-200">
                              {renderMarkdownAndKatex(note.summary)}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/20 rounded-xl px-3 py-3 border border-slate-800 shadow-inner">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                            Ringkasan sedang dimuat otomatis dari panel editor...
                          </div>
                        )}

                        {/* 3. Export & Download Tools */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            🚀 Ekspor &amp; Unduh Dokumen
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => handleExportPdf(note)}
                              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition active:scale-95 shadow"
                            >
                              <Download className="w-3.5 h-3.5 text-blue-400" />
                              <span>Cetak PDF</span>
                            </button>
                            <button
                              onClick={() => handleExportDocx(note)}
                              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition active:scale-95 shadow"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ekspor Word (.doc)</span>
                            </button>
                          </div>
                        </div>

                        {/* 4. AI STUDY ASSISTANT PANEL */}
                        <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                            <Sparkles className="w-4 h-4 text-violet-400" />
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">AI Study Assistant (Offline)</h4>
                          </div>

                          {/* Chat messages stream */}
                          <div className="max-h-44 overflow-y-auto space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-900 shadow-inner">
                            {noteChats.length === 0 ? (
                              <p className="text-[11px] text-slate-500 text-center italic py-4">Tanyakan apa saja seputar isi materi catatan ini secara offline...</p>
                            ) : (
                              noteChats.map((chat, cIdx) => (
                                <div
                                  key={cIdx}
                                  className={`p-2 rounded-lg text-xs leading-relaxed max-w-[85%] ${
                                    chat.sender === 'user'
                                      ? 'bg-violet-600/20 text-violet-200 ml-auto border border-violet-500/20'
                                      : 'bg-slate-800 text-slate-200 border border-slate-700/60'
                                  }`}
                                >
                                  <p className="font-semibold text-[10px] uppercase text-slate-400 tracking-wider mb-0.5">
                                    {chat.sender === 'user' ? 'Anda' : 'Focus AI'}
                                  </p>
                                  <p className="whitespace-pre-wrap">{chat.text}</p>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Input chat */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Tanya AI: 'Apa konsep utama?', 'Jelaskan rumus'..."
                              value={chatInputs[note.id] || ''}
                              onChange={(e) => setChatInputs({ ...chatInputs, [note.id]: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSendChat(note.id, note.content);
                              }}
                              className="flex-1 bg-slate-800 border border-slate-750 text-xs rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                            <button
                              onClick={() => handleSendChat(note.id, note.content)}
                              className="p-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-550 hover:to-blue-550 rounded-xl text-white transition active:scale-95 shadow-md shadow-violet-600/10"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>



                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
