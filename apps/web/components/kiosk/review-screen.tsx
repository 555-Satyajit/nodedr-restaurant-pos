"use client";

import { ArrowLeft, CheckCircle2, Printer, RefreshCw, WifiOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { KioskMenu } from "@/lib/kiosk-api";
import { basketCount, basketTotal, type BasketLine } from "@/lib/kiosk-basket";
import type { KioskConfirmation, SubmitState } from "@/lib/kiosk-flow";
import { orderQrPayload } from "@/lib/scan";
import { BasketLines } from "./basket-lines";
import { Banner, KButton } from "./kiosk-ui";
import { printTicket } from "./kiosk-print";

export function ReviewScreen({
  menu,
  basket,
  submit,
  locked,
  online,
  fmt,
  header,
  serviceLabel,
  onChange,
  onBack,
  onConfirm,
  onStartOver,
}: {
  menu: KioskMenu;
  basket: BasketLine[];
  submit: SubmitState;
  locked: boolean;
  online: boolean;
  fmt: (n: number) => string;
  header: React.ReactNode;
  serviceLabel: string;
  onChange: (key: string, delta: number) => void;
  onBack: () => void;
  onConfirm: () => void;
  onStartOver: () => void;
}) {
  const { t } = useI18n();
  const pending = submit.status === "pending";
  const failed = submit.status === "error" ? submit.kind : null;
  const ambiguous = failed === "network" || failed === "server";
  const taxText =
    menu.taxMode === "INCLUSIVE"
      ? t("kiosk.review.taxIncluded", { tax: menu.taxLabel })
      : t("kiosk.review.taxAdded", { tax: menu.taxLabel });

  return (
    <div className="flex h-full flex-col bg-[#EDE7D8]">
      {header}
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-5 lg:flex-row lg:gap-6">
        <section className="flex min-h-0 flex-1 flex-col rounded-2xl sm:rounded-3xl border border-[#D3CBB4] bg-[#FAF7EF] shadow-2xs">
          <h1 className="flex items-center justify-between gap-3 border-b border-[#D3CBB4] p-4 sm:p-5 text-lg sm:text-2xl font-bold text-[#1F334D]">
            {t("kiosk.review.title")}
            <span className="rounded-full bg-[#DCE5F0] px-3.5 py-1 text-xs sm:text-sm font-semibold text-[#2A4D77]">{serviceLabel}</span>
          </h1>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-5">
            <BasketLines lines={basket} fmt={fmt} locked={locked} onChange={onChange} />
          </div>
        </section>

        <section className="flex shrink-0 flex-col justify-between gap-4 rounded-2xl sm:rounded-3xl border border-[#D3CBB4] bg-[#FAF7EF] p-4 sm:p-5 shadow-2xs lg:w-[24rem] xl:w-[26rem]">
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between text-2xl sm:text-3xl font-extrabold text-[#1F334D]">
              <span>{t("kiosk.basket.total")}</span>
              <span className="tabular-nums">{fmt(basketTotal(basket))}</span>
            </div>
            <p className="text-xs sm:text-sm text-[#4E6078]">
              {basketCount(basket) === 1 ? t("kiosk.basket.item") : t("kiosk.basket.items", { count: basketCount(basket) })}
              {" · "}
              {taxText}
            </p>
            <p className="rounded-xl border border-[#D3CBB4]/60 bg-[#EDE7D8] p-2.5 text-xs sm:text-sm font-medium text-[#1F334D]">
              {t("kiosk.review.payLater")}
            </p>
          </div>

          <div className="space-y-3">
            {!online && (
              <Banner tone="error" title={t("kiosk.offline.title")}>
                {t("kiosk.offline.body")}
              </Banner>
            )}
            {failed && (
              <Banner tone="error" title={t(`kiosk.err.${failed}.title`)}>
                {failed === "validation" && submit.status === "error" && submit.message
                  ? `${t("kiosk.err.validation.body")} (${submit.message})`
                  : t(`kiosk.err.${failed}.body`)}
              </Banner>
            )}

            {/* Rule: Hero CTA uses Lobster Red, white bold text */}
            <KButton
              variant="hero"
              large
              className="w-full text-base sm:text-lg shadow-sm"
              loading={pending}
              disabled={!online || basket.length === 0}
              onClick={onConfirm}
            >
              {pending ? (
                t("kiosk.review.sending")
              ) : ambiguous ? (
                <>
                  <RefreshCw className="h-5 w-5" aria-hidden />
                  {t("kiosk.review.retry")}
                </>
              ) : (
                t("kiosk.review.confirm")
              )}
            </KButton>
            {ambiguous ? (
              <KButton variant="secondary" className="w-full" disabled={pending} onClick={onStartOver}>
                {t("kiosk.review.startOver")}
              </KButton>
            ) : (
              <KButton variant="secondary" className="w-full" disabled={pending} onClick={onBack}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t("kiosk.review.back")}
              </KButton>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function DoneScreen({
  menu,
  confirmation,
  secondsLeft,
  fmt,
  localeTag,
  online,
  onNewOrder,
}: {
  menu: KioskMenu;
  confirmation: KioskConfirmation;
  secondsLeft: number;
  fmt: (n: number | string) => string;
  localeTag: string;
  online: boolean;
  onNewOrder: () => void;
}) {
  const { t } = useI18n();
  const qrRef = useRef<HTMLDivElement>(null);
  const [printState, setPrintState] = useState<"idle" | "printing" | "unavailable">("idle");

  const print = async () => {
    setPrintState("printing");
    const ok = await printTicket({
      restaurantName: menu.restaurantName,
      orderNumber: confirmation.orderNumber,
      createdAt: confirmation.createdAt,
      serviceLabel:
        confirmation.serviceType === "DINE_IN" ? t("kiosk.service.dineIn") : t("kiosk.service.takeaway"),
      items: confirmation.items,
      subtotal: confirmation.subtotal,
      taxAmount: confirmation.taxAmount,
      totalAmount: confirmation.totalAmount,
      taxLabel: menu.taxLabel,
      taxMode: menu.taxMode,
      locale: localeTag,
      currency: confirmation.currency,
      qrSvg: qrRef.current?.innerHTML,
      labels: {
        order: t("kiosk.ticket.order"),
        total: t("kiosk.ticket.total"),
        taxIncluded: t("kiosk.ticket.taxIncluded"),
        notPaid: t("kiosk.ticket.notPaid"),
        payAtCounter: t("kiosk.ticket.payAtCounter"),
      },
    });
    setPrintState(ok ? "idle" : "unavailable");
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto p-4 sm:p-8 text-center">
      <CheckCircle2 className="h-16 w-16 sm:h-20 sm:w-20 text-[var(--success)]" aria-hidden />
      <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">{t("kiosk.done.title")}</h1>
      <div role="status" aria-live="polite" className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs w-full max-w-sm">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("kiosk.done.number")}</p>
        <p data-testid="order-number" className="text-4xl sm:text-6xl font-extrabold leading-none tracking-wide text-primary tabular-nums my-2">
          {confirmation.orderNumber.split("-").pop()}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">{confirmation.orderNumber}</p>
      </div>
      <p className="text-base sm:text-lg font-semibold text-foreground max-w-md">{t("kiosk.done.pay")}</p>
      <p className="text-sm sm:text-base tabular-nums text-muted-foreground">
        {t("kiosk.basket.total")}: <strong className="text-foreground">{fmt(confirmation.totalAmount)}</strong>
      </p>

      {printState === "unavailable" && (
        <div className="w-full max-w-md">
          <Banner tone="warning" title={t("kiosk.done.printUnavailable")} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm">
        <KButton variant="secondary" large loading={printState === "printing"} onClick={print} className="flex-1 text-sm sm:text-base">
          <Printer className="h-5 w-5" aria-hidden />
          {t("kiosk.done.print")}
        </KButton>
        <KButton variant="hero" large onClick={onNewOrder} className="flex-1 text-sm sm:text-base shadow-md">
          {t("kiosk.done.newOrder")}
        </KButton>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground tabular-nums" aria-live="off">
        {t("kiosk.done.autoReturn", { seconds: secondsLeft })}
      </p>
      {!online && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4" aria-hidden /> {t("kiosk.offline.title")}
        </div>
      )}

      {/* Source for the ticket's order QR (read by staff scanners). Not shown. */}
      <div ref={qrRef} className="hidden" aria-hidden>
        <QRCodeSVG value={orderQrPayload(confirmation.orderNumber)} size={160} marginSize={1} />
      </div>
    </div>
  );
}
