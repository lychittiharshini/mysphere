import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  clampStr,
  db,
  handleFirestoreError,
  isValidUsernameFormat,
  normalizeUsername,
  OperationType,
} from '../lib/firebase';
import { todayStr } from '../lib/dates';
import type { ThemeMode, UserPrivateInfo, UserProfile } from '../types/mysphere';
import { useTheme } from './ThemeContext';

interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
  profile: UserProfile | null;
  privateInfo: UserPrivateInfo | null;
  profileLoading: boolean;
  needsUsernameSetup: boolean;
  registerWithEmail: (email: string, username: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  claimUsernameAndInitProfile: (username: string) => Promise<void>;
  updateUserProfile: (updates: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatarColor' | 'themePreference'>>) => Promise<void>;
  updatePrivacyAndNotifications: (params: {
    notifications?: UserPrivateInfo['notifications'];
    privacy?: UserPrivateInfo['privacy'];
  }) => Promise<void>;
  updateMonthlyBudget: (budget: number, currency?: string) => Promise<void>;
  updateCurrencyPreference: (currency: string) => Promise<void>;
  changeUsername: (newUsername: string) => Promise<void>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<UserPrivateInfo | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [claimingProfile, setClaimingProfile] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      setAuthLoading(false);
      if (!fbUser) {
        setProfile(null);
        setPrivateInfo(null);
        setProfileLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setPrivateInfo(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    let profileLoaded = false;
    let privateLoaded = false;

    const markDone = () => {
      if (profileLoaded && privateLoaded) {
        setProfileLoading(false);
      }
    };

    const userPath = `users/${user.uid}`;
    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setProfile(data);
          if (data.themePreference === 'dark' || data.themePreference === 'light') {
            setTheme(data.themePreference);
          }
        } else {
          setProfile(null);
        }
        profileLoaded = true;
        markDone();
      },
      (err) => {
        profileLoaded = true;
        markDone();
        handleFirestoreError(err, OperationType.GET, userPath);
      }
    );

    const privPath = `users/${user.uid}/private/info`;
    const unsubPrivate = onSnapshot(
      doc(db, 'users', user.uid, 'private', 'info'),
      (snap) => {
        if (snap.exists()) {
          setPrivateInfo(snap.data() as UserPrivateInfo);
        } else {
          setPrivateInfo(null);
        }
        privateLoaded = true;
        markDone();
      },
      (err) => {
        privateLoaded = true;
        markDone();
        handleFirestoreError(err, OperationType.GET, privPath);
      }
    );

    return () => {
      unsubProfile();
      unsubPrivate();
    };
  }, [user, setTheme]);

  const needsUsernameSetup = Boolean(
    user && !profileLoading && !claimingProfile && !profile
  );

  const registerWithEmail = async (email: string, username: string, password: string) => {
    const cleanUsername = normalizeUsername(username);
    if (!isValidUsernameFormat(cleanUsername)) {
      throw new Error(
        'Username must be 3-24 characters using lowercase letters, numbers, or underscores.'
      );
    }
    setClaimingProfile(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: cleanUsername });
      setUser(auth.currentUser ?? cred.user);
      await claimUsernameAndInitProfile(cleanUsername);
    } finally {
      setClaimingProfile(false);
    }
  };

  const loginWithEmail = async (email: string, password: string, rememberMe: boolean) => {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    setUser(auth.currentUser ?? cred.user);
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const claimUsernameAndInitProfile = async (rawUsername: string) => {
    const current = auth.currentUser;
    if (!current) {
      throw new Error('Please sign in before completing setup.');
    }
    const cleanUsername = normalizeUsername(rawUsername);
    if (!isValidUsernameFormat(cleanUsername)) {
      throw new Error(
        'Username must be 3-24 characters using lowercase letters, numbers, or underscores.'
      );
    }

    const usernameRef = doc(db, 'usernames', cleanUsername);
    const profileRef = doc(db, 'users', current.uid);
    const privateRef = doc(db, 'users', current.uid, 'private', 'info');

    try {
      await runTransaction(db, async (tx) => {
        const usernameSnap = await tx.get(usernameRef);
        if (usernameSnap.exists()) {
          throw new Error('That username is already taken. Please choose another.');
        }

        const existingProfile = await tx.get(profileRef);
        if (existingProfile.exists()) {
          return;
        }

        tx.set(usernameRef, {
          uid: current.uid,
          username: cleanUsername,
          searchable: true,
          createdAt: serverTimestamp(),
        });

        tx.set(profileRef, {
          uid: current.uid,
          username: cleanUsername,
          displayName: clampStr(cleanUsername, 60),
          bio: '',
          avatarColor: '#8B5CF6',
          themePreference: theme,
          shareStats: true,
          shareStreak: true,
          shareFocusHours: true,
          statsSummary: {
            tasksCompletedToday: 0,
            activeGoals: 0,
            currentStreak: 0,
            focusMinutesToday: 0,
            productivityScore: 0,
            updatedDate: todayStr(),
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        tx.set(privateRef, {
          uid: current.uid,
          email: clampStr(current.email || '', 160),
          notifications: {
            taskReminders: true,
            goalMilestones: true,
            friendRequests: true,
            focusChime: true,
          },
          privacy: {
            searchableByUsername: true,
            showStatsToFriends: true,
            showStreakToFriends: true,
            showFocusToFriends: true,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      await updateProfile(current, { displayName: cleanUsername });
    } catch (err) {
      if (err instanceof Error && err.message.includes('already taken')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.WRITE, `users/${current.uid}`);
    }
  };

  const updateUserProfile = async (
    updates: Partial<
      Pick<UserProfile, 'displayName' | 'bio' | 'avatarColor' | 'themePreference'>
    >
  ) => {
    if (!auth.currentUser) return;
    const ref = doc(db, 'users', auth.currentUser.uid);
    const sanitized: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.displayName !== undefined) {
      sanitized.displayName = clampStr(updates.displayName || profile?.username || 'User', 60);
    }
    if (updates.bio !== undefined) {
      sanitized.bio = clampStr(updates.bio, 240);
    }
    if (updates.avatarColor !== undefined) {
      sanitized.avatarColor = clampStr(updates.avatarColor, 32);
    }
    if (updates.themePreference !== undefined) {
      const t: ThemeMode = updates.themePreference === 'light' ? 'light' : 'dark';
      sanitized.themePreference = t;
      setTheme(t);
    }
    try {
      await updateDoc(ref, sanitized);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const updatePrivacyAndNotifications = async (params: {
    notifications?: UserPrivateInfo['notifications'];
    privacy?: UserPrivateInfo['privacy'];
  }) => {
    if (!auth.currentUser || !privateInfo) return;
    const uid = auth.currentUser.uid;
    try {
      const privUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (params.notifications) privUpdates.notifications = params.notifications;
      if (params.privacy) privUpdates.privacy = params.privacy;
      await updateDoc(doc(db, 'users', uid, 'private', 'info'), privUpdates);

      if (params.privacy) {
        await updateDoc(doc(db, 'users', uid), {
          shareStats: params.privacy.showStatsToFriends,
          shareStreak: params.privacy.showStreakToFriends,
          shareFocusHours: params.privacy.showFocusToFriends,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/private/info`);
    }
  };

  const updateMonthlyBudget = async (budget: number, currency?: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const cleanBudget = Math.max(0, Math.min(100000000, Number.isFinite(budget) ? Math.round(budget * 100) / 100 : 0));
    const payload: Record<string, unknown> = {
      monthlyBudget: cleanBudget,
      updatedAt: serverTimestamp(),
    };
    if (currency !== undefined && currency.trim()) {
      payload.currency = clampStr(currency, 8);
    }
    try {
      await updateDoc(doc(db, 'users', uid, 'private', 'info'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/private/info`);
    }
  };

  const updateCurrencyPreference = async (currency: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const clean = clampStr(currency.toUpperCase() || 'USD', 8);
    try {
      await updateDoc(doc(db, 'users', uid, 'private', 'info'), {
        currency: clean,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/private/info`);
    }
  };

  const changeUsername = async (rawNewUsername: string) => {
    const current = auth.currentUser;
    if (!current || !profile) throw new Error('Profile not loaded.');
    const nextUsername = normalizeUsername(rawNewUsername);
    if (!isValidUsernameFormat(nextUsername)) {
      throw new Error(
        'Username must be 3-24 characters using lowercase letters, numbers, or underscores.'
      );
    }
    if (nextUsername === profile.username) return;

    const oldRef = doc(db, 'usernames', profile.username);
    const newRef = doc(db, 'usernames', nextUsername);
    const userRef = doc(db, 'users', current.uid);

    try {
      await runTransaction(db, async (tx) => {
        const existingNew = await tx.get(newRef);
        if (existingNew.exists()) {
          throw new Error('That username is already taken.');
        }
        tx.delete(oldRef);
        tx.set(newRef, {
          uid: current.uid,
          username: nextUsername,
          searchable: privateInfo?.privacy?.searchableByUsername ?? true,
          createdAt: serverTimestamp(),
        });
        tx.update(userRef, {
          username: nextUsername,
          updatedAt: serverTimestamp(),
        });
      });
      await updateProfile(current, { displayName: nextUsername });
    } catch (err) {
      if (err instanceof Error && err.message.includes('already taken')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.WRITE, `usernames/${nextUsername}`);
    }
  };

  const changeUserPassword = async (currentPassword: string, newPassword: string) => {
    const current = auth.currentUser;
    if (!current || !current.email) {
      throw new Error('Password changes are only available for email/password accounts.');
    }
    const credential = EmailAuthProvider.credential(current.email, currentPassword);
    await reauthenticateWithCredential(current, credential);
    await updatePassword(current, newPassword);
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setPrivateInfo(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        profile,
        privateInfo,
        profileLoading,
        needsUsernameSetup,
        registerWithEmail,
        loginWithEmail,
        sendResetEmail,
        claimUsernameAndInitProfile,
        updateUserProfile,
        updatePrivacyAndNotifications,
        updateMonthlyBudget,
        updateCurrencyPreference,
        changeUsername,
        changeUserPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
