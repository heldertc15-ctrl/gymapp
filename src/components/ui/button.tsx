import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-black transition active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:focus-visible:ring-white/30",
  {
    variants: {
      variant: {
        default:
          "border-2 border-zinc-950 bg-[#111827] text-white shadow-[0_4px_0_#030712] hover:-translate-y-0.5 hover:bg-[#0f172a] dark:border-white dark:bg-white dark:text-zinc-950 dark:shadow-[0_4px_0_rgba(255,255,255,0.35)] dark:hover:bg-cyan-100",
        secondary:
          "border-2 border-zinc-950/15 bg-white text-zinc-950 shadow-[0_4px_0_rgba(24,24,27,0.12)] hover:-translate-y-0.5 hover:bg-cyan-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:shadow-[0_4px_0_rgba(255,255,255,0.07)] dark:hover:bg-zinc-800",
        ghost:
          "text-zinc-600 hover:bg-white hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
        destructive:
          "border-2 border-red-900 bg-red-500 text-white shadow-[0_4px_0_#7f1d1d] hover:-translate-y-0.5 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
