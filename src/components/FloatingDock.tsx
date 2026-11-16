import React from 'react';
import {
  BookOpen,
  CheckSquare,
  Flame,
  Gift,
  LayoutDashboard,
  NotebookPen,
  Target,
  Wallet,
} from 'lucide-react';
import type { NavTab } from '../types/mysphere';

interface FloatingDockProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

const DOCK_ITEMS: {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, accent: 'from-violet-500 to-indigo-500' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, accent: 'from-sky-500 to-indigo-500' },
  { id: 'goals', label: 'Goals', icon: Target, accent: 'from-violet-500 to-fuchsia-500' },
  { id: 'notes', label: 'Notes', icon: NotebookPen, accent: 'from-amber-400 to-orange-500' },
  { id: 'habits', label: 'Habits', icon: Flame, accent: 'from-orange-500 to-rose-500' },
  { id: 'journal', label: 'Journal', icon: BookOpen, accent: 'from-purple-500 to-pink-500' },
  { id: 'wishlist', label: 'Wishlist', icon: Gift, accent: 'from-pink-500 to-rose-500' },
  { id: 'expenses', label: 'Expenses', icon: Wallet, accent: 'from-emerald-500 to-teal-500' },
];

export const FloatingDock: React.FC<FloatingDockProps> = ({ activeTab, onSelectTab }) => {
  return (
    <div className="fixed bottom-3.5 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1rem)] pointer-events-none">
      <nav
        aria-label="Quick dock navigation"
        className="pointer-events-auto liquid-dock rounded-2xl sm:rounded-[22px] px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar"
      >
        {DOCK_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="group relative flex flex-col items-center justify-center px-1.5 sm:px-2 py-1 rounded-xl focus:outline-none cursor-pointer shrink-0 transition-transform duration-200 ease-out hover:-translate-y-1.5 hover:scale-110 active:scale-95"
            >
              {/* Floating macOS Tooltip */}
              <span className="hidden sm:block pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-950 shadow-lg border border-white/15 dark:border-slate-200">
                {item.label}
              </span>

              {/* Icon Glass Tile */}
              <span
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 border ${
                  active
                    ? `bg-gradient-to-br ${item.accent} text-white border-white/30 shadow-md shadow-violet-500/25`
                    : 'bg-white/55 dark:bg-white/8 text-slate-700 dark:text-slate-200 border-slate-200/70 dark:border-white/12 group-hover:bg-white/90 dark:group-hover:bg-white/16 group-hover:text-slate-950 dark:group-hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </span>

              {/* Mobile tiny label */}
              <span
                className={`sm:hidden mt-0.5 text-[10px] font-medium leading-none ${
                  active
                    ? 'text-violet-700 dark:text-violet-300'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {item.label}
              </span>

              {/* Active macOS indicator dot */}
              <span
                className={`hidden sm:block mt-1 w-1 h-1 rounded-full transition-all duration-200 ${
                  active
                    ? 'bg-violet-600 dark:bg-violet-300 scale-100 opacity-100'
                    : 'bg-transparent scale-0 opacity-0'
                }`}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
};
