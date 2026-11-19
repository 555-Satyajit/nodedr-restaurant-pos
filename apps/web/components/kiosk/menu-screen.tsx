"use client";

import { UploadImage } from "@/components/ui/upload-image";
import { Plus, Search, ShoppingBag, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { KioskMenu, KioskMenuItem } from "@/lib/kiosk-api";
import { basketCount, basketTotal, toInclusiveUnitPrice, type BasketLine } from "@/lib/kiosk-basket";
import { cn } from "@/lib/utils";
import { BasketLines } from "./basket-lines";
import { Banner, KButton, TOUCH } from "./kiosk-ui";
import { ModifierSheet, type ModifierChoice } from "./modifier-sheet";

export function MenuScreen({
  menu,
  basket,
  unavailableNames,
  fmt,
  onAdd,
  onChange,
  onReview,
  header,
}: {
  menu: KioskMenu;
  basket: BasketLine[];
  unavailableNames: string[];
  fmt: (n: number) => string;
  onAdd: (line: Omit<BasketLine, "key" | "quantity">) => void;
  onChange: (key: string, delta: number) => void;
  onReview: () => void;
  header: React.ReactNode;
}) {
  const { t } = useI18n();
  const [categoryId, setCategoryId] = useState(menu.categories[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [picking, setPicking] = useState<KioskMenuItem | null>(null);

  const unit = (item: KioskMenuItem, extra = 0) =>
    toInclusiveUnitPrice(Number(item.price) + extra, Number(item.taxRatePercent), menu.taxMode);

  const visible = useMemo(() => {
    if (deferredQuery) {
      return menu.categories.flatMap((c) =>
        c.items.filter(
          (i) =>
            i.name.toLowerCase().includes(deferredQuery) ||
            (i.description ?? "").toLowerCase().includes(deferredQuery),
        ),
      );
    }
    return menu.categories.find((c) => c.id === categoryId)?.items ?? [];
  }, [menu, categoryId, deferredQuery]);

  const qtyOf = (itemId: string) =>
    basket.filter((l) => l.menuItemId === itemId).reduce((s, l) => s + l.quantity, 0);

  const add = (item: KioskMenuItem) => {
    if (item.modifierGroups.length > 0) setPicking(item);
    else onAdd({ menuItemId: item.id, name: item.name, modifierIds: [], modifierLabel: "", unitPrice: unit(item) });
  };
  const addWithChoice = (item: KioskMenuItem, c: ModifierChoice) => {
    onAdd({
      menuItemId: item.id,
      name: item.name,
      modifierIds: c.modifierIds,
      modifierLabel: c.label,
      unitPrice: unit(item, c.extra),
    });
    setPicking(null);
  };

  const count = basketCount(basket);
  const total = basketTotal(basket);

  return (
    <div className="flex h-full flex-col">
      {header}
      {unavailableNames.length > 0 && (
        <div className="px-3 pt-2 sm:px-4 sm:pt-3">
          <Banner tone="warning" title={t("kiosk.menu.unavailable", { names: unavailableNames.join(", ") })} />
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* categories: scrollable segmented pill bar on mobile, elegant vertical rail on desktop */}
        <nav
          aria-label={t("kiosk.menu.categories")}
          className="flex shrink-0 gap-2 overflow-x-auto border-b border-[#D3CBB4] bg-[#FAF7EF] p-2.5 sm:p-3 md:w-[14rem] lg:w-[16rem] md:flex-col md:overflow-y-auto md:overflow-x-hidden md:border-b-0 md:border-r no-scrollbar"
        >
          {menu.categories.map((c) => {
            const on = !deferredQuery && c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                aria-current={on ? "true" : undefined}
                onClick={() => {
                  setQuery("");
                  setCategoryId(c.id);
                }}
                className={cn(
                  "shrink-0 touch-manipulation select-none rounded-xl px-4 py-2 text-left text-sm sm:text-base font-semibold leading-tight transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A4D77]/40",
                  TOUCH,
                  on
                    ? "bg-[#2A4D77] text-white shadow-2xs font-bold"
                    : "bg-[#FAF7EF] border border-[#D3CBB4] text-[#1F334D] hover:bg-[#DCE5F0] active:bg-[#DCE5F0]/80",
                )}
              >
                {c.name}
              </button>
            );
          })}
        </nav>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#EDE7D8]">
          <div className="p-2 sm:p-3 pb-0">
            <label className="relative block">
              <span className="sr-only">{t("kiosk.menu.search")}</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4E6078]" aria-hidden />
              <input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, 40))}
                placeholder={t("kiosk.menu.search")}
                className={cn(
                  "w-full select-text rounded-2xl border border-[#D3CBB4] bg-[#FAF7EF] pl-11 pr-12 text-sm sm:text-base text-[#1F334D] placeholder:text-[#8A93A3] shadow-2xs focus-visible:border-[#2A4D77] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A4D77]/30",
                  "py-2.5",
                )}
              />
              {query && (
                <button
                  type="button"
                  aria-label={t("kiosk.menu.clearSearch")}
                  onClick={() => setQuery("")}
                  className={cn("absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full text-[#4E6078] hover:text-[#1F334D]", TOUCH)}
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              )}
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-4">
            {visible.length === 0 ? (
              <p className="py-16 text-center text-base sm:text-lg text-[#4E6078]">
                {t("kiosk.menu.searchNone", { query })}
              </p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] md:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
                {visible.map((item) => {
                  const qty = qtyOf(item.id);
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "flex overflow-hidden rounded-2xl border border-[#D3CBB4] bg-[#FAF7EF] shadow-2xs transition-all",
                        "hover:shadow-sm sm:flex-col"
                      )}
                    >
                      {item.imageUrl ? (
                        <UploadImage
                          src={item.imageUrl}
                          width={320}
                          height={128}
                          sizes="(max-width: 640px) 120px, 320px"
                          className="h-28 w-28 shrink-0 object-cover sm:h-36 sm:w-full"
                        />
                      ) : null}
                      <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-bold leading-tight text-[#1F334D]">{item.name}</h3>
                          {item.description && (
                            <p className="mt-1 line-clamp-2 text-xs sm:text-sm leading-snug text-[#4E6078]">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-[#D3CBB4]/50">
                          <span className="text-base sm:text-lg font-bold tabular-nums text-[#1F334D]">
                            {fmt(unit(item))}
                          </span>
                          <KButton
                            variant={qty > 0 ? "secondary" : "primary"}
                            onClick={() => add(item)}
                            aria-label={`${t("kiosk.menu.add")} ${item.name}`}
                            className="rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold"
                          >
                            <Plus className="h-4 w-4" aria-hidden />
                            <span>{t("kiosk.menu.add")}</span>
                            {qty > 0 && (
                              <span className="ml-1.5 rounded-full bg-[#DCE5F0] px-2 py-0.5 text-xs font-bold text-[#2A4D77] tabular-nums">
                                {qty}
                              </span>
                            )}
                          </KButton>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>

        {/* basket: side panel on wide screens */}
        <aside className="hidden w-[22rem] lg:w-[26rem] shrink-0 flex-col border-l border-[#D3CBB4] bg-[#FAF7EF] lg:flex">
          <h2 className="flex items-center gap-2.5 border-b border-[#D3CBB4] p-4 text-lg font-bold text-[#1F334D]">
            <ShoppingBag className="h-5 w-5 text-[#2A4D77]" aria-hidden />
            {t("kiosk.basket.title")}
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            {basket.length === 0 ? (
              <p className="py-12 text-center text-sm sm:text-base text-[#4E6078]">{t("kiosk.basket.empty")}</p>
            ) : (
              <BasketLines lines={basket} fmt={fmt} locked={false} onChange={onChange} />
            )}
          </div>
          <div className="space-y-3 border-t border-[#D3CBB4] p-4 bg-[#FAF7EF]">
            <div className="flex items-baseline justify-between text-lg font-bold text-[#1F334D]">
              <span>{t("kiosk.basket.total")}</span>
              <span className="tabular-nums">{fmt(total)}</span>
            </div>
            {/* Rule: Hero CTA uses Lobster Red (max 1 per screen) */}
            <KButton variant="hero" large className="w-full text-lg shadow-sm" disabled={count === 0} onClick={onReview}>
              {t("kiosk.basket.review")}
            </KButton>
          </div>
        </aside>
      </div>

      {/* basket: floating elevated bottom bar on narrow/mobile screens */}
      <div className="flex items-center justify-between gap-3 border-t border-[#D3CBB4] bg-[#FAF7EF] p-3 shadow-md lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#4E6078] uppercase tracking-wider">
            {count === 1 ? t("kiosk.basket.item") : t("kiosk.basket.items", { count })}
          </p>
          <p className="text-xl font-bold tabular-nums text-[#1F334D]">{fmt(total)}</p>
        </div>
        {/* Rule: Hero CTA uses Lobster Red */}
        <KButton variant="hero" large disabled={count === 0} onClick={onReview} className="rounded-2xl px-6 shadow-sm">
          {t("kiosk.basket.review")}
        </KButton>
      </div>

      {picking && (
        <ModifierSheet
          key={picking.id}
          item={picking}
          priceText={fmt}
          onCancel={() => setPicking(null)}
          onConfirm={(c) => addWithChoice(picking, c)}
        />
      )}
    </div>
  );
}
