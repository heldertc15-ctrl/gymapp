import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  const width = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn("h-3 overflow-hidden rounded-full border border-zinc-950/10 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-fuchsia-400 transition-all duration-500 dark:from-lime-300 dark:via-cyan-300 dark:to-pink-300"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
