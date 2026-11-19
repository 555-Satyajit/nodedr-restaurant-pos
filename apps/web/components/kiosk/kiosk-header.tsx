"use client";

import { Globe, X } from "lucide-react";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { TOUCH } from "./kiosk-ui";

// English-first; Spanish as second supported kiosk language.
export const LOCALES_SHOWN: Locale[] = ["en", "es"];

export function KioskHeader({
  name,
  locale,
  onLocale,
  locales,
  onCancel,
  cancelLabel,
  languageLabel,
  serviceLabel,
  onChangeService,
  changeLabel,
}: {
  name: string;
  locale?: Locale;
  onLocale?: (l: Locale) => void;
  locales?: Locale[];
  onCancel: () => void;
  cancelLabel: string;
  languageLabel?: string;
  serviceLabel: string | null;
  onChangeService?: () => void;
  changeLabel: string;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D3CBB4] bg-[#FAF7EF] px-3.5 py-2.5 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <p className="truncate text-base sm:text-lg font-bold text-[#1F334D]">{name}</p>
        {serviceLabel && (
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-[#DCE5F0] px-3 py-1 text-xs sm:text-sm font-semibold text-[#2A4D77]">
              {serviceLabel}
            </span>
            {onChangeService && (
              <button
                type="button"
                onClick={onChangeService}
                className={cn(
                  "rounded-lg px-1.5 text-xs sm:text-sm font-semibold text-[#2A4D77] hover:underline",
                  TOUCH
                )}
              >
                {changeLabel}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Cancel button: Secondary style with dark crimson icon */}
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border border-[#D3CBB4] bg-[#FAF7EF] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#A61B1B]",
            "hover:bg-[#F3D9D6] active:bg-[#F3D9D6]/80 transition-colors shadow-2xs",
            TOUCH
          )}
        >
          <X className="h-4 w-4" aria-hidden />
          <span>{cancelLabel}</span>
        </button>
      </div>
    </header>
  );
}
