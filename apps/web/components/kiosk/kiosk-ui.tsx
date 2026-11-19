"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Kiosk-only primitives. Plain elements on purpose (not the dashboard's
// shadcn Button): kiosk sizing is driven by the root font-size scale in
// app/kiosk/[token]/layout.tsx, and every control keeps a >=48 CSS px touch
// target via the max(48px, 3rem) floor.

export const TOUCH = "min-h-[44px] min-w-[44px]";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "hero";

const VARIANT: Record<Variant, string> = {
  // Brand Slate Blue button
  primary: "bg-[#2A4D77] text-white shadow-xs hover:bg-[#213E61] active:bg-[#19304D] disabled:opacity-50",
  // Surface Card button with border
  secondary: "border border-[#D3CBB4] bg-[#FAF7EF] text-[#1F334D] shadow-2xs hover:bg-[#DCE5F0] active:bg-[#DCE5F0]/80",
  ghost: "text-[#1F334D] hover:bg-[#DCE5F0]/50 active:bg-[#DCE5F0]",
  // Dark crimson danger button
  danger: "bg-[#A61B1B] text-white hover:bg-[#8B1414] active:bg-[#720E0E]",
  // Single Hero CTA: Lobster Red accent (Rule: max 1 per screen, white bold text)
  hero: "bg-[#F03A2A] text-white font-bold tracking-wide shadow-sm hover:bg-[#D92F1F] active:bg-[#B82416]",
};

export function KButton({
  variant = "primary",
  large,
  loading,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  large?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex touch-manipulation select-none items-center justify-center gap-2 rounded-2xl px-5 font-semibold transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] motion-reduce:transition-none",
        TOUCH,
        large ? "py-4 text-[1.25rem] sm:text-[1.35rem]" : "py-2.5 text-[1.05rem]",
        VARIANT[variant],
        className,
      )}
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={cn(
        "inline-flex touch-manipulation select-none items-center justify-center rounded-full border border-border bg-card text-foreground shadow-2xs",
        "hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:opacity-40 active:scale-95 motion-reduce:transition-none",
        TOUCH,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Banner({
  tone,
  title,
  children,
  action,
}: {
  tone: "error" | "warning" | "info";
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const toneClass =
    tone === "error"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : tone === "warning"
        ? "border-warning/40 bg-warning/10 text-amber-900 dark:text-amber-200"
        : "border-border bg-secondary/50 text-foreground";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border p-4 shadow-2xs", toneClass)}
    >
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[1.1rem] font-semibold leading-snug">{title}</p>
        {children && <p className="mt-1 text-[0.95rem] leading-snug text-muted-foreground">{children}</p>}
      </div>
      {action && <div className="shrink-0 self-end sm:self-center">{action}</div>}
    </div>
  );
}
