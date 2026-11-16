import type {
  Goal,
  GoalCategory,
  GoalChecklistItem,
  GoalComputedStatus,
  GoalIconKey,
} from '../types/mysphere';
import { todayStr } from './dates';

export const GOAL_CATEGORIES: GoalCategory[] = [
  'Study',
  'Career',
  'Personal',
  'Health',
  'Skills',
  'Finance',
  'Other',
];

export const GOAL_ICONS: { id: GoalIconKey; label: string }[] = [
  { id: 'target', label: 'Target' },
  { id: 'book', label: 'Study' },
  { id: 'code', label: 'Skills' },
  { id: 'briefcase', label: 'Career' },
  { id: 'heart', label: 'Health' },
  { id: 'user', label: 'Personal' },
  { id: 'wallet', label: 'Finance' },
  { id: 'sparkles', label: 'Ambition' },
];

export const GOAL_COLORS: { hex: string; label: string }[] = [
  { hex: '#8B5CF6', label: 'Violet' },
  { hex: '#6366F1', label: 'Indigo' },
  { hex: '#0EA5E9', label: 'Sky' },
  { hex: '#10B981', label: 'Emerald' },
  { hex: '#F59E0B', label: 'Amber' },
  { hex: '#EC4899', label: 'Rose' },
];

export function getGoalChecklist(
  goal: Goal,
  allChecklistItems: GoalChecklistItem[]
): GoalChecklistItem[] {
  const fromSubcollection = allChecklistItems
    .filter((item) => item.goalId === goal.id)
    .sort((a, b) => a.order - b.order);

  if (fromSubcollection.length > 0) {
    return fromSubcollection;
  }

  if (goal.milestones && goal.milestones.length > 0) {
    return goal.milestones.map((ms, idx) => ({
      id: ms.id,
      userId: goal.userId,
      goalId: goal.id,
      title: ms.title,
      completed: Boolean(ms.completed),
      order: idx,
    }));
  }

  return [];
}

export interface ComputedGoalStats {
  totalItems: number;
  completedItems: number;
  hasItems: boolean;
  progress: number;
  computedStatus: GoalComputedStatus;
  statusLabel: 'Not Started' | 'In Progress' | 'Completed' | 'Overdue';
  category: GoalCategory;
  icon: GoalIconKey;
  color: string;
}

export function computeGoalStats(
  goal: Goal,
  items: GoalChecklistItem[],
  today: string = todayStr()
): ComputedGoalStats {
  const totalItems = items.length;
  const completedItems = items.filter((i) => i.completed).length;
  const hasItems = totalItems > 0;
  const progress = hasItems ? Math.round((completedItems / totalItems) * 100) : 0;

  let computedStatus: GoalComputedStatus;
  let statusLabel: ComputedGoalStats['statusLabel'];

  if (hasItems && progress === 100) {
    computedStatus = 'completed';
    statusLabel = 'Completed';
  } else if (Boolean(goal.targetDate) && goal.targetDate < today) {
    computedStatus = 'overdue';
    statusLabel = 'Overdue';
  } else if (progress === 0) {
    computedStatus = 'not-started';
    statusLabel = 'Not Started';
  } else {
    computedStatus = 'in-progress';
    statusLabel = 'In Progress';
  }

  return {
    totalItems,
    completedItems,
    hasItems,
    progress,
    computedStatus,
    statusLabel,
    category: goal.category || 'Personal',
    icon: goal.icon || 'target',
    color: goal.color || '#8B5CF6',
  };
}
