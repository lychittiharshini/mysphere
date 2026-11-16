import type {
  FocusSession,
  Goal,
  GoalChecklistItem,
  Habit,
  HabitCompletion,
  Task,
} from '../types/mysphere';

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toDateStr(dt);
}

export function getLastNDays(n: number): string[] {
  const today = new Date();
  const res: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - i);
    res.push(toDateStr(dt));
  }
  return res;
}

export function formatShortDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatPrettyDate(dateStr: string): string {
  if (!dateStr) return 'No date';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatFullToday(): { dayName: string; fullDate: string } {
  const now = new Date();
  return {
    dayName: now.toLocaleDateString('en-US', { weekday: 'long' }),
    fullDate: now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  };
}

export const DAILY_QUOTES: { text: string; author: string }[] = [
  { text: 'Small disciplines repeated with consistency every day lead to great achievements gained slowly over time.', author: 'John C. Maxwell' },
  { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { text: 'Focus is a matter of deciding what things you are not going to do.', author: 'John Carmack' },
  { text: 'Quiet progress in the dark blooms into unmistakable growth in the light.', author: 'MySphere Almanac' },
  { text: 'The secret of your future is hidden in your daily routine.', author: 'Mike Murdock' },
  { text: 'Amateurs sit and wait for inspiration, the rest of us just get up and go to work.', author: 'Stephen King' },
  { text: 'A little progress every day creates a bigger universe.', author: 'MySphere' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'Simplicity is about subtracting the obvious and adding the meaningful.', author: 'John Maeda' },
  { text: 'Well begun is half done.', author: 'Aristotle' },
];

export function getQuoteOfTheDay(): { text: string; author: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

export function calculateHabitStreak(
  habitId: string,
  completions: HabitCompletion[]
): { current: number; best: number; missedLast7: number } {
  const completedDates = new Set(
    completions
      .filter((c) => c.habitId === habitId && c.completed)
      .map((c) => c.date)
  );

  const today = todayStr();
  let current = 0;
  let checkDate = completedDates.has(today) ? today : addDays(today, -1);

  while (completedDates.has(checkDate)) {
    current++;
    checkDate = addDays(checkDate, -1);
    if (current > 3650) break;
  }

  let missedLast7 = 0;
  for (let i = 1; i <= 7; i++) {
    if (!completedDates.has(addDays(today, -i))) {
      missedLast7++;
    }
  }

  const sorted = Array.from(completedDates).sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const d of sorted) {
    if (!prev || addDays(prev, 1) === d) {
      run++;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = d;
  }

  return { current, best, missedLast7 };
}

export function calculateOverallHabitStreak(
  habits: Habit[],
  completions: HabitCompletion[]
): number {
  if (habits.length === 0) return 0;
  const completedByDate = new Map<string, number>();
  for (const c of completions) {
    if (c.completed) {
      completedByDate.set(c.date, (completedByDate.get(c.date) || 0) + 1);
    }
  }

  const today = todayStr();
  let streak = 0;
  let cursor = (completedByDate.get(today) || 0) > 0 ? today : addDays(today, -1);
  while ((completedByDate.get(cursor) || 0) > 0) {
    streak++;
    cursor = addDays(cursor, -1);
    if (streak > 3650) break;
  }
  return streak;
}

export function calculateDailyProductivityScore(params: {
  tasks: Task[];
  goals: Goal[];
  goalChecklistItems?: GoalChecklistItem[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  focusSessions: FocusSession[];
}): number {
  const today = todayStr();
  const dueOrDoneToday = params.tasks.filter(
    (t) => t.dueDate === today || (t.completed && t.completedAt.startsWith(today))
  );
  const completedToday = params.tasks.filter(
    (t) => t.completed && (t.completedAt.startsWith(today) || t.dueDate === today)
  );
  const taskRatio =
    dueOrDoneToday.length > 0
      ? Math.min(1, completedToday.length / dueOrDoneToday.length)
      : completedToday.length > 0
        ? 1
        : 0;

  const habitsDoneToday = params.habitCompletions.filter(
    (c) => c.date === today && c.completed
  ).length;
  const habitRatio =
    params.habits.length > 0 ? Math.min(1, habitsDoneToday / params.habits.length) : 0;

  const focusMinutesToday = params.focusSessions
    .filter((f) => f.date === today && (f.mode === 'focus' || f.mode === 'custom'))
    .reduce((acc, s) => acc + s.durationMinutes, 0);
  const focusRatio = Math.min(1, focusMinutesToday / 50);

  const itemsByGoal = new Map<string, GoalChecklistItem[]>();
  (params.goalChecklistItems || []).forEach((it) => {
    const arr = itemsByGoal.get(it.goalId) || [];
    arr.push(it);
    itemsByGoal.set(it.goalId, arr);
  });

  const getProgress = (g: Goal) => {
    const items = itemsByGoal.get(g.id);
    if (items && items.length > 0) {
      const done = items.filter((i) => i.completed).length;
      return Math.round((done / items.length) * 100);
    }
    if (g.milestones && g.milestones.length > 0) {
      const done = g.milestones.filter((m) => m.completed).length;
      return Math.round((done / g.milestones.length) * 100);
    }
    return 0;
  };

  const incompleteGoals = params.goals.filter((g) => getProgress(g) < 100);
  const completedGoals = params.goals.filter((g) => {
    const items = itemsByGoal.get(g.id);
    return (items && items.length > 0 && getProgress(g) === 100) || g.status === 'completed';
  });

  const avgGoalProgress =
    incompleteGoals.length > 0
      ? incompleteGoals.reduce((acc, g) => acc + getProgress(g), 0) /
        (incompleteGoals.length * 100)
      : completedGoals.length > 0
        ? 1
        : 0;

  const score = Math.round(
    taskRatio * 40 + habitRatio * 30 + focusRatio * 20 + avgGoalProgress * 10
  );
  return Math.max(0, Math.min(100, score));
}
