"use client";

import { Globe, RefreshCw, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { useI18n, type Locale } from "@/lib/i18n/context";
import type { KioskMenu } from "@/lib/kiosk-api";
import type { ServiceType } from "@/lib/kiosk-flow";
import { Banner, KButton, TOUCH } from "./kiosk-ui";
import { cn } from "@/lib/utils";

export type MenuLoad =
  | { status: "loading" }
  | { status: "ready"; menu: KioskMenu }
  | { status: "empty"; menu: KioskMenu }
  | { status: "unreachable" }
  | { status: "notFound" };

export function WelcomeScreen({
  load,
  onRetry,
  onStart,
  locales = ["en", "es"],
}: {
  load: MenuLoad;
  onRetry: () => void;
  onStart: () => void;
  locales?: Locale[];
}) {
  const { t, locale, setLocale } = useI18n();
  const menu = load.status === "ready" || load.status === "empty" ? load.menu : null;

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-y-auto bg-[#EDE7D8] p-4 sm:p-8">
      {/* Top Bar with Language Toggle */}
      <div className="flex w-full items-center justify-end">
        <div
          role="group"
          aria-label={t("kiosk.language")}
          className="inline-flex items-center gap-1 rounded-full border border-[#D3CBB4] bg-[#FAF7EF] p-1 shadow-2xs"
        >
          <Globe className="ml-2 h-4 w-4 text-[#4E6078]" aria-hidden />
          {locales.map((l) => {
            const on = l === locale;
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                onClick={() => setLocale(l)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wider transition-all",
                  TOUCH,
                  on
                    ? "bg-[#2A4D77] text-white shadow-2xs"
                    : "text-[#4E6078] hover:text-[#1F334D]"
                )}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center Hero */}
      <div className="my-auto flex flex-col items-center justify-center gap-6 px-4 text-center">
        {menu?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={menu.logoUrl}
            alt=""
            className="h-20 w-20 sm:h-28 sm:w-28 rounded-3xl border border-[#D3CBB4] bg-[#FAF7EF] object-contain p-2 shadow-2xs"
          />
        ) : (
          <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl border border-[#D3CBB4] bg-[#FAF7EF] text-[#2A4D77] shadow-2xs">
            <UtensilsCrossed className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden />
          </div>
        )}

        <div className="max-w-lg space-y-2">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1F334D]">
            {menu?.restaurantName ?? "OrderRestro"}
          </h1>
          <p className="text-lg sm:text-2xl text-[#4E6078] font-medium">
            {t("kiosk.welcome.title")}
          </p>
        </div>

        {load.status === "ready" && (
          <KButton
            variant="hero"
            large
            onClick={onStart}
            className="w-full max-w-sm text-xl sm:text-2xl py-4 sm:py-5 rounded-2xl shadow-sm"
          >
            {t("kiosk.welcome.touch")}
          </KButton>
        )}

        {load.status === "loading" && (
          <div
            role="status"
            aria-label="loading"
            className="h-14 w-full max-w-sm animate-pulse rounded-2xl bg-[#E2DBC8] motion-reduce:animate-none"
          />
        )}

        {load.status === "empty" && (
          <div className="w-full max-w-md">
            <Banner
              tone="warning"
              title={t("kiosk.menu.empty.title")}
              action={<RetryButton onRetry={onRetry} />}
            >
              {t("kiosk.menu.empty.body")}
            </Banner>
          </div>
        )}

        {load.status === "unreachable" && (
          <div className="w-full max-w-md">
            <Banner
              tone="error"
              title={t("kiosk.load.error.title")}
              action={<RetryButton onRetry={onRetry} />}
            >
              {t("kiosk.load.error.body")}
            </Banner>
          </div>
        )}

        {load.status === "notFound" && (
          <div className="w-full max-w-md">
            <Banner tone="error" title={t("kiosk.load.notFound.title")}>
              {t("kiosk.load.notFound.body")}
            </Banner>
          </div>
        )}
      </div>

      {/* Footer subtle brand mark */}
      <div className="py-2 text-center text-xs font-semibold tracking-wider uppercase text-[#4E6078]/70">
        OrderRestro Kiosk
      </div>
    </div>
  );
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <KButton variant="secondary" onClick={onRetry} className="text-sm">
      <RefreshCw className="h-4 w-4" aria-hidden />
      {t("kiosk.load.retry")}
    </KButton>
  );
}

export function ServiceScreen({
  services,
  onChoose,
}: {
  services: { dineIn: boolean; takeaway: boolean };
  onChoose: (s: ServiceType) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-6 text-center">
      <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
        {t("kiosk.service.title")}
      </h1>
      <div className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        {services.dineIn && (
          <ServiceTile
            icon={<UtensilsCrossed className="h-12 w-12 sm:h-14 sm:w-14" aria-hidden />}
            label={t("kiosk.service.dineIn")}
            onClick={() => onChoose("DINE_IN")}
          />
        )}
        {services.takeaway && (
          <ServiceTile
            icon={<ShoppingBag className="h-12 w-12 sm:h-14 sm:w-14" aria-hidden />}
            label={t("kiosk.service.takeaway")}
            onClick={() => onChoose("TAKEAWAY")}
          />
        )}
      </div>
    </div>
  );
}

function ServiceTile({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[11rem] sm:min-h-[14rem] flex-col items-center justify-center gap-4 rounded-3xl",
        "border-2 border-border/80 bg-card p-6 text-xl sm:text-2xl font-bold text-foreground shadow-xs transition-all",
        "hover:border-primary hover:bg-secondary/30 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.98] motion-reduce:transition-none"
      )}
    >
      <span className="text-primary">{icon}</span>
      {label}
    </button>
  );
}
