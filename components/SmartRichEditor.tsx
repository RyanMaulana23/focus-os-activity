'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { NoteImage, Folder, useNotesStore } from '@/lib/stores/notesStore';
import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Code, Image as ImageIcon,
  Sparkles, Save, Eye, Edit2, AlertCircle, FileText,
  Plus, Tag, FolderPlus, Download, RefreshCw, HelpCircle,
  Table as TableIcon, Bookmark, BookmarkCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { renderMarkdownAndKatex } from '@/lib/utils/markdownParser';
import { usePlaylistStore } from '@/lib/stores/playlistStore';



interface SmartRichEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialCategory?: 'task' | 'material' | 'summary';
  initialFolderId?: string;
  initialTags?: string[];
  noteId?: string; // If editing an existing note
  onSaveSuccess?: (noteId: string) => void;
  onCancel?: () => void;
}

export function SmartRichEditor({
  initialTitle = '',
  initialContent = '',
  initialCategory = 'material',
  initialFolderId,
  initialTags = [],
  noteId,
  onSaveSuccess,
  onCancel
}: SmartRichEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [category, setCategory] = useState<'task' | 'material' | 'summary'>(initialCategory);
  const [folderId, setFolderId] = useState<string | undefined>(initialFolderId);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialTags);
  const [images, setImages] = useState<NoteImage[]>([]);
  
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'saving'>('idle');
  const [isAiStructuring, setIsAiStructuring] = useState(false);
  const [aiStepLabel, setAiStepLabel] = useState('');
  const [error, setError] = useState('');

  const folders = useNotesStore((s) => s.folders);
  const addFolder = useNotesStore((s) => s.addFolder);
  const addNote = useNotesStore((s) => s.addNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const notes = useNotesStore((s) => s.notes);
  const currentSong = usePlaylistStore((s) => s.currentSong);
  const hasActiveMusic = !!currentSong;


  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<boolean>(false);

  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (mode !== 'split' || isScrollingRef.current) return;
    const editor = e.currentTarget;
    const preview = previewContainerRef.current;
    if (!editor || !preview) return;
    
    isScrollingRef.current = true;
    const editorScrollPercentage = editor.scrollTop / Math.max(editor.scrollHeight - editor.clientHeight, 1);
    preview.scrollTop = editorScrollPercentage * (preview.scrollHeight - preview.clientHeight);
    
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 50);
  };

  const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (mode !== 'split' || isScrollingRef.current) return;
    const preview = e.currentTarget;
    const editor = textareaRef.current;
    if (!editor || !preview) return;
    
    isScrollingRef.current = true;
    const previewScrollPercentage = preview.scrollTop / Math.max(preview.scrollHeight - preview.clientHeight, 1);
    editor.scrollTop = previewScrollPercentage * (editor.scrollHeight - editor.clientHeight);
    
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 50);
  };


  // Load existing note details if we have noteId
  useEffect(() => {
    if (noteId) {
      const activeNote = notes.find((n) => n.id === noteId);
      if (activeNote) {
        setTitle(activeNote.title);
        setContent(activeNote.content);
        setCategory(activeNote.category);
        setFolderId(activeNote.folderId);
        setTags(activeNote.tags || []);
        setImages(activeNote.images || []);
      }
    }
  }, [noteId, notes]);

  // Autosave to LocalStorage as a draft
  useEffect(() => {
    if (!noteId && (title.trim() || content.trim())) {
      const draft = { title, content, category, folderId, tags, images, updatedAt: Date.now() };
      localStorage.setItem('focus_os_note_draft', JSON.stringify(draft));
    }
  }, [title, content, category, folderId, tags, images, noteId]);

  // Load draft on mount
  useEffect(() => {
    if (!noteId) {
      const savedDraft = localStorage.getItem('focus_os_note_draft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          // Only restore if draft is less than 24 hours old
          if (Date.now() - parsed.updatedAt < 24 * 60 * 60 * 1000) {
            setTitle(parsed.title || '');
            setContent(parsed.content || '');
            setCategory(parsed.category || 'material');
            setFolderId(parsed.folderId);
            setTags(parsed.tags || []);
            setImages(parsed.images || []);
          }
        } catch (e) {
          console.warn('Failed to parse note draft', e);
        }
      }
    }
  }, [noteId]);

  // Prevent split screen mode on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && mode === 'split') {
        setMode('edit');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mode]);

  // ── Image Handling ───────────────────────────────────────────────────

  const insertImageIntoContent = useCallback((imageUrl: string, captionText: string = 'Gambar') => {
    const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const newImage: NoteImage = {
      id: imageId,
      imageUrl,
      caption: captionText,
      uploadedAt: new Date().toISOString()
    };

    setImages((prev) => [...prev, newImage]);

    // Insert image tag at current cursor position
    const textarea = textareaRef.current;
    if (textarea) {
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const textBefore = content.substring(0, startPos);
      const textAfter = content.substring(endPos);
      
      const imageMarkdown = `\n\n![${captionText}](${imageUrl})\n\n`;
      setContent(textBefore + imageMarkdown + textAfter);
      
      // Reset cursor pos after render
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = startPos + imageMarkdown.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 50);
    } else {
      setContent((prev) => `${prev}\n\n![${captionText}](${imageUrl})\n\n`);
    }
  }, [content]);

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Hanya file gambar (PNG, JPG, WEBP) yang didukung.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        insertImageIntoContent(reader.result, file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.onerror = () => {
      setError('Gagal membaca berkas gambar.');
    };
    reader.readAsDataURL(file);
  }, [insertImageIntoContent]);

  const onFileSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(handleImageFile);
    }
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(handleImageFile);
    }
  };

  // Clipboard Paste handler (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          handleImageFile(blob);
        }
      }
    }
  };

  // ── Text Format Toolbar Helpers ─────────────────────────────────────
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const selectedText = content.substring(startPos, endPos);
    const textBefore = content.substring(0, startPos);
    const textAfter = content.substring(endPos);

    // Identify if the element is block-level to inject protective line breaks
    const isBlock = 
      prefix.startsWith('#') || 
      prefix.startsWith('-') || 
      prefix.startsWith('1.') || 
      prefix.startsWith('$$') || 
      prefix.startsWith('|') || 
      prefix.startsWith('```');

    let finalPrefix = prefix;
    let finalSuffix = suffix;

    if (isBlock) {
      // Ensure leading newline if not at start or not already preceded by newline
      if (startPos > 0 && textBefore[startPos - 1] !== '\n') {
        finalPrefix = '\n' + prefix;
      }
      // Ensure trailing newline if not followed by newline
      if (endPos < content.length && textAfter[0] !== '\n') {
        finalSuffix = suffix + '\n';
      }
    }

    const replacement = finalPrefix + (selectedText || (isBlock && prefix.trim() === '```javascript' ? '// tulis kode di sini' : 'Teks')) + finalSuffix;
    setContent(textBefore + replacement + textAfter);

    setTimeout(() => {
      textarea.focus();
      const newCursorStart = startPos + finalPrefix.length;
      const newCursorEnd = newCursorStart + (selectedText || (isBlock && prefix.trim() === '```javascript' ? '// tulis kode di sini' : 'Teks')).length;
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 50);
  };


  // ── AI Smart Formatter & Structurer ────────────────────────────────
  const triggerAiStructuring = async () => {
    if (!content.trim()) {
      setError('Masukkan tulisan catatan terlebih dahulu sebelum merapikan dengan AI.');
      return;
    }
    
    setError('');
    setIsAiStructuring(true);
    setAiStepLabel('Menganalisis rumus, kode, dan struktur tulisan…');

    try {
      // Prompt standard analyzer
      const response = await fetch('/api/analyze-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          title: title || 'Catatan Baru',
          mode: 'format_and_structure'
        })
      });

      if (!response.ok) {
        throw new Error('Gagal merapikan catatan dengan AI');
      }

      setAiStepLabel('Menyusun format Markdown, LaTeX, dan Heading…');
      const data = await response.json();
      
      // Inject AI result
      setContent(data.summary || content);
      
      // If AI returned structured tags
      if (data.tags && Array.isArray(data.tags)) {
        setTags((prev) => Array.from(new Set([...prev, ...data.tags])));
      }
      
      setSaveStatus('saving');
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      }, 800);

    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Gagal memanggil modul AI. Silakan coba lagi.');
    } finally {
      setIsAiStructuring(false);
    }
  };

  // ── Save Trigger ────────────────────────────────────────────────────
  const handleSave = () => {
    if (!title.trim()) {
      setError('Judul catatan wajib diisi.');
      return;
    }
    if (!content.trim()) {
      setError('Isi catatan tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      if (noteId) {
        // Edit existing
        updateNote(noteId, {
          title,
          content,
          category,
          folderId,
          tags,
          images
        });
        setSaveStatus('saved');
        setIsSaving(false);
        setTimeout(() => {
          setSaveStatus('idle');
          if (onSaveSuccess) onSaveSuccess(noteId);
        }, 1000);
      } else {
        // Save new
        const newId = addNote({
          title,
          content,
          category,
          folderId,
          tags,
          images
        });
        localStorage.removeItem('focus_os_note_draft');
        setSaveStatus('saved');
        setIsSaving(false);
        setTimeout(() => {
          setSaveStatus('idle');
          if (onSaveSuccess) onSaveSuccess(newId);
        }, 1000);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan catatan.');
      setIsSaving(false);
    }
  };

  // ── Folders & Tags Controls ──────────────────────────────────────────
  const handleAddFolder = () => {
    const name = prompt('Masukkan nama folder baru:');
    if (name && name.trim()) {
      const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#ec4899'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const newId = addFolder(name.trim(), randomColor);
      setFolderId(newId);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleToggleCheckbox = useCallback((lineIndex: number) => {
    setContent((prev) => {
      const lines = prev.split('\n');
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const line = lines[lineIndex];
        const match = line.match(/^(\s*)(-\s*\[\s*\]|-\s*\[x\]|-\s*\[X\]|□|✅|\[\s*\]|\[x\]|\[X\])(.*)$/i);
        if (match) {
          const indent = match[1];
          const prefix = match[2];
          const rest = match[3];
          let newPrefix = prefix;

          if (prefix.startsWith('-')) {
            if (prefix.includes('x') || prefix.includes('X')) {
              newPrefix = '- [ ]';
            } else {
              newPrefix = '- [x]';
            }
          } else if (prefix === '□') {
            newPrefix = '✅';
          } else if (prefix === '✅') {
            newPrefix = '□';
          } else if (prefix.startsWith('[')) {
            if (prefix.includes('x') || prefix.includes('X')) {
              newPrefix = '[ ]';
            } else {
              newPrefix = '[x]';
            }
          }
          lines[lineIndex] = indent + newPrefix + rest;
        }
      }
      return lines.join('\n');
    });
  }, []);

  // ── Markdown Realtime Parser / Renderer ─────────────────────────────
  const renderFormattedMarkdown = (markdownText: string) => {
    return renderMarkdownAndKatex(markdownText, handleToggleCheckbox);
  };


  return (
    <div className={`flex flex-col ${hasActiveMusic ? 'h-[calc(100vh-236px)] md:h-[calc(100vh-140px)]' : 'h-[calc(100vh-140px)]'} bg-slate-900/40 border border-slate-700/60 rounded-2xl overflow-hidden backdrop-blur-xl`}>
      {/* Top Toolbar */}
      <div className="flex flex-col bg-slate-950/80 border-b border-slate-800/80 z-20 flex-shrink-0">
        {/* Row 1: View Modes & AI/Save Actions */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-slate-800/30 flex-wrap">
          {/* Editor view modes */}
          <div className="flex bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/50">
            {(['edit', 'preview', 'split'] as const).map((m) => {
              if (m === 'split') {
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`hidden md:block px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
                      mode === m
                        ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Layar Belah
                  </button>
                );
              }
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
                    mode === m
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'edit' ? 'Tulis' : 'Pratinjau'}
                </button>
              );
            })}
          </div>

          {/* AI Action and Save Status */}
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="text-xs text-slate-400">Menyimpan...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Save className="w-3.5 h-3.5 animate-pulse" /> Tersimpan!
              </span>
            )}
            
            <button
              onClick={triggerAiStructuring}
              disabled={isAiStructuring || !content.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold flex items-center gap-1.5 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-600/20 active:scale-95"
              title="Merapikan & Struktur AI"
            >
              {isAiStructuring ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Merapikan AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                  <span>Rapi & Struktur AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Formatting options (Horizontally scrollable on mobile) */}
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto whitespace-nowrap scrollbar-none flex-nowrap md:flex-wrap">
          {/* Heading levels */}
          <button
            onClick={() => insertFormatting('# ', '')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition flex-shrink-0"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('## ', '')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition flex-shrink-0"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('### ', '')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition flex-shrink-0"
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          {/* Format options */}
          <div className="w-[1px] h-6 bg-slate-800 mx-1 flex-shrink-0" />
          <button
            onClick={() => insertFormatting('**', '**')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition flex-shrink-0"
            title="Tebal (Bold)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('*', '*')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition flex-shrink-0"
            title="Miring (Italic)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('<u>', '</u>')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition flex-shrink-0"
            title="Garis Bawah (Underline)"
          >
            <Underline className="w-4 h-4" />
          </button>

          {/* Structure Helpers */}
          <div className="w-[1px] h-6 bg-slate-800 mx-1 flex-shrink-0" />
          <button
            onClick={() => insertFormatting('- ', '')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition flex-shrink-0"
            title="Poin Bullet"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('1. ', '')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition flex-shrink-0"
            title="Daftar Angka"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('- [ ] ', '')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition flex-shrink-0"
            title="Daftar Ceklis"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          {/* Special Elements */}
          <button
            onClick={() => insertFormatting('```javascript\n', '\n```')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition flex-shrink-0"
            title="Blok Kode Program"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('$$\n', '\n$$')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition flex-shrink-0"
            title="Rumus Matematika LaTeX"
          >
            <span className="font-serif font-bold text-xs select-none">Σx</span>
          </button>
          <button
            onClick={() => insertFormatting('| Kolom 1 | Kolom 2 |\n|---|---|\n| Baris 1 | Data |\n', '')}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition flex-shrink-0"
            title="Sisipkan Tabel"
          >
            <TableIcon className="w-4 h-4" />
          </button>

          {/* Image Insertion */}
          <div className="w-[1px] h-6 bg-slate-800 mx-1 flex-shrink-0" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-gradient-to-r from-blue-600/80 to-cyan-600/80 hover:from-blue-600 hover:to-cyan-600 rounded-lg text-white font-medium flex items-center gap-1.5 transition text-xs shadow-md flex-shrink-0"
            title="Unggah Gambar"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Gambar</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileSelectChange}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
            multiple
          />
        </div>
      </div>


      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden bg-slate-950/20 relative" onDragOver={handleDragOver} onDrop={handleDrop}>
        
        {/* Drag & Drop Overlay */}
        <div className="absolute inset-0 z-30 pointer-events-none opacity-0 hover:opacity-100 bg-violet-600/5 backdrop-blur-[1px] flex items-center justify-center border-4 border-dashed border-violet-500/40 rounded-b-2xl transition duration-300">
          <div className="bg-slate-900 border border-slate-700/80 p-4 rounded-xl shadow-2xl flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-violet-400 animate-bounce" />
            <span className="text-sm font-semibold text-white">Lepaskan berkas gambar untuk langsung disisipkan ke catatan</span>
          </div>
        </div>

        {/* AI Typing Loading Overlay */}
        <AnimatePresence>
          {isAiStructuring && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="p-4 bg-violet-600/10 border border-violet-500/30 rounded-2xl mb-4 relative">
                <Sparkles className="w-12 h-12 text-violet-400 animate-pulse mx-auto" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">AI Sedang Merapikan Catatan</h4>
              <p className="text-sm text-slate-400 max-w-sm mb-4">{aiStepLabel}</p>
              
              {/* Visual simulation lines */}
              <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-600 to-blue-500 rounded-full w-2/3 animate-infinite-scroll" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WRITE PANEL */}
        {(mode === 'edit' || mode === 'split') && (
          <div className="flex-1 flex flex-col h-full border-r border-slate-800/80 overflow-hidden">
            {/* Note Metadata / Title */}
            <div className="px-5 py-4 bg-slate-900/40 border-b border-slate-800/60 flex flex-col gap-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul Catatan (Contoh: Kuliah Fisika - Hukum Newton)"
                className="w-full bg-transparent text-lg font-bold text-white border-0 border-b border-slate-800 focus:border-violet-500 focus:ring-0 pb-1.5 placeholder-slate-500 transition-colors"
              />

              <div className="grid grid-cols-2 md:flex md:items-center gap-3 md:gap-4 text-xs">
                {/* Category selector */}
                <div className="flex items-center gap-1.5 col-span-1">
                  <span className="text-slate-400 font-medium shrink-0">Kategori:</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700/80 text-slate-300 rounded px-2.5 py-1 focus:ring-1 focus:ring-violet-500 outline-none w-full text-xs"
                  >
                    <option value="material">Materi Ajar</option>
                    <option value="task">Tugas</option>
                    <option value="summary">Ringkasan</option>
                  </select>
                </div>

                {/* Folder Selector */}
                <div className="flex items-center gap-1.5 col-span-1">
                  <span className="text-slate-400 font-medium shrink-0">Folder:</span>
                  <div className="flex items-center gap-1 w-full">
                    <select
                      value={folderId || ''}
                      onChange={(e) => setFolderId(e.target.value || undefined)}
                      className="bg-slate-800 border border-slate-700/80 text-slate-300 rounded px-2.5 py-1 focus:ring-1 focus:ring-violet-500 outline-none w-full text-xs"
                    >
                      <option value="">(Tanpa Folder)</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddFolder}
                      className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition shrink-0"
                      title="Tambah Folder Baru"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tag Input */}
                <div className="flex items-center gap-1.5 col-span-2 md:flex-1 md:min-w-[200px]">
                  <Tag className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <div className="flex flex-wrap gap-1 items-center bg-slate-800 border border-slate-700/80 rounded px-2 py-0.5 w-full">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1"
                      >
                        {t}
                        <button onClick={() => removeTag(t)} className="text-slate-400 hover:text-red-400">×</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder={tags.length === 0 ? "Ketik tag & Enter..." : "+tag"}
                      className="bg-transparent border-0 focus:ring-0 p-0 text-[11px] text-white flex-1 min-w-[50px] placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>


            {/* Content Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onScroll={handleEditorScroll}
                onKeyDown={(e) => {
                  // Tab support inside editor
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    insertFormatting('  ', '');
                  }
                }}
                onPaste={handlePaste}
                placeholder="Tulis materi, salin catatan kasar, atau tempel gambar (Ctrl+V) di sini... Gunakan toolbar di atas untuk mempermudah pemformatan."
                className="w-full h-full bg-transparent border-0 focus:ring-0 p-5 text-sm leading-relaxed text-slate-200 resize-none outline-none font-mono placeholder-slate-600 overflow-y-auto"
              />
              
              {/* Bottom statistics line */}
              <div className="absolute bottom-2 right-4 px-2 py-1 bg-slate-900/60 rounded border border-slate-800 text-[10px] text-slate-500 select-none">
                {content.length.toLocaleString('id-ID')} karakter · {content.split(/\s+/).filter(Boolean).length} kata
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW PANEL */}
        {(mode === 'preview' || mode === 'split') && (
          <div
            ref={previewContainerRef}
            onScroll={handlePreviewScroll}
            className="flex-1 h-full overflow-y-auto p-6 sm:p-8 bg-slate-950/40 relative"
          >
            
            {/* Header info in preview mode */}
            {mode === 'preview' && (
              <div className="mb-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-violet-600/20 border border-violet-500/40 text-violet-400 px-2 py-0.5 rounded">
                    {category === 'material' ? 'Materi' : category === 'task' ? 'Tugas' : 'Ringkasan'}
                  </span>
                  {folderId && (
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700/60">
                      📂 {folders.find(f => f.id === folderId)?.name}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-extrabold text-white">{title || 'Catatan Tanpa Judul'}</h1>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {tags.map((t) => (
                      <span key={t} className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rich Parsed Content */}
            <div className="prose prose-invert max-w-none">
              {renderFormattedMarkdown(content)}
            </div>
          </div>
        )}
      </div>

      {/* Editor Footer / Actions */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-t border-slate-800/80 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !content.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/10 active:scale-95 text-sm"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Catatan</span>
          </button>
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition text-sm font-semibold"
            >
              Kembali
            </button>
          )}
        </div>

        {/* Tip / Reminder */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 max-w-md bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-800/50">
          <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 animate-pulse" />
          <span><b>Tips:</b> Tempel gambar dari clipboard dengan <b>Ctrl+V</b> atau seret gambar langsung ke workspace untuk disisipkan.</span>
        </div>
      </div>
    </div>
  );
}
