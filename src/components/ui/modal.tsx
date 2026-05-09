import * as React from "react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function Modal({ open, title, description, children, className }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        className={cn(
          "w-full max-w-md rounded-lg border-2 border-zinc-950 bg-white p-5 shadow-[0_12px_0_rgba(24,24,27,0.25)] dark:border-zinc-700 dark:bg-zinc-950",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="space-y-1">
          <h2 id="modal-title" className="text-lg font-black text-zinc-950 dark:text-zinc-50">
            {title}
          </h2>
          {description ? (
            <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
          ) : null}
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
