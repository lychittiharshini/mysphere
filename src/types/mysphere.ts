import type { Timestamp } from 'firebase/firestore';

export type ThemeMode = 'dark' | 'light';

export type NavTab =
  | 'dashboard'
  | 'tasks'
  | 'goals'
  | 'notes'
  | 'habits'
  | 'calendar'
  | 'focus'
  | 'journal'
  | 'wishlist'
  | 'expenses'
  | 'friends'
  | 'analytics'
  | 'settings';

export interface StatsSummary {
  tasksCompletedToday: number;
  activeGoals: number;
  currentStreak: number;
  focusMinutesToday: number;
  productivityScore: number;
  updatedDate: string;
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarColor?: string;
  themePreference: ThemeMode;
  shareStats: boolean;
  shareStreak: boolean;
  shareFocusHours: boolean;
  statsSummary: StatsSummary;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  notifications: {
    taskReminders: boolean;
    goalMilestones: boolean;
    friendRequests: boolean;
    focusChime: boolean;
  };
  privacy: {
    searchableByUsername: boolean;
    showStatsToFriends: boolean;
    showStreakToFriends: boolean;
    showFocusToFriends: boolean;
  };
  monthlyBudget?: number;
  currency?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  category: string;
  dueDate: string;
  dueTime: string;
  completed: boolean;
  completedAt: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type GoalType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'long-term';
export type GoalStatus = 'active' | 'completed' | 'paused';
export type GoalCategory =
  | 'Study'
  | 'Career'
  | 'Personal'
  | 'Health'
  | 'Skills'
  | 'Finance'
  | 'Other';
export type GoalIconKey =
  | 'target'
  | 'book'
  | 'briefcase'
  | 'user'
  | 'heart'
  | 'code'
  | 'wallet'
  | 'sparkles';
export type GoalComputedStatus = 'not-started' | 'in-progress' | 'completed' | 'overdue';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface GoalChecklistItem {
  id: string;
  userId: string;
  goalId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface GoalStepDraft {
  id?: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category?: GoalCategory;
  icon?: GoalIconKey;
  color?: string;
  type?: GoalType;
  startDate: string;
  targetDate: string;
  progress: number;
  status: GoalStatus;
  milestones?: Milestone[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type NoteCategory =
  | 'Personal'
  | 'College'
  | 'Ideas'
  | 'Projects'
  | 'Important'
  | 'Other';

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: NoteCategory;
  tags: string[];
  pinned: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type HabitFrequency = 'daily' | 'weekly';

export interface Habit {
  id: string;
  userId: string;
  title: string;
  frequency: HabitFrequency;
  targetPerWeek: number;
  color: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface HabitCompletion {
  id: string;
  userId: string;
  habitId: string;
  date: string;
  completed: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type CalendarEventType = 'event' | 'deadline' | 'study' | 'reminder';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  eventType: CalendarEventType;
  linkedTaskId: string;
  linkedGoalId: string;
  reminderMinutes: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type FocusModeType = 'focus' | 'short-break' | 'long-break' | 'custom';

export interface FocusSession {
  id: string;
  userId: string;
  mode: FocusModeType;
  durationMinutes: number;
  label: string;
  date: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type JournalMood =
  | 'peaceful'
  | 'motivated'
  | 'grateful'
  | 'reflective'
  | 'tired'
  | 'stressed';

export type JournalTemplateId =
  | 'blank'
  | 'daily-diary'
  | 'travel-memories'
  | 'study-journal'
  | 'gratitude-journal'
  | 'mood-journal'
  | 'vision-board'
  | 'monthly-memories'
  | 'personal-scrapbook';

export type JournalElementType = 'text' | 'image' | 'shape' | 'sticker';
export type JournalShapeKind = 'rect' | 'rounded' | 'circle' | 'line' | 'badge';

export interface JournalCanvasElement {
  id: string;
  type: JournalElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity?: number;
  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'semibold' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  // Shape & Box properties
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shapeKind?: JournalShapeKind;
  // Image properties
  imageUrl?: string;
  imagePath?: string;
  // Sticker properties
  stickerEmoji?: string;
  stickerLabel?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  date: string;
  title: string;
  mood: JournalMood;
  gratitude: string;
  reflection: string;
  isDraft?: boolean;
  templateId?: JournalTemplateId | string;
  canvasBackground?: string;
  canvasBorder?: string;
  elements?: JournalCanvasElement[];
  thumbnailUrl?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type WishlistPriority = 'high' | 'medium' | 'low';
export type WishlistStatus = 'Want' | 'Planning to Buy' | 'Purchased';

export interface WishlistItem {
  id: string;
  userId: string;
  name: string;
  description: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  imagePath: string;
  category: string;
  priority: WishlistPriority;
  status: WishlistStatus;
  purchasedAt: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ExpenseCategory =
  | 'Food'
  | 'Travel'
  | 'Shopping'
  | 'Education'
  | 'Entertainment'
  | 'Health'
  | 'Subscriptions'
  | 'Other';

export interface Expense {
  id: string;
  userId: string;
  title: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
  paymentMethod: string;
  description: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  toUsername: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Friendship {
  id: string;
  users: string[];
  userA: string;
  userB: string;
  usernames: Record<string, string>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SharedGoal {
  id: string;
  title: string;
  description: string;
  creatorUid: string;
  creatorUsername: string;
  participantUids: string[];
  participantUsernames: Record<string, string>;
  targetDate: string;
  progress: number;
  status: 'active' | 'completed';
  celebratedBy: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ChallengeTemplateKey =
  | '7-day-study'
  | '30-day-coding'
  | 'daily-reading'
  | 'habit-consistency'
  | 'custom';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  templateKey: ChallengeTemplateKey;
  durationDays: number;
  creatorUid: string;
  creatorUsername: string;
  participantUids: string[];
  participantProgress: Record<string, number>;
  participantUsernames: Record<string, string>;
  startDate: string;
  status: 'active' | 'completed';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
