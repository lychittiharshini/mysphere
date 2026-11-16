import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Calendar,
  CreditCard,
  Edit2,
  Lock,
  PiggyBank,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import {
  formatMoney,
  getCurrencyOption,
  SUPPORTED_CURRENCIES,
} from '../../lib/currency';
import { formatPrettyDate, formatShortDay, getLastNDays, todayStr } from '../../lib/dates';
import type { Expense, ExpenseCategory } from '../../types/mysphere';

const CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Travel',
  'Shopping',
  'Education',
  'Entertainment',
  'Health',
  'Subscriptions',
  'Other',
];

const PAYMENT_METHODS = [
  'UPI',
  'Debit Card',
  'Credit Card',
  'Cash',
  'Net Banking',
  'Wallet',
  'Other',
];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: '#8B5CF6',
  Travel: '#0EA5E9',
  Shopping: '#EC4899',
  Education: '#6366F1',
  Entertainment: '#F59E0B',
  Health: '#10B981',
  Subscriptions: '#A855F7',
  Other: '#64748B',
};

export const ExpensesView: React.FC = () => {
  const { privateInfo, updateMonthlyBudget, updateCurrencyPreference } = useAuth();
  const { expenses, addExpense, updateExpense, deleteExpense } = useData();
  const { theme } = useTheme();
  const { showToast, confirmDialog } = useToast();

  const activeCurrency = getCurrencyOption(privateInfo?.currency);
  const formatCurrency = (val: number) => formatMoney(val, activeCurrency.code);

  const today = todayStr();
  const currentMonthKey = today.slice(0, 7);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [categoryFilter, setCategoryFilter] = useState<'All' | ExpenseCategory>('All');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');
  const [budgetCurrencyDraft, setBudgetCurrencyDraft] = useState(activeCurrency.code);
  const [savingBudget, setSavingBudget] = useState(false);

  const monthlyBudget = privateInfo?.monthlyBudget ?? 0;

  const availableMonths = useMemo(() => {
    const months = new Set<string>([currentMonthKey]);
    expenses.forEach((ex) => {
      if (ex.date && ex.date.length >= 7) {
        months.add(ex.date.slice(0, 7));
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [expenses, currentMonthKey]);

  const metrics = useMemo(() => {
    const last7 = new Set(getLastNDays(7));
    const todayTotal = expenses
      .filter((e) => e.date === today)
      .reduce((sum, e) => sum + e.amount, 0);
    const weeklyTotal = expenses
      .filter((e) => last7.has(e.date))
      .reduce((sum, e) => sum + e.amount, 0);
    const currentMonthTotal = expenses
      .filter((e) => e.date.startsWith(currentMonthKey))
      .reduce((sum, e) => sum + e.amount, 0);
    const selectedMonthTotal = expenses
      .filter((e) => e.date.startsWith(selectedMonth))
      .reduce((sum, e) => sum + e.amount, 0);
    const remainingBudget =
      monthlyBudget > 0 ? monthlyBudget - currentMonthTotal : 0;
    const budgetPct =
      monthlyBudget > 0
        ? Math.min(100, Math.round((currentMonthTotal / monthlyBudget) * 100))
        : 0;

    return {
      todayTotal,
      weeklyTotal,
      currentMonthTotal,
      selectedMonthTotal,
      remainingBudget,
      budgetPct,
    };
  }, [expenses, today, currentMonthKey, selectedMonth, monthlyBudget]);

  // Weekly 7-day trend chart
  const weeklyTrendData = useMemo(() => {
    return getLastNDays(7).map((d) => ({
      day: formatShortDay(d),
      amount: Number(
        expenses
          .filter((e) => e.date === d)
          .reduce((sum, e) => sum + e.amount, 0)
          .toFixed(2)
      ),
    }));
  }, [expenses]);

  // Last 6 months spending chart
  const monthlyChartData = useMemo(() => {
    const [year, month] = currentMonthKey.split('-').map(Number);
    const result: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(year, month - 1 - i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = dt.toLocaleDateString(undefined, { month: 'short' });
      const total = expenses
        .filter((e) => e.date.startsWith(key))
        .reduce((sum, e) => sum + e.amount, 0);
      result.push({ month: label, total: Number(total.toFixed(2)) });
    }
    return result;
  }, [expenses, currentMonthKey]);

  // Category distribution for selectedMonth
  const categoryBreakdown = useMemo(() => {
    const scoped = expenses.filter((e) => e.date.startsWith(selectedMonth));
    const totals = new Map<ExpenseCategory, number>();
    CATEGORIES.forEach((c) => totals.set(c, 0));
    scoped.forEach((e) => {
      totals.set(e.category, (totals.get(e.category) || 0) + e.amount);
    });
    const grand = scoped.reduce((sum, e) => sum + e.amount, 0);
    return CATEGORIES.map((cat) => {
      const val = Number((totals.get(cat) || 0).toFixed(2));
      return {
        category: cat,
        amount: val,
        color: CATEGORY_COLORS[cat],
        pct: grand > 0 ? Math.round((val / grand) * 100) : 0,
      };
    })
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...expenses]
      .filter((e) => {
        if (selectedMonth !== 'all' && !e.date.startsWith(selectedMonth)) return false;
        if (categoryFilter !== 'All' && e.category !== categoryFilter) return false;
        if (q) {
          const matchTitle = e.title.toLowerCase().includes(q);
          const matchDesc = e.description.toLowerCase().includes(q);
          const matchMethod = e.paymentMethod.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchMethod) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const cmp = b.date.localeCompare(a.date);
        if (cmp !== 0) return cmp;
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      });
  }, [expenses, selectedMonth, categoryFilter, search]);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setAmount('');
    setDate(today);
    setCategory('Food');
    setPaymentMethod('UPI');
    setDescription('');
    setModalOpen(true);
  };

  const openEdit = (ex: Expense) => {
    setEditing(ex);
    setTitle(ex.title);
    setAmount(String(ex.amount));
    setDate(ex.date);
    setCategory(ex.category);
    setPaymentMethod(ex.paymentMethod);
    setDescription(ex.description || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number.parseFloat(amount);
    if (!title.trim() || !Number.isFinite(numericAmount) || numericAmount < 0) {
      showToast('Enter a valid expense title and amount.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateExpense(editing.id, {
          title: title.trim(),
          amount: numericAmount,
          date,
          category,
          paymentMethod,
          description: description.trim(),
        });
        showToast('Expense updated.', 'success');
      } else {
        await addExpense({
          title: title.trim(),
          amount: numericAmount,
          date,
          category,
          paymentMethod,
          description: description.trim(),
        });
        showToast('Expense logged privately.', 'success');
      }
      setModalOpen(false);
    } catch {
      showToast('Could not save expense.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ex: Expense) => {
    const ok = await confirmDialog({
      title: 'Delete expense?',
      description: `Delete "${ex.title}" (${formatCurrency(ex.amount)})?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await deleteExpense(ex.id);
    showToast('Expense deleted.', 'info');
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Math.max(0, Number.parseFloat(budgetDraft) || 0);
    setSavingBudget(true);
    try {
      await updateMonthlyBudget(val, budgetCurrencyDraft);
      showToast('Monthly budget and currency updated.', 'success');
      setBudgetModalOpen(false);
    } catch {
      showToast('Could not save monthly budget.', 'error');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleQuickCurrencyChange = async (code: string) => {
    try {
      await updateCurrencyPreference(code);
      const opt = getCurrencyOption(code);
      showToast(`Currency set to ${opt.name} (${opt.symbol}).`, 'success');
    } catch {
      showToast('Could not update currency.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
            Expense Tracker
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-violet-500" />
            <span>Strictly private. Track daily spending, monthly budgets, and trends.</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Select currency"
            value={activeCurrency.code}
            onChange={(e) => void handleQuickCurrencyChange(e.target.value)}
            className="px-3 py-2.5 rounded-xl liquid-glass text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} · {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setBudgetDraft(monthlyBudget > 0 ? String(monthlyBudget) : '');
              setBudgetCurrencyDraft(activeCurrency.code);
              setBudgetModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl liquid-glass text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white whitespace-nowrap cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-violet-500" />
            <span>Set Budget</span>
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-md shadow-violet-600/20 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Today's Expenses</span>
            <Calendar className="w-4 h-4 text-sky-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {formatCurrency(metrics.todayTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">spent today</p>
        </div>

        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Weekly Expenses</span>
            <TrendingDown className="w-4 h-4 text-violet-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {formatCurrency(metrics.weeklyTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">last 7 days</p>
        </div>

        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>This Month</span>
            <Wallet className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {formatCurrency(metrics.currentMonthTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">current month total</p>
        </div>

        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Remaining Budget</span>
            <PiggyBank className="w-4 h-4 text-emerald-500" />
          </div>
          <p
            className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${
              monthlyBudget > 0 && metrics.remainingBudget < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-950 dark:text-white'
            }`}
          >
            {monthlyBudget > 0 ? formatCurrency(metrics.remainingBudget) : 'Unset'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {monthlyBudget > 0
              ? `of ${formatCurrency(monthlyBudget)} budget`
              : 'Click Set Budget to track'}
          </p>
        </div>
      </div>

      {/* Budget Progress Bar */}
      {monthlyBudget > 0 && (
        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-slate-900 dark:text-white">
              Monthly Budget Usage
            </span>
            <span className="font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
              {metrics.budgetPct}% ({formatCurrency(metrics.currentMonthTotal)} /{' '}
              {formatCurrency(monthlyBudget)})
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                metrics.remainingBudget < 0
                  ? 'bg-rose-500'
                  : metrics.budgetPct >= 80
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-500'
              }`}
              style={{ width: `${metrics.budgetPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Interactive Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Spending Chart */}
        <div className="liquid-glass rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Monthly Spending
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Last 6 months trend
          </p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}
                />
                <XAxis
                  dataKey="month"
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
                />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v))}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="total" name="Spent" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="liquid-glass rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Weekly Spending Trend
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Daily spend over the past 7 days
          </p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrendData}>
                <defs>
                  <linearGradient id="expTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.38} />
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
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={theme === 'dark' ? '#94A3B8' : '#64748B'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v))}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Spent"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fill="url(#expTrendGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Chart */}
        <div className="liquid-glass rounded-2xl p-5 flex flex-col">
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Category Distribution
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {selectedMonth === 'all' ? 'All time' : `Month ${selectedMonth}`}
          </p>

          {categoryBreakdown.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 py-10">
              No expenses recorded for this month yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 items-center flex-1">
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={38}
                      outerRadius={64}
                      paddingAngle={2}
                    >
                      {categoryBreakdown.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v))}
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {categoryBreakdown.map((row) => (
                  <div
                    key={row.category}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex items-center gap-1.5 truncate text-slate-700 dark:text-slate-200">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="truncate">{row.category}</span>
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                      {row.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters & Transactions Ledger */}
      <div className="liquid-glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200/60 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/12 bg-white/75 dark:bg-slate-900/75 text-xs text-slate-800 dark:text-slate-200"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m === currentMonthKey ? `${m} (This Month)` : m}
                </option>
              ))}
              <option value="all">All Months</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'All' | ExpenseCategory)}
              className="px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/12 bg-white/75 dark:bg-slate-900/75 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, note, payment..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/12 bg-white/75 dark:bg-slate-900/65 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-7 h-7 text-violet-500 mx-auto mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No expenses found for this period.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 text-sm font-medium text-violet-600 dark:text-violet-300 hover:underline cursor-pointer"
            >
              Log an expense
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/60 dark:divide-white/8">
            {filteredExpenses.map((ex) => (
              <div
                key={ex.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/40 dark:hover:bg-white/4 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-2 shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[ex.category] }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-950 dark:text-white truncate">
                      {ex.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                      <span>{ex.category}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        <span>{ex.paymentMethod}</span>
                      </span>
                      <span>·</span>
                      <span className="tabular-nums">{formatPrettyDate(ex.date)}</span>
                    </p>
                    {ex.description && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {ex.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span className="font-mono text-base font-semibold text-slate-950 dark:text-white tabular-nums">
                    {formatCurrency(ex.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(ex)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      aria-label={`Edit ${ex.title}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(ex)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                      aria-label={`Delete ${ex.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Expense Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="liquid-glass w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                {editing ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Expense Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Coffee & study snacks"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount ({activeCurrency.symbol} {activeCurrency.code})
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="12.50"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white tabular-nums"
                  />
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
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details or receipt memo..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
                />
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium cursor-pointer"
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monthly Budget Modal */}
      {budgetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="liquid-glass w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                Monthly Budget
              </h2>
              <button
                type="button"
                onClick={() => setBudgetModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Currency
                </label>
                <select
                  value={budgetCurrencyDraft}
                  onChange={(e) => setBudgetCurrencyDraft(e.target.value as typeof budgetCurrencyDraft)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Monthly Budget ({getCurrencyOption(budgetCurrencyDraft).symbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={budgetDraft}
                  onChange={(e) => setBudgetDraft(e.target.value)}
                  placeholder="1000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white tabular-nums"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Saved privately to your account settings. Set to 0 to disable budget alerts.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium cursor-pointer"
                >
                  {savingBudget ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
