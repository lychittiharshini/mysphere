import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { todayStr } from '../../lib/dates';
import type { FocusModeType } from '../../types/mysphere';

const MODE_PRESETS: Record<FocusModeType, number> = {
  focus: 25,
  'short-break': 5,
  'long-break': 15,
  custom: 45,
};

export const FocusModeView: React.FC = () => {
  const { focusSessions, logFocusSession, deleteFocusSession } = useData();
  const { showToast } = useToast();

  const [mode, setMode] = useState<FocusModeType>('focus');
  const [customMinutes, setCustomMinutes] = useState(45);
  const [label, setLabel] = useState('Deep Work Session');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  // Ambient Web Audio soundscape
  const [ambientOn, setAmbientOn] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.25);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const totalSeconds =
    (mode === 'custom' ? customMinutes : MODE_PRESETS[mode]) * 60;

  const stopAmbient = () => {
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      gainNodeRef.current = null;
    }
  };

  const toggleAmbient = () => {
    if (ambientOn) {
      stopAmbient();
      setAmbientOn(false);
      return;
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      // Warm gentle brown-noise rain texture
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.0;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 380;

      const gain = ctx.createGain();
      gain.gain.value = ambientVolume * 0.35;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();

      audioCtxRef.current = ctx;
      gainNodeRef.current = gain;
      setAmbientOn(true);
    } catch {
      showToast('Browser audio unavailable.', 'error');
    }
  };

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = ambientVolume * 0.35;
    }
  }, [ambientVolume]);

  useEffect(() => {
    return () => {
      stopAmbient();
    };
  }, []);

  const playChime = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.4);
    } catch {
      // ignore audio error
    }
  };

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setRunning(false);
          playChime();
          const mins = mode === 'custom' ? customMinutes : MODE_PRESETS[mode];
          void logFocusSession({
            mode,
            durationMinutes: mins,
            label: label.trim() || 'Focus Session',
          }).then(() => {
            showToast(`Logged ${mins}m ${mode} session!`, 'success');
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, mode, customMinutes, label]);

  const switchMode = (nextMode: FocusModeType) => {
    setRunning(false);
    setMode(nextMode);
    const mins = nextMode === 'custom' ? customMinutes : MODE_PRESETS[nextMode];
    setSecondsLeft(mins * 60);
  };

  const resetTimer = () => {
    setRunning(false);
    const mins = mode === 'custom' ? customMinutes : MODE_PRESETS[mode];
    setSecondsLeft(mins * 60);
  };

  const handleLogCompletedNow = async () => {
    const elapsedMins = Math.max(1, Math.round((totalSeconds - secondsLeft) / 60));
    setRunning(false);
    try {
      await logFocusSession({
        mode,
        durationMinutes: elapsedMins,
        label: label.trim() || 'Focus Session',
      });
      showToast(`Saved ${elapsedMins} minutes to your focus history.`, 'success');
      resetTimer();
    } catch {
      showToast('Could not save focus session.', 'error');
    }
  };

  const today = todayStr();
  const todayStats = useMemo(() => {
    const todayItems = focusSessions.filter((s) => s.date === today);
    const focusMinutes = todayItems
      .filter((s) => s.mode === 'focus' || s.mode === 'custom')
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    return { count: todayItems.length, focusMinutes };
  }, [focusSessions, today]);

  const sortedHistory = useMemo(() => {
    return [...focusSessions].sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
  }, [focusSessions]);

  const minsDisplay = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secsDisplay = String(secondsLeft % 60).padStart(2, '0');
  const progressPct = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const radius = 92;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (progressPct / 100) * circ;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
          Focus Mode
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Distraction-free Pomodoro timer with optional ambient soundscape and session logging.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pomodoro Workspace */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-6 sm:p-8 flex flex-col items-center">
          {/* Mode selector */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60">
            {(
              [
                { id: 'focus', label: 'Focus 25m' },
                { id: 'short-break', label: 'Short Break 5m' },
                { id: 'long-break', label: 'Long Break 15m' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => switchMode(m.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  mode === m.id
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'custom' && (
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span>Minutes:</span>
              <input
                type="number"
                min={1}
                max={180}
                value={customMinutes}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(180, Number(e.target.value) || 25));
                  setCustomMinutes(val);
                  if (!running) setSecondsLeft(val * 60);
                }}
                className="w-20 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-center font-mono"
              />
            </div>
          )}

          {/* Circular Countdown */}
          <div className="relative w-56 h-56 my-8 flex items-center justify-center">
            <svg className="w-56 h-56 -rotate-90" viewBox="0 0 216 216">
              <circle
                cx="108"
                cy="108"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-200 dark:text-white/10"
              />
              <circle
                cx="108"
                cy="108"
                r={radius}
                stroke="#8B5CF6"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-4xl sm:text-5xl font-semibold text-slate-950 dark:text-white tabular-nums">
                {minsDisplay}:{secsDisplay}
              </span>
              <span className="mt-1 text-xs text-slate-500 dark:text-slate-400 capitalize">
                {mode.replace('-', ' ')}
              </span>
            </div>
          </div>

          {/* Label */}
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What are you focusing on?"
            className="w-full max-w-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-900/70 text-center text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          {/* Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {running ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetTimer}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            {secondsLeft < totalSeconds && (
              <button
                type="button"
                onClick={() => void handleLogCompletedNow()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-500/10 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish & Log</span>
              </button>
            )}
          </div>

          {/* Ambient Sound Control */}
          <div className="mt-8 pt-5 border-t border-slate-200/70 dark:border-white/10 w-full max-w-sm flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={toggleAmbient}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                ambientOn
                  ? 'border-violet-500/50 bg-violet-500/15 text-violet-700 dark:text-violet-200'
                  : 'border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300'
              }`}
            >
              {ambientOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{ambientOn ? 'Ambient Rain On' : 'Ambient Rain Off'}</span>
            </button>

            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={ambientVolume}
              onChange={(e) => setAmbientVolume(Number(e.target.value))}
              className="w-28 accent-violet-600"
              aria-label="Ambient sound volume"
            />
          </div>
        </div>

        {/* Daily Stats & History */}
        <div className="lg:col-span-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Today's Focus</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
                {todayStats.focusMinutes}m
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Sessions Today</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
                {todayStats.count}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/65 backdrop-blur-xl p-5">
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white mb-4">
              Session History
            </h2>

            {sortedHistory.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                Complete a focus timer to record your first session.
              </p>
            ) : (
              <ul className="divide-y divide-slate-200/70 dark:divide-white/8 max-h-80 overflow-y-auto">
                {sortedHistory.slice(0, 20).map((s) => (
                  <li
                    key={s.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {s.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {s.date} · {s.mode} · {s.durationMinutes}m
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteFocusSession(s.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                      aria-label="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
