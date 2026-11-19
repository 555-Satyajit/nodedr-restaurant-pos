"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { BasketLine } from "@/lib/kiosk-basket";
import { IconButton } from "./kiosk-ui";

/** Basket rows with quantity steppers; `locked` freezes edits (submit in flight / outcome unknown). */
export function BasketLines({
  lines,
  fmt,
  locked,
  onChange,
}: {
  lines: BasketLine[];
  fmt: (n: number) => string;
  locked: boolean;
  onChange: (key: string, delta: number) => void;
}) {
  const { t } = useI18n();
  return (
    <ul className="flex flex-col divide-y divide-[#D3CBB4]/70">
      {lines.map((l) => (
        <li key={l.key} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-semibold leading-snug text-[#1F334D]">{l.name}</p>
            {l.modifierLabel && (
              <p className="text-xs leading-snug text-[#4E6078]">{l.modifierLabel}</p>
            )}
            <p className="text-xs sm:text-sm tabular-nums text-[#4E6078]">{fmt(l.unitPrice)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <IconButton
              label={l.quantity === 1 ? t("kiosk.basket.remove", { name: l.name }) : t("kiosk.basket.less", { name: l.name })}
              disabled={locked}
              onClick={() => onChange(l.key, -1)}
              className="border-[#D3CBB4] bg-[#FAF7EF] text-[#A61B1B] hover:bg-[#F3D9D6]"
            >
              {l.quantity === 1 ? <Trash2 className="h-4 w-4" aria-hidden /> : <Minus className="h-4 w-4 text-[#1F334D]" aria-hidden />}
            </IconButton>
            <span className="w-7 text-center text-sm sm:text-base font-bold tabular-nums text-[#1F334D]" aria-live="polite">
              {l.quantity}
            </span>
            <IconButton
              label={t("kiosk.basket.more", { name: l.name })}
              disabled={locked}
              onClick={() => onChange(l.key, 1)}
              className="border-[#D3CBB4] bg-[#FAF7EF] text-[#2A4D77] hover:bg-[#DCE5F0]"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </IconButton>
          </div>
          <p className="w-16 sm:w-20 shrink-0 text-right text-sm sm:text-base font-bold tabular-nums text-[#1F334D]">
            {fmt(Math.round(l.unitPrice * l.quantity * 100) / 100)}
          </p>
        </li>
      ))}
    </ul>
  );
}
