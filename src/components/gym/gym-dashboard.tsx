"use client";

import { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  Download,
  Dumbbell,
  ListChecks,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import {
  createExercise,
  createSet,
  createWorkout,
  getExercisePr,
  type ManualPr,
  type Split,
  type SplitTemplate,
  type Workout,
  type WorkoutExercise,
} from "@/lib/gym";
import { cn } from "@/lib/utils";
import { useGymStore } from "@/lib/use-gym-store";

type GymScreen = "home" | "workout" | "edit-template" | "view-workout";

export function GymDashboard() {
  const {
    hydrated,
    workouts,
    templates,
    manualPrs,
    stats,
    templateStatus,
    addWorkout,
    deleteWorkout,
    saveManualPr,
    deleteManualPr,
    setTemplates,
    refreshTemplates,
    importGymData,
  } = useGymStore();
  const [screen, setScreen] = useState<GymScreen>("home");
  const [selectedSplit, setSelectedSplit] = useState<Split>("Push");
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutExercise[]>([]);
  const [viewWorkout, setViewWorkout] = useState<Workout | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Workout | null>(null);
  const [exerciseMenuOpen, setExerciseMenuOpen] = useState(false);
  const [backupStatus, setBackupStatus] = useState("");
  const [manualPrEditor, setManualPrEditor] = useState<ManualPr | null | "new">(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const currentExercise = currentWorkout[currentExerciseIndex];
  const totalSets = currentWorkout.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const doneSets = currentWorkout.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.done).length, 0);
  const workoutProgress = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;
  const prEntries = useMemo(() => Object.entries(stats.prs).sort((a, b) => b[1].value - a[1].value), [stats.prs]);

  function startWorkout(split: Split) {
    const template = templates.find((item) => item.split === split);
    const exercises = template?.exercises
      .filter((exercise) => exercise.name.trim())
      .map((exercise) => createExercise(exercise.name, exercise.defaultSets ?? 3)) ?? [];

    setSelectedSplit(split);
    setCurrentWorkout(exercises);
    setCurrentExerciseIndex(0);
    setExerciseMenuOpen(false);
    setScreen("workout");
  }

  function finishWorkout() {
    addWorkout(createWorkout({ split: selectedSplit, exercises: currentWorkout }));
    setCurrentWorkout([]);
    setCurrentExerciseIndex(0);
    setScreen("home");
  }

  function goToNextExercise() {
    if (currentExerciseIndex < currentWorkout.length - 1) {
      setCurrentExerciseIndex((index) => index + 1);
      return;
    }

    finishWorkout();
  }

  function updateSet(exerciseIndex: number, setIndex: number, field: "weight" | "reps", value: string) {
    setCurrentWorkout((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, innerIndex) =>
                innerIndex === setIndex ? { ...set, [field]: value } : set,
              ),
            }
          : exercise,
      ),
    );
  }

  function toggleSetDone(exerciseIndex: number, setIndex: number) {
    setCurrentWorkout((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, innerIndex) =>
                innerIndex === setIndex ? { ...set, done: !set.done } : set,
              ),
            }
          : exercise,
      ),
    );
  }

  function addSetToExercise(exerciseIndex: number) {
    setCurrentWorkout((current) =>
      current.map((exercise, index) => {
        if (index !== exerciseIndex) {
          return exercise;
        }

        const lastSet = exercise.sets.at(-1);
        return {
          ...exercise,
          sets: [...exercise.sets, createSet(lastSet?.weight ?? "", lastSet?.reps ?? "8")],
        };
      }),
    );
  }

  function updateTemplate(split: Split, updater: (template: SplitTemplate) => SplitTemplate) {
    setTemplates((current) => current.map((template) => (template.split === split ? updater(template) : template)));
  }

  function exportGymData() {
    const backup = {
      app: "momentum",
      type: "gym-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      workouts,
      templates,
      manualPrs,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `momentum-gym-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupStatus(`Exported ${workouts.length} workouts`);
    window.setTimeout(() => setBackupStatus(""), 2600);
  }

  async function importBackupFile(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const imported = importGymData(JSON.parse(await file.text()));
      setBackupStatus(`Imported ${imported.workouts} workouts, ${imported.manualPrs} manual PRs, and ${imported.templates} template exercises`);
    } catch {
      setBackupStatus("Import failed. Choose a valid gym backup JSON file.");
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
      window.setTimeout(() => setBackupStatus(""), 4200);
    }
  }

  if (screen === "workout") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <WorkoutHeader
          selectedSplit={selectedSplit}
          currentExercise={currentExercise}
          doneSets={doneSets}
          totalSets={totalSets}
          progress={workoutProgress}
          onOpenMenu={() => setExerciseMenuOpen(true)}
          onFinish={finishWorkout}
        />

        {currentExercise ? (
          <Card className="border-lime-300">
            <CardContent className="space-y-5 p-5">
              <div className="text-center">
                <Badge className="border-lime-200 bg-lime-100 text-lime-950">Exercise {currentExerciseIndex + 1} of {currentWorkout.length}</Badge>
                <h1 className="mt-3 text-3xl font-black tracking-normal text-zinc-950 dark:text-zinc-50">{currentExercise.name}</h1>
                <ExercisePr name={currentExercise.name} workouts={workouts} manualPrs={manualPrs} />
              </div>

              <div className="grid gap-3">
                {currentExercise.sets.map((set, setIndex) => (
                  <div
                    key={set.id}
                    className={cn(
                      "grid gap-3 rounded-lg border-2 border-zinc-950/10 bg-white p-3 shadow-[0_4px_0_rgba(24,24,27,0.08)] dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
                      set.done && "border-lime-300 bg-lime-50 dark:border-lime-700 dark:bg-lime-950/30",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        size="icon"
                        variant={set.done ? "default" : "secondary"}
                        onClick={() => toggleSetDone(currentExerciseIndex, setIndex)}
                        aria-label={set.done ? "Mark set incomplete" : "Mark set complete"}
                        title={set.done ? "Mark incomplete" : "Mark complete"}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <div>
                        <div className="font-black text-zinc-950 dark:text-zinc-50">Set {setIndex + 1}</div>
                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          {set.done ? "Logged" : "Waiting"}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={set.weight}
                        onChange={(event) => updateSet(currentExerciseIndex, setIndex, "weight", event.target.value)}
                        placeholder="lb"
                        aria-label={`Set ${setIndex + 1} weight`}
                      />
                      <span className="text-sm font-black text-zinc-400">x</span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={set.reps}
                        onChange={(event) => updateSet(currentExerciseIndex, setIndex, "reps", event.target.value)}
                        placeholder="reps"
                        aria-label={`Set ${setIndex + 1} reps`}
                      />
                    </div>
                    <Badge className="justify-center border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                      {Number(set.weight || 0) * Number(set.reps || 0)} lb
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => addSetToExercise(currentExerciseIndex)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add set
                </Button>
                <Button type="button" className="flex-1" onClick={goToNextExercise}>
                  {currentExerciseIndex === currentWorkout.length - 1 ? "Finish workout" : "Next exercise"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-300">
            <CardContent className="space-y-4 p-8 text-center">
              <Dumbbell className="mx-auto h-10 w-10 text-zinc-500" aria-hidden="true" />
              <div>
                <h1 className="text-xl font-black text-zinc-950 dark:text-zinc-50">No exercises configured</h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Add exercises to the {selectedSplit} template first.</p>
              </div>
              <Button type="button" onClick={() => setScreen("edit-template")}>Edit template</Button>
            </CardContent>
          </Card>
        )}

        <ExerciseMenu
          open={exerciseMenuOpen}
          exercises={currentWorkout}
          currentIndex={currentExerciseIndex}
          onClose={() => setExerciseMenuOpen(false)}
          onSelect={(index) => {
            setCurrentExerciseIndex(index);
            setExerciseMenuOpen(false);
          }}
        />
      </div>
    );
  }

  if (screen === "edit-template") {
    const template = templates.find((item) => item.split === selectedSplit);

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Button type="button" variant="ghost" onClick={() => setScreen("home")}>Back</Button>
            <h1 className="mt-2 text-2xl font-black tracking-normal text-zinc-950 dark:text-zinc-50">Edit {selectedSplit}</h1>
            <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Set the exercises and default set count for this split.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void refreshTemplates()}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Restore defaults
          </Button>
        </div>

        <Card className="border-cyan-300">
          <CardContent className="space-y-3 p-5">
            {template?.exercises.map((exercise, index) => (
              <div key={`${selectedSplit}-${index}`} className="grid gap-3 rounded-lg border-2 border-zinc-950/10 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[minmax(0,1fr)_96px_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor={`exercise-${index}`}>Exercise</Label>
                  <Input
                    id={`exercise-${index}`}
                    value={exercise.name}
                    onChange={(event) =>
                      updateTemplate(selectedSplit, (current) => ({
                        ...current,
                        exercises: current.exercises.map((item, innerIndex) =>
                          innerIndex === index ? { ...item, name: event.target.value } : item,
                        ),
                      }))
                    }
                    placeholder="Exercise name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`sets-${index}`}>Sets</Label>
                  <Input
                    id={`sets-${index}`}
                    type="number"
                    min={1}
                    max={10}
                    value={exercise.defaultSets ?? 3}
                    onChange={(event) =>
                      updateTemplate(selectedSplit, (current) => ({
                        ...current,
                        exercises: current.exercises.map((item, innerIndex) =>
                          innerIndex === index ? { ...item, defaultSets: Number(event.target.value) || 3 } : item,
                        ),
                      }))
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    updateTemplate(selectedSplit, (current) => ({
                      ...current,
                      exercises: current.exercises.filter((_, innerIndex) => innerIndex !== index),
                    }))
                  }
                  aria-label="Remove exercise"
                  title="Remove exercise"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() =>
                updateTemplate(selectedSplit, (current) => ({
                  ...current,
                  exercises: [...current.exercises, { name: "", defaultSets: 3 }],
                }))
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add exercise
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === "view-workout" && viewWorkout) {
    return (
      <WorkoutDetail
        workout={viewWorkout}
        onBack={() => setScreen("home")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-normal text-zinc-950 dark:text-zinc-50">Gym Tracker</h1>
          <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Plan the split, log every set, and keep your PRs beside your study streak.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void refreshTemplates()}>
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh exercises
        </Button>
      </div>

      {templateStatus ? (
        <div className="rounded-lg border-2 border-lime-300 bg-lime-50 px-4 py-3 text-sm font-black text-lime-950 dark:border-lime-700 dark:bg-lime-950 dark:text-lime-100">
          {templateStatus}
        </div>
      ) : null}

      {backupStatus ? (
        <div className="rounded-lg border-2 border-cyan-300 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-950 dark:border-cyan-700 dark:bg-cyan-950 dark:text-cyan-100">
          {backupStatus}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Workouts" value={stats.totalWorkouts.toString()} icon={<Dumbbell className="h-4 w-4" aria-hidden="true" />} className="border-cyan-300 bg-cyan-50" />
        <MetricCard label="This week" value={stats.weeklyWorkouts.toString()} icon={<ListChecks className="h-4 w-4" aria-hidden="true" />} className="border-lime-300 bg-lime-50" />
        <MetricCard label="Completed sets" value={stats.completedSets.toString()} icon={<Check className="h-4 w-4" aria-hidden="true" />} className="border-amber-300 bg-amber-50" />
        <MetricCard label="Total volume" value={formatVolume(stats.totalVolume)} icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />} className="border-pink-300 bg-pink-50" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="border-lime-300">
          <CardHeader>
            <CardTitle>Start Workout</CardTitle>
            <CardDescription>Choose a split from your saved templates.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {templates.map((template) => (
              <div key={template.split} className="grid gap-2 rounded-lg border-2 border-zinc-950/10 bg-white p-3 shadow-[0_4px_0_rgba(24,24,27,0.08)] dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <button
                  type="button"
                  className="flex min-h-20 items-center gap-3 rounded-md px-2 text-left transition hover:bg-cyan-50 dark:hover:bg-zinc-800"
                  onClick={() => startWorkout(template.split)}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-zinc-950/10 bg-zinc-50 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
                    <Dumbbell className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-black text-zinc-950 dark:text-zinc-50">{template.split}</span>
                    <span className="block text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                      {template.exercises.filter((exercise) => exercise.name.trim()).length} exercises
                    </span>
                  </span>
                </button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    setSelectedSplit(template.split);
                    setScreen("edit-template");
                  }}
                  aria-label={`Edit ${template.split} template`}
                  title={`Edit ${template.split}`}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-300">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>All-Time PRs</CardTitle>
                <CardDescription>Workout PRs plus the manual PRs you enter from your screenshot.</CardDescription>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setManualPrEditor("new")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add PR
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {prEntries.length > 0 ? (
              <div className="grid gap-2">
                {prEntries.map(([name, pr]) => {
                  const manualPr = manualPrs.find((item) => normalizeName(item.name) === name);

                  return (
                    <div key={name} className="grid gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="truncate font-black capitalize text-zinc-950 dark:text-zinc-50">{name}</div>
                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          {formatVolume(pr.value)} best set volume{manualPr ? " · manual" : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border-amber-200 bg-amber-100 text-amber-950">
                          <Trophy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          {pr.weight} x {pr.reps}
                        </Badge>
                        {manualPr ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setManualPrEditor(manualPr)}
                              aria-label={`Edit ${manualPr.name} PR`}
                              title={`Edit ${manualPr.name}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteManualPr(manualPr.id)}
                              aria-label={`Delete ${manualPr.name} PR`}
                              title={`Delete ${manualPr.name}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No PRs yet" body="Add PRs from your screenshot or complete a set with weight and reps." />
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-sky-300">
        <CardHeader>
          <CardTitle>Recent Workouts</CardTitle>
          <CardDescription>{workouts.length === 1 ? "1 workout saved" : `${workouts.length} workouts saved`}</CardDescription>
        </CardHeader>
        <CardContent>
          {workouts.length > 0 ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {workouts.slice(0, 12).map((workout) => (
                <div key={workout.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => {
                      setViewWorkout(workout);
                      setScreen("view-workout");
                    }}
                  >
                    <div className="font-black text-zinc-950 dark:text-zinc-50">
                      {new Date(workout.createdAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                      {workout.split} day with {workout.exercises.length} exercises
                    </div>
                  </button>
                  <Badge>{countDoneSets(workout)} sets</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirm(workout)}
                    aria-label="Delete workout"
                    title="Delete workout"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No workouts yet" body="Start a split and finish a workout to build your log." />
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-950/10">
        <CardHeader>
          <CardTitle>Gym Data</CardTitle>
          <CardDescription>Move workouts and split templates between devices with a JSON backup.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="secondary" className="flex-1" onClick={exportGymData}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export backup
          </Button>
          <Button type="button" variant="secondary" className="flex-1" onClick={() => importInputRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import backup
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void importBackupFile(event.target.files?.[0])}
          />
        </CardContent>
      </Card>

      <Modal open={Boolean(deleteConfirm)} title="Delete workout" description="This removes the workout from this device.">
        {deleteConfirm ? (
          <div className="space-y-5">
            <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              {deleteConfirm.date} - {deleteConfirm.split} day
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  deleteWorkout(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ManualPrModal
        key={manualPrEditor === "new" ? "new-pr" : manualPrEditor?.id ?? "closed-pr"}
        manualPr={manualPrEditor}
        onCancel={() => setManualPrEditor(null)}
        onSave={(input) => {
          saveManualPr(input);
          setManualPrEditor(null);
        }}
      />

      {!hydrated ? (
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">Loading saved gym data...</p>
      ) : null}
    </div>
  );
}

function WorkoutHeader({
  selectedSplit,
  currentExercise,
  doneSets,
  totalSets,
  progress,
  onOpenMenu,
  onFinish,
}: {
  selectedSplit: Split;
  currentExercise: WorkoutExercise | undefined;
  doneSets: number;
  totalSets: number;
  progress: number;
  onOpenMenu: () => void;
  onFinish: () => void;
}) {
  return (
    <Card className="border-cyan-300">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-between gap-3 rounded-lg border-2 border-zinc-950/10 bg-white px-3 text-left text-sm font-black text-zinc-950 shadow-[0_3px_0_rgba(24,24,27,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            onClick={onOpenMenu}
          >
            <span className="truncate">{currentExercise?.name ?? `${selectedSplit} Day`}</span>
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
          <Button type="button" variant="secondary" onClick={onFinish}>Finish now</Button>
        </div>
        <Progress value={progress} className="h-4" />
        <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
          {doneSets} / {totalSets} sets complete ({Math.round(progress)}%)
        </div>
      </CardContent>
    </Card>
  );
}

function ExerciseMenu({
  open,
  exercises,
  currentIndex,
  onClose,
  onSelect,
}: {
  open: boolean;
  exercises: WorkoutExercise[];
  currentIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/55 p-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-lg flex-col rounded-lg border-2 border-zinc-950 bg-white p-4 shadow-[0_12px_0_rgba(24,24,27,0.25)] dark:border-zinc-700 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50">Select exercise</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close exercise menu" title="Close">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-4 grid gap-2 overflow-y-auto">
          {exercises.map((exercise, index) => {
            const complete = exercise.sets.length > 0 && exercise.sets.every((set) => set.done);

            return (
              <button
                key={exercise.id}
                type="button"
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border-2 border-zinc-950/10 bg-zinc-50 p-3 text-left font-black text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50",
                  index === currentIndex && "border-cyan-300 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-950/40",
                )}
                onClick={() => onSelect(index)}
              >
                <span className={complete ? "line-through opacity-70" : undefined}>{exercise.name}</span>
                {complete ? <Check className="h-4 w-4 text-lime-600" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WorkoutDetail({ workout, onBack }: { workout: Workout; onBack: () => void }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <h1 className="mt-2 text-2xl font-black tracking-normal text-zinc-950 dark:text-zinc-50">{workout.split} Day</h1>
        <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          {new Date(workout.createdAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-4">
        {workout.exercises.map((exercise) => (
          <Card key={exercise.id} className="border-zinc-950/10">
            <CardHeader>
              <CardTitle>{exercise.name}</CardTitle>
              <CardDescription>{exercise.sets.filter((set) => set.done).length} completed sets</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {exercise.sets.filter((set) => set.done && set.weight && set.reps).map((set, index) => (
                <div key={set.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900">
                  <span className="font-bold text-zinc-500 dark:text-zinc-400">Set {index + 1}</span>
                  <span className="font-black text-zinc-950 dark:text-zinc-50">{set.weight} x {set.reps}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ManualPrModal({
  manualPr,
  onCancel,
  onSave,
}: {
  manualPr: ManualPr | null | "new";
  onCancel: () => void;
  onSave: (input: { id?: string; name: string; weight: string; reps: string }) => void;
}) {
  const editingPr = manualPr && manualPr !== "new" ? manualPr : null;
  const [name, setName] = useState(editingPr?.name ?? "");
  const [weight, setWeight] = useState(editingPr?.weight ?? "");
  const [reps, setReps] = useState(editingPr?.reps ?? "");
  const canSave = name.trim().length > 0 && Number(weight) > 0 && Number(reps) > 0;

  return (
    <Modal
      open={Boolean(manualPr)}
      title={editingPr ? "Edit manual PR" : "Add manual PR"}
      description="Enter the exercise, weight, and reps from your screenshot."
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="manual-pr-name">Exercise</Label>
          <Input
            id="manual-pr-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bench Press"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="manual-pr-weight">Weight</Label>
            <Input
              id="manual-pr-weight"
              type="number"
              inputMode="decimal"
              min={0}
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="135"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-pr-reps">Reps</Label>
            <Input
              id="manual-pr-reps"
              type="number"
              inputMode="numeric"
              min={1}
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              placeholder="8"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() =>
              onSave({
                id: editingPr?.id,
                name,
                weight,
                reps,
              })
            }
          >
            Save PR
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ExercisePr({ name, workouts, manualPrs }: { name: string; workouts: Workout[]; manualPrs: ManualPr[] }) {
  const pr = getExercisePr(name, workouts, manualPrs);

  if (!pr) {
    return <p className="mt-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">No PR logged yet</p>;
  }

  return (
    <p className="mt-2 text-sm font-black text-amber-700 dark:text-amber-300">
      PR: {pr.weight} x {pr.reps}
    </p>
  );
}

function MetricCard({ label, value, icon, className }: { label: string; value: string; icon: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-2xl font-black text-zinc-950 dark:text-zinc-50">{value}</div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-zinc-950/10 bg-white text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
            {icon}
          </span>
        </div>
        <div className="mt-1 text-sm font-bold text-zinc-500 dark:text-zinc-400">{label}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
      <div className="font-black text-zinc-950 dark:text-zinc-50">{title}</div>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{body}</p>
    </div>
  );
}

function countDoneSets(workout: Workout) {
  return workout.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.done).length, 0);
}

function formatVolume(volume: number) {
  if (volume >= 1000) {
    return `${Math.round(volume / 100) / 10}k lb`;
  }

  return `${Math.round(volume)} lb`;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}
