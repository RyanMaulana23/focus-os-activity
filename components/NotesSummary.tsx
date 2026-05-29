'use client';

import { useState, useEffect } from 'react';
import { useNotesStore } from '@/lib/stores/notesStore';
import { Zap, Plus, Trash2, Sparkles, RefreshCw, Eye, Send } from 'lucide-react';
import { getAIResponse } from './NotesViewer';

export function NotesSummary() {
  const notes                 = useNotesStore((s) => s.notes);
  const generateSummaryInStore = useNotesStore((s) => s.generateSummary);
  const addSummaryNote        = useNotesStore((s) => s.addSummaryNote);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [summaryText,    setSummaryText]    = useState('');
  const [isGenerating,   setIsGenerating]   = useState(false);
  const [showSaved,      setShowSaved]      = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  // AI Assistant Chat state (per noteId)
  const [chats, setChats] = useState<Record<string, { sender: 'user' | 'ai'; text: string }[]>>({});
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});

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

  const candidates = notes.filter(
    (n) => n.category === 'material' || n.category === 'task'
  );

  const selectedNote = candidates.find((n) => n.id === selectedNoteId) ?? null;

  // ── When selected note changes, load its existing summary (or reset) ────
  useEffect(() => {
    if (!selectedNote) {
      setSummaryText('');
      setShowFullContent(false);
      return;
    }
    // If note already has a summary (from auto-generate on upload), show it
    setSummaryText(selectedNote.summary ?? '');
    setShowFullContent(false);
  }, [selectedNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generate / Regenerate ────────────────────────────────────────────────
  const doGenerate = async (note: NonNullable<typeof selectedNote>) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/analyze-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: note.fileType !== 'image' ? note.content : undefined,
          image: note.fileType === 'image' ? note.fileDataUrl : undefined,
          title: note.title,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gagal memanggil API Gemini');
      }

      const data = await response.json();
      setSummaryText(data.summary);
      generateSummaryInStore(note.id, data.summary);
    } catch (err) {
      console.error('[NotesSummary] Generate error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
    // useEffect above will handle loading the stored summary
  };

  const handleSave = () => {
    if (!selectedNoteId || !summaryText.trim()) return;
    addSummaryNote(selectedNoteId, summaryText);
    setShowSaved(true);
    setTimeout(() => {
      setShowSaved(false);
      setSelectedNoteId(null);
      setSummaryText('');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Generate &amp; Ringkas Materi</h2>
          <p className="text-xs text-slate-400 mt-0.5">Ringkasan otomatis dibuat saat upload · klik catatan untuk melihat</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Note List ─────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-4 sm:p-6">
          <h3 className="text-base font-bold text-white mb-4">Pilih Catatan</h3>

          {candidates.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-50" />
              <p className="text-slate-400 text-sm">Belum ada catatan untuk diringkas</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {candidates.map((note) => (
                <button
                  key={note.id}
                  onClick={() => handleSelectNote(note.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all border ${
                    selectedNoteId === note.id
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 border-violet-500 text-white shadow-lg shadow-violet-600/20'
                      : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">{note.title}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {note.category === 'material' ? 'Materi' : 'Tugas'}
                        {note.fileType && note.fileType !== 'text' ? ` · ${note.fileType.toUpperCase()}` : ''}
                        {' · '}{note.content.length.toLocaleString('id-ID')} karakter
                      </p>
                    </div>
                    {note.summary && (
                      <span className="flex-shrink-0 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Ringkas
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Summary Panel ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {selectedNote ? (
            <>
              {/* Selected note info */}
              <div className="bg-slate-700/30 rounded-xl border border-slate-600 p-4">
                <p className="text-xs text-slate-400 mb-1">Catatan Dipilih:</p>
                <p className="text-sm text-white font-semibold">{selectedNote.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {selectedNote.fileType && selectedNote.fileType !== 'text' && (
                    <span className="text-xs bg-slate-600/60 text-slate-300 px-2 py-0.5 rounded">
                      📄 {selectedNote.fileType.toUpperCase()}
                    </span>
                  )}
                  {selectedNote.fileName && (
                    <span className="text-xs text-slate-400 truncate max-w-[200px]">
                      {selectedNote.fileName}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    {selectedNote.content.length.toLocaleString('id-ID')} karakter
                  </span>
                </div>

                {/* Toggle show full content */}
                <button
                  onClick={() => setShowFullContent((v) => !v)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showFullContent ? 'Sembunyikan konten' : 'Lihat konten asli'}
                </button>

                {showFullContent && (
                  <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-slate-800 border border-slate-700 p-3">
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {selectedNote.content}
                    </p>
                  </div>
                )}
              </div>

              {/* Generate / Regenerate button */}
              <button
                onClick={() => doGenerate(selectedNote)}
                disabled={isGenerating}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  isGenerating
                    ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
                    : summaryText
                    ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-600/40'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
                    Menganalisis konten…
                  </>
                ) : summaryText ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Regenerate Ringkasan
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate Ringkasan
                  </>
                )}
              </button>

              {/* Summary output */}
              {summaryText && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-emerald-600/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        RINGKASAN OTOMATIS
                      </span>
                      <button
                        onClick={() => setSummaryText('')}
                        className="p-1 hover:bg-red-600/20 rounded transition text-slate-500 hover:text-red-400"
                        title="Hapus ringkasan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-sm text-slate-200 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {summaryText}
                    </div>
                  </div>

                  {/* Save */}
                  <button
                    onClick={handleSave}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-600/40 transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Simpan sebagai Catatan Ringkasan
                  </button>

                  {showSaved && (
                    <div className="bg-emerald-600/20 border border-emerald-500 text-emerald-300 px-4 py-3 rounded-lg text-sm text-center">
                      ✓ Ringkasan berhasil disimpan ke catatan!
                    </div>
                  )}
                </div>
              )}

              {/* No summary yet but note has no auto-summary */}
              {!summaryText && !isGenerating && (
                <div className="bg-slate-700/20 border border-dashed border-slate-600 rounded-xl p-6 text-center">
                  <Sparkles className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                  <p className="text-slate-400 text-sm">
                    {selectedNote.summary
                      ? 'Ringkasan sudah ada — lihat di atas'
                      : 'Klik "Generate Ringkasan" untuk membuat ringkasan'}
                  </p>
                </div>
              )}

              {/* AI Study Assistant Chat Panel */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3 mt-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">AI Study Assistant (Offline)</h4>
                </div>

                {/* Chat messages stream */}
                <div className="max-h-44 overflow-y-auto space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-900 shadow-inner">
                  {(chats[selectedNote.id] || []).length === 0 ? (
                    <p className="text-[11px] text-slate-500 text-center italic py-4">Tanyakan apa saja seputar isi materi catatan ini secara offline...</p>
                  ) : (
                    (chats[selectedNote.id] || []).map((chat, cIdx) => (
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
                    value={chatInputs[selectedNote.id] || ''}
                    onChange={(e) => setChatInputs({ ...chatInputs, [selectedNote.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendChat(selectedNote.id, selectedNote.content);
                    }}
                    className="flex-1 bg-slate-800 border border-slate-750 text-xs rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                  <button
                    onClick={() => handleSendChat(selectedNote.id, selectedNote.content)}
                    className="p-2 bg-gradient-to-r from-violet-600 to-blue-650 hover:from-violet-550 hover:to-blue-550 rounded-xl text-white transition active:scale-95 shadow-md shadow-violet-600/10"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-700/20 rounded-xl border border-dashed border-slate-600 p-6 sm:p-12 flex items-center justify-center min-h-80">
              <div className="text-center">
                <Zap className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-40" />
                <p className="text-slate-400 font-medium">Pilih catatan untuk memulai</p>
                <p className="text-slate-500 text-sm mt-1">Ringkasan otomatis langsung tersedia</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
