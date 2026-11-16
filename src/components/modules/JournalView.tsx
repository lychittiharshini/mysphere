import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bold,
  BookOpen,
  Check,
  Copy,
  Download,
  Edit2,
  FileDown,
  Image as ImageIcon,
  Italic,
  Layers,
  LayoutTemplate,
  Lock,
  Move,
  Palette,
  Pencil,
  Plus,
  Redo2,
  RotateCw,
  Save,
  Search,
  Shapes,
  Smile,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { formatPrettyDate, todayStr } from '../../lib/dates';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  exportJournalAsPdf,
  exportJournalAsPng,
} from '../../lib/journalExport';
import {
  JOURNAL_BACKGROUNDS,
  JOURNAL_BORDERS,
  JOURNAL_STICKERS,
  JOURNAL_TEMPLATES,
  type JournalTemplateDefinition,
} from '../../lib/journalTemplates';
import { uploadUserImage } from '../../lib/storage';
import type {
  JournalCanvasElement,
  JournalEntry,
  JournalMood,
  JournalShapeKind,
  JournalTemplateId,
} from '../../types/mysphere';

const MOODS: { id: JournalMood; label: string }[] = [
  { id: 'peaceful', label: 'Peaceful' },
  { id: 'motivated', label: 'Motivated' },
  { id: 'grateful', label: 'Grateful' },
  { id: 'reflective', label: 'Reflective' },
  { id: 'tired', label: 'Tired' },
  { id: 'stressed', label: 'Stressed' },
];

type StudioToolTab =
  | 'text'
  | 'upload'
  | 'images'
  | 'background'
  | 'elements'
  | 'stickers'
  | 'templates'
  | 'layers';

const TOOL_TABS: {
  id: StudioToolTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'background', label: 'Background', icon: Palette },
  { id: 'elements', label: 'Elements', icon: Shapes },
  { id: 'stickers', label: 'Stickers', icon: Smile },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'layers', label: 'Layers', icon: Layers },
];

