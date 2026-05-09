import { getLocalDateKey, startOfLocalDay } from "@/lib/utils";

export const SUBJECTS = ["Six Sigma", "Coding", "Reading", "Work Skills", "Other"] as const;
export const PRESET_MINUTES = [10, 20, 30, 45, 60] as const;

export type Subject = (typeof SUBJECTS)[number] | string;
export type TimerMode = "count-up" | "preset";
export type SessionMode = TimerMode | "manual";
export type Theme = "light" | "dark";

export type StudySession = {
  id: string;
  date: string;
  durationMinutes: number;
  subject: Subject;
  mode: SessionMode;
  completedAt: string;
  createdAt: string;
};

export type Settings = {
  dailyGoalMinutes: number;
  minimumStreakMinutes: number;
  defaultSubject: Subject;
  theme: Theme;
};

export type DayMinutes = {
  dateKey: string;
  label: string;
  minutes: number;
};

export type StudyStats = {
  todayMinutes: number;
  currentStreak: number;
  longestStreak: number;
  totalHours: number;
  totalSessions: number;
  averageSessionLength: number;
  weeklyMinutes: DayMinutes[];
  thisWeekTotal: number;
  lastWeekTotal: number;
  focusScore: number;
  mostStudiedSubject: string;
};

export const DEFAULT_SETTINGS: Settings = {
  dailyGoalMinutes: 30,
  minimumStreakMinutes: 10,
  defaultSubject: "Six Sigma",
  theme: "light",
};

export const STORAGE_KEYS = {
  sessions: "studytracker:sessions",
  settings: "studytracker:settings",
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function createSession(input: {
  durationSeconds: number;
  subject: Subject;
  mode: SessionMode;
  now?: Date;
}): StudySession {
  const now = input.now ?? new Date();

  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: getLocalDateKey(now),
    durationMinutes: Number((input.durationSeconds / 60).toFixed(2)),
    subject: input.subject,
    mode: input.mode,
    completedAt: now.toISOString(),
    createdAt: now.toISOString(),
  };
}

export function sanitizeSettings(settings: Partial<Settings> | null | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    dailyGoalMinutes: clampNumber(settings?.dailyGoalMinutes, 1, 600, DEFAULT_SETTINGS.dailyGoalMinutes),
    minimumStreakMinutes: clampNumber(
      settings?.minimumStreakMinutes,
      1,
      600,
      DEFAULT_SETTINGS.minimumStreakMinutes,
    ),
    defaultSubject: settings?.defaultSubject || DEFAULT_SETTINGS.defaultSubject,
    theme: settings?.theme === "dark" ? "dark" : "light",
  };
}

export function calculateStats(
  sessions: StudySession[],
  settings: Settings,
  now = new Date(),
): StudyStats {
  const todayKey = getLocalDateKey(now);
  const minutesByDate = new Map<string, number>();
  const subjectTotals = new Map<string, number>();

  sessions.forEach((session) => {
    minutesByDate.set(session.date, (minutesByDate.get(session.date) ?? 0) + session.durationMinutes);
    subjectTotals.set(
      session.subject,
      (subjectTotals.get(session.subject) ?? 0) + session.durationMinutes,
    );
  });

  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const totalSessions = sessions.length;
  const todayMinutes = minutesByDate.get(todayKey) ?? 0;
  const weeklyMinutes = buildWeek(now).map((day) => ({
    ...day,
    minutes: minutesByDate.get(day.dateKey) ?? 0,
  }));
  const thisWeekTotal = weeklyMinutes.reduce((sum, day) => sum + day.minutes, 0);
  const lastWeekTotal = buildWeek(addDays(now, -7)).reduce(
    (sum, day) => sum + (minutesByDate.get(day.dateKey) ?? 0),
    0,
  );
  const dailyGoalDays = Array.from(minutesByDate.values()).filter(
    (minutes) => minutes >= settings.dailyGoalMinutes,
  ).length;

  return {
    todayMinutes,
    currentStreak: calculateCurrentStreak(minutesByDate, settings.minimumStreakMinutes, now),
    longestStreak: calculateLongestStreak(minutesByDate, settings.minimumStreakMinutes),
    totalHours: totalMinutes / 60,
    totalSessions,
    averageSessionLength: totalSessions === 0 ? 0 : totalMinutes / totalSessions,
    weeklyMinutes,
    thisWeekTotal,
    lastWeekTotal,
    focusScore: Math.round(totalMinutes) + totalSessions * 10 + dailyGoalDays * 25,
    mostStudiedSubject: getMostStudiedSubject(subjectTotals),
  };
}

function calculateCurrentStreak(
  minutesByDate: Map<string, number>,
  minimumStreakMinutes: number,
  now: Date,
) {
  let streak = 0;
  let cursor = startOfLocalDay(now);
  const todayProtected = (minutesByDate.get(getLocalDateKey(cursor)) ?? 0) >= minimumStreakMinutes;

  if (!todayProtected) {
    cursor = addDays(cursor, -1);
  }

  while ((minutesByDate.get(getLocalDateKey(cursor)) ?? 0) >= minimumStreakMinutes) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function calculateLongestStreak(minutesByDate: Map<string, number>, minimumStreakMinutes: number) {
  const protectedDays = Array.from(minutesByDate.entries())
    .filter(([, minutes]) => minutes >= minimumStreakMinutes)
    .map(([dateKey]) => dateKey)
    .sort();

  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  protectedDays.forEach((dateKey) => {
    const currentDate = parseLocalDateKey(dateKey);
    const isConsecutive = previous
      ? getLocalDateKey(addDays(previous, 1)) === getLocalDateKey(currentDate)
      : false;

    current = isConsecutive ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = currentDate;
  });

  return longest;
}

function buildWeek(date: Date): Omit<DayMinutes, "minutes">[] {
  const current = startOfLocalDay(date);
  const mondayOffset = (current.getDay() + 6) % 7;
  const monday = addDays(current, -mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(monday, index);
    return {
      dateKey: getLocalDateKey(day),
      label: WEEKDAY_LABELS[day.getDay()],
    };
  });
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseLocalDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function getMostStudiedSubject(subjectTotals: Map<string, number>) {
  let bestSubject = "None yet";
  let bestMinutes = 0;

  subjectTotals.forEach((minutes, subject) => {
    if (minutes > bestMinutes) {
      bestSubject = subject;
      bestMinutes = minutes;
    }
  });

  return bestSubject;
}
