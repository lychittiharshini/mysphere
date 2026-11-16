import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { formatPrettyDate, toDateStr, todayStr } from '../../lib/dates';
import type { CalendarEvent, CalendarEventType } from '../../types/mysphere';

type CalViewMode = 'month' | 'week' | 'day';

interface CombinedCalendarItem {
  id: string;
  title: string;
  date: string;
  time: string;
  kind: 'event' | 'deadline' | 'study' | 'reminder' | 'task' | 'goal';
  rawEvent?: CalendarEvent;
}

export const CalendarView: React.FC = () => {
  const {
    calendarEvents,
    tasks,
    goals,
    addCalendarEvent,
    deleteCalendarEvent,
  } = useData();
  const { showToast, confirmDialog } = useToast();

  const [viewMode, setViewMode] = useState<CalViewMode>('month');
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [eventType, setEventType] = useState<CalendarEventType>('study');
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [linkedGoalId, setLinkedGoalId] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [saving, setSaving] = useState(false);

  const today = todayStr();

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CombinedCalendarItem[]>();
    const push = (d: string, item: CombinedCalendarItem) => {
      if (!d) return;
      const arr = map.get(d) || [];
      arr.push(item);
      map.set(d, arr);
    };

    calendarEvents.forEach((ev) => {
      push(ev.date, {
        id: ev.id,
        title: ev.title,
        date: ev.date,
        time: ev.startTime || '',
        kind: ev.eventType,
        rawEvent: ev,
      });
    });

    tasks.forEach((t) => {
      if (t.dueDate) {
        push(t.dueDate, {
          id: `task_${t.id}`,
          title: `Task: ${t.title}`,
          date: t.dueDate,
          time: t.dueTime || '',
          kind: 'task',
        });
      }
    });

    goals.forEach((g) => {
      if (g.targetDate) {
        push(g.targetDate, {
          id: `goal_${g.id}`,
          title: `Goal Target: ${g.title}`,
          date: g.targetDate,
          time: '',
          kind: 'goal',
        });
      }
    });

    return map;
  }, [calendarEvents, tasks, goals]);

  const monthCells = useMemo(() => {
    const y = cursorDate.getFullYear();
    const m = cursorDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const cells: { dateStr: string; dayNum: number; inMonth: boolean }[] = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      const dt = new Date(y, m, -i);
      cells.push({ dateStr: toDateStr(dt), dayNum: dt.getDate(), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(y, m, d);
      cells.push({ dateStr: toDateStr(dt), dayNum: d, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const nextIdx = cells.length - (startWeekday + daysInMonth) + 1;
      const dt = new Date(y, m + 1, nextIdx);
      cells.push({ dateStr: toDateStr(dt), dayNum: dt.getDate(), inMonth: false });
    }
    return cells;
  }, [cursorDate]);

  const weekDays = useMemo(() => {
    const base = new Date(cursorDate);
    const diff = base.getDay();
    base.setDate(base.getDate() - diff);
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(base);
      dt.setDate(base.getDate() + i);
      return toDateStr(dt);
    });
  }, [cursorDate]);

  const shiftCursor = (dir: -1 | 1) => {
    const next = new Date(cursorDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + dir);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + dir * 7);
    } else {
      next.setDate(next.getDate() + dir);
      setSelectedDate(toDateStr(next));
    }
    setCursorDate(next);
  };

  const openModalForDate = (targetDate: string) => {
    setDate(targetDate);
    setTitle('');
    setDescription('');
    setStartTime('09:00');
    setEndTime('10:00');
    setEventType('study');
    setLinkedTaskId('');
    setLinkedGoalId('');
    setReminderMinutes(15);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await addCalendarEvent({
        title: title.trim(),
        description: description.trim(),
        date,
        startTime,
        endTime,
        eventType,
        linkedTaskId,
        linkedGoalId,
        reminderMinutes,
      });
      setModalOpen(false);
      showToast('Event scheduled.', 'success');
    } catch {
      showToast('Failed to add calendar event.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (ev: CalendarEvent) => {
    const ok = await confirmDialog({
      title: 'Delete event?',
      description: `Remove "${ev.title}" from your calendar?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await deleteCalendarEvent(ev.id);
    showToast('Event deleted.', 'info');
  };

  const selectedItems = itemsByDate.get(selectedDate) || [];

  const kindColor = (kind: CombinedCalendarItem['kind']) => {
    switch (kind) {
      case 'deadline':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-300';
      case 'study':
        return 'bg-violet-500/15 text-violet-700 dark:text-violet-300';
      case 'task':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
      case 'goal':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
      default:
        return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
            Calendar & Schedule
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Schedule study sessions, reminders, and view task and goal deadlines.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModalForDate(selectedDate)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Event</span>
        </button>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftCursor(-1)}
            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-display font-semibold text-base text-slate-950 dark:text-white min-w-[160px] text-center">
            {cursorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => shiftCursor(1)}
            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center p-1 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60">
          {(
            [
              { id: 'month', label: 'Monthly' },
              { id: 'week', label: 'Weekly' },
              { id: 'day', label: 'Daily' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setViewMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                viewMode === m.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main View + Selected Day Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-4 sm:p-5">
          {viewMode === 'month' && (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400 pb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {monthCells.map((cell) => {
                  const items = itemsByDate.get(cell.dateStr) || [];
                  const isToday = cell.dateStr === today;
                  const isSelected = cell.dateStr === selectedDate;
                  return (
                    <button
                      key={cell.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(cell.dateStr)}
                      className={`min-h-[82px] p-1.5 rounded-xl border text-left flex flex-col transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-slate-200/70 dark:border-white/8 hover:border-violet-400/60'
                      } ${!cell.inMonth ? 'opacity-40' : ''}`}
                    >
                      <span
                        className={`font-mono text-xs tabular-nums ${
                          isToday
                            ? 'font-semibold text-violet-600 dark:text-violet-300'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                      <div className="mt-1 space-y-0.5 w-full overflow-hidden">
                        {items.slice(0, 2).map((it) => (
                          <div
                            key={it.id}
                            className={`px-1.5 py-0.5 rounded text-[10px] truncate ${kindColor(
                              it.kind
                            )}`}
                          >
                            {it.title}
                          </div>
                        ))}
                        {items.length > 2 && (
                          <span className="block text-[10px] text-slate-400 px-1">
                            +{items.length - 2} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === 'week' && (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
              {weekDays.map((d) => {
                const items = itemsByDate.get(d) || [];
                const isSelected = d === selectedDate;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={`min-h-[220px] p-3 rounded-xl border text-left flex flex-col gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-slate-200/70 dark:border-white/10'
                    }`}
                  >
                    <span className="font-mono text-xs font-medium text-slate-900 dark:text-white">
                      {formatPrettyDate(d)}
                    </span>
                    <div className="space-y-1.5 w-full">
                      {items.map((it) => (
                        <div
                          key={it.id}
                          className={`p-1.5 rounded-lg text-[11px] truncate ${kindColor(
                            it.kind
                          )}`}
                        >
                          {it.time ? `${it.time} ` : ''}
                          {it.title}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === 'day' && (
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                {formatPrettyDate(selectedDate)}
              </h3>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
                  No events or deadlines for this day.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {selectedItems.map((it) => (
                    <div
                      key={it.id}
                      className="p-4 rounded-xl border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] capitalize ${kindColor(it.kind)}`}>
                          {it.kind}
                        </span>
                        <p className="mt-1 font-medium text-sm text-slate-950 dark:text-white">
                          {it.title}
                        </p>
                        {it.time && (
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            {it.time}
                          </p>
                        )}
                      </div>
                      {it.rawEvent && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteEvent(it.rawEvent!)}
                          className="p-2 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Date Agenda */}
        <div className="xl:col-span-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Selected Date</p>
                <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                  {formatPrettyDate(selectedDate)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => openModalForDate(selectedDate)}
                className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white cursor-pointer"
                aria-label="Add event on selected date"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {selectedItems.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6">
                Nothing scheduled yet for this date.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {selectedItems.map((it) => (
                  <li
                    key={it.id}
                    className="p-3 rounded-xl border border-slate-200/70 dark:border-white/10 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] capitalize ${kindColor(it.kind)}`}>
                        {it.kind}
                      </span>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white truncate">
                        {it.title}
                      </p>
                      {it.time && (
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {it.time}
                        </p>
                      )}
                    </div>
                    {it.rawEvent && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteEvent(it.rawEvent!)}
                        className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                Schedule Event
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Algorithms study block"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as CalendarEventType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="study">Study Session</option>
                    <option value="event">Event</option>
                    <option value="deadline">Deadline</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    End
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Reminder (min)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    value={reminderMinutes}
                    onChange={(e) => setReminderMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Link Task (optional)
                  </label>
                  <select
                    value={linkedTaskId}
                    onChange={(e) => setLinkedTaskId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">None</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Link Goal (optional)
                  </label>
                  <select
                    value={linkedGoalId}
                    onChange={(e) => setLinkedGoalId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">None</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
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
                  {saving ? 'Saving...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
