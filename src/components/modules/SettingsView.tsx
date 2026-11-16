import React, { useEffect, useState } from 'react';
import { Loader2, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { normalizeUsername } from '../../lib/firebase';
import { getCurrencyOption, SUPPORTED_CURRENCIES } from '../../lib/currency';

const AVATAR_COLORS = ['#8B5CF6', '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#3B82F6'];

export const SettingsView: React.FC = () => {
  const {
    user,
    profile,
    privateInfo,
    updateUserProfile,
    updatePrivacyAndNotifications,
    updateCurrencyPreference,
    changeUsername,
    changeUserPassword,
    logout,
  } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarColor, setAvatarColor] = useState(profile?.avatarColor || '#8B5CF6');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newUsername, setNewUsername] = useState(profile?.username || '');
  const [savingUsername, setSavingUsername] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setBio(profile.bio || '');
      setAvatarColor(profile.avatarColor || '#8B5CF6');
      setNewUsername(profile.username);
    }
  }, [profile]);

  const isEmailPasswordUser = Boolean(
    user?.providerData?.some((p) => p.providerId === 'password')
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile({ displayName, bio, avatarColor });
      showToast('Profile settings saved.', 'success');
    } catch {
      showToast('Could not update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUsername(true);
    try {
      await changeUsername(newUsername);
      showToast('Username updated successfully.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to change username.', 'error');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Password updated.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Could not change password. Verify your current password.',
        'error'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleThemeChange = async (next: 'dark' | 'light') => {
    setTheme(next);
    await updateUserProfile({ themePreference: next });
    showToast(`Theme switched to ${next} mode.`, 'info');
  };

  const toggleNotification = async (
    key: keyof NonNullable<typeof privateInfo>['notifications']
  ) => {
    if (!privateInfo) return;
    const next = {
      ...privateInfo.notifications,
      [key]: !privateInfo.notifications[key],
    };
    await updatePrivacyAndNotifications({ notifications: next });
    showToast('Notification preferences updated.', 'info');
  };

  const togglePrivacy = async (
    key: keyof NonNullable<typeof privateInfo>['privacy']
  ) => {
    if (!privateInfo) return;
    const next = {
      ...privateInfo.privacy,
      [key]: !privateInfo.privacy[key],
    };
    await updatePrivacyAndNotifications({ privacy: next });
    showToast('Privacy settings updated.', 'info');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
          Settings
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Manage your profile, account security, appearance, notifications, and friend privacy.
        </p>
      </div>

      {/* Profile Settings */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-6 space-y-4"
      >
        <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
          Profile Settings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email Address (Private)
            </label>
            <input
              type="email"
              disabled
              value={privateInfo?.email || user?.email || ''}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900/40 text-sm text-slate-500 dark:text-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Bio / Focus Motto
          </label>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Building consistent daily habits..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
            Sphere Color
          </label>
          <div className="flex items-center gap-2.5">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAvatarColor(c)}
                className={`w-7 h-7 rounded-full cursor-pointer ${
                  avatarColor === c ? 'ring-2 ring-offset-2 ring-violet-500 dark:ring-offset-slate-950' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
        >
          {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Save Profile</span>
        </button>
      </form>

      {/* Change Username */}
      <form
        onSubmit={handleChangeUsername}
        className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-6 space-y-4"
      >
        <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
          Change Username
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={newUsername}
            onChange={(e) => setNewUsername(normalizeUsername(e.target.value))}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={savingUsername || newUsername === profile?.username}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium cursor-pointer"
          >
            {savingUsername ? 'Updating...' : 'Update Username'}
          </button>
        </div>
      </form>

      {/* Change Password */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
          Password & Security
        </h2>
        {isEmailPasswordUser ? (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm new password"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer"
            >
              {savingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your account signs in via Google Authentication; password management is handled through your Google account.
          </p>
        )}
      </div>

      {/* Theme Selection */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
          Theme Selection
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => void handleThemeChange('dark')}
            className={`p-4 rounded-xl border text-left flex items-center gap-3 cursor-pointer ${
              theme === 'dark'
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-slate-200 dark:border-white/10'
            }`}
          >
            <Moon className="w-5 h-5 text-violet-400" />
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                Midnight Fernhollow
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deep navy canvas with subtle violet luminescence
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => void handleThemeChange('light')}
            className={`p-4 rounded-xl border text-left flex items-center gap-3 cursor-pointer ${
              theme === 'light'
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-slate-200 dark:border-white/10'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                Warm Off-White
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Soft alabaster background with lavender accents
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Currency Preference */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
              Currency Preference
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose your currency for Expense Tracker & Wishlist (e.g. Indian Rupee ₹ or US Dollar $).
            </p>
          </div>
          <select
            aria-label="Currency preference"
            value={getCurrencyOption(privateInfo?.currency).code}
            onChange={(e) => {
              const code = e.target.value;
              void updateCurrencyPreference(code).then(() => {
                const opt = getCurrencyOption(code);
                showToast(`Currency updated to ${opt.name} (${opt.symbol}).`, 'success');
              });
            }}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white cursor-pointer"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Privacy & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-6 space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Privacy Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Personal notes, private tasks, and journal entries are always private.
          </p>
          {privateInfo &&
            (
              [
                { key: 'showStatsToFriends', label: 'Share productivity score & task counts' },
                { key: 'showStreakToFriends', label: 'Share habit streak with friends' },
                { key: 'showFocusToFriends', label: 'Share daily focus minutes with friends' },
                { key: 'searchableByUsername', label: 'Allow friend discovery by username' },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between gap-3 py-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={privateInfo.privacy[item.key]}
                  onChange={() => void togglePrivacy(item.key)}
                  className="accent-violet-600 w-4 h-4"
                />
              </label>
            ))}
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-6 space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Notification Preferences
          </h2>
          {privateInfo &&
            (
              [
                { key: 'taskReminders', label: 'Task deadline alerts' },
                { key: 'goalMilestones', label: 'Goal milestone celebrations' },
                { key: 'friendRequests', label: 'Friend request notifications' },
                { key: 'focusChime', label: 'Focus timer completion chime' },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between gap-3 py-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={privateInfo.notifications[item.key]}
                  onChange={() => void toggleNotification(item.key)}
                  className="accent-violet-600 w-4 h-4"
                />
              </label>
            ))}
        </div>
      </div>

      {/* Account Management & Logout */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Session & Account
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Signed in as @{profile?.username} ({user?.email})
          </p>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
