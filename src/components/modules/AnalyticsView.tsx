import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { getLastNDays } from '../../lib/dates';
import { computeGoalStats, getGoalChecklist } from '../../lib/goals';

type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

export const AnalyticsView: React.FC = () => {
  const { tasks, goals, goalChecklistItems, habits, habitCompletions, focusSessions } = useData();
  const { theme } = useTheme();
  const [period, setPeriod] = useState<AnalyticsPeriod>('weekly');

  const dayCount = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
  const dateWindow = useMemo(() => getLastNDays(dayCount), [dayCount]);
  const windowSet = useMemo(() => new Set(dateWindow), [dateWindow]);

  const summary = useMemo(() => {
    const tasksCompleted = tasks.filter((t) => {
      if (!t.completed) return false;
      const d = t.completedAt ? t.completedAt.slice(0, 10) : t.dueDate;
      return windowSet.has(d);
    }).length;

    const goalsAchieved = goals.filter(
      (g) => computeGoalStats(g, getGoalChecklist(g, goalChecklistItems)).computedStatus === 'completed'
    ).length;

    let habitChecks = 0;
    habitCompletions.forEach((c) => {
      if (c.completed && windowSet.has(c.date)) habitChecks++;
    });
    const possibleHabitChecks = habits.length * dateWindow.length;
    const habitConsistency =
      possibleHabitChecks > 0
        ? Math.round((habitChecks / possibleHabitChecks) * 100)
        : 0;

    const focusMinutes = focusSessions
      .filter((s) => windowSet.has(s.date) && (s.mode === 'focus' || s.mode === 'custom'))
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    const focusHours = (focusMinutes / 60).toFixed(1);

    return { tasksCompleted, goalsAchieved, habitConsistency, focusHours };
  }, [tasks, goals, goalChecklistItems, habits, habitCompletions, focusSessions, windowSet, dateWindow.length]);

  const trendSeries = useMemo(() => {
    const seriesDays = period === 'daily' ? getLastNDays(7) : dateWindow;
    return seriesDays.map((date) => {
      const doneTasks = tasks.filter(
        (t) =>
          t.completed &&
          ((t.completedAt && t.completedAt.startsWith(date)) || t.dueDate === date)
      ).length;
      const doneHabits = habitCompletions.filter(
        (c) => c.date === date && c.completed
      ).length;
      const focusMins = focusSessions
        .filter((f) => f.date === date && (f.mode === 'focus' || f.mode === 'custom'))
        .reduce((acc, s) => acc + s.durationMinutes, 0);

      return {
        date: date.slice(5),
        tasks: doneTasks,
        habits: doneHabits,
        focusHours: Number((focusMins / 60).toFixed(2)),
      };
    });
  }, [period, dateWindow, tasks, habitCompletions, focusSessions]);

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, { category: string; completed: number; pending: number }>();
    tasks.forEach((t) => {
      const entry = counts.get(t.category) || {
        category: t.category,
        completed: 0,
        pending: 0,
      };
      if (t.completed) entry.completed++;
      else entry.pending++;
      counts.set(t.category, entry);
    });
    return Array.from(counts.values());
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
            Productivity Analytics
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track output, habit consistency, goals achieved, and deep focus hours.
          </p>
        </div>

        <div className="flex items-center p-1 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-950/65">
          {(
            [
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                period === p.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Tasks Completed</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {summary.tasksCompleted}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Goals Achieved</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {summary.goalsAchieved}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Habit Consistency</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {summary.habitConsistency}%
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Focus Hours</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {summary.focusHours}h
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-6">
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white mb-1">
            Tasks & Habit Momentum
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Completed items across your selected horizon
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendSeries}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}
                />
                <XAxis
                  dataKey="date"
                  stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  name="Tasks"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.22}
                />
                <Area
                  type="monotone"
                  dataKey="habits"
                  name="Habits"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.18}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-6">
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white mb-1">
            Focus Hours Logged
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Pomodoro & custom focus sessions per day
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendSeries}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}
                />
                <XAxis
                  dataKey="date"
                  stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  unit="h"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="focusHours" name="Focus Hours" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-6">
        <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white mb-4">
          Tasks by Category
        </h2>
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create tasks to view your category breakdown.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}
                />
                <XAxis
                  dataKey="category"
                  stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#8B5CF6" />
                <Bar dataKey="pending" name="Pending" stackId="a" fill="#475569" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
