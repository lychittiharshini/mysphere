import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Check,
  CheckSquare,
  Clock,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Palette,
  Pin,
  Plus,
  Quote,
  Search,
  Trash2,
  Type,
  Underline,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import type { Note, NoteCategory } from '../../types/mysphere';

const CATEGORIES: NoteCategory[] = [
  'Personal',
  'College',
  'Projects',
  'Ideas',
  'Important',
  'Other',
];

const TEXT_COLORS = [
  { label: 'Default', value: 'inherit', swatch: '#94A3B8' },
  { label: 'Violet', value: '#8B5CF6', swatch: '#8B5CF6' },
  { label: 'Sky Blue', value: '#0EA5E9', swatch: '#0EA5E9' },
  { label: 'Emerald', value: '#10B981', swatch: '#10B981' },
  { label: 'Amber', value: '#F59E0B', swatch: '#F59E0B' },
  { label: 'Rose', value: '#F43F5E', swatch: '#F43F5E' },
];

function sanitizeHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function formatEditedDate(note: Note): string {
  const millis = note.updatedAt?.toMillis?.() || note.createdAt?.toMillis?.();
  if (!millis) return 'Just now';
  return new Date(millis).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const NotesView: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote } = useData();
  const { showToast, confirmDialog } = useToast();

  const [selectedFolder, setSelectedFolder] = useState<'All' | 'Pinned' | NoteCategory>('All');
  const [search, setSearch] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  // Editor draft state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NoteCategory>('Personal');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const editorRef = useRef<HTMLDivElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratingRef = useRef(false);
  const hasPendingSaveRef = useRef(false);

  const draftSnapshotRef = useRef<{
    id: string | null;
    title: string;
    category: NoteCategory;
    tags: string[];
    pinned: boolean;
  }>({
    id: null,
    title: '',
    category: 'Personal',
    tags: [],
    pinned: false,
  });

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...notes]
      .filter((n) => {
        if (selectedFolder === 'Pinned' && !n.pinned) return false;
        if (
          selectedFolder !== 'All' &&
          selectedFolder !== 'Pinned' &&
          n.category !== selectedFolder
        ) {
          return false;
        }
        if (q) {
          const textBody = n.content.replace(/<[^>]+>/g, ' ').toLowerCase();
          const matchTitle = n.title.toLowerCase().includes(q);
          const matchBody = textBody.includes(q);
          const matchTag = n.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchBody && !matchTag) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const aTime = a.updatedAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
  }, [notes, selectedFolder, search]);

  const activeNote: Note | null = useMemo(
    () => notes.find((n) => n.id === activeNoteId) || null,
    [notes, activeNoteId]
  );

  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const snap = draftSnapshotRef.current;
    if (!hasPendingSaveRef.current || !snap.id) return;
    hasPendingSaveRef.current = false;
    const htmlContent = sanitizeHtml(editorRef.current?.innerHTML || '');
    try {
      await updateNote(snap.id, {
        title: snap.title.trim() || 'Untitled Note',
        content: htmlContent,
        category: snap.category,
        tags: snap.tags,
        pinned: snap.pinned,
      });
    } catch {
      // Handled via context error boundary/logging
    }
  }, [updateNote]);

  // Select first note automatically if none selected
  useEffect(() => {
    if (!activeNoteId && filteredNotes.length > 0) {
      setActiveNoteId(filteredNotes[0].id);
    }
  }, [activeNoteId, filteredNotes]);

  // Flush unsaved edits on unmount
  useEffect(() => {
    return () => {
      void flushPendingSave();
    };
  }, [flushPendingSave]);

  // Hydrate editor when switching activeNoteId
  useEffect(() => {
    if (!activeNote) return;
    hydratingRef.current = true;
    hasPendingSaveRef.current = false;
    setTitle(activeNote.title);
    setCategory(activeNote.category);
    setTags(activeNote.tags || []);
    setPinned(activeNote.pinned);
    setSaveState('idle');

    draftSnapshotRef.current = {
      id: activeNote.id,
      title: activeNote.title,
      category: activeNote.category,
      tags: activeNote.tags || [],
      pinned: activeNote.pinned,
    };

    if (editorRef.current) {
      editorRef.current.innerHTML = sanitizeHtml(activeNote.content || '');
      // Sync checkbox DOM checked attributes from persisted HTML
      const checkboxes = editorRef.current.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]'
      );
      checkboxes.forEach((box) => {
        const row = box.closest('.mysphere-check-row');
        const isChecked =
          box.hasAttribute('checked') || row?.getAttribute('data-checked') === 'true';
        box.checked = isChecked;
        if (row) row.setAttribute('data-checked', String(isChecked));
      });
    }
    const timer = setTimeout(() => {
      hydratingRef.current = false;
    }, 50);
    return () => clearTimeout(timer);
  }, [activeNote?.id]);

  const scheduleAutosave = (
    nextTitle: string,
    nextCategory: NoteCategory,
    nextTags: string[],
    nextPinned: boolean
  ) => {
    if (!activeNote || hydratingRef.current) return;
    draftSnapshotRef.current = {
      id: activeNote.id,
      title: nextTitle,
      category: nextCategory,
      tags: nextTags,
      pinned: nextPinned,
    };
    hasPendingSaveRef.current = true;
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const targetId = activeNote.id;
    saveTimerRef.current = setTimeout(async () => {
      hasPendingSaveRef.current = false;
      const htmlContent = sanitizeHtml(editorRef.current?.innerHTML || '');
      try {
        await updateNote(targetId, {
          title: nextTitle.trim() || 'Untitled Note',
          content: htmlContent,
          category: nextCategory,
          tags: nextTags,
          pinned: nextPinned,
        });
        setSaveState('saved');
      } catch {
        setSaveState('idle');
      }
    }, 550);
  };

  const handleSelectNote = async (nextId: string) => {
    if (nextId === activeNoteId) return;
    await flushPendingSave();
    setActiveNoteId(nextId);
  };

  const handleNewNote = async () => {
    await flushPendingSave();
    const initialCat: NoteCategory =
      selectedFolder !== 'All' && selectedFolder !== 'Pinned'
        ? selectedFolder
        : 'Personal';
    try {
      const newId = await addNote({
        title: 'Untitled Note',
        content: '<p></p>',
        category: initialCat,
        tags: [],
        pinned: false,
      });
      setActiveNoteId(newId);
      showToast('New note created.', 'success');
    } catch {
      showToast('Could not create note.', 'error');
    }
  };

  const handleDeleteNote = async (note: Note) => {
    const ok = await confirmDialog({
      title: 'Delete note?',
      description: `Delete "${note.title}" permanently?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    hasPendingSaveRef.current = false;
    await deleteNote(note.id);
    if (activeNoteId === note.id) {
      setActiveNoteId(null);
    }
    showToast('Note deleted.', 'info');
  };

  const execFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    scheduleAutosave(title, category, tags, pinned);
  };

  const insertChecklistItem = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const rowHtml =
      '<div class="mysphere-check-row" data-checked="false"><input type="checkbox" /><span class="mysphere-check-text">Checklist item</span></div><div><br /></div>';
    document.execCommand('insertHTML', false, rowHtml);
    scheduleAutosave(title, category, tags, pinned);
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      const checkbox = target as HTMLInputElement;
      const checked = checkbox.checked;
      if (checked) {
        checkbox.setAttribute('checked', 'checked');
      } else {
        checkbox.removeAttribute('checked');
      }
      const row = checkbox.closest('.mysphere-check-row');
      if (row) {
        row.setAttribute('data-checked', String(checked));
      }
      scheduleAutosave(title, category, tags, pinned);
    }
  };

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '').slice(0, 24);
    if (!clean || tags.includes(clean) || tags.length >= 10) return;
    const next = [...tags, clean];
    setTags(next);
    setTagInput('');
    scheduleAutosave(title, category, next, pinned);
  };

  const handleRemoveTag = (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    scheduleAutosave(title, category, next, pinned);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
            Notebook
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Rich-text personal notes with headings, text colors, checklists, tags, and instant autosave.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleNewNote()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-md shadow-violet-600/20 transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Folder Bar */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(['All', 'Pinned', ...CATEGORIES] as const).map((folder) => (
          <button
            key={folder}
            type="button"
            onClick={() => setSelectedFolder(folder)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              selectedFolder === folder
                ? 'bg-violet-600 text-white shadow-sm'
                : 'liquid-glass text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            {folder}
          </button>
        ))}
      </div>

      {/* Split Master-Detail Notebook */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Left List */}
        <div className="lg:col-span-4 liquid-glass rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-200/60 dark:border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes or #tags..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/12 bg-white/75 dark:bg-slate-900/65 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 dark:divide-white/8">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No notes in this folder yet.
              </div>
            ) : (
              filteredNotes.map((n) => {
                const isSelected = activeNote?.id === n.id;
                const preview = n.content.replace(/<[^>]+>/g, ' ').trim();
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void handleSelectNote(n.id)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-violet-500/14 dark:bg-violet-500/20'
                        : 'hover:bg-white/45 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-violet-700 dark:text-violet-300 font-medium">
                        {n.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {formatEditedDate(n)}
                        </span>
                        {n.pinned && <Pin className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
                      </div>
                    </div>
                    <p className="mt-1 font-medium text-sm text-slate-950 dark:text-white truncate">
                      {n.title || 'Untitled Note'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {preview || 'Empty note'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Editor */}
        <div className="lg:col-span-8 liquid-glass rounded-2xl flex flex-col overflow-hidden">
          {!activeNote ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Select a note or create a new one to start writing.
              </p>
              <button
                type="button"
                onClick={() => void handleNewNote()}
                className="mt-3 text-sm font-medium text-violet-600 dark:text-violet-300 hover:underline cursor-pointer"
              >
                Create Note
              </button>
            </div>
          ) : (
            <>
              {/* Meta & Actions */}
              <div className="p-4 sm:px-6 border-b border-slate-200/60 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTitle(val);
                      scheduleAutosave(val, category, tags, pinned);
                    }}
                    placeholder="Note title..."
                    className="flex-1 min-w-0 bg-transparent font-display text-xl font-semibold text-slate-950 dark:text-white focus:outline-none"
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                      {saveState === 'saving' ? (
                        'Saving...'
                      ) : saveState === 'saved' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Saved</span>
                        </>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextPin = !pinned;
                        setPinned(nextPin);
                        scheduleAutosave(title, category, tags, nextPin);
                      }}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${
                        pinned
                          ? 'text-violet-600 dark:text-violet-300 bg-violet-500/15'
                          : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                      aria-label={pinned ? 'Unpin note' : 'Pin note'}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteNote(activeNote)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={category}
                      onChange={(e) => {
                        const nextCat = e.target.value as NoteCategory;
                        setCategory(nextCat);
                        scheduleAutosave(title, nextCat, tags, pinned);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-white/15 bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-wrap items-center gap-2">
                      {tags.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-violet-700 dark:text-violet-300 hover:line-through cursor-pointer"
                          title="Click to remove tag"
                        >
                          #{t}
                        </button>
                      ))}
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="+ add tag"
                        className="w-24 bg-transparent text-xs text-slate-600 dark:text-slate-300 focus:outline-none border-b border-transparent focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last edited {formatEditedDate(activeNote)}</span>
                  </span>
                </div>

                {/* Rich Text Toolbar */}
                <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-slate-200/60 dark:border-white/8">
                  <button
                    type="button"
                    onClick={() => execFormat('bold')}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('italic')}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('underline')}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                    title="Underline"
                  >
                    <Underline className="w-4 h-4" />
                  </button>

                  <span className="h-4 w-px bg-slate-300/60 dark:bg-white/15 mx-1" />

                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', '<p>')}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                    title="Normal Text"
                  >
                    <Type className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', '<h1>')}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                    title="Heading 1"
                  >
                    <Heading1 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', '<h2>')}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                    title="Heading 2"
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', '<h3>')}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                    title="Heading 3"
                  >
                    <Heading3 className="w-4 h-4" />
                  </button>

                  <span className="h-4 w-px bg-slate-300/60 dark:bg-white/15 mx-1" />

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setColorMenuOpen((o) => !o)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                      title="Text Color"
                    >
                      <Palette className="w-4 h-4" />
                    </button>
                    {colorMenuOpen && (
                      <div className="absolute left-0 top-9 z-20 liquid-glass rounded-xl p-2 flex items-center gap-1.5 shadow-xl">
                        {TEXT_COLORS.map((c) => (
                          <button
                            key={c.label}
                            type="button"
                            onClick={() => {
                              if (c.value === 'inherit') {
                                execFormat('removeFormat');
                              } else {
                                execFormat('foreColor', c.value);
                              }
                              setColorMenuOpen(false);
                            }}
                            title={c.label}
                            className="w-5 h-5 rounded-full border border-white/40 cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: c.swatch }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => execFormat('insertUnorderedList')}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('insertOrderedList')}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={insertChecklistItem}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-500/12 cursor-pointer"
                    title="Insert Interactive Checklist Item"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Checklist</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', '<blockquote>')}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                    title="Quote"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', '<pre>')}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                    title="Code Block"
                  >
                    <Code className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editable Rich Text Area */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onClick={handleEditorClick}
                onInput={() => scheduleAutosave(title, category, tags, pinned)}
                className="mysphere-editor flex-1 p-6 text-sm text-slate-800 dark:text-slate-200 overflow-y-auto"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
