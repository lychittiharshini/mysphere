import React from 'react';
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  Flame,
  Moon,
  Shield,
  Sun,
  Target,
  Timer,
  Users,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { BrandLogo } from './BrandLogo';
import { FernhollowCanvas } from './FernhollowCanvas';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100 flex flex-col">
      <FernhollowCanvas variant="hero" />

      {/* Top Bar Contract: exactly 3 zones separated by gap-8 */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-8">
        <a href="#top" className="shrink-0">
          <BrandLogo />
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <a
            href="#ecosystem"
            className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Workspace
          </a>
          <a
            href="#habits-focus"
            className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Focus & Habits
          </a>
          <a
            href="#friends"
            className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Friends
          </a>
          <a
            href="#privacy"
            className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Privacy
          </a>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Main content */}
      <main id="top" className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 text-xs font-medium text-violet-700 dark:text-violet-300 mb-6">
              <span>Personal Productivity & Friends Platform</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-300 transition-colors cursor-pointer"
                aria-label="Toggle color theme"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5" />
                    <span>Switch to Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5" />
                    <span>Switch to Midnight</span>
                  </>
                )}
              </button>
            </div>

            <h1 className="font-display font-semibold tracking-tight text-slate-950 dark:text-white text-4xl sm:text-5xl md:text-6xl leading-[1.08] [text-wrap:balance]">
              Your space. Your goals. Your growth.
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">
              MySphere brings tasks, long-horizon goals, rich notes, daily habits,
              Pomodoro focus sessions, private journaling, and friend accountability
              together inside one calm, distraction-free workspace.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/20 transition-all whitespace-nowrap cursor-pointer"
              >
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium border border-slate-300 dark:border-slate-700 bg-white/75 dark:bg-slate-900/60 backdrop-blur-md text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800/80 transition-all whitespace-nowrap cursor-pointer"
              >
                <span>Sign In</span>
              </button>
            </div>
          </div>

          {/* 4-Column Quiet Capability Strip */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-950/65 backdrop-blur-xl p-5">
              <CheckSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h2 className="mt-3 font-display font-semibold text-base text-slate-900 dark:text-white">
                Tasks & Deadlines
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Priorities, categories, daily progress bars, and smart Today & Overdue views.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-950/65 backdrop-blur-xl p-5">
              <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="mt-3 font-display font-semibold text-base text-slate-900 dark:text-white">
                Goals & Milestones
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Daily to long-term horizons tracked with circular rings and milestone checklists.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-950/65 backdrop-blur-xl p-5">
              <Flame className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h2 className="mt-3 font-display font-semibold text-base text-slate-900 dark:text-white">
                Habits & Streaks
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Weekly and monthly consistency calendars that highlight streaks and missed days.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-950/65 backdrop-blur-xl p-5">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="mt-3 font-display font-semibold text-base text-slate-900 dark:text-white">
                Friends & Challenges
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Shared goals, group study challenges, and opt-in progress celebration.
              </p>
            </div>
          </div>
        </section>

        {/* Asymmetric Ecosystem Bento */}
        <section
          id="ecosystem"
          className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200/70 dark:border-white/10"
        >
          <div className="max-w-xl mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-950 dark:text-white [text-wrap:balance]">
              Designed for calm daily momentum
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Every module syncs in real time with your personal account so your plans, notes, and focus hours stay consistent across every device.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div
              id="habits-focus"
              className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl p-7"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                  01. Deep Work & Rituals
                </span>
                <Timer className="w-4 h-4 text-violet-500" />
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold text-slate-900 dark:text-white">
                Distraction-free Pomodoro focus, rich notebook, and daily journal
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Run 25/5/15 Pomodoro or custom focus timers with optional ambient soundscapes, capture structured notes with autosave across College, Projects, and Ideas folders, and close each evening with mood and gratitude reflections.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-200/70 dark:border-white/10">
                <div>
                  <p className="font-mono text-lg font-semibold text-slate-900 dark:text-white tabular-nums">
                    25 / 5 / 15
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pomodoro & custom intervals
                  </p>
                </div>
                <div>
                  <p className="font-mono text-lg font-semibold text-slate-900 dark:text-white tabular-nums">
                    Autosave
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Rich-text folders & tags
                  </p>
                </div>
                <div>
                  <p className="font-mono text-lg font-semibold text-slate-900 dark:text-white tabular-nums">
                    Monthly / Weekly
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Calendar linked to tasks & goals
                  </p>
                </div>
              </div>
            </div>

            <div
              id="friends"
              className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl p-7 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                    02. Friend Circle
                  </span>
                  <Calendar className="w-4 h-4 text-indigo-500" />
                </div>
                <h3 className="mt-3 font-display text-xl font-semibold text-slate-900 dark:text-white">
                  Grow alongside friends
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Connect by unique username, join 7-day study or 30-day coding challenges, and celebrate shared goals when they reach 100%.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-200/70 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                <p>· 7-day study challenge</p>
                <p>· 30-day coding challenge</p>
                <p>· Daily reading & habit consistency</p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy guarantee */}
        <section
          id="privacy"
          className="max-w-6xl mx-auto px-6 py-14 border-t border-slate-200/70 dark:border-white/10"
        >
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl p-7 sm:p-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-violet-700 dark:text-violet-300">
                <Shield className="w-4 h-4" />
                <span>Private by default</span>
              </div>
              <h2 className="mt-2 font-display text-xl sm:text-2xl font-semibold text-slate-950 dark:text-white">
                Your notes, private tasks, and journal entries stay yours alone.
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Friends never see your private workspace data. Only summary metrics you explicitly enable in Privacy Settings—and goals or challenges you actively join—are shared.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Start Your Sphere
            </button>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl w-full mx-auto px-6 py-8 border-t border-slate-200/70 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <p>MySphere — A little progress every day creates a bigger universe.</p>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Create Account
          </button>
        </div>
      </footer>
    </div>
  );
};
