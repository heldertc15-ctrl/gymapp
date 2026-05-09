"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Award, CalendarDays, Check, ChevronLeft, ChevronRight, Flame, Gem, Pause, Play, Plus, Rocket, Sparkles, Square, TimerReset, Trophy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { calculateStats, createSession, PRESET_MINUTES, SUBJECTS, type StudySession, type Subject, type TimerMode } from "@/lib/study";
import { formatDuration, formatMinutes, getLocalDateKey } from "@/lib/utils";
import { useStudyStore } from "@/lib/use-study-store";

type TimerStatus = "idle" | "running" | "paused";
type Completion = {
  session: StudySession;
  dailyGoalComplete: boolean;
  streakProtected: boolean;
};
type YearHeatmapDay = {
  dateKey: string;
  day: number;
  month: number;
  weekday: number;
  minutes: number;
  isToday: boolean;
};

export function Dashboard() {
  const { sessions, settings, stats, addSession, hydrated } = useStudyStore();
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [mode, setMode] = useState<TimerMode>("count-up");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [presetMinutes, setPresetMinutes] = useState(30);
  const [customPresetMinutes, setCustomPresetMinutes] = useState(25);
  const [pendingDurationSeconds, setPendingDurationSeconds] = useState<number | null>(null);
  const [showShortSession, setShowShortSession] = useState(false);
  const [showSaveSession, setShowSaveSession] = useState(false);
  const [showManualSession, setShowManualSession] = useState(false);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const elapsedBeforeRunRef = useRef(0);
  const runningStartedAtRef = useRef<number | null>(null);
  const presetCompletedRef = useRef(false);

  const selectedPresetMinutes = presetMinutes === 0 ? customPresetMinutes : presetMinutes;
  const targetSeconds = selectedPresetMinutes * 60;
  const displaySeconds = mode === "preset" ? Math.max(0, targetSeconds - elapsedSeconds) : elapsedSeconds;
  const presetProgress =
    mode === "preset" && targetSeconds > 0 ? Math.min(100, (elapsedSeconds / targetSeconds) * 100) : 0;
  const todayGoalPercent = (stats.todayMinutes / settings.dailyGoalMinutes) * 100;
  const streakProtected = stats.todayMinutes >= settings.minimumStreakMinutes;

  function startTimer() {
    setCompletion(null);
    elapsedBeforeRunRef.current = elapsedSeconds;
    runningStartedAtRef.current = Date.now();
    presetCompletedRef.current = false;
    setStatus("running");
  }

  function pauseTimer() {
    if (status === "running") {
      const currentElapsedSeconds = getClockElapsedSeconds();
      elapsedBeforeRunRef.current = currentElapsedSeconds;
      runningStartedAtRef.current = null;
      setElapsedSeconds(currentElapsedSeconds);
      setStatus("paused");
    }
  }

  function stopTimer() {
    const currentElapsedSeconds = status === "running" ? getClockElapsedSeconds() : elapsedSeconds;

    if (status === "idle" || currentElapsedSeconds <= 0) {
      return;
    }

    elapsedBeforeRunRef.current = currentElapsedSeconds;
    runningStartedAtRef.current = null;
    setElapsedSeconds(currentElapsedSeconds);
    setStatus("paused");
    setPendingDurationSeconds(currentElapsedSeconds);

    if (currentElapsedSeconds < 60) {
      setShowShortSession(true);
      return;
    }

    setShowSaveSession(true);
  }

  function completePresetSession() {
    const completedAt =
      runningStartedAtRef.current === null
        ? new Date()
        : new Date(
            runningStartedAtRef.current +
              Math.max(0, targetSeconds - elapsedBeforeRunRef.current) * 1000,
          );
    const session = createSession({
      durationSeconds: targetSeconds,
      subject: settings.defaultSubject,
      mode: "preset",
      now: completedAt,
    });
    const nextSessions = [session, ...sessions];
    const nextStats = calculateStats(nextSessions, settings);

    addSession(session);
    resetTimer();
    setCompletion({
      session,
      dailyGoalComplete: nextStats.todayMinutes >= settings.dailyGoalMinutes,
      streakProtected: nextStats.todayMinutes >= settings.minimumStreakMinutes,
    });
  }

  function savePendingSession(subject: Subject) {
    if (!pendingDurationSeconds) {
      return;
    }

    const session = createSession({
      durationSeconds: pendingDurationSeconds,
      subject,
      mode,
    });
    const nextSessions = [session, ...sessions];
    const nextStats = calculateStats(nextSessions, settings);

    addSession(session);
    setShowSaveSession(false);
    setShowShortSession(false);
    setCompletion({
      session,
      dailyGoalComplete: nextStats.todayMinutes >= settings.dailyGoalMinutes,
      streakProtected: nextStats.todayMinutes >= settings.minimumStreakMinutes,
    });
    resetTimer();
  }

  function saveManualSession(input: { durationMinutes: number; subject: Subject; completedAt: Date }) {
    const session = createSession({
      durationSeconds: input.durationMinutes * 60,
      subject: input.subject,
      mode: "manual",
      now: input.completedAt,
    });
    const nextSessions = [session, ...sessions];
    const nextStats = calculateStats(nextSessions, settings);

    addSession(session);
    setShowManualSession(false);
    setCompletion({
      session,
      dailyGoalComplete: nextStats.todayMinutes >= settings.dailyGoalMinutes,
      streakProtected: nextStats.todayMinutes >= settings.minimumStreakMinutes,
    });
  }

  function discardPendingSession() {
    setShowShortSession(false);
    setShowSaveSession(false);
    setPendingDurationSeconds(null);
    resetTimer();
  }

  function resetTimer() {
    setStatus("idle");
    setElapsedSeconds(0);
    setPendingDurationSeconds(null);
    elapsedBeforeRunRef.current = 0;
    runningStartedAtRef.current = null;
    presetCompletedRef.current = false;
  }

  function getClockElapsedSeconds() {
    if (runningStartedAtRef.current === null) {
      return elapsedBeforeRunRef.current;
    }

    return elapsedBeforeRunRef.current + Math.floor((Date.now() - runningStartedAtRef.current) / 1000);
  }

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    function syncElapsedSeconds() {
      const next = getClockElapsedSeconds();

      if (mode === "preset" && targetSeconds > 0 && next >= targetSeconds) {
        setElapsedSeconds(targetSeconds);

        if (!presetCompletedRef.current) {
          presetCompletedRef.current = true;
          window.setTimeout(() => completePresetSession(), 0);
        }

        return;
      }

      setElapsedSeconds(next);
    }

    syncElapsedSeconds();

    const interval = window.setInterval(syncElapsedSeconds, 1000);
    window.addEventListener("focus", syncElapsedSeconds);
    document.addEventListener("visibilitychange", syncElapsedSeconds);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncElapsedSeconds);
      document.removeEventListener("visibilitychange", syncElapsedSeconds);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mode, targetSeconds]);

  return (
    <div className="space-y-6">
      <LevelQuestCard
        focusScore={stats.focusScore}
        todayMinutes={stats.todayMinutes}
        dailyGoalMinutes={settings.dailyGoalMinutes}
        currentStreak={stats.currentStreak}
        totalSessions={stats.totalSessions}
        mostStudiedSubject={stats.mostStudiedSubject}
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <MainTimerCard
          status={status}
          mode={mode}
          displaySeconds={displaySeconds}
          elapsedSeconds={elapsedSeconds}
          presetProgress={presetProgress}
          selectedPresetMinutes={selectedPresetMinutes}
          onStart={startTimer}
          onPause={pauseTimer}
          onStop={stopTimer}
          canStop={status !== "idle" && elapsedSeconds > 0}
        />
        <div className="grid gap-6">
          <TodayProgressCard
            todayMinutes={stats.todayMinutes}
            dailyGoalMinutes={settings.dailyGoalMinutes}
            todayGoalPercent={todayGoalPercent}
          />
          <StreakCard
            currentStreak={stats.currentStreak}
            longestStreak={stats.longestStreak}
            protectedToday={streakProtected}
            minimumStreakMinutes={settings.minimumStreakMinutes}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <PresetTimerCard
          mode={mode}
          status={status}
          presetMinutes={presetMinutes}
          customPresetMinutes={customPresetMinutes}
          onModeChange={setMode}
          onPresetChange={setPresetMinutes}
          onCustomPresetChange={setCustomPresetMinutes}
        />
        <TotalStatsCard
          totalHours={stats.totalHours}
          totalSessions={stats.totalSessions}
          averageSessionLength={stats.averageSessionLength}
          focusScore={stats.focusScore}
          onAddManualSession={() => setShowManualSession(true)}
        />
      </section>

      <WeeklyOverviewCard
        weeklyMinutes={stats.weeklyMinutes}
        thisWeekTotal={stats.thisWeekTotal}
        lastWeekTotal={stats.lastWeekTotal}
      />

      <YearHeatmapCard sessions={sessions} />

      <ShortSessionModal
        open={showShortSession}
        durationSeconds={pendingDurationSeconds ?? 0}
        onSaveAnyway={() => {
          setShowShortSession(false);
          setShowSaveSession(true);
        }}
        onDiscard={discardPendingSession}
      />
      <SaveSessionModal
        key={showSaveSession ? `open-${settings.defaultSubject}` : "closed"}
        open={showSaveSession}
        defaultSubject={settings.defaultSubject}
        durationSeconds={pendingDurationSeconds ?? 0}
        onSave={savePendingSession}
        onDiscard={discardPendingSession}
      />
      <ManualSessionModal
        key={showManualSession ? `manual-${settings.defaultSubject}` : "manual-closed"}
        open={showManualSession}
        defaultSubject={settings.defaultSubject}
        onSave={saveManualSession}
        onCancel={() => setShowManualSession(false)}
      />
      <CompletionModal
        completion={completion}
        onClose={() => setCompletion(null)}
      />

      {!hydrated ? (
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">Loading saved study data...</p>
      ) : null}
    </div>
  );
}

