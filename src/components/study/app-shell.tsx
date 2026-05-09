"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, Dumbbell, History, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Study", icon: BookOpenCheck },
  { href: "/gym", label: "Gym", icon: Dumbbell },
  { href: "/history", label: "Study Log", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-30 border-b-2 border-zinc-950/10 bg-white/80 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-zinc-950 bg-lime-300 text-zinc-950 shadow-[0_4px_0_#18181b] dark:border-white dark:bg-cyan-300">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-black leading-4">Momentum</span>
              <span className="hidden text-xs font-semibold text-zinc-500 dark:text-zinc-400 sm:block">
                Study and strength log
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 rounded-lg border-2 border-zinc-950/10 bg-white p-1 shadow-[0_4px_0_rgba(24,24,27,0.08)] dark:border-zinc-700 dark:bg-zinc-900">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-black text-zinc-500 transition hover:bg-cyan-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                    isActive &&
                      "bg-zinc-950 text-white shadow-sm hover:bg-zinc-950 hover:text-white dark:bg-zinc-50 dark:text-zinc-950 dark:hover:text-zinc-950",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
