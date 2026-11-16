import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthView } from './components/AuthView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FernhollowCanvas } from './components/FernhollowCanvas';
import { FloatingDock } from './components/FloatingDock';
import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { AnalyticsView } from './components/modules/AnalyticsView';
import { CalendarView } from './components/modules/CalendarView';
import { DashboardView } from './components/modules/DashboardView';
import { ExpensesView } from './components/modules/ExpensesView';
import { FocusModeView } from './components/modules/FocusModeView';
import { FriendsView } from './components/modules/FriendsView';
import { GoalsView } from './components/modules/GoalsView';
import { HabitsView } from './components/modules/HabitsView';
import { JournalView } from './components/modules/JournalView';
import { NotesView } from './components/modules/NotesView';
import { SettingsView } from './components/modules/SettingsView';
import { TasksView } from './components/modules/TasksView';
import { WishlistView } from './components/modules/WishlistView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import {
  getPublicPath,
  getTabPath,
  normalizePathname,
  parseRoute,
  type PublicRouteMode,
} from './lib/routing';
import type { NavTab } from './types/mysphere';

const MySphereWorkspace: React.FC = () => {
  const {
    user,
    authLoading,
    profile,
    profileLoading,
    needsVerification,
    needsUsernameSetup,
  } = useAuth();

  const initialRoute = parseRoute(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  const [publicView, setPublicView] = useState<PublicRouteMode>(() => {
    if (initialRoute.kind === 'public') return initialRoute.mode;
    if (initialRoute.kind === 'tab') return 'login';
    return 'landing';
  });

  const [activeTab, setActiveTab] = useState<NavTab>(() =>
    initialRoute.kind === 'tab' ? initialRoute.tab : 'dashboard'
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigateTab = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const targetPath = getTabPath(tab);
      if (normalizePathname(window.location.pathname) !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  }, []);

  const navigatePublic = useCallback((mode: PublicRouteMode) => {
    setPublicView(mode);
    if (typeof window !== 'undefined') {
      const targetPath = getPublicPath(mode);
      if (normalizePathname(window.location.pathname) !== targetPath) {
        window.history.pushState({ publicMode: mode }, '', targetPath);
      }
    }
  }, []);

  // Support browser back / forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseRoute(window.location.pathname);
      if (parsed.kind === 'tab') {
        setActiveTab(parsed.tab);
      } else if (parsed.kind === 'public') {
        setPublicView(parsed.mode);
      } else {
        setPublicView('landing');
        setActiveTab('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isAuthenticatedReady = Boolean(
    user && !needsVerification && !needsUsernameSetup && profile
  );

  // Keep URL aligned when transitioning into authenticated workspace
  useEffect(() => {
    if (typeof window === 'undefined' || authLoading || profileLoading) return;
    if (isAuthenticatedReady) {
      const parsed = parseRoute(window.location.pathname);
      if (parsed.kind !== 'tab') {
        const target = getTabPath(activeTab);
        window.history.replaceState({ tab: activeTab }, '', target);
      }
    }
  }, [isAuthenticatedReady, authLoading, profileLoading, activeTab]);

  if (authLoading || (user && user.emailVerified && profileLoading)) {
    return (
      <div className="relative min-h-screen flex items-center justify-center text-slate-900 dark:text-slate-100">
        <FernhollowCanvas variant="hero" />
        <div className="liquid-glass flex items-center gap-3 px-5 py-3 rounded-2xl">
          <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
          <span className="text-sm font-medium">Loading your sphere...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated or pending email verification / username onboarding
  if (!user || needsVerification || needsUsernameSetup || !profile) {
    if (!user && publicView === 'landing') {
      return <LandingPage onOpenAuth={(mode) => navigatePublic(mode)} />;
    }

    return (
      <AuthView
        initialMode={publicView === 'register' ? 'register' : 'login'}
        onBackToLanding={() => navigatePublic('landing')}
      />
    );
  }

  // Authenticated Workspace
  const renderModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={navigateTab} />;
      case 'tasks':
        return <TasksView />;
      case 'goals':
        return <GoalsView />;
      case 'notes':
        return <NotesView />;
      case 'habits':
        return <HabitsView />;
      case 'calendar':
        return <CalendarView />;
      case 'focus':
        return <FocusModeView />;
      case 'journal':
        return <JournalView />;
      case 'wishlist':
        return <WishlistView />;
      case 'expenses':
        return <ExpensesView />;
      case 'friends':
        return <FriendsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onNavigate={navigateTab} />;
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row text-slate-900 dark:text-slate-100">
      <FernhollowCanvas variant="dashboard" />

      <Sidebar
        activeTab={activeTab}
        onSelectTab={navigateTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onSetMobileOpen={setMobileMenuOpen}
      />

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-28">
        <div className="max-w-6xl mx-auto">{renderModule()}</div>
      </main>

      <FloatingDock activeTab={activeTab} onSelectTab={navigateTab} />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <MySphereWorkspace />
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
