import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  clampStr,
  db,
  generateDocId,
  handleFirestoreError,
  isValidUsernameFormat,
  normalizeUsername,
  OperationType,
} from '../lib/firebase';
import {
  calculateDailyProductivityScore,
  calculateOverallHabitStreak,
  todayStr,
} from '../lib/dates';
import type {
  CalendarEvent,
  Challenge,
  ChallengeTemplateKey,
  Expense,
  FocusModeType,
  FocusSession,
  FriendRequest,
  Friendship,
  Goal,
  GoalCategory,
  GoalChecklistItem,
  GoalIconKey,
  GoalStepDraft,
  Habit,
  HabitCompletion,
  JournalEntry,
  Note,
  SharedGoal,
  Task,
  UserProfile,
  WishlistItem,
} from '../types/mysphere';
import { deleteStoragePath } from '../lib/storage';
import { useAuth } from './AuthContext';

export interface GoalFormPayload {
  title: string;
  description: string;
  category: GoalCategory;
  icon: GoalIconKey;
  color: string;
  startDate: string;
  targetDate: string;
}

interface DataContextValue {
  loading: boolean;
  tasks: Task[];
  goals: Goal[];
  goalChecklistItems: GoalChecklistItem[];
  notes: Note[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  calendarEvents: CalendarEvent[];
  focusSessions: FocusSession[];
  journalEntries: JournalEntry[];
  wishlist: WishlistItem[];
  expenses: Expense[];
  friendRequests: FriendRequest[];
  friendships: Friendship[];
  friendProfiles: Record<string, UserProfile>;
  sharedGoals: SharedGoal[];
  challenges: Challenge[];
  dailyScore: number;

  addTask: (input: Omit<Task, 'id' | 'userId' | 'completed' | 'completedAt' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  toggleTaskComplete: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addGoal: (input: GoalFormPayload, initialSteps?: GoalStepDraft[]) => Promise<void>;
  updateGoal: (id: string, updates: Partial<GoalFormPayload>, steps?: GoalStepDraft[]) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addGoalChecklistItem: (goalId: string, title: string) => Promise<void>;
  toggleGoalChecklistItem: (item: GoalChecklistItem) => Promise<void>;
  updateGoalChecklistItemTitle: (item: GoalChecklistItem, title: string) => Promise<void>;
  deleteGoalChecklistItem: (item: GoalChecklistItem) => Promise<void>;
  reorderGoalChecklistItems: (goalId: string, orderedItems: GoalChecklistItem[]) => Promise<void>;

  addNote: (input: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  addHabit: (input: Omit<Habit, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateHabit: (id: string, updates: Partial<Omit<Habit, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabitCompletion: (habitId: string, date: string) => Promise<void>;

  addCalendarEvent: (input: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCalendarEvent: (id: string, updates: Partial<Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;

  logFocusSession: (input: { mode: FocusModeType; durationMinutes: number; label: string }) => Promise<void>;
  deleteFocusSession: (id: string) => Promise<void>;

  addJournalEntry: (input: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateJournalEntry: (id: string, updates: Partial<Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;

  addWishlistItem: (
    input: Omit<WishlistItem, 'id' | 'userId' | 'purchasedAt' | 'createdAt' | 'updatedAt'> & {
      purchasedAt?: string;
    }
  ) => Promise<string>;
  updateWishlistItem: (
    id: string,
    updates: Partial<Omit<WishlistItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  deleteWishlistItem: (item: WishlistItem) => Promise<void>;

  addExpense: (input: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateExpense: (
    id: string,
    updates: Partial<Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  findUserByUsername: (username: string) => Promise<UserProfile | null>;
  sendFriendRequest: (targetUser: UserProfile) => Promise<void>;
  respondFriendRequest: (req: FriendRequest, accept: boolean) => Promise<void>;
  cancelFriendRequest: (reqId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;

  createSharedGoal: (input: {
    title: string;
    description: string;
    targetDate: string;
    friendUids: string[];
  }) => Promise<void>;
  updateSharedGoalProgress: (goal: SharedGoal, progress: number) => Promise<void>;
  celebrateSharedGoal: (goal: SharedGoal) => Promise<void>;
  deleteSharedGoal: (id: string) => Promise<void>;

  createChallenge: (input: {
    title: string;
    description: string;
    templateKey: ChallengeTemplateKey;
    durationDays: number;
    friendUids: string[];
  }) => Promise<void>;
  incrementChallengeProgress: (challenge: Challenge) => Promise<void>;
  deleteChallenge: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalChecklistItems, setGoalChecklistItems] = useState<GoalChecklistItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<Record<string, UserProfile>>({});
  const [sharedGoals, setSharedGoals] = useState<SharedGoal[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const uid = user && user.emailVerified && profile ? user.uid : null;

  useEffect(() => {
    if (!uid) {
      setTasks([]);
      setGoals([]);
      setGoalChecklistItems([]);
      setNotes([]);
      setHabits([]);
      setHabitCompletions([]);
      setCalendarEvents([]);
      setFocusSessions([]);
      setJournalEntries([]);
      setWishlist([]);
      setExpenses([]);
      setSentRequests([]);
      setReceivedRequests([]);
      setFriendships([]);
      setFriendProfiles({});
      setSharedGoals([]);
      setChallenges([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let settled = 0;
    const totalListeners = 15;
    const markSettled = () => {
      settled++;
      if (settled >= totalListeners) setLoading(false);
    };

    const unsubs: (() => void)[] = [];

    const subscribeSubcollection = <T,>(
      subName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const path = `users/${uid}/${subName}`;
      const unsub = onSnapshot(
        collection(db, 'users', uid, subName),
        (snap) => {
          setter(snap.docs.map((d) => d.data() as T));
          markSettled();
        },
        (err) => {
          markSettled();
          handleFirestoreError(err, OperationType.LIST, path);
        }
      );
      unsubs.push(unsub);
    };

    subscribeSubcollection<Task>('tasks', setTasks);
    subscribeSubcollection<Goal>('goals', setGoals);
    subscribeSubcollection<GoalChecklistItem>('goalChecklistItems', setGoalChecklistItems);
    subscribeSubcollection<Note>('notes', setNotes);
    subscribeSubcollection<Habit>('habits', setHabits);
    subscribeSubcollection<HabitCompletion>('habitCompletions', setHabitCompletions);
    subscribeSubcollection<CalendarEvent>('calendarEvents', setCalendarEvents);
    subscribeSubcollection<FocusSession>('focusSessions', setFocusSessions);
    subscribeSubcollection<JournalEntry>('journalEntries', setJournalEntries);
    subscribeSubcollection<WishlistItem>('wishlist', setWishlist);
    subscribeSubcollection<Expense>('expenses', setExpenses);

    unsubs.push(
      onSnapshot(
        query(collection(db, 'friendRequests'), where('fromUid', '==', uid)),
        (snap) => {
          setSentRequests(snap.docs.map((d) => d.data() as FriendRequest));
          markSettled();
        },
        (err) => {
          markSettled();
          handleFirestoreError(err, OperationType.LIST, 'friendRequests');
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'friendRequests'), where('toUid', '==', uid)),
        (snap) => {
          setReceivedRequests(snap.docs.map((d) => d.data() as FriendRequest));
          markSettled();
        },
        (err) => {
          markSettled();
          handleFirestoreError(err, OperationType.LIST, 'friendRequests');
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'friendships'), where('users', 'array-contains', uid)),
        (snap) => {
          setFriendships(snap.docs.map((d) => d.data() as Friendship));
          markSettled();
        },
        (err) => {
          markSettled();
          handleFirestoreError(err, OperationType.LIST, 'friendships');
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'sharedGoals'), where('participantUids', 'array-contains', uid)),
        (snap) => {
          setSharedGoals(snap.docs.map((d) => d.data() as SharedGoal));
          markSettled();
        },
        (err) => {
          markSettled();
          handleFirestoreError(err, OperationType.LIST, 'sharedGoals');
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'challenges'), where('participantUids', 'array-contains', uid)),
        (snap) => {
          setChallenges(snap.docs.map((d) => d.data() as Challenge));
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'challenges');
        }
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || friendships.length === 0) {
      setFriendProfiles({});
      return;
    }

    const otherUids = Array.from(
      new Set(
        friendships
          .map((f) => (f.userA === uid ? f.userB : f.userA))
          .filter((id) => Boolean(id) && id !== uid)
      )
    );

    const unsubs = otherUids.map((friendUid) =>
      onSnapshot(
        doc(db, 'users', friendUid),
        (snap) => {
          if (snap.exists()) {
            setFriendProfiles((prev) => ({
              ...prev,
              [friendUid]: snap.data() as UserProfile,
            }));
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${friendUid}`);
        }
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [uid, friendships]);

  const migratedGoalsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!uid || loading || goals.length === 0) return;
    const toMigrate = goals.filter(
      (g) =>
        !migratedGoalsRef.current.has(g.id) &&
        g.milestones &&
        g.milestones.length > 0 &&
        !goalChecklistItems.some((item) => item.goalId === g.id)
    );
    if (toMigrate.length === 0) return;

    toMigrate.forEach((g) => migratedGoalsRef.current.add(g.id));

    (async () => {
      for (const g of toMigrate) {
        const legacy = g.milestones || [];
        const doneCount = legacy.filter((m) => m.completed).length;
        const nextProgress = legacy.length > 0 ? Math.round((doneCount / legacy.length) * 100) : 0;
        const nextStatus = legacy.length > 0 && nextProgress === 100 ? 'completed' : 'active';
        const batch = writeBatch(db);
        legacy.forEach((ms, idx) => {
          const itemId = generateDocId('gci');
          batch.set(doc(db, 'users', uid, 'goalChecklistItems', itemId), {
            id: itemId,
            userId: uid,
            goalId: g.id,
            title: clampStr(ms.title || 'Action step', 200),
            completed: Boolean(ms.completed),
            order: idx,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        batch.update(doc(db, 'users', uid, 'goals', g.id), {
          category: g.category || 'Personal',
          icon: g.icon || 'target',
          color: g.color || '#8B5CF6',
          milestones: [],
          progress: nextProgress,
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      }
    })().catch((err) => {
      console.error('Legacy goal milestone migration error:', err);
    });
  }, [uid, loading, goals, goalChecklistItems]);

  const dailyScore = useMemo(
    () =>
      calculateDailyProductivityScore({
        tasks,
        goals,
        goalChecklistItems,
        habits,
        habitCompletions,
        focusSessions,
      }),
    [tasks, goals, goalChecklistItems, habits, habitCompletions, focusSessions]
  );

  const lastSummaryHashRef = useRef<string>('');
  useEffect(() => {
    if (!uid || !profile || loading) return;

    const today = todayStr();
    const tasksCompletedToday = tasks.filter(
      (t) => t.completed && (t.completedAt.startsWith(today) || t.dueDate === today)
    ).length;
    const activeGoals = goals.filter((g) => {
      const items = goalChecklistItems.filter((i) => i.goalId === g.id);
      if (items.length === 0) return true;
      const done = items.filter((i) => i.completed).length;
      return done < items.length;
    }).length;
    const currentStreak = calculateOverallHabitStreak(habits, habitCompletions);
    const focusMinutesToday = focusSessions
      .filter((f) => f.date === today && (f.mode === 'focus' || f.mode === 'custom'))
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    const nextSummary = {
      tasksCompletedToday: profile.shareStats ? tasksCompletedToday : 0,
      activeGoals: profile.shareStats ? activeGoals : 0,
      currentStreak: profile.shareStreak ? currentStreak : 0,
      focusMinutesToday: profile.shareFocusHours ? focusMinutesToday : 0,
      productivityScore: profile.shareStats ? dailyScore : 0,
      updatedDate: today,
    };

    const hash = JSON.stringify(nextSummary);
    const existingHash = JSON.stringify(profile.statsSummary);
    if (hash === lastSummaryHashRef.current || hash === existingHash) return;

    const timer = setTimeout(() => {
      lastSummaryHashRef.current = hash;
      updateDoc(doc(db, 'users', uid), {
        statsSummary: nextSummary,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        console.error('Failed to sync stats summary:', err);
      });
    }, 900);

    return () => clearTimeout(timer);
  }, [uid, profile, loading, tasks, goals, habits, habitCompletions, focusSessions, dailyScore]);

  const friendRequests = useMemo(() => {
    const map = new Map<string, FriendRequest>();
    for (const r of [...receivedRequests, ...sentRequests]) {
      map.set(r.id, r);
    }
    return Array.from(map.values());
  }, [receivedRequests, sentRequests]);

  const requireUid = () => {
    if (!uid) throw new Error('You must be signed in and verified.');
    return uid;
  };

  const addTask: DataContextValue['addTask'] = async (input) => {
    const u = requireUid();
    const id = generateDocId('tsk');
    const path = `users/${u}/tasks/${id}`;
    try {
      await setDoc(doc(db, 'users', u, 'tasks', id), {
        id,
        userId: u,
        title: clampStr(input.title, 160),
        description: clampStr(input.description || '', 2000),
        priority: input.priority,
        category: clampStr(input.category || 'Personal', 40),
        dueDate: clampStr(input.dueDate || '', 20),
        dueTime: clampStr(input.dueTime || '', 10),
        completed: false,
        completedAt: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const updateTask: DataContextValue['updateTask'] = async (id, updates) => {
    const u = requireUid();
    const path = `users/${u}/tasks/${id}`;
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) payload.title = clampStr(updates.title, 160);
    if (updates.description !== undefined) payload.description = clampStr(updates.description, 2000);
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.category !== undefined) payload.category = clampStr(updates.category || 'Personal', 40);
    if (updates.dueDate !== undefined) payload.dueDate = clampStr(updates.dueDate, 20);
    if (updates.dueTime !== undefined) payload.dueTime = clampStr(updates.dueTime, 10);
    if (updates.completed !== undefined) payload.completed = updates.completed;
    if (updates.completedAt !== undefined) payload.completedAt = clampStr(updates.completedAt, 40);
    try {
      await updateDoc(doc(db, 'users', u, 'tasks', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const toggleTaskComplete: DataContextValue['toggleTaskComplete'] = async (task) => {
    const nextDone = !task.completed;
    await updateTask(task.id, {
      completed: nextDone,
      completedAt: nextDone ? new Date().toISOString() : '',
    });
  };

  const deleteTask: DataContextValue['deleteTask'] = async (id) => {
    const u = requireUid();
    const path = `users/${u}/tasks/${id}`;
    try {
      await deleteDoc(doc(db, 'users', u, 'tasks', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const computeGoalSyncPayload = (items: { completed: boolean }[]) => {
    if (items.length === 0) {
      return { progress: 0, status: 'active' as const };
    }
    const done = items.filter((i) => i.completed).length;
    const progress = Math.round((done / items.length) * 100);
    const status = progress === 100 ? ('completed' as const) : ('active' as const);
    return { progress, status };
  };

  const addGoal: DataContextValue['addGoal'] = async (input, initialSteps = []) => {
    const u = requireUid();
    const goalId = generateDocId('gol');
    const path = `users/${u}/goals/${goalId}`;
    const cleanSteps = initialSteps
      .map((s) => ({ ...s, title: clampStr(s.title, 200) }))
      .filter((s) => s.title.length > 0);
    const { progress, status } = computeGoalSyncPayload(cleanSteps);

    try {
      const firstBatch = writeBatch(db);
      firstBatch.set(doc(db, 'users', u, 'goals', goalId), {
        id: goalId,
        userId: u,
        title: clampStr(input.title, 160),
        description: clampStr(input.description || '', 2000),
        category: input.category || 'Personal',
        icon: clampStr(input.icon || 'target', 32),
        color: clampStr(input.color || '#8B5CF6', 32),
        type: 'long-term',
        startDate: clampStr(input.startDate || todayStr(), 20),
        targetDate: clampStr(input.targetDate || '', 20),
        progress,
        status,
        milestones: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const firstChunk = cleanSteps.slice(0, 400);
      firstChunk.forEach((step, idx) => {
        const itemId = generateDocId('gci');
        firstBatch.set(doc(db, 'users', u, 'goalChecklistItems', itemId), {
          id: itemId,
          userId: u,
          goalId,
          title: step.title,
          completed: Boolean(step.completed),
          order: idx,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await firstBatch.commit();

      for (let i = 400; i < cleanSteps.length; i += 400) {
        const chunk = cleanSteps.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((step, offset) => {
          const itemId = generateDocId('gci');
          batch.set(doc(db, 'users', u, 'goalChecklistItems', itemId), {
            id: itemId,
            userId: u,
            goalId,
            title: step.title,
            completed: Boolean(step.completed),
            order: i + offset,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const updateGoal: DataContextValue['updateGoal'] = async (id, updates, steps) => {
    const u = requireUid();
    const path = `users/${u}/goals/${id}`;
    const goalPayload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) goalPayload.title = clampStr(updates.title, 160);
    if (updates.description !== undefined) goalPayload.description = clampStr(updates.description, 2000);
    if (updates.category !== undefined) goalPayload.category = updates.category;
    if (updates.icon !== undefined) goalPayload.icon = clampStr(updates.icon, 32);
    if (updates.color !== undefined) goalPayload.color = clampStr(updates.color, 32);
    if (updates.startDate !== undefined) goalPayload.startDate = clampStr(updates.startDate, 20);
    if (updates.targetDate !== undefined) goalPayload.targetDate = clampStr(updates.targetDate, 20);

    try {
      if (steps === undefined) {
        await updateDoc(doc(db, 'users', u, 'goals', id), goalPayload);
        return;
      }

      const existingItems = goalChecklistItems.filter((item) => item.goalId === id);
      const existingMap = new Map(existingItems.map((it) => [it.id, it]));
      const cleanSteps = steps
        .map((s) => ({ ...s, title: clampStr(s.title, 200) }))
        .filter((s) => s.title.length > 0);
      const keptIds = new Set(cleanSteps.map((s) => s.id).filter(Boolean) as string[]);

      const { progress, status } = computeGoalSyncPayload(cleanSteps);
      goalPayload.progress = progress;
      goalPayload.status = status;
      goalPayload.milestones = [];

      type Op =
        | { kind: 'goal' }
        | { kind: 'delete'; itemId: string }
        | { kind: 'update'; itemId: string; title: string; completed: boolean; order: number }
        | { kind: 'create'; title: string; completed: boolean; order: number };

      const ops: Op[] = [{ kind: 'goal' }];
      existingItems.forEach((it) => {
        if (!keptIds.has(it.id)) ops.push({ kind: 'delete', itemId: it.id });
      });
      cleanSteps.forEach((step, idx) => {
        if (step.id && existingMap.has(step.id)) {
          ops.push({
            kind: 'update',
            itemId: step.id,
            title: step.title,
            completed: Boolean(step.completed),
            order: idx,
          });
        } else {
          ops.push({
            kind: 'create',
            title: step.title,
            completed: Boolean(step.completed),
            order: idx,
          });
        }
      });

      for (let i = 0; i < ops.length; i += 450) {
        const chunk = ops.slice(i, i + 450);
        const batch = writeBatch(db);
        for (const op of chunk) {
          if (op.kind === 'goal') {
            batch.update(doc(db, 'users', u, 'goals', id), goalPayload);
          } else if (op.kind === 'delete') {
            batch.delete(doc(db, 'users', u, 'goalChecklistItems', op.itemId));
          } else if (op.kind === 'update') {
            batch.update(doc(db, 'users', u, 'goalChecklistItems', op.itemId), {
              title: op.title,
              completed: op.completed,
              order: op.order,
              updatedAt: serverTimestamp(),
            });
          } else {
            const newItemId = generateDocId('gci');
            batch.set(doc(db, 'users', u, 'goalChecklistItems', newItemId), {
              id: newItemId,
              userId: u,
              goalId: id,
              title: op.title,
              completed: op.completed,
              order: op.order,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteGoal: DataContextValue['deleteGoal'] = async (id) => {
    const u = requireUid();
    const path = `users/${u}/goals/${id}`;
    try {
      const itemsToDelete = goalChecklistItems.filter((item) => item.goalId === id);
      const firstBatch = writeBatch(db);
      firstBatch.delete(doc(db, 'users', u, 'goals', id));
      itemsToDelete.slice(0, 440).forEach((it) => {
        firstBatch.delete(doc(db, 'users', u, 'goalChecklistItems', it.id));
      });
      await firstBatch.commit();

      for (let i = 440; i < itemsToDelete.length; i += 450) {
        const batch = writeBatch(db);
        itemsToDelete.slice(i, i + 450).forEach((it) => {
          batch.delete(doc(db, 'users', u, 'goalChecklistItems', it.id));
        });
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const addGoalChecklistItem: DataContextValue['addGoalChecklistItem'] = async (
    goalId,
    rawTitle
  ) => {
    const u = requireUid();
    const title = clampStr(rawTitle, 200);
    if (!title) return;
    const existing = goalChecklistItems
      .filter((it) => it.goalId === goalId)
      .sort((a, b) => a.order - b.order);
    const maxOrder = existing.length > 0 ? existing[existing.length - 1].order + 1 : 0;
    const itemId = generateDocId('gci');
    const path = `users/${u}/goalChecklistItems/${itemId}`;
    const nextItems = [...existing, { completed: false }];
    const { progress, status } = computeGoalSyncPayload(nextItems);

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', u, 'goalChecklistItems', itemId), {
        id: itemId,
        userId: u,
        goalId,
        title,
        completed: false,
        order: maxOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'users', u, 'goals', goalId), {
        progress,
        status,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const toggleGoalChecklistItem: DataContextValue['toggleGoalChecklistItem'] = async (item) => {
    const u = requireUid();
    const path = `users/${u}/goalChecklistItems/${item.id}`;
    const nextCompleted = !item.completed;
    const siblingItems = goalChecklistItems
      .filter((it) => it.goalId === item.goalId)
      .map((it) => (it.id === item.id ? { ...it, completed: nextCompleted } : it));
    const { progress, status } = computeGoalSyncPayload(siblingItems);

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', u, 'goalChecklistItems', item.id), {
        completed: nextCompleted,
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'users', u, 'goals', item.goalId), {
        progress,
        status,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const updateGoalChecklistItemTitle: DataContextValue['updateGoalChecklistItemTitle'] = async (
    item,
    rawTitle
  ) => {
    const u = requireUid();
    const title = clampStr(rawTitle, 200);
    if (!title) return;
    const path = `users/${u}/goalChecklistItems/${item.id}`;
    try {
      await updateDoc(doc(db, 'users', u, 'goalChecklistItems', item.id), {
        title,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteGoalChecklistItem: DataContextValue['deleteGoalChecklistItem'] = async (item) => {
    const u = requireUid();
    const path = `users/${u}/goalChecklistItems/${item.id}`;
    const remaining = goalChecklistItems.filter(
      (it) => it.goalId === item.goalId && it.id !== item.id
    );
    const { progress, status } = computeGoalSyncPayload(remaining);

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', u, 'goalChecklistItems', item.id));
      batch.update(doc(db, 'users', u, 'goals', item.goalId), {
        progress,
        status,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const reorderGoalChecklistItems: DataContextValue['reorderGoalChecklistItems'] = async (
    goalId,
    orderedItems
  ) => {
    const u = requireUid();
    const path = `users/${u}/goalChecklistItems`;
    try {
      for (let i = 0; i < orderedItems.length; i += 450) {
        const chunk = orderedItems.slice(i, i + 450);
        const batch = writeBatch(db);
        chunk.forEach((it, offset) => {
          const nextOrder = i + offset;
          if (it.goalId === goalId && it.order !== nextOrder) {
            batch.update(doc(db, 'users', u, 'goalChecklistItems', it.id), {
              order: nextOrder,
              updatedAt: serverTimestamp(),
            });
          }
        });
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const addNote: DataContextValue['addNote'] = async (input) => {
    const u = requireUid();
    const id = generateDocId('nte');
    const path = `users/${u}/notes/${id}`;
    try {
      await setDoc(doc(db, 'users', u, 'notes', id), {
        id,
        userId: u,
        title: clampStr(input.title || 'Untitled Note', 180),
        content: (input.content || '').slice(0, 50000),
        category: input.category,
        tags: (input.tags || []).slice(0, 10).map((t) => clampStr(t, 30)),
        pinned: Boolean(input.pinned),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const updateNote: DataContextValue['updateNote'] = async (id, updates) => {
    const u = requireUid();
    const path = `users/${u}/notes/${id}`;
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) payload.title = clampStr(updates.title || 'Untitled Note', 180);
    if (updates.content !== undefined) payload.content = updates.content.slice(0, 50000);
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.tags !== undefined) {
      payload.tags = updates.tags.slice(0, 10).map((t) => clampStr(t, 30));
    }
    if (updates.pinned !== undefined) payload.pinned = Boolean(updates.pinned);
    try {
      await updateDoc(doc(db, 'users', u, 'notes', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteNote: DataContextValue['deleteNote'] = async (id) => {
    const u = requireUid();
    const path = `users/${u}/notes/${id}`;
    try {
      await deleteDoc(doc(db, 'users', u, 'notes', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const addHabit: DataContextValue['addHabit'] = async (input) => {
    const u = requireUid();
    const id = generateDocId('hab');
    const path = `users/${u}/habits/${id}`;
    try {
      await setDoc(doc(db, 'users', u, 'habits', id), {
        id,
        userId: u,
        title: clampStr(input.title, 120),
        frequency: input.frequency,
        targetPerWeek: Math.max(1, Math.min(7, input.targetPerWeek || 7)),
        color: clampStr(input.color || '#8B5CF6', 32),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const updateHabit: DataContextValue['updateHabit'] = async (id, updates) => {
    const u = requireUid();
    const path = `users/${u}/habits/${id}`;
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) payload.title = clampStr(updates.title, 120);
    if (updates.frequency !== undefined) payload.frequency = updates.frequency;
    if (updates.targetPerWeek !== undefined) {
      payload.targetPerWeek = Math.max(1, Math.min(7, updates.targetPerWeek));
    }
    if (updates.color !== undefined) payload.color = clampStr(updates.color, 32);
    try {
      await updateDoc(doc(db, 'users', u, 'habits', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteHabit: DataContextValue['deleteHabit'] = async (id) => {
    const u = requireUid();
    const path = `users/${u}/habits/${id}`;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', u, 'habits', id));
      for (const c of habitCompletions) {
        if (c.habitId === id) {
          batch.delete(doc(db, 'users', u, 'habitCompletions', c.id));
        }
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const toggleHabitCompletion: DataContextValue['toggleHabitCompletion'] = async (
    habitId,
    date
  ) => {
    const u = requireUid();
    const completionId = `${habitId}_${date}`;
    const path = `users/${u}/habitCompletions/${completionId}`;
    const existing = habitCompletions.find((c) => c.id === completionId);
    try {
      if (existing) {
        await updateDoc(doc(db, 'users', u, 'habitCompletions', completionId), {
          completed: !existing.completed,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'users', u, 'habitCompletions', completionId), {
          id: completionId,
          userId: u,
          habitId,
          date,
          completed: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const addCalendarEvent: DataContextValue['addCalendarEvent'] = async (input) => {
    const u = requireUid();
    const id = generateDocId('evt');
    const path = `users/${u}/calendarEvents/${id}`;
    try {
      await setDoc(doc(db, 'users', u, 'calendarEvents', id), {
        id,
        userId: u,
        title: clampStr(input.title, 160),
        description: clampStr(input.description || '', 1000),
        date: clampStr(input.date, 20),
        startTime: clampStr(input.startTime || '', 10),
        endTime: clampStr(input.endTime || '', 10),
        eventType: input.eventType,
        linkedTaskId: clampStr(input.linkedTaskId || '', 128),
        linkedGoalId: clampStr(input.linkedGoalId || '', 128),
        reminderMinutes: Math.max(0, Math.min(10080, input.reminderMinutes || 15)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const updateCalendarEvent: DataContextValue['updateCalendarEvent'] = async (id, updates) => {
    const u = requireUid();
    const path = `users/${u}/calendarEvents/${id}`;
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) payload.title = clampStr(updates.title, 160);
    if (updates.description !== undefined) payload.description = clampStr(updates.description, 1000);
    if (updates.date !== undefined) payload.date = clampStr(updates.date, 20);
    if (updates.startTime !== undefined) payload.startTime = clampStr(updates.startTime, 10);
    if (updates.endTime !== undefined) payload.endTime = clampStr(updates.endTime, 10);
    if (updates.eventType !== undefined) payload.eventType = updates.eventType;
    if (updates.linkedTaskId !== undefined) payload.linkedTaskId = clampStr(updates.linkedTaskId, 128);
    if (updates.linkedGoalId !== undefined) payload.linkedGoalId = clampStr(updates.linkedGoalId, 128);
    if (updates.reminderMinutes !== undefined) {
      payload.reminderMinutes = Math.max(0, Math.min(10080, updates.reminderMinutes));
    }
    try {
      await updateDoc(doc(db, 'users', u, 'calendarEvents', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteCalendarEvent: DataContextValue['deleteCalendarEvent'] = async (id) => {
    const u = requireUid();
    const path = `users/${u}/calendarEvents/${id}`;
    try {
      await deleteDoc(doc(db, 'users', u, 'calendarEvents', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const logFocusSession: DataContextValue['logFocusSession'] = async (input) => {
    const u = requireUid();
    const id = generateDocId('foc');
    const path = `users/${u}/focusSessions/${id}`;
    try {
      await setDoc(doc(db, 'users', u, 'focusSessions', id), {
        id,
        userId: u,
        mode: input.mode,
        durationMinutes: Math.max(1, Math.min(180, Math.round(input.durationMinutes))),
        label: clampStr(input.label || 'Deep Focus', 140),
        date: todayStr(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const deleteFocusSession: DataContextValue['deleteFocusSession'] = async (id) => {
    const u = requireUid();
    const path = `users/${u}/focusSessions/${id}`;
    try {
      await deleteDoc(doc(db, 'users', u, 'focusSessions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const addJournalEntry: DataContextValue['addJournalEntry'] = async (input) => {
    const u = requireUid();
    const id = generateDocId('jrn');
    const path = `users/${u}/journalEntries/${id}`;
    const docPayload: Record<string, unknown> = {
      id,
      userId: u,
      date: clampStr(input.date || todayStr(), 20),
      title: clampStr(input.title || 'Untitled Journal Page', 160),
      mood: input.mood,
      gratitude: clampStr(input.gratitude || '', 2000),
      reflection: clampStr(input.reflection || '', 10000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.isDraft !== undefined) docPayload.isDraft = Boolean(input.isDraft);
    if (input.templateId !== undefined) docPayload.templateId = clampStr(input.templateId, 40);
    if (input.canvasBackground !== undefined) {
      docPayload.canvasBackground = clampStr(input.canvasBackground, 240);
    }
    if (input.canvasBorder !== undefined) {
      docPayload.canvasBorder = clampStr(input.canvasBorder, 160);
    }
    if (input.elements !== undefined) {
      docPayload.elements = input.elements.slice(0, 80);
    }
    if (input.thumbnailUrl !== undefined) {
      docPayload.thumbnailUrl = clampStr(input.thumbnailUrl, 2000);
    }
    try {
      await setDoc(doc(db, 'users', u, 'journalEntries', id), docPayload);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const updateJournalEntry: DataContextValue['updateJournalEntry'] = async (id, updates) => {
    const u = requireUid();
    const path = `users/${u}/journalEntries/${id}`;
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.date !== undefined) payload.date = clampStr(updates.date, 20);
    if (updates.title !== undefined) {
      payload.title = clampStr(updates.title || 'Untitled Journal Page', 160);
    }
    if (updates.mood !== undefined) payload.mood = updates.mood;
    if (updates.gratitude !== undefined) payload.gratitude = clampStr(updates.gratitude, 2000);
    if (updates.reflection !== undefined) payload.reflection = clampStr(updates.reflection, 10000);
    if (updates.isDraft !== undefined) payload.isDraft = Boolean(updates.isDraft);
    if (updates.templateId !== undefined) payload.templateId = clampStr(updates.templateId, 40);
    if (updates.canvasBackground !== undefined) {
      payload.canvasBackground = clampStr(updates.canvasBackground, 240);
    }
    if (updates.canvasBorder !== undefined) {
      payload.canvasBorder = clampStr(updates.canvasBorder, 160);
    }
    if (updates.elements !== undefined) payload.elements = updates.elements.slice(0, 80);
    if (updates.thumbnailUrl !== undefined) {
      payload.thumbnailUrl = clampStr(updates.thumbnailUrl, 2000);
    }
    try {
      await updateDoc(doc(db, 'users', u, 'journalEntries', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteJournalEntry: DataContextValue['deleteJournalEntry'] = async (id) => {
    const u = requireUid();
    const path = `users/${u}/journalEntries/${id}`;
    const existing = journalEntries.find((entry) => entry.id === id);
    try {
      await deleteDoc(doc(db, 'users', u, 'journalEntries', id));
      if (existing?.elements) {
        existing.elements.forEach((el) => {
          if (el.imagePath) void deleteStoragePath(el.imagePath);
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const addWishlistItem: DataContextValue['addWishlistItem'] = async (input) => {
    const u = requireUid();
    const id = generateDocId('wsh');
    const path = `users/${u}/wishlist/${id}`;
    const cleanPrice = Math.max(
      0,
      Math.min(100000000, Number.isFinite(input.price) ? Math.round(input.price * 100) / 100 : 0)
    );
    const purchasedAt =
      input.status === 'Purchased' ? input.purchasedAt || new Date().toISOString() : '';
    try {
      await setDoc(doc(db, 'users', u, 'wishlist', id), {
        id,
        userId: u,
        name: clampStr(input.name, 160),
        description: clampStr(input.description || '', 1500),
        price: cleanPrice,
        productUrl: clampStr(input.productUrl || '', 1000),
        imageUrl: clampStr(input.imageUrl || '', 2000),
        imagePath: clampStr(input.imagePath || '', 300),
        category: clampStr(input.category || 'Other', 40),
        priority: input.priority,
        status: input.status,
        purchasedAt: clampStr(purchasedAt, 40),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const updateWishlistItem: DataContextValue['updateWishlistItem'] = async (id, updates) => {
    const u = requireUid();
    const path = `users/${u}/wishlist/${id}`;
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.name !== undefined) payload.name = clampStr(updates.name, 160);
    if (updates.description !== undefined) payload.description = clampStr(updates.description, 1500);
    if (updates.price !== undefined) {
      payload.price = Math.max(
        0,
        Math.min(100000000, Number.isFinite(updates.price) ? Math.round(updates.price * 100) / 100 : 0)
      );
    }
    if (updates.productUrl !== undefined) payload.productUrl = clampStr(updates.productUrl, 1000);
    if (updates.imageUrl !== undefined) payload.imageUrl = clampStr(updates.imageUrl, 2000);
    if (updates.imagePath !== undefined) payload.imagePath = clampStr(updates.imagePath, 300);
    if (updates.category !== undefined) payload.category = clampStr(updates.category || 'Other', 40);
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.status !== undefined) {
      payload.status = updates.status;
      if (updates.purchasedAt === undefined) {
        payload.purchasedAt = updates.status === 'Purchased' ? new Date().toISOString() : '';
      }
    }
    if (updates.purchasedAt !== undefined) payload.purchasedAt = clampStr(updates.purchasedAt, 40);
    try {
      await updateDoc(doc(db, 'users', u, 'wishlist', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteWishlistItem: DataContextValue['deleteWishlistItem'] = async (item) => {
    const u = requireUid();
    const path = `users/${u}/wishlist/${item.id}`;
    try {
      await deleteDoc(doc(db, 'users', u, 'wishlist', item.id));
      if (item.imagePath) void deleteStoragePath(item.imagePath);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const addExpense: DataContextValue['addExpense'] = async (input) => {
    const u = requireUid();
    const id = generateDocId('exp');
    const path = `users/${u}/expenses/${id}`;
    const cleanAmount = Math.max(
      0,
      Math.min(100000000, Number.isFinite(input.amount) ? Math.round(input.amount * 100) / 100 : 0)
    );
    try {
      await setDoc(doc(db, 'users', u, 'expenses', id), {
        id,
        userId: u,
        title: clampStr(input.title, 160),
        amount: cleanAmount,
        date: clampStr(input.date || todayStr(), 20),
        category: input.category,
        paymentMethod: clampStr(input.paymentMethod || 'UPI', 40),
        description: clampStr(input.description || '', 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const updateExpense: DataContextValue['updateExpense'] = async (id, updates) => {
    const u = requireUid();
    const path = `users/${u}/expenses/${id}`;
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) payload.title = clampStr(updates.title, 160);
    if (updates.amount !== undefined) {
      payload.amount = Math.max(
        0,
        Math.min(
          100000000,
          Number.isFinite(updates.amount) ? Math.round(updates.amount * 100) / 100 : 0
        )
      );
    }
    if (updates.date !== undefined) payload.date = clampStr(updates.date, 20);
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.paymentMethod !== undefined) {
      payload.paymentMethod = clampStr(updates.paymentMethod || 'Other', 40);
    }
    if (updates.description !== undefined) payload.description = clampStr(updates.description, 1000);
    try {
      await updateDoc(doc(db, 'users', u, 'expenses', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteExpense: DataContextValue['deleteExpense'] = async (id) => {
    const u = requireUid();
    const path = `users/${u}/expenses/${id}`;
    try {
      await deleteDoc(doc(db, 'users', u, 'expenses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const findUserByUsername: DataContextValue['findUserByUsername'] = async (rawUsername) => {
    requireUid();
    const clean = normalizeUsername(rawUsername);
    if (!isValidUsernameFormat(clean)) return null;
    try {
      const unameSnap = await getDoc(doc(db, 'usernames', clean));
      if (!unameSnap.exists()) return null;
      const targetUid = (unameSnap.data() as { uid: string }).uid;
      const userSnap = await getDoc(doc(db, 'users', targetUid));
      if (!userSnap.exists()) return null;
      return userSnap.data() as UserProfile;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `usernames/${clean}`);
    }
  };

  const sendFriendRequest: DataContextValue['sendFriendRequest'] = async (targetUser) => {
    const u = requireUid();
    if (!profile) throw new Error('Profile not loaded.');
    if (targetUser.uid === u) throw new Error('You cannot add yourself as a friend.');

    const alreadyFriend = friendships.some(
      (f) => f.users.includes(u) && f.users.includes(targetUser.uid)
    );
    if (alreadyFriend) throw new Error(`You are already friends with @${targetUser.username}.`);

    const pendingExists = friendRequests.some(
      (r) =>
        r.status === 'pending' &&
        ((r.fromUid === u && r.toUid === targetUser.uid) ||
          (r.fromUid === targetUser.uid && r.toUid === u))
    );
    if (pendingExists) throw new Error('A pending friend request already exists.');

    const id = generateDocId('frq');
    try {
      await setDoc(doc(db, 'friendRequests', id), {
        id,
        fromUid: u,
        fromUsername: profile.username,
        toUid: targetUser.uid,
        toUsername: targetUser.username,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `friendRequests/${id}`);
    }
  };

  const respondFriendRequest: DataContextValue['respondFriendRequest'] = async (req, accept) => {
    const u = requireUid();
    if (req.toUid !== u) throw new Error('Only the recipient can respond.');
    try {
      if (!accept) {
        await updateDoc(doc(db, 'friendRequests', req.id), {
          status: 'rejected',
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const [userA, userB] = [req.fromUid, req.toUid].sort();
      const friendshipId = `${userA}_${userB}`;
      await runTransaction(db, async (tx) => {
        const reqRef = doc(db, 'friendRequests', req.id);
        const friendRef = doc(db, 'friendships', friendshipId);
        tx.update(reqRef, {
          status: 'accepted',
          updatedAt: serverTimestamp(),
        });
        tx.set(friendRef, {
          id: friendshipId,
          users: [userA, userB],
          userA,
          userB,
          usernames: {
            [req.fromUid]: req.fromUsername,
            [req.toUid]: req.toUsername,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `friendRequests/${req.id}`);
    }
  };

  const cancelFriendRequest: DataContextValue['cancelFriendRequest'] = async (reqId) => {
    requireUid();
    try {
      await deleteDoc(doc(db, 'friendRequests', reqId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `friendRequests/${reqId}`);
    }
  };

  const removeFriend: DataContextValue['removeFriend'] = async (friendshipId) => {
    requireUid();
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `friendships/${friendshipId}`);
    }
  };

  const createSharedGoal: DataContextValue['createSharedGoal'] = async (input) => {
    const u = requireUid();
    if (!profile) throw new Error('Profile not ready.');
    const id = generateDocId('sg');
    const participantUids = Array.from(new Set([u, ...input.friendUids])).slice(0, 20);
    const participantUsernames: Record<string, string> = { [u]: profile.username };
    for (const fUid of participantUids) {
      if (fUid !== u && friendProfiles[fUid]) {
        participantUsernames[fUid] = friendProfiles[fUid].username;
      }
    }
    try {
      await setDoc(doc(db, 'sharedGoals', id), {
        id,
        title: clampStr(input.title, 160),
        description: clampStr(input.description || '', 1500),
        creatorUid: u,
        creatorUsername: profile.username,
        participantUids,
        participantUsernames,
        targetDate: clampStr(input.targetDate || todayStr(), 20),
        progress: 0,
        status: 'active',
        celebratedBy: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `sharedGoals/${id}`);
    }
  };

  const updateSharedGoalProgress: DataContextValue['updateSharedGoalProgress'] = async (
    goal,
    progress
  ) => {
    requireUid();
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    const nextStatus = clamped >= 100 ? 'completed' : 'active';
    try {
      await updateDoc(doc(db, 'sharedGoals', goal.id), {
        progress: clamped,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sharedGoals/${goal.id}`);
    }
  };

  const celebrateSharedGoal: DataContextValue['celebrateSharedGoal'] = async (goal) => {
    const u = requireUid();
    if (goal.celebratedBy.includes(u)) return;
    try {
      await updateDoc(doc(db, 'sharedGoals', goal.id), {
        celebratedBy: [...goal.celebratedBy, u].slice(0, 20),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sharedGoals/${goal.id}`);
    }
  };

  const deleteSharedGoal: DataContextValue['deleteSharedGoal'] = async (id) => {
    requireUid();
    try {
      await deleteDoc(doc(db, 'sharedGoals', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sharedGoals/${id}`);
    }
  };

  const createChallenge: DataContextValue['createChallenge'] = async (input) => {
    const u = requireUid();
    if (!profile) throw new Error('Profile not ready.');
    const id = generateDocId('chl');
    const participantUids = Array.from(new Set([u, ...input.friendUids])).slice(0, 25);
    const participantUsernames: Record<string, string> = { [u]: profile.username };
    const participantProgress: Record<string, number> = { [u]: 0 };
    for (const fUid of participantUids) {
      if (fUid !== u && friendProfiles[fUid]) {
        participantUsernames[fUid] = friendProfiles[fUid].username;
      }
      participantProgress[fUid] = 0;
    }
    try {
      await setDoc(doc(db, 'challenges', id), {
        id,
        title: clampStr(input.title, 160),
        description: clampStr(input.description || '', 1500),
        templateKey: input.templateKey,
        durationDays: Math.max(1, Math.min(365, Math.round(input.durationDays))),
        creatorUid: u,
        creatorUsername: profile.username,
        participantUids,
        participantProgress,
        participantUsernames,
        startDate: todayStr(),
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `challenges/${id}`);
    }
  };

  const incrementChallengeProgress: DataContextValue['incrementChallengeProgress'] = async (
    challenge
  ) => {
    const u = requireUid();
    const currentDays = challenge.participantProgress[u] || 0;
    const nextDays = Math.min(challenge.durationDays, currentDays + 1);
    const updatedProgress = { ...challenge.participantProgress, [u]: nextDays };
    const allFinished = challenge.participantUids.every(
      (pUid) => (updatedProgress[pUid] || 0) >= challenge.durationDays
    );
    try {
      await updateDoc(doc(db, 'challenges', challenge.id), {
        participantProgress: updatedProgress,
        status: allFinished ? 'completed' : 'active',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `challenges/${challenge.id}`);
    }
  };

  const deleteChallenge: DataContextValue['deleteChallenge'] = async (id) => {
    requireUid();
    try {
      await deleteDoc(doc(db, 'challenges', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `challenges/${id}`);
    }
  };

  return (
    <DataContext.Provider
      value={{
        loading,
        tasks,
        goals,
        goalChecklistItems,
        notes,
        habits,
        habitCompletions,
        calendarEvents,
        focusSessions,
        journalEntries,
        wishlist,
        expenses,
        friendRequests,
        friendships,
        friendProfiles,
        sharedGoals,
        challenges,
        dailyScore,
        addTask,
        updateTask,
        toggleTaskComplete,
        deleteTask,
        addGoal,
        updateGoal,
        deleteGoal,
        addGoalChecklistItem,
        toggleGoalChecklistItem,
        updateGoalChecklistItemTitle,
        deleteGoalChecklistItem,
        reorderGoalChecklistItems,
        addNote,
        updateNote,
        deleteNote,
        addHabit,
        updateHabit,
        deleteHabit,
        toggleHabitCompletion,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        logFocusSession,
        deleteFocusSession,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        addWishlistItem,
        updateWishlistItem,
        deleteWishlistItem,
        addExpense,
        updateExpense,
        deleteExpense,
        findUserByUsername,
        sendFriendRequest,
        respondFriendRequest,
        cancelFriendRequest,
        removeFriend,
        createSharedGoal,
        updateSharedGoalProgress,
        celebrateSharedGoal,
        deleteSharedGoal,
        createChallenge,
        incrementChallengeProgress,
        deleteChallenge,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
