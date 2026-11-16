import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Check, Flame, Plus, Trash2, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import {
  calculateHabitStreak,
  formatShortDay,
  getLastNDays,
  todayStr,
} from '../../lib/dates';
import type { HabitFrequency } from '../../types/mysphere';

const EXAMPLE_HABITS = [
  'Study for 2 hours',
  'Read 10 pages',
  'Drink enough water',
  'Practice coding',
  'Exercise',
  'Wake up early',
];

const HABIT_COLORS = ['#8B5CF6', '#6366F1', '#10B981', '#F59E0B', '#EC4899'];

export const HabitsView: React.FC = () => {
  const { habits, habitCompletions, addHabit, deleteHabit, toggleHabitCompletion } = useData();
  const { theme } = useTheme();
  const { showToast, confirmDialog } = useToast();

  const [calendarMode, setCalendarMode] = useState<'weekly' | 'monthly'>('weekly');
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [targetPerWeek, setTargetPerWeek] = useState(7);
  const [color, setColor] = useState('#8B5CF6');
  const [saving, setSaving] = useState(false);

  const today = todayStr();
  const displayDays = useMemo(
    () => getLastNDays(calendarMode === 'weekly' ? 7 : 28),
    [calendarMode]
  );

  const completedSet = useMemo(() => {
    const s = new Set<string>();
    habitCompletions.forEach((c) => {
      if (c.completed) s.add(`${c.habitId}_${c.date}`);
    });
    return s;
  }, [habitCompletions]);

  const consistencyChartData = useMemo(() => {
    const last14 = getLastNDays(14);
    return last14.map((date) => {
      const done = habits.filter((h) => completedSet.has(`${h.id}_${date}`)).length;
      const pct = habits.length > 0 ? Math.round((done / habits.length) * 100) : 0;
      return {
        day: date.slice(5),
        completion: pct,
      };
    });
  }, [habits, completedSet]);

  const overallCompletionPct = useMemo(() => {
    if (habits.length === 0) return 0;
    const days = getLastNDays(7);
    let totalChecks = 0;
    let totalSlots = habits.length * days.length;
    for (const h of habits) {
      for (const d of days) {
        if (completedSet.has(`${h.id}_${d}`)) totalChecks++;
      }
    }
    return totalSlots > 0 ? Math.round((totalChecks / totalSlots) * 100) : 0;
  }, [habits, completedSet]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await addHabit({
        title: title.trim(),
        frequency,
        targetPerWeek: frequency === 'daily' ? 7 : targetPerWeek,
        color,
      });
      setTitle('');
      setModalOpen(false);
      showToast('Habit added.', 'success');
    } catch {
      showToast('Could not add habit.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAdd = async (habitTitle: string) => {
    if (habits.some((h) => h.title.toLowerCase() === habitTitle.toLowerCase())) {
      showToast(`"${habitTitle}" is already in your habits.`, 'info');
      return;
    }
    await addHabit({
      title: habitTitle,
      frequency: 'daily',
      targetPerWeek: 7,
      color: HABIT_COLORS[habits.length % HABIT_COLORS.length],
    });
    showToast(`Added "${habitTitle}".`, 'success');
  };

  const handleDelete = async (id: string, habitTitle: string) => {
    const ok = await confirmDialog({
      title: 'Delete habit?',
      description: `Delete "${habitTitle}" and its completion history?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await deleteHabit(id);
    showToast('Habit deleted.', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
            Habit Tracker
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Build daily consistency, track streaks, and spot missed days.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-950/65">
            <button
              type="button"
              onClick={() => setCalendarMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                calendarMode === 'weekly'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                calendarMode === 'monthly'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Monthly
            </button>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Habit</span>
          </button>
        </div>
      </div>

      {/* Summary & Quick Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">7-Day Habit Completion</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-slate-950 dark:text-white tabular-nums">
              {overallCompletionPct}%
            </p>
          </div>
          <Flame className="w-7 h-7 text-violet-500" />
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-5">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2.5">
            Quick-add popular habits
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_HABITS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => void handleQuickAdd(ex)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-violet-500 text-xs text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                + {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Habit Matrix */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl overflow-hidden">
        {habits.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No habits tracked yet. Add a custom habit or tap a quick-add template above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/70 dark:divide-white/8">
            {habits.map((habit) => {
              const { current, best, missedLast7 } = calculateHabitStreak(
                habit.id,
                habitCompletions
              );
              const doneToday = completedSet.has(`${habit.id}_${today}`);
              const doneCountInRange = displayDays.filter((d) =>
                completedSet.has(`${habit.id}_${d}`)
              ).length;
              const pctInRange = Math.round((doneCountInRange / displayDays.length) * 100);

              return (
                <div key={habit.id} className="p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => void toggleHabitCompletion(habit.id, today)}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                          doneToday
                            ? 'text-white border-transparent'
                            : 'border-slate-300 dark:border-slate-600 hover:border-violet-500'
                        }`}
                        style={doneToday ? { backgroundColor: habit.color } : undefined}
                        aria-label={`Toggle ${habit.title} for today`}
                      >
                        {doneToday && <Check className="w-4 h-4" />}
                      </button>

                      <div>
                        <h3 className="font-display font-semibold text-base text-slate-950 dark:text-white">
                          {habit.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {habit.frequency} · Streak: {current}d · Best: {best}d · Missed (7d):{' '}
                          {missedLast7}d · {pctInRange}%
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleDelete(habit.id, habit.title)}
                      className="self-end sm:self-center p-2 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                      aria-label="Delete habit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Weekly or Monthly day squares */}
                  <div
                    className={`grid gap-1.5 ${
                      calendarMode === 'weekly' ? 'grid-cols-7' : 'grid-cols-7 sm:grid-cols-14'
                    }`}
                  >
                    {displayDays.map((d) => {
                      const isDone = completedSet.has(`${habit.id}_${d}`);
                      const isToday = d === today;
                      const isMissed = !isDone && d < today;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => void toggleHabitCompletion(habit.id, d)}
                          title={`${d}: ${isDone ? 'Completed' : isMissed ? 'Missed' : 'Pending'}`}
                          className={`py-2 px-1 rounded-lg border text-center transition-colors cursor-pointer ${
                            isDone
                              ? 'text-white border-transparent'
                              : isMissed
                                ? 'border-rose-500/25 bg-rose-500/5 text-slate-400 dark:text-slate-500'
                                : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'
                          } ${isToday ? 'ring-2 ring-violet-500/60' : ''}`}
                          style={isDone ? { backgroundColor: habit.color } : undefined}
                        >
                          <span className="block text-[10px] leading-none">
                            {calendarMode === 'weekly' ? formatShortDay(d) : d.slice(8)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Consistency Chart */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-6">
        <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
          14-Day Habit Consistency
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Daily percentage of active habits checked off
        </p>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consistencyChartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}
              />
              <XAxis
                dataKey="day"
                stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="completion" name="Completion %" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Create Habit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                New Habit
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Habit Name
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Practice coding for 45 mins"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                {frequency === 'weekly' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target Days / Week
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={targetPerWeek}
                      onChange={(e) => setTargetPerWeek(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-2.5">
                  {HABIT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full cursor-pointer ${
                        color === c ? 'ring-2 ring-offset-2 ring-violet-500 dark:ring-offset-slate-950' : ''
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer"
                >
                  {saving ? 'Adding...' : 'Create Habit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