function LevelQuestCard({
  focusScore,
  todayMinutes,
  dailyGoalMinutes,
  currentStreak,
  totalSessions,
  mostStudiedSubject,
}: {
  focusScore: number;
  todayMinutes: number;
  dailyGoalMinutes: number;
  currentStreak: number;
  totalSessions: number;
  mostStudiedSubject: string;
}) {
  const xpPerLevel = 250;
  const level = Math.floor(focusScore / xpPerLevel) + 1;
  const levelXp = focusScore % xpPerLevel;
  const nextLevelXp = xpPerLevel - levelXp;
  const questPercent = Math.min(100, (todayMinutes / dailyGoalMinutes) * 100);
  const questComplete = todayMinutes >= dailyGoalMinutes;

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden border-zinc-950 bg-[#111827] text-white shadow-[0_12px_0_rgba(17,24,39,0.18)] dark:border-white">
        <div className="grid gap-5 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-white bg-lime-300 text-zinc-950 shadow-[0_6px_0_rgba(0,0,0,0.35)]">
            <div className="text-center">
              <div className="text-xs font-black uppercase">Level</div>
              <div className="text-4xl font-black leading-none">{level}</div>
            </div>
          </div>
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-cyan-200 bg-cyan-200 text-cyan-950">
                <Zap className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {focusScore.toLocaleString()} XP
              </Badge>
              <Badge className="border-pink-200 bg-pink-200 text-pink-950">
                <Flame className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {currentStreak} day combo
              </Badge>
              <Badge className="border-amber-200 bg-amber-200 text-amber-950">
                <Trophy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {totalSessions} clears
              </Badge>
            </div>
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-black tracking-normal sm:text-3xl">Daily Quest Board</h1>
                  <p className="mt-1 text-sm font-semibold text-white/70">
                    {questComplete ? "Quest cleared. Bank the win." : `${formatMinutes(dailyGoalMinutes - todayMinutes)} to clear today's quest.`}
                  </p>
                </div>
                <div className="whitespace-nowrap text-right text-sm font-black text-lime-200">
                  {nextLevelXp} XP to L{level + 1}
                </div>
              </div>
              <Progress value={(levelXp / xpPerLevel) * 100} className="mt-4 h-4 bg-white/15" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-amber-300 bg-amber-100 shadow-[0_10px_0_rgba(217,119,6,0.18)] dark:border-amber-300 dark:bg-amber-950">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-amber-900 bg-white text-amber-600 shadow-[0_4px_0_rgba(120,53,15,0.25)]">
              <Award className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="text-sm font-black text-amber-950 dark:text-amber-100">Today&apos;s Reward</div>
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                {questComplete ? "Daily goal bonus unlocked" : "Fill the bar for the bonus"}
              </div>
            </div>
          </div>
          <Progress value={questPercent} className="h-4 bg-amber-200 dark:bg-amber-900" />
          <div className="grid grid-cols-2 gap-3">
            <MiniReward label="Top skill" value={mostStudiedSubject} />
            <MiniReward label="Quest" value={`${Math.min(100, Math.round(questPercent))}%`} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function MainTimerCard({
  status,
  mode,
  displaySeconds,
  elapsedSeconds,
  presetProgress,
  selectedPresetMinutes,
  onStart,
  onPause,
  onStop,
  canStop,
}: {
  status: TimerStatus;
  mode: TimerMode;
  displaySeconds: number;
  elapsedSeconds: number;
  presetProgress: number;
  selectedPresetMinutes: number;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  canStop: boolean;
}) {
  const statusText = status === "running" ? "Studying" : status === "paused" ? "Paused" : "Ready";

  return (
    <Card className="overflow-hidden border-cyan-300 shadow-[0_10px_0_rgba(8,145,178,0.16)]">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Main Timer</CardTitle>
            <CardDescription>
              {mode === "preset" ? `${selectedPresetMinutes} minute preset` : "Count-up mode"}
            </CardDescription>
          </div>
          <Badge className={status === "running" ? "border-lime-300 bg-lime-200 text-lime-950" : "border-cyan-200 bg-cyan-100 text-cyan-950"}>
            {status === "running" ? <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> : null}
            {statusText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-7 pt-7">
        <div className="rounded-lg border-2 border-zinc-950 bg-gradient-to-br from-cyan-200 via-white to-lime-200 px-4 py-8 text-center shadow-[0_8px_0_rgba(8,47,73,0.18)] dark:from-cyan-950 dark:via-zinc-950 dark:to-lime-950">
          <div className="font-mono text-5xl font-black tracking-normal text-zinc-950 dark:text-zinc-50 sm:text-7xl">
            {formatDuration(displaySeconds)}
          </div>
          <p className="mt-3 text-sm font-bold text-zinc-600 dark:text-zinc-300">
            {mode === "preset"
              ? `${formatMinutes(elapsedSeconds / 60)} studied in this preset`
              : "Start the run. Stack the XP."}
          </p>
          {mode === "preset" ? <Progress value={presetProgress} className="mt-5" /> : null}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Button size="lg" onClick={onStart} disabled={status === "running"}>
            {status === "paused" ? <Rocket className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            {status === "paused" ? "Resume" : "Start"}
          </Button>
          <Button size="lg" variant="secondary" onClick={onPause} disabled={status !== "running"}>
            <Pause className="h-4 w-4" aria-hidden="true" />
            Pause
          </Button>
          <Button size="lg" variant="secondary" onClick={onStop} disabled={!canStop}>
            <Square className="h-4 w-4" aria-hidden="true" />
            Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PresetTimerCard({
  mode,
  status,
  presetMinutes,
  customPresetMinutes,
  onModeChange,
  onPresetChange,
  onCustomPresetChange,
}: {
  mode: TimerMode;
  status: TimerStatus;
  presetMinutes: number;
  customPresetMinutes: number;
  onModeChange: (mode: TimerMode) => void;
  onPresetChange: (minutes: number) => void;
  onCustomPresetChange: (minutes: number) => void;
}) {
  const disabled = status !== "idle";

  return (
    <Card className="border-violet-300 shadow-[0_10px_0_rgba(124,58,237,0.14)]">
      <CardHeader>
        <CardTitle>Preset Timer</CardTitle>
        <CardDescription>Choose a quest length before the run starts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "count-up" ? "default" : "secondary"}
            onClick={() => onModeChange("count-up")}
            disabled={disabled}
          >
            Count up
          </Button>
          <Button
            type="button"
            variant={mode === "preset" ? "default" : "secondary"}
            onClick={() => onModeChange("preset")}
            disabled={disabled}
          >
            <TimerReset className="h-4 w-4" aria-hidden="true" />
            Quest
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_MINUTES.map((minutes) => (
            <Button
              key={minutes}
              type="button"
              variant={mode === "preset" && presetMinutes === minutes ? "default" : "secondary"}
              onClick={() => {
                onModeChange("preset");
                onPresetChange(minutes);
              }}
              disabled={disabled}
            >
              {minutes}m
            </Button>
          ))}
          <Button
            type="button"
            variant={mode === "preset" && presetMinutes === 0 ? "default" : "secondary"}
            onClick={() => {
              onModeChange("preset");
              onPresetChange(0);
            }}
            disabled={disabled}
          >
            Custom
          </Button>
        </div>
        {presetMinutes === 0 ? (
          <div className="space-y-2">
            <Label htmlFor="custom-preset">Custom minutes</Label>
            <Input
              id="custom-preset"
              type="number"
              min={1}
              max={240}
              value={customPresetMinutes}
              disabled={disabled}
              onChange={(event) => onCustomPresetChange(Number(event.target.value))}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TodayProgressCard({
  todayMinutes,
  dailyGoalMinutes,
  todayGoalPercent,
}: {
  todayMinutes: number;
  dailyGoalMinutes: number;
  todayGoalPercent: number;
}) {
  const remaining = Math.max(0, dailyGoalMinutes - todayMinutes);

  return (
    <Card className="border-emerald-300 shadow-[0_10px_0_rgba(5,150,105,0.16)]">
      <CardHeader>
        <CardTitle>Today&apos;s Progress</CardTitle>
        <CardDescription>{remaining > 0 ? `${formatMinutes(remaining)} until reward` : "Reward unlocked"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-3xl font-black text-zinc-950 dark:text-zinc-50">
            {Math.round(todayMinutes)} <span className="text-base font-medium text-zinc-500">min</span>
          </div>
          <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Daily goal: {dailyGoalMinutes} minutes
          </p>
        </div>
        <Progress value={todayGoalPercent} className="h-4" />
      </CardContent>
    </Card>
  );
}

function StreakCard({
  currentStreak,
  longestStreak,
  protectedToday,
  minimumStreakMinutes,
}: {
  currentStreak: number;
  longestStreak: number;
  protectedToday: boolean;
  minimumStreakMinutes: number;
}) {
  return (
    <Card className="border-pink-300 shadow-[0_10px_0_rgba(219,39,119,0.14)]">
      <CardHeader>
        <CardTitle>Streak</CardTitle>
        <CardDescription>
          {protectedToday ? "Combo protected today." : `${minimumStreakMinutes} minutes protects the combo.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Current" value={`${currentStreak}d`} icon={<Flame className="h-4 w-4" aria-hidden="true" />} className="bg-pink-50" />
          <Metric label="Longest" value={`${longestStreak}d`} icon={<Trophy className="h-4 w-4" aria-hidden="true" />} className="bg-amber-50" />
        </div>
      </CardContent>
    </Card>
  );
}

function TotalStatsCard({
  totalHours,
  totalSessions,
  averageSessionLength,
  focusScore,
  onAddManualSession,
}: {
  totalHours: number;
  totalSessions: number;
  averageSessionLength: number;
  focusScore: number;
  onAddManualSession: () => void;
}) {
  return (
    <Card className="border-lime-300 shadow-[0_10px_0_rgba(101,163,13,0.14)]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle>Total Stats</CardTitle>
            <CardDescription>Clean signal from completed sessions.</CardDescription>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={onAddManualSession}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add session
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <Metric label="Total hours" value={totalHours.toFixed(totalHours >= 10 ? 0 : 1)} icon={<Zap className="h-4 w-4" aria-hidden="true" />} className="bg-cyan-50" />
          <Metric label="Sessions" value={totalSessions.toString()} icon={<Trophy className="h-4 w-4" aria-hidden="true" />} className="bg-amber-50" />
          <Metric label="Avg session" value={formatMinutes(averageSessionLength)} icon={<TimerReset className="h-4 w-4" aria-hidden="true" />} className="bg-emerald-50" />
          <Metric label="Focus Score" value={focusScore.toLocaleString()} icon={<Gem className="h-4 w-4" aria-hidden="true" />} className="bg-pink-50" />
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyOverviewCard({
  weeklyMinutes,
  thisWeekTotal,
  lastWeekTotal,
}: Pick<ReturnType<typeof calculateStats>, "weeklyMinutes" | "thisWeekTotal" | "lastWeekTotal">) {
  const maxMinutes = Math.max(30, ...weeklyMinutes.map((day) => day.minutes));
  const ahead = thisWeekTotal >= lastWeekTotal;

  return (
    <Card className="border-sky-300 shadow-[0_10px_0_rgba(14,165,233,0.14)]">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Weekly XP Map</CardTitle>
            <CardDescription>{ahead ? "Ahead of last week." : "Clear today first."}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge className="border-cyan-200 bg-cyan-100 text-cyan-950">This week {Math.round(thisWeekTotal)}m</Badge>
            <Badge className="border-zinc-200 bg-white text-zinc-700">Last week {Math.round(lastWeekTotal)}m</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid h-52 grid-cols-7 items-end gap-2 sm:gap-4">
          {weeklyMinutes.map((day) => (
            <div key={day.dateKey} className="flex h-full flex-col justify-end gap-2">
              <div className="flex flex-1 items-end rounded-lg border-2 border-zinc-950/10 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
                <div
                  className="w-full rounded-md bg-gradient-to-t from-cyan-400 via-lime-300 to-amber-300 transition-all dark:from-cyan-300 dark:via-lime-200 dark:to-amber-200"
                  style={{ height: `${Math.max(4, (day.minutes / maxMinutes) * 100)}%` }}
                  title={`${Math.round(day.minutes)} minutes`}
                />
              </div>
              <div className="text-center">
                <div className="text-xs font-black text-zinc-700 dark:text-zinc-300">{day.label}</div>
                <div className="text-xs font-bold text-zinc-400">{Math.round(day.minutes)}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function YearHeatmapCard({ sessions }: { sessions: StudySession[] }) {
  const [visibleYear, setVisibleYear] = useState(() => startOfYear(new Date()));
  const yearDays = useMemo(() => buildYearHeatmapDays(visibleYear, sessions), [visibleYear, sessions]);
  const yearTotal = yearDays.reduce((sum, day) => sum + day.minutes, 0);
  const activeDays = yearDays.filter((day) => day.minutes > 0).length;
  const maxMinutes = Math.max(0, ...yearDays.map((day) => day.minutes));
  const hottestDay = yearDays.reduce<YearHeatmapDay | null>(
    (best, day) => (day.minutes > (best?.minutes ?? 0) ? day : best),
    null,
  );
  const leadingBlankDays = yearDays[0]?.weekday ?? 0;
  const yearLabel = visibleYear.getFullYear().toString();

  return (
    <Card className="border-emerald-300 shadow-[0_10px_0_rgba(5,150,105,0.14)]">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Year Heatmap</CardTitle>
            <CardDescription>Every day this year. Deeper emerald means more minutes.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setVisibleYear((year) => addYears(year, -1))}
              aria-label="Previous year"
              title="Previous year"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Badge className="h-10 min-w-28 justify-center border-emerald-200 bg-emerald-100 text-emerald-950">
              <CalendarDays className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {yearLabel}
            </Badge>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setVisibleYear((year) => addYears(year, 1))}
              aria-label="Next year"
              title="Next year"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Year minutes" value={formatMinutes(yearTotal)} icon={<Zap className="h-4 w-4" aria-hidden="true" />} className="bg-emerald-50" />
          <Metric label="Active days" value={activeDays.toString()} icon={<Flame className="h-4 w-4" aria-hidden="true" />} className="bg-emerald-50" />
          <Metric
            label="Hottest day"
            value={hottestDay && hottestDay.minutes > 0 ? `${MONTH_SHORT_LABELS[hottestDay.month]} ${hottestDay.day}` : "None"}
            icon={<Trophy className="h-4 w-4" aria-hidden="true" />}
            className="bg-emerald-50"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border-2 border-zinc-950/10 bg-white p-3 shadow-[0_5px_0_rgba(24,24,27,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex min-w-max gap-2">
            <div className="grid grid-rows-7 gap-1 pt-0.5 text-[10px] font-black uppercase text-zinc-400">
              {SHORT_WEEKDAY_LABELS.map((label, index) => (
                <div key={`${label}-${index}`} className="flex h-3.5 w-3.5 items-center justify-center">
                  {index % 2 === 0 ? label : ""}
                </div>
              ))}
            </div>
            <div className="grid grid-flow-col grid-rows-7 gap-1">
              {Array.from({ length: leadingBlankDays }, (_, index) => (
                <div key={`blank-${index}`} className="h-3.5 w-3.5 rounded-[3px]" aria-hidden="true" />
              ))}
              {yearDays.map((day) => (
                <div
                  key={day.dateKey}
                  className={`h-3.5 w-3.5 rounded-[3px] border transition hover:scale-125 ${getHeatmapClass(day.minutes, maxMinutes)} ${
                    day.isToday ? "ring-2 ring-zinc-950 ring-offset-1 dark:ring-white dark:ring-offset-zinc-950" : ""
                  }`}
                  title={`${MONTH_LABELS[day.month]} ${day.day}, ${yearLabel}: ${formatMinutes(day.minutes)}`}
                  aria-label={`${MONTH_LABELS[day.month]} ${day.day}, ${yearLabel}: ${formatMinutes(day.minutes)}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 text-xs font-black uppercase text-zinc-500 dark:text-zinc-400">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className={`h-3.5 w-3.5 rounded-[3px] border ${HEATMAP_LEGEND_CLASSES[level]}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border-2 border-zinc-950/10 p-4 shadow-[0_4px_0_rgba(24,24,27,0.08)] dark:border-zinc-800 dark:bg-zinc-900/70 ${className ?? "bg-zinc-50"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-2xl font-black text-zinc-950 dark:text-zinc-50">{value}</div>
        {icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-zinc-950/10 bg-white text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-xs font-black uppercase tracking-normal text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
    </div>
  );
}

function MiniReward({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border-2 border-amber-900/10 bg-white p-3 shadow-[0_3px_0_rgba(120,53,15,0.12)] dark:bg-zinc-950">
      <div className="truncate text-sm font-black text-zinc-950 dark:text-zinc-50">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase text-amber-700 dark:text-amber-200">{label}</div>
    </div>
  );
}

function ShortSessionModal({
  open,
  durationSeconds,
  onSaveAnyway,
  onDiscard,
}: {
  open: boolean;
  durationSeconds: number;
  onSaveAnyway: () => void;
  onDiscard: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Short session"
      description="This session is under one minute. Save it anyway, or discard it and keep the record clean."
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          Duration: <span className="font-medium text-zinc-950 dark:text-zinc-50">{formatDuration(durationSeconds)}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onDiscard}>
            Discard
          </Button>
          <Button onClick={onSaveAnyway}>Save anyway</Button>
        </div>
      </div>
    </Modal>
  );
}

function SaveSessionModal({
  open,
  defaultSubject,
  durationSeconds,
  onSave,
  onDiscard,
}: {
  open: boolean;
  defaultSubject: Subject;
  durationSeconds: number;
  onSave: (subject: Subject) => void;
  onDiscard: () => void;
}) {
  const [subject, setSubject] = useState(defaultSubject);
  const [customSubject, setCustomSubject] = useState("");

  const selectedSubject = subject === "Other" && customSubject.trim() ? customSubject.trim() : subject;

  return (
    <Modal open={open} title="Save study session" description="Choose a subject. You can keep the default and save immediately.">
      <div className="space-y-5">
        <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          Duration: <span className="font-medium text-zinc-950 dark:text-zinc-50">{formatDuration(durationSeconds)}</span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="session-subject">Subject</Label>
          <Select id="session-subject" value={subject} onChange={(event) => setSubject(event.target.value)}>
            {SUBJECTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
        {subject === "Other" ? (
          <div className="space-y-2">
            <Label htmlFor="custom-subject">Custom tag</Label>
            <Input
              id="custom-subject"
              value={customSubject}
              onChange={(event) => setCustomSubject(event.target.value)}
              placeholder="Optional"
            />
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onDiscard}>
            Discard
          </Button>
          <Button onClick={() => onSave(selectedSubject)}>Save session</Button>
        </div>
      </div>
    </Modal>
  );
}

function ManualSessionModal({
  open,
  defaultSubject,
  onSave,
  onCancel,
}: {
  open: boolean;
  defaultSubject: Subject;
  onSave: (input: { durationMinutes: number; subject: Subject; completedAt: Date }) => void;
  onCancel: () => void;
}) {
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [completedAt, setCompletedAt] = useState(() => formatDateTimeLocalValue(new Date()));
  const [subject, setSubject] = useState(defaultSubject);
  const [customSubject, setCustomSubject] = useState("");

  const numericDuration = Number(durationMinutes);
  const selectedSubject = subject === "Other" && customSubject.trim() ? customSubject.trim() : subject;
  const completedDate = new Date(completedAt);
  const canSave =
    numericDuration > 0 &&
    numericDuration <= 600 &&
    Number.isFinite(numericDuration) &&
    selectedSubject.trim().length > 0 &&
    !Number.isNaN(completedDate.getTime());

  return (
    <Modal open={open} title="Add study session" description="Manually log a session you already completed.">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="manual-duration">Duration minutes</Label>
            <Input
              id="manual-duration"
              type="number"
              min={1}
              max={600}
              step={1}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-completed-at">Completed at</Label>
            <Input
              id="manual-completed-at"
              type="datetime-local"
              value={completedAt}
              onChange={(event) => setCompletedAt(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="manual-subject">Subject</Label>
          <Select id="manual-subject" value={subject} onChange={(event) => setSubject(event.target.value)}>
            {SUBJECTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
        {subject === "Other" ? (
          <div className="space-y-2">
            <Label htmlFor="manual-custom-subject">Custom tag</Label>
            <Input
              id="manual-custom-subject"
              value={customSubject}
              onChange={(event) => setCustomSubject(event.target.value)}
              placeholder="Optional"
            />
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                durationMinutes: numericDuration,
                subject: selectedSubject,
                completedAt: completedDate,
              })
            }
            disabled={!canSave}
          >
            Save session
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CompletionModal({
  completion,
  onClose,
}: {
  completion: Completion | null;
  onClose: () => void;
}) {
  const messages = useMemo(() => {
    if (!completion) {
      return [];
    }

    return [
      "You showed up. That's the win.",
      completion.streakProtected ? "Chain protected." : null,
      completion.dailyGoalComplete ? "Daily goal complete." : null,
    ].filter(Boolean) as string[];
  }, [completion]);

  return (
    <Modal open={Boolean(completion)} title="Session complete">
      {completion ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Duration" value={formatMinutes(completion.session.durationMinutes)} />
            <Metric label="Subject" value={completion.session.subject} />
          </div>
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message}
                className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <Check className="h-4 w-4 text-zinc-950 dark:text-zinc-50" aria-hidden="true" />
                {message}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function formatDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const SHORT_WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const MONTH_SHORT_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const HEATMAP_LEGEND_CLASSES = [
  "border-zinc-950/10 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800",
  "border-emerald-200 bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950",
  "border-emerald-300 bg-emerald-300 dark:border-emerald-700 dark:bg-emerald-800",
  "border-emerald-500 bg-emerald-500 dark:border-emerald-500 dark:bg-emerald-600",
  "border-emerald-700 bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-400",
] as const;

function buildYearHeatmapDays(yearStart: Date, sessions: StudySession[]): YearHeatmapDay[] {
  const year = yearStart.getFullYear();
  const daysInYear = getDaysInYear(year);
  const todayKey = getLocalDateKey(new Date());
  const minutesByDate = new Map<string, number>();

  sessions.forEach((session) => {
    minutesByDate.set(session.date, (minutesByDate.get(session.date) ?? 0) + session.durationMinutes);
  });

  return Array.from({ length: daysInYear }, (_, index) => {
    const date = new Date(year, 0, index + 1);
    const dateKey = getLocalDateKey(date);

    return {
      dateKey,
      day: date.getDate(),
      month: date.getMonth(),
      weekday: date.getDay(),
      minutes: minutesByDate.get(dateKey) ?? 0,
      isToday: dateKey === todayKey,
    };
  });
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function addYears(date: Date, years: number) {
  return new Date(date.getFullYear() + years, 0, 1);
}

function getDaysInYear(year: number) {
  return new Date(year, 11, 31).getDate() === 31 && new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}

function getHeatmapClass(minutes: number, maxMinutes: number) {
  if (minutes <= 0 || maxMinutes <= 0) {
    return "border-zinc-950/10 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800";
  }

  const heat = minutes / maxMinutes;

  if (heat < 0.25) {
    return "border-emerald-200 bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950";
  }

  if (heat < 0.5) {
    return "border-emerald-300 bg-emerald-300 dark:border-emerald-700 dark:bg-emerald-800";
  }

  if (heat < 0.75) {
    return "border-emerald-500 bg-emerald-500 dark:border-emerald-500 dark:bg-emerald-600";
  }

  return "border-emerald-700 bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-400";
}
