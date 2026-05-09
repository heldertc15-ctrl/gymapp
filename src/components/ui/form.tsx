import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border-2 border-zinc-950/10 bg-white px-3 text-sm font-semibold text-zinc-950 shadow-[0_3px_0_rgba(24,24,27,0.08)] outline-none transition placeholder:text-zinc-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-cyan-300 dark:focus:ring-cyan-300/20",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border-2 border-zinc-950/10 bg-white px-3 text-sm font-semibold text-zinc-950 shadow-[0_3px_0_rgba(24,24,27,0.08)] outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-cyan-300 dark:focus:ring-cyan-300/20",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-black text-zinc-800 dark:text-zinc-200", className)} {...props} />;
}
