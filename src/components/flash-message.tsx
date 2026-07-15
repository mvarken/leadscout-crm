"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FlashType } from "@/lib/flash";

type FlashMessageProps = {
  message: string;
  type: FlashType;
};

const styles = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-600 text-white shadow-emerald-900/20"
  },
  warning: {
    icon: TriangleAlert,
    className: "border-amber-200 bg-amber-500 text-amber-950 shadow-amber-900/20"
  },
  error: {
    icon: Info,
    className: "border-red-200 bg-red-600 text-white shadow-red-900/20"
  }
} satisfies Record<FlashType, { icon: typeof CheckCircle2; className: string }>;

export function FlashMessage({ message, type }: FlashMessageProps) {
  const [visible, setVisible] = useState(true);
  const Icon = styles[type].icon;

  useEffect(() => {
    document.cookie = "leadscout_flash=; Path=/; Max-Age=0; SameSite=Lax";
    const timeout = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed left-0 right-0 top-3 z-50 flex justify-center px-4 transition duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0"
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium shadow-xl ${styles[type].className}`}
        role="status"
      >
        <Icon className="h-5 w-5 flex-none" aria-hidden="true" />
        <p className="min-w-0 flex-1">{message}</p>
        <button
          type="button"
          className="rounded p-1 opacity-80 transition hover:bg-white/15 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/70"
          onClick={() => setVisible(false)}
          aria-label="Meldung schliessen"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
