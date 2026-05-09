"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateGymStats,
  DEFAULT_TEMPLATES,
  GYM_STORAGE_KEYS,
  parseServerTemplates,
  sanitizeTemplates,
  sanitizeWorkouts,
  type SplitTemplate,
  type Workout,
} from "@/lib/gym";

export function useGymStore() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<SplitTemplate[]>(DEFAULT_TEMPLATES);
  const [hydrated, setHydrated] = useState(false);
  const [templateStatus, setTemplateStatus] = useState("");

  useEffect(() => {
    async function hydrate() {
      const savedWorkouts = readStorage(GYM_STORAGE_KEYS.workouts, []);
      const savedTemplates = readStorage<SplitTemplate[] | null>(GYM_STORAGE_KEYS.templates, null);
      const serverTemplates = await loadTemplatesFromServer();
      const nextTemplates =
        savedTemplates && savedTemplates.some((template) => template.exercises.length > 0)
          ? sanitizeTemplates(savedTemplates)
          : serverTemplates;

      setWorkouts(sanitizeWorkouts(savedWorkouts));
      setTemplates(nextTemplates);
      setHydrated(true);
    }

    void hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    localStorage.setItem(GYM_STORAGE_KEYS.workouts, JSON.stringify(workouts));
  }, [hydrated, workouts]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    localStorage.setItem(GYM_STORAGE_KEYS.templates, JSON.stringify(templates));
  }, [hydrated, templates]);

  const stats = useMemo(() => calculateGymStats(workouts), [workouts]);

  function addWorkout(workout: Workout) {
    setWorkouts((current) => [workout, ...current]);
  }

  function deleteWorkout(id: string) {
    setWorkouts((current) => current.filter((workout) => workout.id !== id));
  }

  async function refreshTemplates() {
    setTemplateStatus("Refreshing templates...");
    const serverTemplates = await loadTemplatesFromServer();
    setTemplates(serverTemplates);
    localStorage.removeItem(GYM_STORAGE_KEYS.templates);
    setTemplateStatus(`Loaded ${serverTemplates.reduce((sum, template) => sum + template.exercises.length, 0)} exercises`);
    window.setTimeout(() => setTemplateStatus(""), 2200);
  }

  function importGymData(value: unknown) {
    const backup = normalizeGymBackup(value);
    const nextWorkouts = sanitizeWorkouts(backup.workouts);
    const nextTemplates = backup.templates ? sanitizeTemplates(backup.templates) : templates;

    setWorkouts(nextWorkouts);
    setTemplates(nextTemplates);

    return {
      workouts: nextWorkouts.length,
      templates: nextTemplates.reduce((sum, template) => sum + template.exercises.length, 0),
    };
  }

  return {
    hydrated,
    workouts,
    templates,
    stats,
    templateStatus,
    addWorkout,
    deleteWorkout,
    setTemplates,
    refreshTemplates,
    importGymData,
  };
}

async function loadTemplatesFromServer(): Promise<SplitTemplate[]> {
  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const response = await fetch(`${basePath}/gym-templates.json`, { cache: "no-store" });

    if (!response.ok) {
      return DEFAULT_TEMPLATES;
    }

    return parseServerTemplates(await response.json());
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeGymBackup(value: unknown): { workouts: unknown; templates?: unknown } {
  if (Array.isArray(value)) {
    return { workouts: value };
  }

  if (!value || typeof value !== "object") {
    return { workouts: [] };
  }

  const backup = value as Record<string, unknown>;
  const rawWorkouts = backup.workouts ?? backup[GYM_STORAGE_KEYS.workouts] ?? [];
  const rawTemplates = backup.templates ?? backup[GYM_STORAGE_KEYS.templates];

  return {
    workouts: parseMaybeJson(rawWorkouts),
    templates: rawTemplates ? parseMaybeJson(rawTemplates) : undefined,
  };
}

function parseMaybeJson(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
