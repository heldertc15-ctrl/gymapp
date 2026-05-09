"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import {
  calculateStats,
  DEFAULT_SETTINGS,
  sanitizeSettings,
  type Settings,
  type StudySession,
} from "@/lib/study";
import { STORAGE_KEYS } from "@/lib/study";

export function useStudyStore() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSessions(readSessions());
    setSettings(readSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  }, [hydrated, sessions]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const cleanSettings = sanitizeSettings(settings);
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(cleanSettings));
    document.documentElement.classList.toggle("dark", cleanSettings.theme === "dark");
  }, [hydrated, settings]);

  const stats = useMemo(() => calculateStats(sessions, settings), [sessions, settings]);

  function addSession(session: StudySession) {
    setSessions((current) =>
      [session, ...current].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      ),
    );
  }

  function deleteSession(id: string) {
    setSessions((current) => current.filter((session) => session.id !== id));
  }

  function updateSettings(nextSettings: Partial<Settings>) {
    setSettings((current) => sanitizeSettings({ ...current, ...nextSettings }));
  }

  function resetAllData() {
    setSessions([]);
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.sessions);
    localStorage.removeItem(STORAGE_KEYS.settings);
    document.documentElement.classList.remove("dark");
  }

  return {
    hydrated,
    sessions,
    settings,
    stats,
    addSession,
    deleteSession,
    updateSettings,
    resetAllData,
  };
}

function readSessions(): StudySession[] {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEYS.sessions);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed.filter(isStudySession) : [];
  } catch {
    return [];
  }
}

function readSettings(): Settings {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEYS.settings);
    return sanitizeSettings(rawValue ? JSON.parse(rawValue) : DEFAULT_SETTINGS);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function isStudySession(value: unknown): value is StudySession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<StudySession>;
  return (
    typeof session.id === "string" &&
    typeof session.date === "string" &&
    typeof session.durationMinutes === "number" &&
    typeof session.subject === "string" &&
    (session.mode === "count-up" || session.mode === "preset" || session.mode === "manual") &&
    typeof session.completedAt === "string" &&
    typeof session.createdAt === "string"
  );
}
