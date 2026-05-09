export const GYM_SPLITS = ["Push", "Pull", "Legs"] as const;

export type Split = (typeof GYM_SPLITS)[number];

export type WorkoutSet = {
  id: string;
  weight: string;
  reps: string;
  done: boolean;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  sets: WorkoutSet[];
};

export type Workout = {
  id: string;
  name: string;
  split: Split;
  date: string;
  exercises: WorkoutExercise[];
  createdAt: string;
};

export type ExerciseTemplate = {
  name: string;
  defaultSets?: number;
};

export type SplitTemplate = {
  split: Split;
  exercises: ExerciseTemplate[];
};

export type GymStats = {
  totalWorkouts: number;
  completedSets: number;
  totalVolume: number;
  weeklyWorkouts: number;
  prs: Record<string, { weight: string; reps: string; value: number }>;
};

export const GYM_STORAGE_KEYS = {
  templates: "gymapp.templates",
  workouts: "gymapp.workouts",
};

export const DEFAULT_TEMPLATES: SplitTemplate[] = GYM_SPLITS.map((split) => ({
  split,
  exercises: [],
}));

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSet(weight = "", reps = "8"): WorkoutSet {
  return { id: createId(), weight, reps, done: false };
}

export function createExercise(name: string, defaultSets = 3): WorkoutExercise {
  return {
    id: createId(),
    name,
    sets: Array.from({ length: defaultSets }, () => createSet()),
  };
}

export function createWorkout(input: { split: Split; exercises: WorkoutExercise[]; now?: Date }): Workout {
  const now = input.now ?? new Date();
  const date = now.toISOString().slice(0, 10);

  return {
    id: createId(),
    name: `${input.split} Day`,
    split: input.split,
    date,
    exercises: input.exercises,
    createdAt: now.toISOString(),
  };
}

export function normalizeExerciseName(name: string) {
  return name.trim().toLowerCase();
}

export function calculateGymStats(workouts: Workout[], now = new Date()): GymStats {
  const weekStart = startOfWeek(now);
  const prs: GymStats["prs"] = {};
  let completedSets = 0;
  let totalVolume = 0;

  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const name = normalizeExerciseName(exercise.name);

      exercise.sets.forEach((set) => {
        if (!set.done || !set.weight || !set.reps) {
          return;
        }

        const weight = Number(set.weight);
        const reps = Number(set.reps);

        if (!Number.isFinite(weight) || !Number.isFinite(reps)) {
          return;
        }

        const value = weight * reps;
        completedSets += 1;
        totalVolume += value;

        if (!prs[name] || value > prs[name].value) {
          prs[name] = { weight: set.weight, reps: set.reps, value };
        }
      });
    });
  });

  return {
    totalWorkouts: workouts.length,
    completedSets,
    totalVolume,
    weeklyWorkouts: workouts.filter((workout) => new Date(workout.createdAt) >= weekStart).length,
    prs,
  };
}

export function getExercisePr(exerciseName: string, workouts: Workout[]) {
  const stats = calculateGymStats(workouts).prs;
  return stats[normalizeExerciseName(exerciseName)] ?? null;
}

export function sanitizeTemplates(value: unknown): SplitTemplate[] {
  if (!Array.isArray(value)) {
    return DEFAULT_TEMPLATES;
  }

  return GYM_SPLITS.map((split) => {
    const template = value.find((item) => item && typeof item === "object" && (item as SplitTemplate).split === split);
    const exercises = Array.isArray(template?.exercises)
      ? template.exercises
          .filter((exercise: Partial<ExerciseTemplate>) => typeof exercise?.name === "string")
          .map((exercise: Partial<ExerciseTemplate>) => ({
            name: exercise.name ?? "",
            defaultSets: clampSetCount(exercise.defaultSets),
          }))
      : [];

    return { split, exercises };
  });
}

export function sanitizeWorkouts(value: unknown): Workout[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isWorkout);
}

export function parseServerTemplates(value: Record<string, string[] | undefined>): SplitTemplate[] {
  return GYM_SPLITS.map((split) => ({
    split,
    exercises: (value[split] ?? []).map((name) => ({ name, defaultSets: 3 })),
  }));
}

function isWorkout(value: unknown): value is Workout {
  if (!value || typeof value !== "object") {
    return false;
  }

  const workout = value as Partial<Workout>;

  return (
    typeof workout.id === "string" &&
    typeof workout.date === "string" &&
    typeof workout.createdAt === "string" &&
    GYM_SPLITS.includes(workout.split as Split) &&
    Array.isArray(workout.exercises)
  );
}

function clampSetCount(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 3;
  }

  return Math.min(10, Math.max(1, Math.round(value)));
}

function startOfWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}
