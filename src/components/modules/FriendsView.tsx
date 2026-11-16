import React, { useMemo, useState } from 'react';
import {
  Check,
  PartyPopper,
  Plus,
  Search,
  Trash2,
  Trophy,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { formatPrettyDate, todayStr } from '../../lib/dates';
import { normalizeUsername } from '../../lib/firebase';
import type { ChallengeTemplateKey, UserProfile } from '../../types/mysphere';

const CHALLENGE_TEMPLATES: {
  key: ChallengeTemplateKey;
  title: string;
  description: string;
  days: number;
}[] = [
  {
    key: '7-day-study',
    title: '7-Day Study Challenge',
    description: 'Complete at least 2 hours of focused study every day for 7 days.',
    days: 7,
  },
  {
    key: '30-day-coding',
    title: '30-Day Coding Challenge',
    description: 'Write code, solve problems, or build projects daily for 30 days.',
    days: 30,
  },
  {
    key: 'daily-reading',
    title: 'Daily Reading Challenge',
    description: 'Read 10+ pages every day for 14 days.',
    days: 14,
  },
  {
    key: 'habit-consistency',
    title: 'Habit Consistency Challenge',
    description: 'Check off your core daily habits without breaking the chain for 21 days.',
    days: 21,
  },
];

export const FriendsView: React.FC = () => {
  const { user, profile } = useAuth();
  const {
    friendRequests,
    friendships,
    friendProfiles,
    sharedGoals,
    challenges,
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
  } = useData();
  const { showToast, confirmDialog } = useToast();

  const [subTab, setSubTab] = useState<'friends' | 'shared-goals' | 'challenges'>('friends');
  const [searchUsername, setSearchUsername] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [searchNote, setSearchNote] = useState('');

  // Shared goal modal
  const [sgModalOpen, setSgModalOpen] = useState(false);
  const [sgTitle, setSgTitle] = useState('');
  const [sgDesc, setSgDesc] = useState('');
  const [sgDate, setSgDate] = useState(todayStr());
  const [sgFriends, setSgFriends] = useState<string[]>([]);

  // Challenge modal
  const [chModalOpen, setChModalOpen] = useState(false);
  const [chTemplate, setChTemplate] = useState<ChallengeTemplateKey>('7-day-study');
  const [chTitle, setChTitle] = useState('7-Day Study Challenge');
  const [chDesc, setChDesc] = useState(
    'Complete at least 2 hours of focused study every day for 7 days.'
  );
  const [chDays, setChDays] = useState(7);
  const [chFriends, setChFriends] = useState<string[]>([]);

  const uid = user?.uid || '';

  const incomingRequests = useMemo(
    () => friendRequests.filter((r) => r.status === 'pending' && r.toUid === uid),
    [friendRequests, uid]
  );

  const outgoingRequests = useMemo(
    () => friendRequests.filter((r) => r.status === 'pending' && r.fromUid === uid),
    [friendRequests, uid]
  );

  const friendList = useMemo(() => {
    return friendships.map((f) => {
      const friendUid = f.userA === uid ? f.userB : f.userA;
      const friendProf = friendProfiles[friendUid];
      return {
        friendshipId: f.id,
        friendUid,
        username: friendProf?.username || f.usernames[friendUid] || 'friend',
        profile: friendProf || null,
      };
    });
  }, [friendships, friendProfiles, uid]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = normalizeUsername(searchUsername);
    if (!q) return;
    setSearching(true);
    setFoundUser(null);
    setSearchNote('');
    try {
      const res = await findUserByUsername(q);
      if (!res) {
        setSearchNote(`No user found with username "@${q}".`);
      } else if (res.uid === uid) {
        setSearchNote('That is your own username.');
      } else {
        setFoundUser(res);
      }
    } catch {
      setSearchNote('Could not complete search.');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (target: UserProfile) => {
    try {
      await sendFriendRequest(target);
      showToast(`Friend request sent to @${target.username}.`, 'success');
      setFoundUser(null);
      setSearchUsername('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send request.', 'error');
    }
  };

  const handleRemoveFriend = async (friendshipId: string, uname: string) => {
    const ok = await confirmDialog({
      title: 'Remove friend?',
      description: `Remove @${uname} from your friends circle?`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    await removeFriend(friendshipId);
    showToast(`Removed @${uname}.`, 'info');
  };

  const handleCreateSharedGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sgTitle.trim()) return;
    try {
      await createSharedGoal({
        title: sgTitle.trim(),
        description: sgDesc.trim(),
        targetDate: sgDate,
        friendUids: sgFriends,
      });
      setSgModalOpen(false);
      setSgTitle('');
      setSgDesc('');
      setSgFriends([]);
      showToast('Shared goal created!', 'success');
    } catch {
      showToast('Could not create shared goal.', 'error');
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chTitle.trim()) return;
    try {
      await createChallenge({
        title: chTitle.trim(),
        description: chDesc.trim(),
        templateKey: chTemplate,
        durationDays: chDays,
        friendUids: chFriends,
      });
      setChModalOpen(false);
      setChFriends([]);
      showToast('Challenge launched!', 'success');
    } catch {
      showToast('Could not create challenge.', 'error');
    }
  };

  const selectChallengeTemplate = (key: ChallengeTemplateKey) => {
    setChTemplate(key);
    const tpl = CHALLENGE_TEMPLATES.find((t) => t.key === key);
    if (tpl) {
      setChTitle(tpl.title);
      setChDesc(tpl.description);
      setChDays(tpl.days);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
            Friends & Community
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Connect with friends, share opted-in progress, tackle challenges, and celebrate milestones.
          </p>
        </div>

        <div className="flex items-center p-1 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-950/65">
          {(
            [
              { id: 'friends', label: 'Friends' },
              { id: 'shared-goals', label: 'Shared Goals' },
              { id: 'challenges', label: 'Challenges' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap ${
                subTab === t.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'friends' && (
        <div className="space-y-6">
          {/* Find Friend by Username */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-6">
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
              Find Friends by Username
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your handle is <span className="font-mono text-violet-600 dark:text-violet-300">@{profile?.username}</span>. Share it with friends so they can connect.
            </p>

            <form onSubmit={handleSearch} className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  placeholder="Enter exact username (e.g. alex_dev)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                {searching ? 'Searching...' : 'Search Username'}
              </button>
            </form>

            {searchNote && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{searchNote}</p>
            )}

            {foundUser && (
              <div className="mt-4 p-4 rounded-xl border border-violet-500/30 bg-violet-500/8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ backgroundColor: foundUser.avatarColor || '#8B5CF6' }}
                  >
                    {foundUser.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">
                      {foundUser.displayName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      @{foundUser.username}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSendRequest(foundUser)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Send Request</span>
                </button>
              </div>
            )}
          </div>

          {/* Pending Requests */}
          {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {incomingRequests.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-5 space-y-3">
                  <h3 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                    Incoming Requests ({incomingRequests.length})
                  </h3>
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 py-2 border-t border-slate-200/70 dark:border-white/8 first:border-t-0"
                    >
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        @{req.fromUsername}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void respondFriendRequest(req, true).then(() =>
                              showToast(`You are now friends with @${req.fromUsername}!`, 'success')
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void respondFriendRequest(req, false).then(() =>
                              showToast('Request declined.', 'info')
                            )
                          }
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {outgoingRequests.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-5 space-y-3">
                  <h3 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                    Sent Requests ({outgoingRequests.length})
                  </h3>
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 py-2 border-t border-slate-200/70 dark:border-white/8 first:border-t-0"
                    >
                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        @{req.toUsername} · Pending
                      </span>
                      <button
                        type="button"
                        onClick={() => void cancelFriendRequest(req.id)}
                        className="text-xs text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Friends Circle */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-6">
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white mb-4">
              Your Circle ({friendList.length})
            </h2>

            {friendList.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                No friends connected yet. Search a friend's username above to send an invite.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {friendList.map((f) => {
                  const p = f.profile;
                  return (
                    <div
                      key={f.friendshipId}
                      className="rounded-xl border border-slate-200/80 dark:border-white/10 p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                            style={{ backgroundColor: p?.avatarColor || '#6366F1' }}
                          >
                            {f.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-display font-semibold text-slate-950 dark:text-white">
                              {p?.displayName || f.username}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              @{f.username}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleRemoveFriend(f.friendshipId, f.username)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                          title="Remove friend"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Shared Productivity Stats (strictly respects friend's privacy toggles) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200/70 dark:border-white/8 text-xs">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Score</p>
                          <p className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                            {p?.shareStats ? `${p.statsSummary.productivityScore}` : 'Private'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Tasks Today</p>
                          <p className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                            {p?.shareStats ? p.statsSummary.tasksCompletedToday : 'Private'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Streak</p>
                          <p className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                            {p?.shareStreak ? `${p.statsSummary.currentStreak}d` : 'Private'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">Focus</p>
                          <p className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                            {p?.shareFocusHours ? `${p.statsSummary.focusMinutesToday}m` : 'Private'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'shared-goals' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSgModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Shared Goal</span>
            </button>
          </div>

          {sharedGoals.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No shared goals yet. Launch one with your friends to track progress together.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {sharedGoals.map((goal) => {
                const isCelebratedByMe = goal.celebratedBy.includes(uid);
                return (
                  <div
                    key={goal.id}
                    className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-6 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-violet-700 dark:text-violet-300">
                          Created by @{goal.creatorUsername} · Due {formatPrettyDate(goal.targetDate)}
                        </p>
                        <h3 className="mt-1 font-display text-lg font-semibold text-slate-950 dark:text-white">
                          {goal.title}
                        </h3>
                        {goal.description && (
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            {goal.description}
                          </p>
                        )}
                      </div>
                      {goal.creatorUid === uid && (
                        <button
                          type="button"
                          onClick={() => void deleteSharedGoal(goal.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Participants:{' '}
                      {goal.participantUids
                        .map((id) => `@${goal.participantUsernames[id] || 'friend'}`)
                        .join(', ')}
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-600 dark:text-slate-300 capitalize">
                          Status: {goal.status}
                        </span>
                        <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                          {goal.progress}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            goal.status === 'completed' ? 'bg-emerald-500' : 'bg-violet-600'
                          }`}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>

                    {goal.status === 'active' ? (
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Update team progress
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={goal.progress}
                          onChange={(e) =>
                            void updateSharedGoalProgress(goal, Number(e.target.value))
                          }
                          className="w-40 accent-violet-600 cursor-pointer"
                        />
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                          <PartyPopper className="w-4 h-4 shrink-0" />
                          <span>
                            Goal completed! {goal.celebratedBy.length} celebration
                            {goal.celebratedBy.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isCelebratedByMe}
                          onClick={() =>
                            void celebrateSharedGoal(goal).then(() =>
                              showToast('Celebration sent to your circle!', 'success')
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium cursor-pointer"
                        >
                          {isCelebratedByMe ? 'Celebrated' : 'Celebrate'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === 'challenges' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setChModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Start Group Challenge</span>
            </button>
          </div>

          {challenges.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 p-12 text-center space-y-4">
              <Trophy className="w-7 h-7 text-violet-500 mx-auto" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No group challenges yet. Launch a 7-day study or 30-day coding challenge with friends.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {CHALLENGE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => {
                      selectChallengeTemplate(tpl.key);
                      setChModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 text-xs text-slate-700 dark:text-slate-200 hover:border-violet-500 cursor-pointer"
                  >
                    + {tpl.title}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {challenges.map((ch) => {
                const myDays = ch.participantProgress[uid] || 0;
                const sortedBoard = [...ch.participantUids].sort(
                  (a, b) =>
                    (ch.participantProgress[b] || 0) - (ch.participantProgress[a] || 0)
                );

                return (
                  <div
                    key={ch.id}
                    className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-6 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-violet-700 dark:text-violet-300 font-mono tabular-nums">
                          {ch.durationDays}-Day Challenge · Started {formatPrettyDate(ch.startDate)}
                        </p>
                        <h3 className="mt-1 font-display text-lg font-semibold text-slate-950 dark:text-white">
                          {ch.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          {ch.description}
                        </p>
                      </div>
                      {ch.creatorUid === uid && (
                        <button
                          type="button"
                          onClick={() => void deleteChallenge(ch.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Leaderboard */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-200/70 dark:border-white/8">
                      {sortedBoard.map((pUid) => {
                        const daysDone = ch.participantProgress[pUid] || 0;
                        const pct = Math.round((daysDone / ch.durationDays) * 100);
                        return (
                          <div key={pUid} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                @{ch.participantUsernames[pUid] || 'friend'}
                                {pUid === uid ? ' (You)' : ''}
                              </span>
                              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                {daysDone} / {ch.durationDays}d
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-violet-600 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {ch.status === 'active' && myDays < ch.durationDays ? (
                      <button
                        type="button"
                        onClick={() =>
                          void incrementChallengeProgress(ch).then(() =>
                            showToast('Checked in today!', 'success')
                          )
                        }
                        className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Check In Today (+1 Day)</span>
                      </button>
                    ) : (
                      <p className="text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Challenge target completed!
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Shared Goal Modal */}
      {sgModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                Create Shared Goal
              </h2>
              <button
                type="button"
                onClick={() => setSgModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSharedGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  value={sgTitle}
                  onChange={(e) => setSgTitle(e.target.value)}
                  placeholder="Ship final semester capstone project"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={sgDesc}
                  onChange={(e) => setSgDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={sgDate}
                  onChange={(e) => setSgDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Invite Friends
                </label>
                {friendList.length === 0 ? (
                  <p className="text-xs text-slate-500">Add friends first to invite them.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {friendList.map((f) => (
                      <label key={f.friendUid} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sgFriends.includes(f.friendUid)}
                          onChange={(e) => {
                            setSgFriends((prev) =>
                              e.target.checked
                                ? [...prev, f.friendUid]
                                : prev.filter((id) => id !== f.friendUid)
                            );
                          }}
                        />
                        <span>@{f.username}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSgModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/15 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Challenge Modal */}
      {chModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                Start Group Challenge
              </h2>
              <button
                type="button"
                onClick={() => setChModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Challenge Template
                </label>
                <select
                  value={chTemplate}
                  onChange={(e) => selectChallengeTemplate(e.target.value as ChallengeTemplateKey)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                >
                  {CHALLENGE_TEMPLATES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.title}
                    </option>
                  ))}
                  <option value="custom">Custom Challenge</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Challenge Title
                </label>
                <input
                  type="text"
                  required
                  value={chTitle}
                  onChange={(e) => setChTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Duration (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={chDays}
                  onChange={(e) => setChDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={chDesc}
                  onChange={(e) => setChDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Invite Friends
                </label>
                {friendList.length === 0 ? (
                  <p className="text-xs text-slate-500">Add friends first to invite them.</p>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {friendList.map((f) => (
                      <label key={f.friendUid} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={chFriends.includes(f.friendUid)}
                          onChange={(e) => {
                            setChFriends((prev) =>
                              e.target.checked
                                ? [...prev, f.friendUid]
                                : prev.filter((id) => id !== f.friendUid)
                            );
                          }}
                        />
                        <span>@{f.username}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setChModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/15 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium cursor-pointer"
                >
                  Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
