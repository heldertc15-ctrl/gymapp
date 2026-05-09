"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { SUBJECTS } from "@/lib/study";
import { formatMinutes } from "@/lib/utils";
import { useStudyStore } from "@/lib/use-study-store";

export function HistoryPage() {
  const { sessions, stats, deleteSession } = useStudyStore();
  const [filter, setFilter] = useState("All");

  const subjectOptions = useMemo(() => {
    const uniqueSubjects = new Set([...SUBJECTS, ...sessions.map((session) => session.subject)]);
    return ["All", ...Array.from(uniqueSubjects)];
  }, [sessions]);

  const filteredSessions = sessions.filter((session) => filter === "All" || session.subject === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-normal text-zinc-950 dark:text-zinc-50">Study Log</h1>
          <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Cleared sessions stored on this device.
          </p>
        </div>
        <div className="w-full sm:w-56">
          <Select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by subject">
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total hours" value={stats.totalHours.toFixed(stats.totalHours >= 10 ? 0 : 1)} className="border-cyan-300 bg-cyan-50" />
        <SummaryCard label="Clears" value={stats.totalSessions.toString()} className="border-amber-300 bg-amber-50" />
        <SummaryCard label="Top skill" value={stats.mostStudiedSubject} className="border-pink-300 bg-pink-50" />
      </section>

      <Card className="border-sky-300">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            {filteredSessions.length === 1 ? "1 session" : `${filteredSessions.length} sessions`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSessions.length > 0 ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="grid gap-3 py-4 sm:grid-cols-[1.2fr_0.8fr_0.8fr_auto] sm:items-center"
                >
                  <div>
                    <div className="font-black text-zinc-950 dark:text-zinc-50">
                      {new Date(session.completedAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(session.completedAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="font-black text-zinc-800 dark:text-zinc-200">
                    {formatMinutes(session.durationMinutes)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{session.subject}</Badge>
                    <Badge>{formatSessionMode(session.mode)}</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSession(session.id)}
                    aria-label="Delete session"
                    title="Delete session"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              No sessions match this filter yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatSessionMode(mode: string) {
  if (mode === "preset") {
    return "Preset";
  }

  if (mode === "manual") {
    return "Manual";
  }

  return "Count up";
}

function SummaryCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="p-5">
        <div className="text-2xl font-black text-zinc-950 dark:text-zinc-50">{value}</div>
        <div className="mt-1 text-sm font-bold text-zinc-500 dark:text-zinc-400">{label}</div>
      </CardContent>
    </Card>
  );
}
