import type { NavTab } from '../types/mysphere';

export const NAV_ROUTE_MAP: Record<NavTab, string> = {
  dashboard: '/dashboard',
  tasks: '/tasks',
  goals: '/goals',
  notes: '/notes',
  habits: '/habits',
  calendar: '/calendar',
  focus: '/focus',
  journal: '/journal',
  wishlist: '/wishlist',
  expenses: '/expenses',
  friends: '/friends',
  analytics: '/analytics',
  settings: '/settings',
};

const PATH_TO_TAB: Record<string, NavTab> = {
  '/dashboard': 'dashboard',
  '/tasks': 'tasks',
  '/goals': 'goals',
  '/notes': 'notes',
  '/habits': 'habits',
  '/calendar': 'calendar',
  '/focus': 'focus',
  '/journal': 'journal',
  '/wishlist': 'wishlist',
  '/expenses': 'expenses',
  '/friends': 'friends',
  '/analytics': 'analytics',
  '/settings': 'settings',
};

export type PublicRouteMode = 'landing' | 'login' | 'register';

export type ParsedRoute =
  | { kind: 'root' }
  | { kind: 'public'; mode: PublicRouteMode }
  | { kind: 'tab'; tab: NavTab };

export function normalizePathname(rawPathname: string): string {
  const cleaned = rawPathname.trim().toLowerCase().replace(/\/+$/, '');
  return cleaned === '' ? '/' : cleaned;
}

export function parseRoute(rawPathname: string): ParsedRoute {
  const path = normalizePathname(rawPathname);
  if (path === '/') return { kind: 'root' };
  if (path === '/login') return { kind: 'public', mode: 'login' };
  if (path === '/register' || path === '/signup') return { kind: 'public', mode: 'register' };
  if (path in PATH_TO_TAB) {
    return { kind: 'tab', tab: PATH_TO_TAB[path] };
  }
  return { kind: 'root' };
}

export function getTabPath(tab: NavTab): string {
  return NAV_ROUTE_MAP[tab] || '/dashboard';
}

export function getPublicPath(mode: PublicRouteMode): string {
  if (mode === 'login') return '/login';
  if (mode === 'register') return '/register';
  return '/';
}
