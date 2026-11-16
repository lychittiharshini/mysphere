import React from 'react';
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  NotebookPen,
  Settings,
  Sun,
  Target,
  Timer,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import type { NavTab } from '../types/mysphere';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onSetMobileOpen: (open: boolean) => void;
}

const NAV_ITEMS: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'habits', label: 'Habits', icon: Flame },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'focus', label: 'Focus Mode', icon: Timer },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'wishlist', label: 'Wishlist', icon: Gift },
  { id: 'expenses', label: 'Expenses', icon: Wallet },
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onSetMobileOpen,
}) => {
  const { user, profile, updateUserProfile, logout } = useAuth();
  const { friendRequests } = useData();
  const { theme, toggleTheme } = useTheme();

  const pendingIncomingCount = friendRequests.filter(
    (r) => r.status === 'pending' && r.toUid === user?.uid
  ).length;

  const handleThemeSwitch = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    if (profile) {
      void updateUserProfile({ themePreference: next });
    }
  };

  const renderNavList = (isMobileDrawer = false) => (
    <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto" aria-label="Primary navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const showLabel = isMobileDrawer || !collapsed;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelectTab(item.id);
              if (isMobileDrawer) onSetMobileOpen(false);
            }}
            title={!showLabel ? item.label : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer whitespace-nowrap ${
              isActive
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20 border border-white/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white border border-transparent'
            } ${!showLabel ? 'justify-center' : ''}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {showLabel && <span className="flex-1 text-left truncate">{item.label}</span>}
            {showLabel && item.id === 'friends' && pendingIncomingCount > 0 && (
              <span
                className={`text-xs font-mono tabular-nums ${
                  isActive ? 'text-violet-100' : 'text-violet-600 dark:text-violet-300'
                }`}
              >
                {pendingIncomingCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const renderFooter = (isMobileDrawer = false) => {
    const showLabel = isMobileDrawer || !collapsed;
    return (
      <div className="p-3 border-t border-slate-200/60 dark:border-white/10 space-y-1.5">
        {showLabel && profile && (
          <div className="px-3 py-2 flex items-center gap-2.5 rounded-xl bg-white/45 dark:bg-white/5 border border-white/60 dark:border-white/10">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 shadow-sm"
              style={{ backgroundColor: profile.avatarColor || '#8B5CF6' }}
            >
              {profile.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                {profile.displayName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                @{profile.username}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleThemeSwitch}
          title={!showLabel ? 'Toggle Theme' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap ${
            !showLabel ? 'justify-center' : ''
          }`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 shrink-0" />
          )}
          {showLabel && (
            <span>{theme === 'dark' ? 'Light Mode' : 'Midnight Mode'}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => void logout()}
          title={!showLabel ? 'Logout' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer whitespace-nowrap ${
            !showLabel ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {showLabel && <span>Logout</span>}
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Collapsible Liquid Glass Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 liquid-glass border-y-0 border-l-0 transition-all duration-200 ${
          collapsed ? 'w-[76px]' : 'w-[252px]'
        }`}
      >
        <div
          className={`h-16 px-4 flex items-center border-b border-slate-200/60 dark:border-white/10 ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <BrandLogo showWordmark={!collapsed} size="sm" />
          {!collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="px-3 pt-3 flex justify-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {renderNavList(false)}
        {renderFooter(false)}
      </aside>

      {/* Mobile Compact Header */}
      <div className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between liquid-glass border-t-0 border-x-0">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleThemeSwitch}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => onSetMobileOpen(true)}
            className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => onSetMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full liquid-glass border-y-0 border-l-0 flex flex-col shadow-2xl">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/70 dark:border-white/10">
              <BrandLogo size="sm" />
              <button
                type="button"
                onClick={() => onSetMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavList(true)}
            {renderFooter(true)}
          </div>
        </div>
      )}
    </>
  );
};
