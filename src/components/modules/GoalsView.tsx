import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Code2,
  Clock,
  Edit2,
  GripVertical,
  Heart,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { formatPrettyDate, todayStr } from '../../lib/dates';
import {
  computeGoalStats,
  getGoalChecklist,
  GOAL_CATEGORIES,
  GOAL_COLORS,
  GOAL_ICONS,
} from '../../lib/goals';
import type {
  Goal,
  GoalCategory,
  GoalChecklistItem,
  GoalComputedStatus,
  GoalIconKey,
  GoalStepDraft,
} from '../../types/mysphere';

type StatusFilter = 'all' | GoalComputedStatus;
type CategoryFilter = 'all' | GoalCategory;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All Goals' },
  { id: 'not-started', label: 'Not Started' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'overdue', label: 'Overdue' },
];

const renderGoalIcon = (iconKey: GoalIconKey, className = 'w-5 h-5') => {
  switch (iconKey) {
    case 'book':
      return <BookOpen className={className} />;
    case 'briefcase':
      return <Briefcase className={className} />;
    case 'user':
      return <User className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'code':
      return <Code2 className={className} />;
    case 'wallet':
      return <Wallet className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    default:
      return <Target className={className} />;
  }
};

const renderStatusIndicator = (status: GoalComputedStatus) => {
  switch (status) {
    case 'completed':
      return {
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
        textClass: 'text-emerald-600 dark:text-emerald-400',
        label: 'Completed',
      };
    case 'overdue':
      return {
        icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500" />,
        textClass: 'text-rose-600 dark:text-rose-400',
        label: 'Overdue',
      };
    case 'in-progress':
      return {
        icon: <Clock className="w-3.5 h-3.5 text-violet-500" />,
        textClass: 'text-violet-600 dark:text-violet-300',
        label: 'In Progress',
      };
    default:
      return {
        icon: <CircleDashed className="w-3.5 h-3.5 text-slate-400" />,
        textClass: 'text-slate-500 dark:text-slate-400',
        label: 'Not Started',
      };
  }
};