const FONT_FAMILIES = [
  { label: 'Outfit Display', value: 'Outfit, sans-serif' },
  { label: 'DM Sans', value: 'DM Sans, sans-serif' },
  { label: 'Editorial Serif', value: 'Georgia, serif' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
];

function nextElementId(): string {
  return `jel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

interface HistorySnapshot {
  elements: JournalCanvasElement[];
  canvasBackground: string;
  canvasBorder: string;
}

export const JournalView: React.FC = () => {
  const { user } = useAuth();
  const { journalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry } =
    useData();
  const { showToast, confirmDialog } = useToast();

  // Gallery state
  const [search, setSearch] = useState('');
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'published' | 'drafts'>('all');
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<JournalEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Studio Editor state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<StudioToolTab>('text');
  const [inspectorTab, setInspectorTab] = useState<'element' | 'reflection'>('element');

  const [title, setTitle] = useState('Untitled Journal Page');
  const [date, setDate] = useState(todayStr());
  const [mood, setMood] = useState<JournalMood>('peaceful');
  const [gratitude, setGratitude] = useState('');
  const [reflection, setReflection] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [templateId, setTemplateId] = useState<JournalTemplateId | string>('blank');
  const [canvasBackground, setCanvasBackground] = useState('#ffffff');
  const [canvasBorder, setCanvasBorder] = useState('2px solid rgba(139, 92, 246, 0.35)');
  const [elements, setElements] = useState<JournalCanvasElement[]>([]);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [historyPast, setHistoryPast] = useState<HistorySnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<HistorySnapshot[]>([]);

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null);

  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const [canvasScale, setCanvasScale] = useState(0.72);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratingRef = useRef(false);

  const latestDraftRef = useRef<{
    entryId: string | null;
    title: string;
    date: string;
    mood: JournalMood;
    gratitude: string;
    reflection: string;
    isDraft: boolean;
    templateId: string;
    canvasBackground: string;
    canvasBorder: string;
    elements: JournalCanvasElement[];
  }>({
    entryId: null,
    title: '',
    date: todayStr(),
    mood: 'peaceful',
    gratitude: '',
    reflection: '',
    isDraft: false,
    templateId: 'blank',
    canvasBackground: '#ffffff',
    canvasBorder: 'none',
    elements: [],
  });

  useEffect(() => {
    latestDraftRef.current = {
      entryId: editingEntryId,
      title,
      date,
      mood,
      gratitude,
      reflection,
      isDraft,
      templateId,
      canvasBackground,
      canvasBorder,
      elements,
    };
  }, [
    editingEntryId,
    title,
    date,
    mood,
    gratitude,
    reflection,
    isDraft,
    templateId,
    canvasBackground,
    canvasBorder,
    elements,
  ]);

  // Dynamically measure container width for crisp canvas scaling
  useEffect(() => {
    if (!editingEntryId || !canvasViewportRef.current) return;
    const node = canvasViewportRef.current;
    const compute = () => {
      const available = Math.max(280, node.clientWidth - 24);
      const next = Math.min(0.85, Math.max(0.36, available / CANVAS_WIDTH));
      setCanvasScale(next);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(node);
    return () => ro.disconnect();
  }, [editingEntryId]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...journalEntries]
      .filter((entry) => {
        if (galleryFilter === 'published' && entry.isDraft) return false;
        if (galleryFilter === 'drafts' && !entry.isDraft) return false;
        if (!q) return true;
        return (
          entry.title.toLowerCase().includes(q) ||
          entry.gratitude.toLowerCase().includes(q) ||
          entry.reflection.toLowerCase().includes(q) ||
          entry.mood.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const cmp = b.date.localeCompare(a.date);
        if (cmp !== 0) return cmp;
        return (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0);
      });
  }, [journalEntries, search, galleryFilter]);

  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedElementId) || null,
    [elements, selectedElementId]
  );

  const canvasImages = useMemo(
    () => elements.filter((el) => el.type === 'image' && el.imageUrl),
    [elements]
  );

  // Trigger debounced autosave whenever studio draft changes
  useEffect(() => {
    if (!editingEntryId || hydratingRef.current) return;
    setSaveState('saving');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    const id = editingEntryId;
    autosaveTimerRef.current = setTimeout(async () => {
      const snap = latestDraftRef.current;
      if (snap.entryId !== id) return;
      try {
        await updateJournalEntry(id, {
          title: snap.title.trim() || 'Untitled Journal Page',
          date: snap.date,
          mood: snap.mood,
          gratitude: snap.gratitude,
          reflection: snap.reflection,
          isDraft: snap.isDraft,
          templateId: snap.templateId,
          canvasBackground: snap.canvasBackground,
          canvasBorder: snap.canvasBorder,
          elements: snap.elements,
        });
        setSaveState('saved');
      } catch {
        setSaveState('idle');
      }
    }, 850);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [
    editingEntryId,
    title,
    date,
    mood,
    gratitude,
    reflection,
    isDraft,
    templateId,
    canvasBackground,
    canvasBorder,
    elements,
    updateJournalEntry,
  ]);

  const pushHistory = useCallback(
    (
      nextElements: JournalCanvasElement[],
      nextBg = canvasBackground,
      nextBorder = canvasBorder
    ) => {
      setHistoryPast((prev) => [
        ...prev.slice(-39),
        {
          elements,
          canvasBackground,
          canvasBorder,
        },
      ]);
      setHistoryFuture([]);
      setElements(nextElements);
      setCanvasBackground(nextBg);
      setCanvasBorder(nextBorder);
    },
    [elements, canvasBackground, canvasBorder]
  );

  const handleUndo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryFuture((f) => [{ elements, canvasBackground, canvasBorder }, ...f]);
    setHistoryPast((p) => p.slice(0, -1));
    setElements(previous.elements);
    setCanvasBackground(previous.canvasBackground);
    setCanvasBorder(previous.canvasBorder);
    setSelectedElementId(null);
  };

  const handleRedo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryPast((p) => [...p, { elements, canvasBackground, canvasBorder }]);
    setHistoryFuture((f) => f.slice(1));
    setElements(next.elements);
    setCanvasBackground(next.canvasBackground);
    setCanvasBorder(next.canvasBorder);
    setSelectedElementId(null);
  };

  const startFromTemplate = async (tpl: JournalTemplateDefinition) => {
    const today = todayStr();
    const niceDate = formatPrettyDate(today);
    const initialElements = tpl.buildElements(niceDate);
    try {
      const newId = await addJournalEntry({
        date: today,
        title: tpl.id === 'blank' ? 'Untitled Journal Page' : tpl.name,
        mood: tpl.defaultMood,
        gratitude: '',
        reflection: '',
        isDraft: true,
        templateId: tpl.id,
        canvasBackground: tpl.canvasBackground,
        canvasBorder: tpl.canvasBorder,
        elements: initialElements,
      });
      hydratingRef.current = true;
      setEditingEntryId(newId);
      setTitle(tpl.id === 'blank' ? 'Untitled Journal Page' : tpl.name);
      setDate(today);
      setMood(tpl.defaultMood);
      setGratitude('');
      setReflection('');
      setIsDraft(true);
      setTemplateId(tpl.id);
      setCanvasBackground(tpl.canvasBackground);
      setCanvasBorder(tpl.canvasBorder);
      setElements(initialElements);
      setHistoryPast([]);
      setHistoryFuture([]);
      setSelectedElementId(null);
      setEditingTextId(null);
      setTemplatePickerOpen(false);
      setSaveState('saved');
      setTimeout(() => {
        hydratingRef.current = false;
      }, 60);
    } catch {
      showToast('Could not create journal page.', 'error');
    }
  };

  const openEntryInStudio = (entry: JournalEntry) => {
    hydratingRef.current = true;
    const initialElements: JournalCanvasElement[] =
      entry.elements && entry.elements.length > 0
        ? entry.elements
        : [
            {
              id: nextElementId(),
              type: 'text',
              x: 56,
              y: 52,
              width: 648,
              height: 54,
              rotation: 0,
              zIndex: 1,
              text: entry.title || 'Journal Entry',
              fontSize: 30,
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 'bold',
              color: '#0f172a',
            },
            {
              id: nextElementId(),
              type: 'text',
              x: 56,
              y: 120,
              width: 648,
              height: 420,
              rotation: 0,
              zIndex: 2,
              text: [entry.gratitude ? `Gratitude:\n${entry.gratitude}` : '', entry.reflection]
                .filter(Boolean)
                .join('\n\n'),
              fontSize: 17,
              fontFamily: 'DM Sans, sans-serif',
              color: '#334155',
            },
          ];

    setEditingEntryId(entry.id);
    setTitle(entry.title);
    setDate(entry.date);
    setMood(entry.mood);
    setGratitude(entry.gratitude || '');
    setReflection(entry.reflection || '');
    setIsDraft(Boolean(entry.isDraft));
    setTemplateId(entry.templateId || 'blank');
    setCanvasBackground(entry.canvasBackground || '#ffffff');
    setCanvasBorder(entry.canvasBorder || '2px solid rgba(139, 92, 246, 0.35)');
    setElements(initialElements);
    setHistoryPast([]);
    setHistoryFuture([]);
    setSelectedElementId(null);
    setEditingTextId(null);
    setSaveState('idle');
    setTimeout(() => {
      hydratingRef.current = false;
    }, 60);
  };

  const handleSaveExplicit = async (draftFlag: boolean) => {
    if (!editingEntryId) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setIsDraft(draftFlag);
    setSaveState('saving');
    try {
      await updateJournalEntry(editingEntryId, {
        title: title.trim() || 'Untitled Journal Page',
        date,
        mood,
        gratitude: gratitude.trim(),
        reflection: reflection.trim(),
        isDraft: draftFlag,
        templateId,
        canvasBackground,
        canvasBorder,
        elements,
      });
      setSaveState('saved');
      showToast(draftFlag ? 'Saved as draft.' : 'Journal entry saved!', 'success');
    } catch {
      setSaveState('idle');
      showToast('Failed to save journal entry.', 'error');
    }
  };

  const handleExitStudio = async () => {
    if (editingEntryId) {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      try {
        await updateJournalEntry(editingEntryId, {
          title: title.trim() || 'Untitled Journal Page',
          date,
          mood,
          gratitude: gratitude.trim(),
          reflection: reflection.trim(),
          isDraft,
          templateId,
          canvasBackground,
          canvasBorder,
          elements,
        });
      } catch {
        // Ignore on close fallback
      }
    }
    setEditingEntryId(null);
    setSelectedElementId(null);
    setEditingTextId(null);
  };

  const handleDuplicateEntry = async (entry: JournalEntry) => {
    try {
      await addJournalEntry({
        date: todayStr(),
        title: `${entry.title} (Copy)`.slice(0, 160),
        mood: entry.mood,
        gratitude: entry.gratitude,
        reflection: entry.reflection,
        isDraft: true,
        templateId: entry.templateId || 'blank',
        canvasBackground: entry.canvasBackground || '#ffffff',
        canvasBorder: entry.canvasBorder || 'none',
        elements: (entry.elements || []).map((el) => ({
          ...el,
          id: nextElementId(),
        })),
      });
      showToast('Journal entry duplicated.', 'success');
    } catch {
      showToast('Could not duplicate entry.', 'error');
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await updateJournalEntry(renameTarget.id, { title: renameValue.trim() });
      showToast('Entry renamed.', 'success');
      setRenameTarget(null);
    } catch {
      showToast('Could not rename entry.', 'error');
    }
  };

  const handleDeleteEntry = async (entry: JournalEntry) => {
    const ok = await confirmDialog({
      title: 'Delete journal entry?',
      description: `Permanently delete "${entry.title}"?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await deleteJournalEntry(entry.id);
    if (editingEntryId === entry.id) {
      setEditingEntryId(null);
    }
    showToast('Journal entry deleted.', 'info');
  };

  // Element Creation Helpers
  const maxZ = useMemo(
    () => elements.reduce((m, el) => Math.max(m, el.zIndex || 0), 0),
    [elements]
  );

  const addTextElement = (variant: 'heading' | 'subheading' | 'body' | 'quote') => {
    const isDarkCanvas =
      canvasBackground.includes('#0b') ||
      canvasBackground.includes('#07') ||
      canvasBackground.includes('#1c');
    const defaultTextColor = isDarkCanvas ? '#f8fafc' : '#0f172a';
    const spec =
      variant === 'heading'
        ? {
            text: 'Page Heading',
            fontSize: 32,
            fontWeight: 'bold' as const,
            fontFamily: 'Outfit, sans-serif',
            width: 440,
            height: 60,
          }
        : variant === 'subheading'
          ? {
              text: 'Section Subheading',
              fontSize: 22,
              fontWeight: 'semibold' as const,
              fontFamily: 'Outfit, sans-serif',
              width: 360,
              height: 44,
            }
          : variant === 'quote'
            ? {
                text: '“A quiet reflection worth keeping.”',
                fontSize: 19,
                fontWeight: 'normal' as const,
                fontStyle: 'italic' as const,
                fontFamily: 'Georgia, serif',
                width: 420,
                height: 76,
              }
            : {
                text: 'Double-click to edit this text box...',
                fontSize: 16,
                fontWeight: 'normal' as const,
                fontFamily: 'DM Sans, sans-serif',
                width: 380,
                height: 110,
              };

    const newEl: JournalCanvasElement = {
      id: nextElementId(),
      type: 'text',
      x: 120 + (elements.length % 4) * 20,
      y: 160 + (elements.length % 5) * 24,
      width: spec.width,
      height: spec.height,
      rotation: 0,
      zIndex: maxZ + 1,
      text: spec.text,
      fontSize: spec.fontSize,
      fontFamily: spec.fontFamily,
      fontWeight: spec.fontWeight,
      fontStyle: spec.fontStyle || 'normal',
      textAlign: 'left',
      color: defaultTextColor,
    };
    pushHistory([...elements, newEl]);
    setSelectedElementId(newEl.id);
    setInspectorTab('element');
  };

  const addShapeElement = (kind: JournalShapeKind) => {
    const newEl: JournalCanvasElement = {
      id: nextElementId(),
      type: 'shape',
      shapeKind: kind,
      x: 180 + (elements.length % 4) * 18,
      y: 220 + (elements.length % 4) * 18,
      width: kind === 'line' ? 360 : kind === 'badge' ? 180 : 220,
      height: kind === 'line' ? 16 : kind === 'badge' ? 46 : 160,
      rotation: 0,
      zIndex: maxZ + 1,
      backgroundColor: 'rgba(139, 92, 246, 0.16)',
      borderColor: '#8B5CF6',
      borderWidth: 2,
      borderRadius: kind === 'rounded' ? 18 : 0,
    };
    pushHistory([...elements, newEl]);
    setSelectedElementId(newEl.id);
    setInspectorTab('element');
  };

  const addStickerElement = (emoji: string, label: string) => {
    const newEl: JournalCanvasElement = {
      id: nextElementId(),
      type: 'sticker',
      x: 310 + (elements.length % 3) * 24,
      y: 300 + (elements.length % 3) * 24,
      width: 72,
      height: 72,
      rotation: 0,
      zIndex: maxZ + 1,
      stickerEmoji: emoji,
      stickerLabel: label,
      fontSize: 48,
    };
    pushHistory([...elements, newEl]);
    setSelectedElementId(newEl.id);
    setInspectorTab('element');
  };

  const handleUploadCanvasImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !editingEntryId) return;
    setUploadingImage(true);
    try {
      const uploaded = await uploadUserImage(user.uid, `journal/${editingEntryId}`, file);
      const newEl: JournalCanvasElement = {
        id: nextElementId(),
        type: 'image',
        x: 150,
        y: 180,
        width: 280,
        height: 220,
        rotation: 0,
        zIndex: maxZ + 1,
        imageUrl: uploaded.url,
        imagePath: uploaded.path,
        borderRadius: 14,
        borderColor: '#ffffff',
        borderWidth: 4,
      };
      pushHistory([...elements, newEl]);
      setSelectedElementId(newEl.id);
      setInspectorTab('element');
      showToast('Photo added to your journal canvas.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateElement = (id: string, patch: Partial<JournalCanvasElement>, recordHistory = true) => {
    const next = elements.map((el) => (el.id === id ? { ...el, ...patch } : el));
    if (recordHistory) {
      pushHistory(next);
    } else {
      setElements(next);
    }
  };

  const removeElement = (id: string) => {
    pushHistory(elements.filter((el) => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
    if (editingTextId === id) setEditingTextId(null);
  };

  const duplicateElement = (el: JournalCanvasElement) => {
    const clone: JournalCanvasElement = {
      ...el,
      id: nextElementId(),
      x: Math.min(CANVAS_WIDTH - 40, el.x + 24),
      y: Math.min(CANVAS_HEIGHT - 40, el.y + 24),
      zIndex: maxZ + 1,
    };
    pushHistory([...elements, clone]);
    setSelectedElementId(clone.id);
  };

  const reorderLayer = (id: string, dir: 'forward' | 'backward') => {
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((el) => el.id === id);
    if (idx === -1) return;
    const swapIdx = dir === 'forward' ? idx + 1 : idx - 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const copy = [...sorted];
    const tmp = copy[idx];
    copy[idx] = copy[swapIdx];
    copy[swapIdx] = tmp;
    const reassigned = copy.map((el, i) => ({ ...el, zIndex: i + 1 }));
    pushHistory(reassigned);
  };

  // Drag / Resize / Rotate pointer interaction handlers
  const beginDrag = (e: React.PointerEvent, el: JournalCanvasElement) => {
    if (editingTextId === el.id) return;
    e.stopPropagation();
    setSelectedElementId(el.id);
    setInspectorTab('element');

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = el.x;
    const origY = el.y;
    let moved = false;
    const snapshotBefore = elements;

    const handleMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / canvasScale;
      const dy = (ev.clientY - startY) / canvasScale;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) moved = true;
      const nextX = Math.max(-40, Math.min(CANVAS_WIDTH - 24, Math.round(origX + dx)));
      const nextY = Math.max(-40, Math.min(CANVAS_HEIGHT - 24, Math.round(origY + dy)));
      setElements((curr) =>
        curr.map((item) => (item.id === el.id ? { ...item, x: nextX, y: nextY } : item))
      );
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (moved) {
        setHistoryPast((prev) => [
          ...prev.slice(-39),
          { elements: snapshotBefore, canvasBackground, canvasBorder },
        ]);
        setHistoryFuture([]);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const beginResize = (e: React.PointerEvent, el: JournalCanvasElement) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = el.width;
    const origH = el.height;
    const snapshotBefore = elements;

    const handleMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / canvasScale;
      const dy = (ev.clientY - startY) / canvasScale;
      const nextW = Math.max(36, Math.min(CANVAS_WIDTH, Math.round(origW + dx)));
      const nextH = Math.max(24, Math.min(CANVAS_HEIGHT, Math.round(origH + dy)));
      setElements((curr) =>
        curr.map((item) =>
          item.id === el.id ? { ...item, width: nextW, height: nextH } : item
        )
      );
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setHistoryPast((prev) => [
        ...prev.slice(-39),
        { elements: snapshotBefore, canvasBackground, canvasBorder },
      ]);
      setHistoryFuture([]);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handleExport = async (format: 'png' | 'pdf') => {
    setExporting(format);
    try {
      if (format === 'png') {
        await exportJournalAsPng({
          title,
          canvasBackground,
          canvasBorder,
          elements,
        });
        showToast('Exported journal page as PNG.', 'success');
      } else {
        await exportJournalAsPdf({
          title,
          canvasBackground,
          canvasBorder,
          elements,
        });
        showToast('Exported journal page as PDF.', 'success');
      }
    } catch {
      showToast(`Could not export ${format.toUpperCase()}.`, 'error');
    } finally {
      setExporting(null);
    }
  };

  // ==================== STUDIO EDITOR VIEW ====================
  if (editingEntryId) {
    return (
      <div className="space-y-4">
        {/* Top Studio Toolbar */}
        <div className="liquid-glass rounded-2xl p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => void handleExitStudio()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/60 dark:bg-white/8 hover:bg-white dark:hover:bg-white/15 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/12 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Gallery</span>
            </button>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Journal page title..."
              className="flex-1 min-w-[140px] max-w-xs px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/12 font-display text-sm font-semibold text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="hidden sm:block px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/12 text-xs text-slate-800 dark:text-slate-200"
            />

            <select
              value={mood}
              onChange={(e) => setMood(e.target.value as JournalMood)}
              className="hidden md:block px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/12 text-xs text-slate-800 dark:text-slate-200"
            >
              {MOODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 mr-1">
              {saveState === 'saving' ? (
                'Autosaving...'
              ) : saveState === 'saved' ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </span>
              ) : null}
            </span>

            <button
              type="button"
              onClick={handleUndo}
              disabled={historyPast.length === 0}
              className="p-2 rounded-xl bg-white/60 dark:bg-white/8 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-white dark:hover:bg-white/15 cursor-pointer"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyFuture.length === 0}
              className="p-2 rounded-xl bg-white/60 dark:bg-white/8 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-white dark:hover:bg-white/15 cursor-pointer"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => void handleSaveExplicit(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 dark:bg-white/8 hover:bg-white dark:hover:bg-white/15 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/12 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSaveExplicit(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-medium shadow-md shadow-violet-600/20 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Entry</span>
            </button>

            <button
              type="button"
              onClick={() => void handleExport('png')}
              disabled={exporting !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 dark:bg-white/8 hover:bg-white dark:hover:bg-white/15 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/12 cursor-pointer"
              title="Export as PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG</span>
            </button>

            <button
              type="button"
              onClick={() => void handleExport('pdf')}
              disabled={exporting !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 dark:bg-white/8 hover:bg-white dark:hover:bg-white/15 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/12 cursor-pointer"
              title="Export as PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Studio Main 3-Column Workspace */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* Left Tool Rail + Panel */}
          <div className="xl:col-span-3 liquid-glass rounded-2xl overflow-hidden flex flex-col">
            {/* Tool Tab Strip */}
            <div className="grid grid-cols-4 gap-1 p-2 border-b border-slate-200/60 dark:border-white/10">
              {TOOL_TABS.map((t) => {
                const Icon = t.icon;
                const active = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTool(t.id)}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/8'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate max-w-full">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tool Controls */}
            <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
              {activeTool === 'text' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Add Text to Canvas
                  </p>
                  <button
                    type="button"
                    onClick={() => addTextElement('heading')}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/60 dark:bg-white/8 hover:bg-violet-500/15 border border-slate-200/70 dark:border-white/10 font-display text-base font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    + Add Heading
                  </button>
                  <button
                    type="button"
                    onClick={() => addTextElement('subheading')}
                    className="w-full text-left px-3.5 py-2 rounded-xl bg-white/60 dark:bg-white/8 hover:bg-violet-500/15 border border-slate-200/70 dark:border-white/10 font-display text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    + Add Subheading
                  </button>
                  <button
                    type="button"
                    onClick={() => addTextElement('body')}
                    className="w-full text-left px-3.5 py-2 rounded-xl bg-white/60 dark:bg-white/8 hover:bg-violet-500/15 border border-slate-200/70 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    + Add Body Text Box
                  </button>
                  <button
                    type="button"
                    onClick={() => addTextElement('quote')}
                    className="w-full text-left px-3.5 py-2 rounded-xl bg-white/60 dark:bg-white/8 hover:bg-violet-500/15 border border-slate-200/70 dark:border-white/10 text-xs italic font-serif text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    + Add Quote Note
                  </button>
                </div>
              )}

              {activeTool === 'upload' && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Upload Memory Photo
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => void handleUploadCanvasImage(e)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full py-6 rounded-xl border border-dashed border-violet-400/60 hover:border-violet-500 flex flex-col items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-violet-500" />
                    <span>{uploadingImage ? 'Uploading photo...' : 'Choose JPG, PNG, or WebP'}</span>
                  </button>
                </div>
              )}

              {activeTool === 'images' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Photos on Page ({canvasImages.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTool('upload')}
                      className="text-xs text-violet-600 dark:text-violet-300 hover:underline cursor-pointer"
                    >
                      + Upload
                    </button>
                  </div>
                  {canvasImages.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No photos placed yet. Use the Upload tab to insert photos.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {canvasImages.map((imgEl) => (
                        <button
                          key={imgEl.id}
                          type="button"
                          onClick={() => setSelectedElementId(imgEl.id)}
                          className={`rounded-xl overflow-hidden border aspect-square cursor-pointer ${
                            selectedElementId === imgEl.id
                              ? 'border-violet-500 ring-2 ring-violet-500/40'
                              : 'border-slate-200/80 dark:border-white/15'
                          }`}
                        >
                          <img
                            src={imgEl.imageUrl}
                            alt="Journal element"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTool === 'background' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Page Background
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {JOURNAL_BACKGROUNDS.map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => pushHistory(elements, bg.css, canvasBorder)}
                          className={`p-2 rounded-xl border text-left text-[11px] font-medium cursor-pointer ${
                            canvasBackground === bg.css
                              ? 'border-violet-500 ring-2 ring-violet-500/35'
                              : 'border-slate-200/80 dark:border-white/12'
                          }`}
                        >
                          <span
                            className="block h-7 w-full rounded-lg mb-1.5 border border-black/10"
                            style={{ background: bg.css }}
                          />
                          <span className="text-slate-700 dark:text-slate-200 truncate block">
                            {bg.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Canvas Border
                    </p>
                    <div className="space-y-1.5">
                      {JOURNAL_BORDERS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => pushHistory(elements, canvasBackground, b.css)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                            canvasBorder === b.css
                              ? 'border-violet-500 bg-violet-500/12 text-violet-700 dark:text-violet-200'
                              : 'border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTool === 'elements' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Shapes & Frames
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { kind: 'rounded', label: 'Rounded Card' },
                        { kind: 'rect', label: 'Rectangle' },
                        { kind: 'circle', label: 'Circle' },
                        { kind: 'badge', label: 'Pill Badge' },
                        { kind: 'line', label: 'Divider Line' },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.kind}
                        type="button"
                        onClick={() => addShapeElement(s.kind)}
                        className="px-3 py-2.5 rounded-xl bg-white/60 dark:bg-white/8 hover:bg-violet-500/15 border border-slate-200/70 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        + {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTool === 'stickers' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Decorative Stickers
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {JOURNAL_STICKERS.map((st) => (
                      <button
                        key={st.label}
                        type="button"
                        onClick={() => addStickerElement(st.emoji, st.label)}
                        className="py-2.5 rounded-xl bg-white/60 dark:bg-white/8 hover:bg-violet-500/15 border border-slate-200/70 dark:border-white/10 flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <span className="text-2xl">{st.emoji}</span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-300">
                          {st.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTool === 'templates' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Apply Page Template
                  </p>
                  {JOURNAL_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        const nextEls = tpl.buildElements(formatPrettyDate(date));
                        setTemplateId(tpl.id);
                        setMood(tpl.defaultMood);
                        pushHistory(nextEls, tpl.canvasBackground, tpl.canvasBorder);
                        showToast(`Applied "${tpl.name}" template.`, 'info');
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-white/60 dark:bg-white/8 hover:bg-violet-500/15 border border-slate-200/70 dark:border-white/10 cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {tpl.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {tpl.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {activeTool === 'layers' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Layer Order ({elements.length})
                  </p>
                  {elements.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Canvas is empty.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {[...elements]
                        .sort((a, b) => b.zIndex - a.zIndex)
                        .map((el) => (
                          <div
                            key={el.id}
                            onClick={() => setSelectedElementId(el.id)}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs cursor-pointer ${
                              selectedElementId === el.id
                                ? 'border-violet-500 bg-violet-500/12'
                                : 'border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5'
                            }`}
                          >
                            <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                              {el.type === 'text'
                                ? el.text?.slice(0, 22) || 'Text Box'
                                : el.type === 'sticker'
                                  ? `${el.stickerEmoji} ${el.stickerLabel || 'Sticker'}`
                                  : el.type === 'image'
                                    ? 'Uploaded Photo'
                                    : `Shape (${el.shapeKind || 'box'})`}
                            </span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  reorderLayer(el.id, 'forward');
                                }}
                                className="p-1 hover:text-violet-600 cursor-pointer"
                                title="Bring Forward"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  reorderLayer(el.id, 'backward');
                                }}
                                className="p-1 hover:text-violet-600 cursor-pointer"
                                title="Send Backward"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeElement(el.id);
                                }}
                                className="p-1 hover:text-rose-500 cursor-pointer"
                                title="Delete layer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Interactive Editable Canvas */}
          <div
            ref={canvasViewportRef}
            onClick={() => {
              setSelectedElementId(null);
              setEditingTextId(null);
            }}
            className="xl:col-span-6 liquid-glass rounded-2xl p-3 flex flex-col items-center justify-start overflow-hidden"
          >
            <div
              className="relative shadow-2xl rounded-lg overflow-hidden select-none"
              style={{
                width: Math.round(CANVAS_WIDTH * canvasScale),
                height: Math.round(CANVAS_HEIGHT * canvasScale),
              }}
            >
              <div
                style={{
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  transform: `scale(${canvasScale})`,
                  transformOrigin: 'top left',
                  background: canvasBackground,
                  border: canvasBorder !== 'none' ? canvasBorder : undefined,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {[...elements]
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map((el) => {
                    const isSelected = selectedElementId === el.id;
                    const isEditingText = editingTextId === el.id;
                    return (
                      <div
                        key={el.id}
                        onPointerDown={(e) => beginDrag(e, el)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (el.type === 'text') {
                            setSelectedElementId(el.id);
                            setEditingTextId(el.id);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: el.x,
                          top: el.y,
                          width: el.width,
                          height: el.height,
                          transform: `rotate(${el.rotation || 0}deg)`,
                          zIndex: el.zIndex,
                          opacity: el.opacity ?? 1,
                          cursor: isEditingText ? 'text' : 'move',
                          outline: isSelected ? '2px solid #8B5CF6' : 'none',
                          outlineOffset: 2,
                        }}
                      >
                        {el.type === 'shape' && (
                          <div
                            style={{
                              width: '100%',
                              height:
                                el.shapeKind === 'line'
                                  ? Math.max(2, (el.borderWidth ?? 2) * 2)
                                  : '100%',
                              marginTop: el.shapeKind === 'line' ? el.height / 2 - 2 : 0,
                              backgroundColor:
                                el.shapeKind === 'line'
                                  ? el.borderColor || '#8B5CF6'
                                  : el.backgroundColor || 'rgba(139,92,246,0.16)',
                              border:
                                el.shapeKind === 'line'
                                  ? 'none'
                                  : `${el.borderWidth ?? 1}px solid ${el.borderColor || '#8B5CF6'}`,
                              borderRadius:
                                el.shapeKind === 'circle'
                                  ? '9999px'
                                  : el.shapeKind === 'badge'
                                    ? '9999px'
                                    : el.shapeKind === 'rect'
                                      ? 0
                                      : el.borderRadius ?? 14,
                            }}
                          />
                        )}

                        {el.type === 'image' && el.imageUrl && (
                          <img
                            src={el.imageUrl}
                            alt="Uploaded journal asset"
                            draggable={false}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: el.borderRadius ?? 12,
                              border: `${el.borderWidth ?? 0}px solid ${el.borderColor || '#ffffff'}`,
                              display: 'block',
                            }}
                          />
                        )}

                        {el.type === 'sticker' && (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ fontSize: el.fontSize || 48, lineHeight: 1 }}
                          >
                            {el.stickerEmoji}
                          </div>
                        )}

                        {el.type === 'text' &&
                          (isEditingText ? (
                            <textarea
                              autoFocus
                              value={el.text || ''}
                              onChange={(e) =>
                                updateElement(el.id, { text: e.target.value }, false)
                              }
                              onBlur={() => setEditingTextId(null)}
                              onPointerDown={(e) => e.stopPropagation()}
                              style={{
                                width: '100%',
                                height: '100%',
                                resize: 'none',
                                background: 'rgba(255,255,255,0.08)',
                                outline: 'none',
                                border: 'none',
                                padding: '6px',
                                fontSize: el.fontSize || 18,
                                fontFamily: el.fontFamily || 'DM Sans, sans-serif',
                                fontWeight:
                                  el.fontWeight === 'bold'
                                    ? 700
                                    : el.fontWeight === 'semibold'
                                      ? 600
                                      : 400,
                                fontStyle: el.fontStyle || 'normal',
                                textAlign: el.textAlign || 'left',
                                color: el.color || '#0f172a',
                                lineHeight: 1.38,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                padding: '6px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: el.fontSize || 18,
                                fontFamily: el.fontFamily || 'DM Sans, sans-serif',
                                fontWeight:
                                  el.fontWeight === 'bold'
                                    ? 700
                                    : el.fontWeight === 'semibold'
                                      ? 600
                                      : 400,
                                fontStyle: el.fontStyle || 'normal',
                                textAlign: el.textAlign || 'left',
                                color: el.color || '#0f172a',
                                lineHeight: 1.38,
                              }}
                            >
                              {el.text}
                            </div>
                          ))}

                        {/* Bottom-Right Resize Handle */}
                        {isSelected && !isEditingText && (
                          <div
                            onPointerDown={(e) => beginResize(e, el)}
                            title="Drag to resize"
                            style={{
                              position: 'absolute',
                              right: -7,
                              bottom: -7,
                              width: 14,
                              height: 14,
                              borderRadius: '9999px',
                              backgroundColor: '#8B5CF6',
                              border: '2px solid #ffffff',
                              cursor: 'nwse-resize',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
            <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
              Drag elements to position · Drag purple corner dot to resize · Double-click text to type
            </p>
          </div>

          {/* Right Element Inspector & Reflection Notes */}
          <div className="xl:col-span-3 liquid-glass rounded-2xl overflow-hidden flex flex-col">
            <div className="grid grid-cols-2 border-b border-slate-200/60 dark:border-white/10 p-1.5 gap-1">
              <button
                type="button"
                onClick={() => setInspectorTab('element')}
                className={`py-2 rounded-xl text-xs font-medium cursor-pointer ${
                  inspectorTab === 'element'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Inspector
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('reflection')}
                className={`py-2 rounded-xl text-xs font-medium cursor-pointer ${
                  inspectorTab === 'reflection'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Written Notes
              </button>
            </div>

            {inspectorTab === 'reflection' ? (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gratitude Log
                  </label>
                  <textarea
                    rows={3}
                    value={gratitude}
                    onChange={(e) => setGratitude(e.target.value)}
                    placeholder="What are you grateful for today?"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/15 bg-white/80 dark:bg-slate-900/75 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Daily Reflection
                  </label>
                  <textarea
                    rows={8}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Thoughts, lessons, and moments..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/15 bg-white/80 dark:bg-slate-900/75 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            ) : !selectedElement ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <Move className="w-6 h-6 text-violet-500 mx-auto" />
                <p>Click any element on the canvas to customize typography, colors, rotation, and layers.</p>
              </div>
            ) : (
              <div className="p-4 space-y-4 max-h-[540px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                    {selectedElement.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => duplicateElement(selectedElement)}
                      className="p-1.5 rounded-lg bg-white/60 dark:bg-white/8 hover:text-violet-600 cursor-pointer"
                      title="Duplicate element"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeElement(selectedElement.id)}
                      className="p-1.5 rounded-lg bg-white/60 dark:bg-white/8 hover:text-rose-500 cursor-pointer"
                      title="Delete element"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {selectedElement.type === 'text' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Text Content
                      </label>
                      <textarea
                        rows={3}
                        value={selectedElement.text || ''}
                        onChange={(e) =>
                          updateElement(selectedElement.id, { text: e.target.value }, false)
                        }
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200/80 dark:border-white/15 bg-white/80 dark:bg-slate-900/75 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Font
                        </label>
                        <select
                          value={selectedElement.fontFamily || 'DM Sans, sans-serif'}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { fontFamily: e.target.value })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/15 bg-white/80 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                        >
                          {FONT_FAMILIES.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Size ({selectedElement.fontSize || 18}px)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={72}
                          value={selectedElement.fontSize || 18}
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              fontSize: Math.max(10, Math.min(72, Number(e.target.value) || 18)),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/15 bg-white/80 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateElement(selectedElement.id, {
                              fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold',
                            })
                          }
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            selectedElement.fontWeight === 'bold'
                              ? 'border-violet-500 bg-violet-500/15 text-violet-600'
                              : 'border-slate-200/80 dark:border-white/12'
                          }`}
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateElement(selectedElement.id, {
                              fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic',
                            })
                          }
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            selectedElement.fontStyle === 'italic'
                              ? 'border-violet-500 bg-violet-500/15 text-violet-600'
                              : 'border-slate-200/80 dark:border-white/12'
                          }`}
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {(
                          [
                            { a: 'left', icon: AlignLeft },
                            { a: 'center', icon: AlignCenter },
                            { a: 'right', icon: AlignRight },
                          ] as const
                        ).map(({ a, icon: Icon }) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => updateElement(selectedElement.id, { textAlign: a })}
                            className={`p-1.5 rounded-lg border cursor-pointer ${
                              (selectedElement.textAlign || 'left') === a
                                ? 'border-violet-500 bg-violet-500/15 text-violet-600'
                                : 'border-slate-200/80 dark:border-white/12'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Text Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedElement.color || '#0f172a'}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { color: e.target.value })
                          }
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                          {selectedElement.color || '#0f172a'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {selectedElement.type === 'sticker' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Sticker Size ({selectedElement.fontSize || 48}px)
                    </label>
                    <input
                      type="range"
                      min={24}
                      max={96}
                      value={selectedElement.fontSize || 48}
                      onChange={(e) =>
                        updateElement(
                          selectedElement.id,
                          { fontSize: Number(e.target.value) },
                          false
                        )
                      }
                      className="w-full accent-violet-600"
                    />
                  </div>
                )}

                {(selectedElement.type === 'shape' || selectedElement.type === 'image') && (
                  <div className="space-y-3">
                    {selectedElement.type === 'shape' && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Fill Color
                        </label>
                        <input
                          type="color"
                          value={
                            selectedElement.backgroundColor?.startsWith('#')
                              ? selectedElement.backgroundColor
                              : '#8b5cf6'
                          }
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              backgroundColor: e.target.value,
                            })
                          }
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Border Color
                        </label>
                        <input
                          type="color"
                          value={
                            selectedElement.borderColor?.startsWith('#')
                              ? selectedElement.borderColor
                              : '#8b5cf6'
                          }
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              borderColor: e.target.value,
                            })
                          }
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Border Width
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={selectedElement.borderWidth ?? 1}
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              borderWidth: Math.max(0, Math.min(20, Number(e.target.value) || 0)),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/15 bg-white/80 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Rotation & Layer Order */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <span className="inline-flex items-center gap-1">
                      <RotateCw className="w-3 h-3" />
                      <span>Rotation</span>
                    </span>
                    <span className="font-mono tabular-nums">{selectedElement.rotation || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={selectedElement.rotation || 0}
                    onChange={(e) =>
                      updateElement(
                        selectedElement.id,
                        { rotation: Number(e.target.value) },
                        false
                      )
                    }
                    className="w-full accent-violet-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <span>Opacity</span>
                    <span className="font-mono tabular-nums">
                      {Math.round((selectedElement.opacity ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={100}
                    value={Math.round((selectedElement.opacity ?? 1) * 100)}
                    onChange={(e) =>
                      updateElement(
                        selectedElement.id,
                        { opacity: Number(e.target.value) / 100 },
                        false
                      )
                    }
                    className="w-full accent-violet-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => reorderLayer(selectedElement.id, 'forward')}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-200/80 dark:border-white/12 text-xs text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-white/8 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Forward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => reorderLayer(selectedElement.id, 'backward')}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-200/80 dark:border-white/12 text-xs text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-white/8 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Backward</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== GALLERY VIEW ====================
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
            Visual Journal Studio
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-violet-500" />
            <span>Private creative diary with templates, photos, stickers, and PNG/PDF export.</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setTemplatePickerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-md shadow-violet-600/20 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Journal Page</span>
          </button>
        </div>
      </div>

      {/* Quick Start Templates Row */}
      <div className="liquid-glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span>Start from a Template</span>
          </h2>
          <button
            type="button"
            onClick={() => setTemplatePickerOpen(true)}
            className="text-xs font-medium text-violet-600 dark:text-violet-300 hover:underline cursor-pointer"
          >
            View all {JOURNAL_TEMPLATES.length} templates
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {JOURNAL_TEMPLATES.slice(0, 5).map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => void startFromTemplate(tpl)}
              className="group text-left p-3 rounded-xl border border-slate-200/80 dark:border-white/12 bg-white/55 dark:bg-white/5 hover:border-violet-500/60 transition-all cursor-pointer"
            >
              <div
                className="h-14 rounded-lg mb-2 border border-black/10 flex items-center justify-center text-xs font-medium"
                style={{ background: tpl.canvasBackground }}
              >
                <span
                  className="px-2 py-0.5 rounded bg-white/85 text-slate-900 text-[10px] font-semibold shadow-sm"
                >
                  {tpl.id === 'blank' ? 'Blank' : 'Template'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {tpl.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                {tpl.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'all', label: `All (${journalEntries.length})` },
              {
                id: 'published',
                label: `Saved (${journalEntries.filter((e) => !e.isDraft).length})`,
              },
              {
                id: 'drafts',
                label: `Drafts (${journalEntries.filter((e) => e.isDraft).length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setGalleryFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                galleryFilter === tab.id
                  ? 'bg-violet-600 text-white'
                  : 'liquid-glass text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search journal pages..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl liquid-glass text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Entries Gallery */}
      {filteredEntries.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-12 text-center">
          <BookOpen className="w-8 h-8 text-violet-500 mx-auto mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No journal pages yet. Choose any template above or start with a blank canvas!
          </p>
          <button
            type="button"
            onClick={() => void startFromTemplate(JOURNAL_TEMPLATES[0])}
            className="mt-3 text-sm font-medium text-violet-600 dark:text-violet-300 hover:underline cursor-pointer"
          >
            Create blank journal page
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEntries.map((entry) => {
            const hasVisual = Boolean(entry.elements && entry.elements.length > 0);
            const firstImage = entry.elements?.find((e) => e.type === 'image' && e.imageUrl);
            const firstSticker = entry.elements?.find((e) => e.type === 'sticker' && e.stickerEmoji);
            return (
              <article
                key={entry.id}
                className="liquid-glass rounded-2xl overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div>
                  {/* Visual Mini Preview */}
                  <div
                    onClick={() => openEntryInStudio(entry)}
                    className="relative h-40 p-4 flex flex-col justify-between cursor-pointer border-b border-slate-200/60 dark:border-white/10 overflow-hidden"
                    style={{
                      background:
                        entry.canvasBackground ||
                        'linear-gradient(135deg, rgba(139,92,246,0.16), rgba(99,102,241,0.12))',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 z-10">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900/65 text-white text-[11px] font-mono tabular-nums backdrop-blur-sm">
                        {formatPrettyDate(entry.date)}
                      </span>
                      {entry.isDraft && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/85 text-white text-[11px] font-medium">
                          Draft
                        </span>
                      )}
                    </div>

                    {firstImage?.imageUrl ? (
                      <img
                        src={firstImage.imageUrl}
                        alt={entry.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-55"
                      />
                    ) : null}

                    <div className="relative z-10 flex items-end justify-between gap-2">
                      <p className="px-2.5 py-1 rounded-lg bg-white/85 dark:bg-slate-950/75 text-slate-900 dark:text-white font-display text-sm font-semibold truncate backdrop-blur-md">
                        {entry.title}
                      </p>
                      {firstSticker?.stickerEmoji && (
                        <span className="text-2xl drop-shadow">{firstSticker.stickerEmoji}</span>
                      )}
                    </div>
                  </div>

                  {/* Summary Meta */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="capitalize font-medium text-violet-700 dark:text-violet-300">
                        Mood: {entry.mood}
                      </span>
                      <span className="tabular-nums">
                        {hasVisual
                          ? `${entry.elements?.length || 0} canvas layers`
                          : 'Written entry'}
                      </span>
                    </div>
                    {(entry.gratitude || entry.reflection) && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {entry.reflection || entry.gratitude}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-4 pb-4 pt-2 border-t border-slate-200/60 dark:border-white/8 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEntryInStudio(entry)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/12 hover:bg-violet-600/22 text-violet-700 dark:text-violet-300 text-xs font-medium cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Open Studio</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRenameTarget(entry);
                        setRenameValue(entry.title);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      title="Rename"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDuplicateEntry(entry)}
                      className="p-1.5 text-slate-400 hover:text-violet-600 cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteEntry(entry)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Full Template Picker Modal */}
      {templatePickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="liquid-glass w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                  Choose a Journal Template
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Start from a blank canvas or pick one of 8 ready-made layouts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplatePickerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {JOURNAL_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => void startFromTemplate(tpl)}
                  className="text-left p-3.5 rounded-xl border border-slate-200/80 dark:border-white/12 bg-white/60 dark:bg-white/5 hover:border-violet-500 transition-all cursor-pointer"
                >
                  <div
                    className="h-20 rounded-lg mb-2.5 border border-black/10 flex items-center justify-center"
                    style={{ background: tpl.canvasBackground }}
                  >
                    <span className="px-2.5 py-1 rounded-md bg-white/90 text-slate-900 text-xs font-semibold shadow">
                      {tpl.name}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {tpl.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {tpl.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="liquid-glass w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white mb-3">
              Rename Journal Entry
            </h2>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                required
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-medium cursor-pointer"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
