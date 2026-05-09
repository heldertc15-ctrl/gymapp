"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form";
import { SUBJECTS, type Theme } from "@/lib/study";
import { useStudyStore } from "@/lib/use-study-store";

export function SettingsPage() {
  const { settings, updateSettings, resetAllData } = useStudyStore();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-normal text-zinc-950 dark:text-zinc-50">Study Settings</h1>
        <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          Tune the quests, combo rules, and default loadout.
        </p>
      </div>

      <Card className="border-lime-300">
        <CardHeader>
          <CardTitle>Quest Rules</CardTitle>
          <CardDescription>These settings affect progress, combos, and new session defaults.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="daily-goal">Daily goal minutes</Label>
              <Input
                id="daily-goal"
                type="number"
                min={1}
                max={600}
                value={settings.dailyGoalMinutes}
                onChange={(event) => updateSettings({ dailyGoalMinutes: Number(event.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="streak-minimum">Minimum streak minutes</Label>
              <Input
                id="streak-minimum"
                type="number"
                min={1}
                max={600}
                value={settings.minimumStreakMinutes}
                onChange={(event) => updateSettings({ minimumStreakMinutes: Number(event.target.value) })}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default-subject">Default subject</Label>
              <Select
                id="default-subject"
                value={settings.defaultSubject}
                onChange={(event) => updateSettings({ defaultSubject: event.target.value })}
              >
                {SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                id="theme"
                value={settings.theme}
                onChange={(event) => updateSettings({ theme: event.target.value as Theme })}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-300">
        <CardHeader>
          <CardTitle>Reset Data</CardTitle>
          <CardDescription>Clear all sessions and restore the default settings on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          {confirmReset ? (
            <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-red-800 dark:text-red-200">This cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    resetAllData();
                    setConfirmReset(false);
                  }}
                >
                  Reset all data
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset all data
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