export const GoalsView: React.FC = () => {
  const {
    goals,
    goalChecklistItems,
    addGoal,
    updateGoal,
    deleteGoal,
    addGoalChecklistItem,
    toggleGoalChecklistItem,
    updateGoalChecklistItemTitle,
    deleteGoalChecklistItem,
    reorderGoalChecklistItems,
  } = useData();
  const { showToast, confirmDialog } = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [celebratingGoalId, setCelebratingGoalId] = useState<string | null>(null);

  // Per-card inline checklist creation & editing
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState('');
  const [dragState, setDragState] = useState<{ goalId: string; itemId: string } | null>(null);

  // Create / Edit Goal modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('Study');
  const [icon, setIcon] = useState<GoalIconKey>('target');
  const [color, setColor] = useState<string>('#8B5CF6');
  const [startDate, setStartDate] = useState(todayStr());
  const [targetDate, setTargetDate] = useState('');
  const [draftSteps, setDraftSteps] = useState<GoalStepDraft[]>([]);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);
  const [editingStepText, setEditingStepText] = useState('');
  const [saving, setSaving] = useState(false);

  const today = todayStr();

  const enrichedGoals = useMemo(() => {
    return goals.map((goal) => {
      const items = getGoalChecklist(goal, goalChecklistItems);
      const stats = computeGoalStats(goal, items, today);
      return { goal, items, stats };
    });
  }, [goals, goalChecklistItems, today]);

  const dashboardMetrics = useMemo(() => {
    const totalGoals = enrichedGoals.length;
    let completedGoals = 0;
    let inProgressGoals = 0;
    let overdueGoals = 0;
    let notStartedGoals = 0;
    let totalSteps = 0;
    let completedSteps = 0;

    enrichedGoals.forEach(({ stats }) => {
      totalSteps += stats.totalItems;
      completedSteps += stats.completedItems;
      if (stats.computedStatus === 'completed') completedGoals++;
      else if (stats.computedStatus === 'overdue') overdueGoals++;
      else if (stats.computedStatus === 'in-progress') inProgressGoals++;
      else notStartedGoals++;
    });

    const overallStepPct =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return {
      totalGoals,
      completedGoals,
      inProgressGoals,
      overdueGoals,
      notStartedGoals,
      totalSteps,
      completedSteps,
      overallStepPct,
    };
  }, [enrichedGoals]);

  const filteredGoals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedGoals
      .filter(({ goal, items, stats }) => {
        if (statusFilter !== 'all' && stats.computedStatus !== statusFilter) return false;
        if (categoryFilter !== 'all' && stats.category !== categoryFilter) return false;
        if (q) {
          const matchesGoal =
            goal.title.toLowerCase().includes(q) ||
            goal.description.toLowerCase().includes(q) ||
            stats.category.toLowerCase().includes(q);
          const matchesItem = items.some((it) => it.title.toLowerCase().includes(q));
          if (!matchesGoal && !matchesItem) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const orderRank = (s: GoalComputedStatus) => {
          if (s === 'overdue') return 0;
          if (s === 'in-progress') return 1;
          if (s === 'not-started') return 2;
          return 3;
        };
        const diff = orderRank(a.stats.computedStatus) - orderRank(b.stats.computedStatus);
        if (diff !== 0) return diff;
        return (a.goal.targetDate || '9999').localeCompare(b.goal.targetDate || '9999');
      });
  }, [enrichedGoals, statusFilter, categoryFilter, searchQuery]);

  const toggleExpand = (goalId: string) => {
    setExpandedIds((prev) => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  const triggerCelebration = (goalId: string) => {
    setCelebratingGoalId(goalId);
    showToast('Goal completed! All action steps checked off.', 'success');
    window.setTimeout(() => {
      setCelebratingGoalId((curr) => (curr === goalId ? null : curr));
    }, 2800);
  };

  const handleToggleItem = async (
    goal: Goal,
    items: GoalChecklistItem[],
    item: GoalChecklistItem
  ) => {
    const nextDone = !item.completed;
    const willCompleteAll =
      nextDone &&
      items.length > 0 &&
      items.every((it) => (it.id === item.id ? true : it.completed));

    try {
      await toggleGoalChecklistItem(item);
      if (willCompleteAll) {
        triggerCelebration(goal.id);
      }
    } catch {
      showToast('Failed to update checklist item.', 'error');
    }
  };

  const handleInlineAddStep = async (goalId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = (inlineDrafts[goalId] || '').trim();
    if (!text) return;
    setInlineDrafts((prev) => ({ ...prev, [goalId]: '' }));
    try {
      await addGoalChecklistItem(goalId, text);
    } catch {
      showToast('Failed to add action step.', 'error');
    }
  };

  const startEditingItem = (item: GoalChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemTitle(item.title);
  };

  const commitItemEdit = async (item: GoalChecklistItem) => {
    const clean = editingItemTitle.trim();
    setEditingItemId(null);
    if (!clean || clean === item.title) return;
    try {
      await updateGoalChecklistItemTitle(item, clean);
    } catch {
      showToast('Failed to rename step.', 'error');
    }
  };

  const handleDeleteItem = async (item: GoalChecklistItem) => {
    try {
      await deleteGoalChecklistItem(item);
    } catch {
      showToast('Failed to delete step.', 'error');
    }
  };

  const moveItemByDelta = async (
    goalId: string,
    items: GoalChecklistItem[],
    index: number,
    delta: -1 | 1
  ) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const copy = [...items];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    try {
      await reorderGoalChecklistItems(goalId, copy);
    } catch {
      showToast('Failed to reorder steps.', 'error');
    }
  };

  const handleDropItem = async (
    goalId: string,
    items: GoalChecklistItem[],
    targetItemId: string
  ) => {
    if (!dragState || dragState.goalId !== goalId || dragState.itemId === targetItemId) {
      setDragState(null);
      return;
    }
    const fromIdx = items.findIndex((i) => i.id === dragState.itemId);
    const toIdx = items.findIndex((i) => i.id === targetItemId);
    setDragState(null);
    if (fromIdx < 0 || toIdx < 0) return;
    const copy = [...items];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    try {
      await reorderGoalChecklistItems(goalId, copy);
    } catch {
      showToast('Failed to reorder steps.', 'error');
    }
  };

  const openCreateModal = () => {
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setCategory('Study');
    setIcon('target');
    setColor('#8B5CF6');
    setStartDate(todayStr());
    setTargetDate('');
    setDraftSteps([]);
    setNewStepTitle('');
    setEditingStepIdx(null);
    setEditingStepText('');
    setModalOpen(true);
  };

  const openEditModal = (goal: Goal, items: GoalChecklistItem[]) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setCategory(goal.category || 'Personal');
    setIcon(goal.icon || 'target');
    setColor(goal.color || '#8B5CF6');
    setStartDate(goal.startDate || todayStr());
    setTargetDate(goal.targetDate || '');
    setDraftSteps(
      items.map((it) => ({
        id: it.id,
        title: it.title,
        completed: it.completed,
      }))
    );
    setNewStepTitle('');
    setEditingStepIdx(null);
    setEditingStepText('');
    setModalOpen(true);
  };

  const addDraftStep = () => {
    const clean = newStepTitle.trim();
    if (!clean) return;
    setDraftSteps((prev) => [...prev, { title: clean, completed: false }]);
    setNewStepTitle('');
  };

  const moveDraftStep = (idx: number, delta: -1 | 1) => {
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= draftSteps.length) return;
    setDraftSteps((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, moved);
      return copy;
    });
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const pendingStep = newStepTitle.trim();
    const finalSteps = pendingStep
      ? [...draftSteps, { title: pendingStep, completed: false }]
      : draftSteps;

    try {
      if (editingGoal) {
        await updateGoal(
          editingGoal.id,
          {
            title: title.trim(),
            description: description.trim(),
            category,
            icon,
            color,
            startDate,
            targetDate,
          },
          finalSteps
        );
        showToast('Goal updated.', 'success');
      } else {
        await addGoal(
          {
            title: title.trim(),
            description: description.trim(),
            category,
            icon,
            color,
            startDate,
            targetDate,
          },
          finalSteps
        );
        showToast('Goal created.', 'success');
      }
      setModalOpen(false);
    } catch {
      showToast('Failed to save goal.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (goal: Goal) => {
    const ok = await confirmDialog({
      title: 'Delete goal?',
      description: `Remove "${goal.title}" and all of its checklist steps permanently?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteGoal(goal.id);
      showToast('Goal removed.', 'info');
    } catch {
      showToast('Failed to delete goal.', 'error');
    }
  };

  const draftDoneCount = draftSteps.filter((s) => s.completed).length;
  const draftProgress =
    draftSteps.length > 0 ? Math.round((draftDoneCount / draftSteps.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
            Goals & Action Plans
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Break big ambitions into checkable steps—progress and status update automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Goal</span>
        </button>
      </div>

      {/* Goal Dashboard Summary */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Goals</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
              {dashboardMetrics.totalGoals}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Completed Goals</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {dashboardMetrics.completedGoals}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">In Progress Goals</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-violet-600 dark:text-violet-300 tabular-nums">
              {dashboardMetrics.inProgressGoals}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Overdue Goals</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
              {dashboardMetrics.overdueGoals}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Overall Checklist Completion
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-300 tabular-nums">
              {dashboardMetrics.totalSteps > 0
                ? `${dashboardMetrics.completedSteps}/${dashboardMetrics.totalSteps} steps completed (${dashboardMetrics.overallStepPct}%)`
                : 'No action steps added yet'}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-300"
              style={{ width: `${dashboardMetrics.overallStepPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status filter tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => {
              const count =
                f.id === 'all'
                  ? dashboardMetrics.totalGoals
                  : f.id === 'completed'
                    ? dashboardMetrics.completedGoals
                    : f.id === 'in-progress'
                      ? dashboardMetrics.inProgressGoals
                      : f.id === 'overdue'
                        ? dashboardMetrics.overdueGoals
                        : dashboardMetrics.notStartedGoals;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/75 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {f.label} <span className="font-mono tabular-nums opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search goals or steps..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Category filter bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                : 'bg-white/65 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            All Categories
          </button>
          {GOAL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                  : 'bg-white/65 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-12 text-center">
          <Target className="w-8 h-8 text-violet-500/70 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {goals.length === 0
              ? 'No goals created yet.'
              : 'No goals match the selected filters.'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {goals.length === 0
              ? 'Create a goal and break it down into checkable action steps.'
              : 'Try switching status or category filters.'}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {filteredGoals.map(({ goal, items, stats }) => {
            const isExpanded = Boolean(expandedIds[goal.id]);
            const isCelebrating = celebratingGoalId === goal.id;
            const statusUi = renderStatusIndicator(stats.computedStatus);
            const barColor =
              stats.computedStatus === 'completed'
                ? '#10B981'
                : stats.computedStatus === 'overdue'
                  ? '#F43F5E'
                  : stats.color;

            return (
              <div
                key={goal.id}
                onClick={() => toggleExpand(goal.id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(goal.id);
                  }
                }}
                className={`group rounded-2xl border bg-white/85 dark:bg-slate-950/65 backdrop-blur-xl p-5 sm:p-6 transition-all duration-200 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                  isCelebrating
                    ? 'border-emerald-500/70 ring-2 ring-emerald-500/30 animate-celebrate-burst'
                    : isExpanded
                      ? 'border-violet-500/50 dark:border-violet-400/40'
                      : 'border-slate-200/80 dark:border-white/10 hover:border-violet-400/50 dark:hover:border-violet-400/30'
                }`}
              >
                {/* Celebration Notice */}
                {isCelebrating && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/12 border border-emerald-500/30 px-3.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 animate-celebrate-burst">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>All action steps completed! Great work.</span>
                  </div>
                )}

                {/* Card Top Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                      style={{
                        backgroundColor: `${stats.color}1F`,
                        color: stats.color,
                      }}
                    >
                      {renderGoalIcon(stats.icon, 'w-5 h-5')}
                    </div>

                    <div className="min-w-0">
                      {/* Unboxed Metadata Line */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {stats.category}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">
                          ·
                        </span>
                        <span className={`inline-flex items-center gap-1 font-medium ${statusUi.textClass}`}>
                          {statusUi.icon}
                          <span>{statusUi.label}</span>
                        </span>
                      </div>

                      <h3 className="mt-1 font-display text-lg font-semibold text-slate-950 dark:text-white truncate">
                        {goal.title}
                      </h3>

                      {goal.description && (
                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {goal.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openEditModal(goal, items)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label={`Edit ${goal.title}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteGoal(goal)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      aria-label={`Delete ${goal.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpand(goal.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label={isExpanded ? 'Collapse checklist' : 'Expand checklist'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress & Target Date Section */}
                <div className="mt-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                      {stats.hasItems
                        ? `${stats.completedItems}/${stats.totalItems} completed`
                        : 'Add your first action step'}
                    </span>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        {goal.targetDate
                          ? `Target: ${formatPrettyDate(goal.targetDate)}`
                          : 'No target date'}
                      </span>
                      {stats.hasItems && (
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            stats.computedStatus === 'completed'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : stats.computedStatus === 'overdue'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {stats.progress}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Automatic Progress Bar */}
                  <div className="h-2.5 w-full rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 ease-out"
                      style={{
                        width: `${stats.hasItems ? stats.progress : 0}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>

                {/* Expanded Full Checklist */}
                {isExpanded && (
                  <div
                    className="mt-5 pt-4 border-t border-slate-200/70 dark:border-white/10 space-y-3 cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Action Steps {stats.hasItems ? `(${stats.completedItems}/${stats.totalItems})` : ''}
                      </span>
                      {items.length > 1 && (
                        <span className="text-[11px] text-slate-400">
                          Drag or use arrows to reorder
                        </span>
                      )}
                    </div>

                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 px-4 py-4 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Add your first action step below to begin tracking progress automatically.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {items.map((item, idx) => {
                          const isEditingThis = editingItemId === item.id;
                          return (
                            <li
                              key={item.id}
                              draggable={!isEditingThis}
                              onDragStart={() =>
                                setDragState({ goalId: goal.id, itemId: item.id })
                              }
                              onDragOver={(e) => {
                                e.preventDefault();
                              }}
                              onDrop={() => void handleDropItem(goal.id, items, item.id)}
                              onDragEnd={() => setDragState(null)}
                              className={`flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors ${
                                dragState?.itemId === item.id
                                  ? 'opacity-50 bg-violet-500/10'
                                  : 'bg-slate-50/90 dark:bg-white/[0.04] hover:bg-slate-100/90 dark:hover:bg-white/[0.07]'
                              }`}
                            >
                              <span
                                className="text-slate-400 cursor-grab active:cursor-grabbing hidden sm:inline-flex shrink-0"
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>

                              <button
                                type="button"
                                onClick={() => void handleToggleItem(goal, items, item)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-all duration-150 cursor-pointer ${
                                  item.completed
                                    ? 'bg-violet-600 border-violet-600 text-white animate-check-pop'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-violet-500'
                                }`}
                                aria-label={
                                  item.completed
                                    ? `Uncheck ${item.title}`
                                    : `Complete ${item.title}`
                                }
                              >
                                {item.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                              </button>

                              {isEditingThis ? (
                                <div className="flex-1 flex items-center gap-1.5 min-w-0">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editingItemTitle}
                                    onChange={(e) => setEditingItemTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        void commitItemEdit(item);
                                      } else if (e.key === 'Escape') {
                                        setEditingItemId(null);
                                      }
                                    }}
                                    className="flex-1 min-w-0 px-2.5 py-1 rounded-lg border border-violet-500 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void commitItemEdit(item)}
                                    className="px-2 py-1 rounded-lg bg-violet-600 text-white text-[11px] font-medium cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemId(null)}
                                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                    aria-label="Cancel edit"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span
                                    onDoubleClick={() => startEditingItem(item)}
                                    className={`flex-1 min-w-0 text-xs sm:text-sm break-words transition-colors ${
                                      item.completed
                                        ? 'line-through text-slate-400 dark:text-slate-500'
                                        : 'text-slate-800 dark:text-slate-100'
                                    }`}
                                  >
                                    {item.title}
                                  </span>

                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() =>
                                        void moveItemByDelta(goal.id, items, idx, -1)
                                      }
                                      className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-25 cursor-pointer disabled:cursor-default"
                                      aria-label="Move step up"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === items.length - 1}
                                      onClick={() =>
                                        void moveItemByDelta(goal.id, items, idx, 1)
                                      }
                                      className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-25 cursor-pointer disabled:cursor-default"
                                      aria-label="Move step down"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => startEditingItem(item)}
                                      className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                                      aria-label={`Edit ${item.title}`}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteItem(item)}
                                      className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                                      aria-label={`Delete ${item.title}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {/* Inline Add Step */}
                    <form
                      onSubmit={(e) => void handleInlineAddStep(goal.id, e)}
                      className="flex items-center gap-2 pt-1"
                    >
                      <input
                        type="text"
                        value={inlineDrafts[goal.id] || ''}
                        onChange={(e) =>
                          setInlineDrafts((prev) => ({ ...prev, [goal.id]: e.target.value }))
                        }
                        placeholder="Add an action step..."
                        maxLength={200}
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900/70 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Step</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                  {editingGoal ? 'Edit Goal' : 'Create New Goal'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Progress is calculated automatically from your action steps.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Learn Java"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Goal Description
                </label>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why this goal matters and what completion looks like..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as GoalCategory)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  >
                    {GOAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Icon & Color Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Goal Icon
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {GOAL_ICONS.map((ic) => (
                      <button
                        key={ic.id}
                        type="button"
                        onClick={() => setIcon(ic.id)}
                        title={ic.label}
                        className={`h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                          icon === ic.id
                            ? 'border-violet-500 bg-violet-500/15 text-violet-600 dark:text-violet-300'
                            : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {renderGoalIcon(ic.id, 'w-4 h-4')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Goal Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {GOAL_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        title={c.label}
                        aria-label={`Color ${c.label}`}
                        className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                          color === c.hex
                            ? 'scale-110 border-slate-900 dark:border-white'
                            : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Read-only Automatic Progress Summary */}
              <div className="rounded-xl bg-slate-100/80 dark:bg-white/[0.04] px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Automatic Progress Preview
                  </span>
                  <span className="font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                    {draftSteps.length > 0
                      ? `${draftDoneCount}/${draftSteps.length} completed · ${draftProgress}%`
                      : 'Add your first action step'}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${draftProgress}%`,
                      backgroundColor: draftProgress === 100 && draftSteps.length > 0 ? '#10B981' : color,
                    }}
                  />
                </div>
              </div>

              {/* Sub-goals / Action Steps Builder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Sub-goals / Action Steps ({draftSteps.length})
                  </label>
                  <span className="text-[11px] text-slate-400">Unlimited steps</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={200}
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDraftStep();
                      }
                    }}
                    placeholder="e.g. Understand Java basics"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={addDraftStep}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-xs font-medium text-slate-800 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Add Step
                  </button>
                </div>

                {draftSteps.length > 0 && (
                  <ul className="mt-2.5 space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {draftSteps.map((step, idx) => (
                      <li
                        key={step.id || `draft_${idx}`}
                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setDraftSteps((prev) =>
                              prev.map((s, i) =>
                                i === idx ? { ...s, completed: !s.completed } : s
                              )
                            )
                          }
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 cursor-pointer ${
                            step.completed
                              ? 'bg-violet-600 border-violet-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                          }`}
                          aria-label={`Toggle ${step.title}`}
                        >
                          {step.completed && <Check className="w-3 h-3" />}
                        </button>

                        {editingStepIdx === idx ? (
                          <div className="flex-1 flex items-center gap-1.5 min-w-0">
                            <input
                              type="text"
                              autoFocus
                              value={editingStepText}
                              onChange={(e) => setEditingStepText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const clean = editingStepText.trim();
                                  if (clean) {
                                    setDraftSteps((prev) =>
                                      prev.map((s, i) =>
                                        i === idx ? { ...s, title: clean } : s
                                      )
                                    );
                                  }
                                  setEditingStepIdx(null);
                                } else if (e.key === 'Escape') {
                                  setEditingStepIdx(null);
                                }
                              }}
                              className="flex-1 px-2 py-1 rounded border border-violet-500 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const clean = editingStepText.trim();
                                if (clean) {
                                  setDraftSteps((prev) =>
                                    prev.map((s, i) =>
                                      i === idx ? { ...s, title: clean } : s
                                    )
                                  );
                                }
                                setEditingStepIdx(null);
                              }}
                              className="px-2 py-1 rounded bg-violet-600 text-white text-[11px] cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              className={`flex-1 truncate ${
                                step.completed
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {step.title}
                            </span>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveDraftStep(idx, -1)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-25 cursor-pointer"
                              aria-label="Move step up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === draftSteps.length - 1}
                              onClick={() => moveDraftStep(idx, 1)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-25 cursor-pointer"
                              aria-label="Move step down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStepIdx(idx);
                                setEditingStepText(step.title);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                              aria-label="Edit step"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDraftSteps((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                              aria-label="Remove step"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium cursor-pointer"
                >
                  {saving ? 'Saving...' : editingGoal ? 'Save Goal' : 'Create New Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
