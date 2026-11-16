import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Flame,
  Plus,
  Target,
  Timer,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import {
  calculateOverallHabitStreak,
  formatFullToday,
  formatPrettyDate,
  formatShortDay,
  getLastNDays,
  getQuoteOfTheDay,
  todayStr,
} from '../../lib/dates';
import { computeGoalStats, getGoalChecklist } from '../../lib/goals';
import type { NavTab } from '../../types/mysphere';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const {
    tasks,
    goals,
    goalChecklistItems,
    habits,
    habitCompletions,
    calendarEvents,
    focusSessions,
    dailyScore,
    loading,
  } = useData();
  const { theme } = useTheme();

  const today = todayStr();
  const { dayName, fullDate } = formatFullToday();
  const quote = getQuoteOfTheDay();

  const stats = useMemo(() => {
    const tasksCompletedToday = tasks.filter(
      (t) => t.completed && (t.completedAt.startsWith(today) || t.dueDate === today)
    ).length;
    const tasksDueTodayTotal = tasks.filter((t) => t.dueDate === today).length;
    const pendingTasks = tasks.filter((t) => !t.completed).length;
    const activeGoals = goals.filter((g) => {
      const s = computeGoalStats(g, getGoalChecklist(g, goalChecklistItems), today);
      return s.computedStatus !== 'completed';
    }).length;
    const currentStreak = calculateOverallHabitStreak(habits, habitCompletions);
    const focusMinutesToday = focusSessions
      .filter((f) => f.date === today && (f.mode === 'focus' || f.mode === 'custom'))
      .reduce((sum, f) => sum + f.durationMinutes, 0);

    const todayCompletionPct =
      tasksDueTodayTotal > 0
        ? Math.min(100, Math.round((tasksCompletedToday / tasksDueTodayTotal) * 100))
        : tasksCompletedToday > 0
          ? 100
          : 0;

    return {
      tasksCompletedToday,
      tasksDueTodayTotal,
      pendingTasks,
      activeGoals,
      currentStreak,
      focusMinutesToday,
      todayCompletionPct,
    };
  }, [tasks, goals, goalChecklistItems, habits, habitCompletions, focusSessions, today]);

  const weeklyChartData = useMemo(() => {
    const days = getLastNDays(7);
    return days.map((dateStr) => {
      const doneTasks = tasks.filter(
        (t) => t.completed && (t.completedAt.startsWith(dateStr) || t.dueDate === dateStr)
      ).length;
      const doneHabits = habitCompletions.filter(
        (c) => c.date === dateStr && c.completed
      ).length;
      const focusMins = focusSessions
        .filter((f) => f.date === dateStr && (f.mode === 'focus' || f.mode === 'custom'))
        .reduce((acc, f) => acc + f.durationMinutes, 0);

      return {
        day: formatShortDay(dateStr),
        tasks: doneTasks,
        habits: doneHabits,
        focusHours: Number((focusMins / 60).toFixed(1)),
      };
    });
  }, [tasks, habitCompletions, focusSessions]);

  const upcomingDeadlines = useMemo(() => {
    const items: { id: string; title: string; date: string; source: 'Task' | 'Goal' | 'Event'; priority?: string }[] = [];

    tasks
      .filter((t) => !t.completed && t.dueDate)
      .forEach((t) =>
        items.push({
          id: `t_${t.id}`,
          title: t.title,
          date: t.dueDate,
          source: 'Task',
          priority: t.priority,
        })
      );

    goals
      .filter((g) => {
        const s = computeGoalStats(g, getGoalChecklist(g, goalChecklistItems), today);
        return s.computedStatus !== 'completed' && Boolean(g.targetDate);
      })
      .forEach((g) =>
        items.push({
          id: `g_${g.id}`,
          title: g.title,
          date: g.targetDate,
          source: 'Goal',
        })
      );

    calendarEvents
      .filter((e) => e.date >= today)
      .forEach((e) =>
        items.push({
          id: `e_${e.id}`,
          title: e.title,
          date: e.date,
          source: 'Event',
        })
      );

    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  }, [tasks, goals, goalChecklistItems, calendarEvents, today]);

  const username = profile?.username || 'friend';
  const focusHoursLabel =
    stats.focusMinutesToday >= 60
      ? `${(stats.focusMinutesToday / 60).toFixed(1)}h`
      : `${stats.focusMinutesToday}m`;

  const scoreCircumference = 2 * Math.PI * 36;
  const scoreOffset = scoreCircumference - (dailyScore / 100) * scoreCircumference;

  return (
    <div className="space-y-6">
      {/* Personalized Greeting & Daily Score */}
      <div className="liquid-glass rounded-2xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
            {dayName} · {fullDate}
          </p>
          <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-semibold text-slate-950 dark:text-white [text-wrap:balance]">
            Welcome back, {username}. Make today count.
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
            “{quote.text}” <span className="not-italic text-slate-400">— {quote.author}</span>
          </p>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 84 84">
              <circle
                cx="42"
                cy="42"
                r="36"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-slate-200 dark:text-white/10"
              />
              <circle
                cx="42"
                cy="42"
                r="36"
                stroke="#8B5CF6"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={scoreCircumference}
                strokeDashoffset={scoreOffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xl font-semibold text-slate-950 dark:text-white tabular-nums">
                {dailyScore}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Score
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('focus')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white/70 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Start Focus</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Done Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {loading ? '—' : stats.tasksCompletedToday}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            of {stats.tasksDueTodayTotal} due today
          </p>
        </div>

        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Pending Tasks</span>
            <CalendarClock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {loading ? '—' : stats.pendingTasks}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            across all lists
          </p>
        </div>

        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Active Goals</span>
            <Target className="w-4 h-4 text-violet-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {loading ? '—' : stats.activeGoals}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            in progress
          </p>
        </div>

        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Habit Streak</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {loading ? '—' : `${stats.currentStreak}d`}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            consecutive days
          </p>
        </div>

        <div className="col-span-2 lg:col-span-1 liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Focus Time</span>
            <Timer className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {loading ? '—' : focusHoursLabel}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            logged today
          </p>
        </div>
      </div>

      {/* Daily Progress Bar */}
      <div className="liquid-glass rounded-2xl p-5">
        <div className="flex items-center justify-between text-sm mb-2.5">
          <span className="font-medium text-slate-900 dark:text-white">
            Today's Task Completion
          </span>
          <span className="font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
            {stats.todayCompletionPct}%
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-600 transition-all duration-300"
            style={{ width: `${stats.todayCompletionPct}%` }}
          />
        </div>
      </div>

      {/* Weekly Progress Chart + Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 liquid-glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                Weekly Progress
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tasks completed and habit check-ins over the last 7 days
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-300 hover:underline cursor-pointer"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyChartData}>
                <defs>
                  <linearGradient id="dashTasksGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashHabitsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}
                />
                <XAxis
                  dataKey="day"
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
                <Area
                  type="monotone"
                  dataKey="tasks"
                  name="Tasks Completed"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#dashTasksGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="habits"
                  name="Habits Checked"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fill="url(#dashHabitsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="liquid-glass rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
              Upcoming Deadlines
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="text-xs font-medium text-violet-600 dark:text-violet-300 hover:underline cursor-pointer"
            >
              Calendar
            </button>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No upcoming deadlines scheduled.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="mt-3 text-xs font-medium text-violet-600 dark:text-violet-300 hover:underline cursor-pointer"
              >
                Schedule a task
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200/70 dark:divide-white/8">
              {upcomingDeadlines.map((item) => {
                const isOverdue = item.date < today;
                return (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.source}
                        {item.priority ? ` · ${item.priority}` : ''}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-xs shrink-0 tabular-nums ${
                        isOverdue
                          ? 'text-rose-600 dark:text-rose-400'
                          : item.date === today
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {item.date === today ? 'Today' : formatPrettyDate(item.date)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
