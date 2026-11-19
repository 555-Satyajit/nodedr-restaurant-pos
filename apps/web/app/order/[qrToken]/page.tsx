"use client";

import {
  BellRing,
  CheckCircle2,
  Minus,
  Plus,
  Receipt,
  Search,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Image from "next/image";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { RatingCard } from "@/components/order/rating-card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ModifierPickerDialog } from "@/components/pos/modifier-picker-dialog";
import { PopBurst } from "@/components/order/pop-burst";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/context";
import { api, ApiError } from "@/lib/api";
import { playSuccessChime, vibrateSuccess } from "@/lib/celebrate";
import { formatCurrency } from "@/lib/format";

interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  price: string;
  isVeg: boolean;
  modifierGroups: {
    modifierGroup: {
      id: string;
      name: string;
      minSelect: number;
      maxSelect: number;
      isRequired: boolean;
      modifiers: { id: string; name: string; priceAdjustment: string; isDefault: boolean }[];
    };
  }[];
}

// One cart line = an item plus its chosen options; the same item with
// different options is a separate line.
interface CartLine {
  key: string;
  menuItemId: string;
  modifierIds: string[];
  label: string;
  unitPrice: number;
  quantity: number;
}

interface PublicStatus {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    acceptance: string;
    paid: boolean;
    payIntent: "CASH" | "ONLINE" | null;
    heldForPayment: boolean;
    kitchen: "WAITING_PAYMENT" | "SENT" | "NEW" | "PREPARING" | "READY" | "SERVED";
    lastPayment: "CREATED" | "SUCCEEDED" | "FAILED" | "EXPIRED" | "NEEDS_REVIEW" | null;
    paged: boolean;
    items: { id: string; nameSnapshot: string; quantity: number; status: string }[];
  } | null;
  openRequests: ("WAITER" | "BILL")[];
}

const ITEM_STATUS_LABEL: Record<string, string> = {
  NEW: "Received",
  ACCEPTED: "Received",
  PREPARING: "Being prepared",
  READY: "Ready",
  SERVED: "Served",
  CANCELLED: "Cancelled",
};

interface PublicMenuCategory {
  id: string;
  name: string;
  items: PublicMenuItem[];
}

interface PublicMenuResponse {
  branchName: string;
  tableName: string;
  categories: PublicMenuCategory[];
  payments?: { cash: boolean; online: boolean };
  session?: { required: boolean };
}

export default function PublicMenuPage({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const { qrToken } = use(params);
  const { t } = useI18n();
  const nameStorageKey = `qr-guest-name:${qrToken}`;
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickerItem, setPickerItem] = useState<PublicMenuItem | null>(null);
  const queryClient = useQueryClient();
  const [placed, setPlaced] = useState<{ orderNumber: string } | null>(null);
  const [guestName, setGuestName] = useState("");
  const [payChoice, setPayChoice] = useState<"CASH" | "ONLINE">("CASH");
  const [payError, setPayError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // One key per basket + payment choice, kept across retries so a double tap or a dropped connection cannot make a second order.
  const attempt = useRef<{ sig: string; key: string } | null>(null);
  // The table code the staff gave the guest is traded for a grant kept only in this tab. Old or copied QR photos have none.
  const sKey = `table-session:${qrToken}`;
  const [grant, setGrant] = useState<string | null>(null);
  // A verified tag tap (see /t/[ref]) is a short-lived proof of being at THIS table. The first order opens the table and the
  // server then hands back a normal session grant, which replaces it.
  const aKey = `table-access:${qrToken}`;
  const [access, setAccess] = useState<string | null>(null);
  const grantRef = useRef<string | null>(null);
  const [codeDraft, setCodeDraft] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  const hdr = (): RequestInit => {
    const g = grantRef.current ?? grant;
    const headers: Record<string, string> = {};
    if (g) headers["X-Table-Session"] = g;
    if (access) headers["X-Table-Access"] = access;
    return Object.keys(headers).length ? { headers } : {};
  };

  const lostSession = (e: unknown) => {
    const code = e instanceof ApiError ? e.code : undefined;
    if (code === "TABLE_SESSION_REQUIRED" || code === "TABLE_SESSION_EXPIRED") {
      try {
        sessionStorage.removeItem(sKey);
        sessionStorage.removeItem(aKey);
      } catch {
        /* storage blocked */
      }
      grantRef.current = null;
      setGrant(null);
      setAccess(null);
      setSessionMsg(
        e instanceof ApiError
          ? e.message
          : "Your table session has ended. Please ask the staff for a new table code."
      );
      return true;
    }
    return false;
  };

  const joinTable = async () => {
    setJoining(true);
    setCodeError(null);
    try {
      const r = await api.post<{ token: string }>(`/public/menu/${qrToken}/session`, {
        code: codeDraft,
      });
      try {
        sessionStorage.setItem(sKey, r.token);
      } catch {
        /* storage blocked: the grant lives in memory only */
      }
      grantRef.current = r.token;
      setGrant(r.token);
      setSessionMsg(null);
      setCodeDraft("");
    } catch (e) {
      setCodeError(e instanceof ApiError ? e.message : "Could not check the code. Please try again.");
    }
    setJoining(false);
  };

  const joinToken = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("j");
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!joinToken) return;
    let alive = true;
    (async () => {
      try {
        const r = await api.post<{ token: string }>(`/public/menu/${qrToken}/session`, { joinToken });
        if (!alive) return;
        try {
          sessionStorage.setItem(sKey, r.token);
        } catch {
          /* storage blocked */
        }
        grantRef.current = r.token;
        setGrant(r.token);
        setSessionMsg(null);
      } catch (e) {
        if (alive)
          setScanMsg(
            e instanceof ApiError
              ? e.message
              : "Could not join the table. Please scan the code on the table screen again."
          );
      }
      try {
        window.history.replaceState(null, "", window.location.pathname);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [joinToken, qrToken, sKey]);

  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    try {
      const g = sessionStorage.getItem(sKey);
      if (g) {
        grantRef.current = g;
        setGrant(g);
      }
      const a = sessionStorage.getItem(aKey);
      if (a) setAccess(a);
    } catch {
      /* storage blocked */
    }
  }, [sKey, aKey]);

  useEffect(() => {
    const saved = sessionStorage.getItem(nameStorageKey);
    if (saved) setGuestName(saved);
  }, [nameStorageKey]);

  useEffect(() => {
    if (placed) {
      vibrateSuccess();
      playSuccessChime();
    }
  }, [placed]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-menu", qrToken],
    queryFn: () => api.get<PublicMenuResponse>(`/public/menu/${qrToken}`),
    retry: false,
  });

  const { data: status } = useQuery({
    queryKey: ["public-status", qrToken],
    queryFn: () => api.get<PublicStatus>(`/public/menu/${qrToken}/status`),
    refetchInterval: 8000,
    enabled: !!data,
  });

  const requestService = useMutation({
    mutationFn: (type: "WAITER" | "BILL") =>
      api.post(`/public/menu/${qrToken}/request`, { type }, hdr()),
    onError: (e) => {
      lostSession(e);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["public-status", qrToken] }),
  });

  const startOnlinePayment = async (orderId: string) => {
    setPayError(null);
    try {
      const pay = await api.post<{ checkoutUrl: string | null }>(
        `/public/menu/${qrToken}/orders/${orderId}/pay-online`,
        { origin: window.location.origin },
        hdr()
      );
      if (!pay.checkoutUrl) throw new Error("no link");
      window.location.href = pay.checkoutUrl;
    } catch (e) {
      setPayError(
        e instanceof ApiError
          ? e.message
          : "We could not open the payment page. You can try again or pay at the register."
      );
      void queryClient.invalidateQueries({ queryKey: ["public-status", qrToken] });
    }
  };

  const payAtRegister = useMutation({
    mutationFn: (orderId: string) =>
      api.post(`/public/menu/${qrToken}/orders/${orderId}/pay-cash`, undefined, hdr()),
    onSuccess: () => {
      setPayError(null);
      void queryClient.invalidateQueries({ queryKey: ["public-status", qrToken] });
    },
    onError: (e) =>
      setPayError(e instanceof ApiError ? e.message : "Could not change that. Please ask the staff."),
  });

  const placeOrder = useMutation({
    mutationFn: () => {
      const items = cart.map((l) => ({
        menuItemId: l.menuItemId,
        quantity: l.quantity,
        modifierIds: l.modifierIds,
      }));
      const sig = JSON.stringify([items, payChoice, guestName]);
      if (!attempt.current || attempt.current.sig !== sig)
        attempt.current = { sig, key: crypto.randomUUID() };
      return api.post<{
        id: string;
        orderNumber: string;
        ratingToken?: string;
        sessionGrant?: string;
      }>(
        `/public/menu/${qrToken}/order`,
        { guestName, items, payment: payChoice, idempotencyKey: attempt.current.key },
        hdr()
      );
    },
    onError: (e) => {
      lostSession(e);
    },
    onSuccess: async (order) => {
      attempt.current = null;
      if (order.sessionGrant) {
        try {
          sessionStorage.setItem(sKey, order.sessionGrant);
          sessionStorage.removeItem(aKey);
        } catch {
          /* storage blocked */
        }
        grantRef.current = order.sessionGrant;
        setGrant(order.sessionGrant);
        setAccess(null);
      }
      try {
        if ((order as { ratingToken?: string }).ratingToken)
          localStorage.setItem(`rating-token:${order.id}`, (order as { ratingToken?: string }).ratingToken!);
      } catch {
        /* storage blocked */
      }
      setPlaced(order);
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ["public-status", qrToken] });
      if (payChoice === "ONLINE") await startOnlinePayment(order.id);
    },
  });

  const confirmName = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    sessionStorage.setItem(nameStorageKey, trimmed);
    setGuestName(trimmed);
  };

  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const quantityOfItem = (itemId: string) =>
    cart.filter((l) => l.menuItemId === itemId).reduce((sum, l) => sum + l.quantity, 0);

  const addLine = (item: PublicMenuItem, modifierIds: string[], label: string, extra: number) => {
    const key = `${item.id}:${[...modifierIds].sort().join(",")}`;
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...prev,
        { key, menuItemId: item.id, modifierIds, label, unitPrice: Number(item.price) + extra, quantity: 1 },
      ];
    });
  };

  const handleAdd = (item: PublicMenuItem) => {
    if (item.modifierGroups.length > 0) setPickerItem(item);
    else addLine(item, [], "", 0);
  };

  const removeOne = (itemId: string) =>
    setCart((prev) => {
      const idx = [...prev].reverse().findIndex((l) => l.menuItemId === itemId);
      if (idx < 0) return prev;
      const at = prev.length - 1 - idx;
      return prev
        .map((l, i) => (i === at ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0);
    });

  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.categories;
    return data.categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [data?.categories, searchQuery]);

  const scrollToCategory = (catId: string) => {
    setActiveCategoryId(catId);
    const el = document.getElementById(`cat-${catId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#EDE7D8] px-6 text-center text-[#1F334D]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF7EF] border border-[#D3CBB4] shadow-sm">
          <UtensilsCrossed className="h-8 w-8 text-[#2A4D77]" />
        </div>
        <p className="text-xl font-bold tracking-tight text-[#1F334D]">{t("order.qrNotRecognized")}</p>
        <p className="max-w-xs text-sm text-[#5B6B7C]">
          {error instanceof ApiError ? error.message : t("order.askStaffForHelp")}
        </p>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#EDE7D8] px-6 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#E5F5EC] border border-[#2E7D32]/30 shadow-md">
          <PopBurst />
          <CheckCircle2 className="h-9 w-9 text-[#2E7D32]" />
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold tracking-tight text-[#1F334D]">
            {t("order.thankYouName", { name: guestName })}
          </p>
          <p className="text-sm text-[#5B6B7C]">
            {t("order.thanksMessage", { branch: data?.branchName ?? t("order.theKitchen") })}
          </p>
        </div>
        <div className="rounded-2xl border border-[#D3CBB4] bg-[#FAF7EF] px-5 py-3 shadow-sm">
          <p className="text-xs uppercase font-medium tracking-wider text-[#5B6B7C]">Order Number</p>
          <p className="text-xl font-black tracking-widest text-[#2A4D77]">{placed.orderNumber}</p>
        </div>
        <Button
          variant="outline"
          className="mt-3 h-12 rounded-xl border-[#D3CBB4] bg-[#FAF7EF] px-6 font-semibold text-[#1F334D] hover:bg-[#EDE7D8]"
          onClick={() => setPlaced(null)}
        >
          {t("order.orderMore")}
        </Button>
      </div>
    );
  }

  if (!guestName) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-[#EDE7D8] px-6 text-center">
        <div className="absolute right-4 top-4">
          <LanguageSwitcher compact />
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF7EF] border border-[#D3CBB4] shadow-sm">
          <UtensilsCrossed className="h-8 w-8 text-[#2A4D77]" />
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-44 rounded-xl bg-[#D3CBB4]/50" />
        ) : (
          <div className="space-y-1">
            <span className="inline-flex items-center rounded-full bg-[#DCE5F0] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#2A4D77]">
              {data?.tableName || "Table"}
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-[#1F334D]">
              {data?.branchName}
            </h1>
            <p className="text-sm text-[#5B6B7C]">Welcome! Please enter your name to view the menu</p>
          </div>
        )}
        <form
          className="flex w-full max-w-xs flex-col gap-4 rounded-3xl border border-[#D3CBB4] bg-[#FAF7EF] p-6 shadow-md"
          onSubmit={(e) => {
            e.preventDefault();
            confirmName();
          }}
        >
          <div className="flex flex-col gap-2 text-left">
            <Label htmlFor="guest-name" className="text-xs font-semibold uppercase tracking-wider text-[#5B6B7C]">
              {t("order.whatsYourName")}
            </Label>
            <Input
              id="guest-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={t("order.namePlaceholder")}
              autoFocus
              maxLength={60}
              className="h-12 rounded-xl border-[#D3CBB4] bg-[#EDE7D8]/60 text-base font-medium text-[#1F334D] focus-visible:ring-[#2A4D77]"
            />
          </div>
          <Button
            type="submit"
            className="h-12 rounded-xl bg-[#F03A2A] text-base font-bold text-white shadow-sm hover:bg-[#D93025] disabled:opacity-50"
            disabled={!nameDraft.trim()}
          >
            {t("order.continueToMenu")}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#EDE7D8] pb-36 text-[#1F334D]">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-[#D3CBB4] bg-[#FAF7EF]/90 backdrop-blur-md px-4 py-3 shadow-xs">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2A4D77] text-white shadow-xs">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold leading-tight text-[#1F334D]">{data?.branchName}</h1>
                <span className="rounded-full bg-[#DCE5F0] px-2 py-0.5 text-[11px] font-bold text-[#2A4D77]">
                  {data?.tableName}
                </span>
              </div>
              <p className="text-xs text-[#5B6B7C] flex items-center gap-1">
                <span>Guest: <strong className="text-[#1F334D]">{guestName}</strong></span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
          </div>
        </div>

        {/* Search bar */}
        <div className="mx-auto mt-3 max-w-2xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6B7C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, drinks, appetizers..."
              className="h-10 w-full rounded-xl border border-[#D3CBB4] bg-[#EDE7D8]/80 pl-10 pr-9 text-sm text-[#1F334D] placeholder:text-[#5B6B7C] focus:border-[#2A4D77] focus:bg-[#FAF7EF] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6B7C] hover:text-[#1F334D]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Slider */}
        {data?.categories && data.categories.length > 1 && !searchQuery && (
          <div className="no-scrollbar -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 pt-1">
            {data.categories.map((cat) => {
              const active = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCategory(cat.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#2A4D77] text-white shadow-xs"
                      : "border border-[#D3CBB4] bg-[#FAF7EF] text-[#5B6B7C] hover:border-[#2A4D77]/40 hover:text-[#1F334D]"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-2xl px-4 pt-5">
        {/* Table code / verification warning if needed */}
        {data?.session?.required && !grant && access && (
          <div className="mb-4 rounded-2xl border border-[#2E7D32]/30 bg-[#E5F5EC] p-3 text-xs font-medium text-[#2E7D32]" data-testid="tap-verified">
            ✓ Your table is verified. Your first order opens the table session.
          </div>
        )}

        {data?.session?.required && !grant && !access && (
          <section aria-label="Table code" className="mb-6">
            <div className="rounded-3xl border border-[#2A4D77]/30 bg-[#FAF7EF] p-5 shadow-sm">
              <h2 className="text-base font-bold text-[#1F334D]">Scan the code on your table to order</h2>
              <p className="mt-1 text-xs text-[#5B6B7C]">
                You can browse the menu now. To place an order, scan the QR code on your table screen or enter your 6-character code below.
              </p>
              {scanMsg && <p role="alert" className="mt-2 text-xs font-medium text-[#F03A2A]">{scanMsg}</p>}
              {sessionMsg && <p role="alert" className="mt-2 text-xs font-medium text-[#F03A2A]">{sessionMsg}</p>}
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (codeDraft.trim().length >= 6) void joinTable();
                }}
              >
                <input
                  id="table-code"
                  value={codeDraft}
                  onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                  maxLength={8}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  className="h-12 min-w-0 flex-1 rounded-xl border border-[#D3CBB4] bg-[#EDE7D8]/60 px-3 text-center text-lg font-bold uppercase tracking-[0.25em] text-[#1F334D] focus:border-[#2A4D77] focus:outline-none"
                  placeholder="ABC234"
                />
                <Button
                  type="submit"
                  className="h-12 rounded-xl bg-[#2A4D77] px-5 font-semibold text-white hover:bg-[#1F334D]"
                  disabled={joining || codeDraft.trim().length < 6}
                >
                  {joining ? "Checking…" : "Join"}
                </Button>
              </form>
              {codeError && <p role="alert" className="mt-2 text-xs font-medium text-[#F03A2A]">{codeError}</p>}
            </div>
          </section>
        )}

        {/* Existing Order Status Card & Service Calls */}
        {status && (status.order || status.openRequests.length > 0) && (
          <section className="mb-6">
            {status.order && (
              <div className="mb-4 rounded-3xl border border-[#D3CBB4] bg-[#FAF7EF] p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#D3CBB4]/60 pb-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5B6B7C]">Active Order</span>
                    <p className="text-base font-bold text-[#1F334D]">#{status.order.orderNumber}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      status.order.paid
                        ? "bg-[#E5F5EC] text-[#2E7D32]"
                        : "bg-[#FFF3E0] text-[#B76E00]"
                    }`}
                  >
                    {status.order.paid ? "Paid" : "Unpaid"}
                  </span>
                </div>

                {status.order.paged && (
                  <div role="alert" className="mt-3 flex items-center gap-2 rounded-xl bg-[#E5F5EC] p-3 text-sm font-bold text-[#2E7D32]">
                    <Sparkles className="h-5 w-5 shrink-0" />
                    <span>Your food is ready! Please collect it now.</span>
                  </div>
                )}

                <p className="mt-3 text-sm font-medium text-[#1F334D]" data-testid="order-state">
                  {{
                    WAITING_PAYMENT: "The kitchen will start as soon as payment is confirmed.",
                    SENT: "Sent to the kitchen.",
                    NEW: "The kitchen has received your order.",
                    PREPARING: "Being prepared by the kitchen crew.",
                    READY: "Ready! Please collect it.",
                    SERVED: "Served. Enjoy your meal!",
                  }[status.order.kitchen]}
                </p>

                {status.order.paid && (
                  <div className="mt-4">
                    <RatingCard orderId={status.order.id} />
                  </div>
                )}

                {!status.order.paid && status.order.payIntent === "ONLINE" && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl bg-[#FFF8E1] p-3">
                    <p className="text-xs text-[#B76E00]">Online payment selected.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-lg bg-[#2A4D77] text-white hover:bg-[#1F334D]"
                        onClick={() => void startOnlinePayment(status.order!.id)}
                      >
                        {status.order.lastPayment === "FAILED" || status.order.lastPayment === "EXPIRED"
                          ? "Retry Payment"
                          : "Pay Now Online"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-[#D3CBB4] bg-white text-xs font-semibold text-[#1F334D]"
                        disabled={payAtRegister.isPending}
                        onClick={() => payAtRegister.mutate(status.order!.id)}
                      >
                        Pay at Register Instead
                      </Button>
                    </div>
                    {payError && <p role="alert" className="text-xs font-semibold text-[#F03A2A]">{payError}</p>}
                  </div>
                )}

                <ul className="mt-3 space-y-1.5 divide-y divide-[#D3CBB4]/40 pt-2 text-xs text-[#5B6B7C]">
                  {status.order.items.map((i) => (
                    <li key={i.id} className="flex justify-between pt-1.5">
                      <span className="font-medium text-[#1F334D]">
                        {i.quantity} × {i.nameSnapshot}
                      </span>
                      <span className="rounded bg-[#EDE7D8] px-2 py-0.5 font-bold text-[#2A4D77]">
                        {ITEM_STATUS_LABEL[i.status] ?? i.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Staff Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl border-[#D3CBB4] bg-[#FAF7EF] text-xs font-bold text-[#1F334D] shadow-xs hover:bg-[#EDE7D8]"
                disabled={requestService.isPending || status.openRequests.includes("WAITER")}
                onClick={() => requestService.mutate("WAITER")}
              >
                <BellRing className="mr-1.5 h-4 w-4 text-[#2A4D77]" />
                {status.openRequests.includes("WAITER") ? "Waiter requested" : "Call waiter"}
              </Button>
              {status.order && (
                <Button
                  variant="outline"
                  className="h-11 flex-1 rounded-xl border-[#D3CBB4] bg-[#FAF7EF] text-xs font-bold text-[#1F334D] shadow-xs hover:bg-[#EDE7D8]"
                  disabled={requestService.isPending || status.openRequests.includes("BILL")}
                  onClick={() => requestService.mutate("BILL")}
                >
                  <Receipt className="mr-1.5 h-4 w-4 text-[#2A4D77]" />
                  {status.openRequests.includes("BILL") ? "Bill requested" : "Request bill"}
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Dish List by Category */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl bg-[#D3CBB4]/40" />
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-12 text-center text-[#5B6B7C]">
            <UtensilsCrossed className="mx-auto h-10 w-10 text-[#D3CBB4]" />
            <p className="mt-2 text-sm font-semibold">No dishes found</p>
            <p className="text-xs">Try searching for something else.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCategories.map((category) => (
              <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-36">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#2A4D77]">
                    {category.name}
                  </h2>
                  <span className="text-xs font-semibold text-[#5B6B7C]">
                    {category.items.length} {category.items.length === 1 ? "item" : "items"}
                  </span>
                </div>

                {/* Items in Category */}
                <div className="space-y-3">
                  {category.items.map((item) => {
                    const quantity = quantityOfItem(item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[#D3CBB4] bg-[#FAF7EF] p-3.5 shadow-xs transition-shadow hover:shadow-sm"
                      >
                        {/* Item Info Column */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {/* Veg / Non-Veg Indicator */}
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${
                                item.isVeg
                                  ? "border-[#2E7D32] bg-white"
                                  : "border-[#C62828] bg-white"
                              }`}
                              title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  item.isVeg ? "bg-[#2E7D32]" : "bg-[#C62828]"
                                }`}
                              />
                            </span>
                            <h3 className="truncate text-sm font-bold text-[#1F334D]">
                              {item.name}
                            </h3>
                          </div>

                          {item.description && (
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5B6B7C]">
                              {item.description}
                            </p>
                          )}

                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm font-black tabular-nums text-[#1F334D]">
                              {formatCurrency(item.price)}
                            </span>
                            {item.modifierGroups && item.modifierGroups.length > 0 && (
                              <span className="text-[11px] font-medium text-[#2A4D77]">
                                • Customizable
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Image + Add/Stepper Column */}
                        <div className="relative flex shrink-0 flex-col items-center">
                          {item.imageUrl ? (
                            <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#D3CBB4]/50 bg-[#EDE7D8]">
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-[#D3CBB4]/50 bg-[#EDE7D8]/60 text-[#5B6B7C]">
                              <UtensilsCrossed className="h-6 w-6 opacity-40" />
                            </div>
                          )}

                          {/* Add button / Stepper overlapping or placed under the image */}
                          <div className="-mt-3.5 z-10">
                            {quantity > 0 ? (
                              <div className="flex items-center gap-1 rounded-xl border border-[#D3CBB4] bg-[#FAF7EF] px-1 py-0.5 shadow-sm">
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EDE7D8] text-[#1F334D] hover:bg-[#D3CBB4]/70 active:scale-95"
                                  onClick={() => removeOne(item.id)}
                                  aria-label="Remove one"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-5 text-center text-xs font-bold tabular-nums text-[#1F334D]">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2A4D77] text-white hover:bg-[#1F334D] active:scale-95"
                                  onClick={() => handleAdd(item)}
                                  aria-label="Add one more"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="h-8 rounded-xl border border-[#2A4D77]/30 bg-[#FAF7EF] px-4 text-xs font-bold uppercase tracking-wider text-[#2A4D77] shadow-sm hover:bg-[#2A4D77] hover:text-white active:scale-95 transition-colors"
                                onClick={() => handleAdd(item)}
                              >
                                {t("order.add")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Modifier Picker Dialog */}
      <ModifierPickerDialog
        item={pickerItem}
        open={!!pickerItem}
        onOpenChange={(open) => !open && setPickerItem(null)}
        onConfirm={(ids, label) => {
          if (!pickerItem) return;
          const extra = ids.reduce((sum, id) => {
            const m = pickerItem.modifierGroups
              .flatMap((g) => g.modifierGroup.modifiers)
              .find((x) => x.id === id);
            return sum + (m ? Number(m.priceAdjustment) : 0);
          }, 0);
          addLine(pickerItem, ids, label, extra);
        }}
      />

      <footer className="mt-8 border-t border-[#D3CBB4] px-5 py-6 text-center text-xs text-[#5B6B7C]">
        {t("order.pricesIncludeTax")}
      </footer>

      {/* Floating Bottom Cart Review & Place Order Bar (Apple HIG Glass Surface) */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D3CBB4] bg-[#FAF7EF]/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_24px_rgba(31,51,77,0.08)]">
          <div className="mx-auto max-w-2xl">
            {data?.payments?.online && (
              <fieldset
                className="mb-2.5 flex gap-2"
                aria-label="How will you pay?"
              >
                {([
                  ["CASH", "Pay at Register"],
                  ["ONLINE", "Pay Online on Phone"],
                ] as const).map(([v, label]) => (
                  <label
                    key={v}
                    className={`flex-1 cursor-pointer rounded-xl border py-2 text-center text-xs font-bold transition-all ${
                      payChoice === v
                        ? "border-[#2A4D77] bg-[#DCE5F0] text-[#2A4D77]"
                        : "border-[#D3CBB4] bg-[#EDE7D8]/60 text-[#5B6B7C]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pay"
                      className="sr-only"
                      checked={payChoice === v}
                      onChange={() => setPayChoice(v)}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            )}

            {!data?.payments?.online && (
              <p className="mb-2 text-center text-xs font-medium text-[#5B6B7C]">
                Payment will be collected at the register.
              </p>
            )}

            {/* Hero CTA Button: 10% Lobster Red */}
            <div className="flex items-center gap-3">
              <Button
                className="h-13 w-full rounded-2xl bg-[#F03A2A] text-base font-black text-white shadow-md hover:bg-[#D93025] active:scale-[0.99] disabled:opacity-50"
                disabled={placeOrder.isPending || (!!data?.session?.required && !grant && !access)}
                onClick={() => placeOrder.mutate()}
              >
                <div className="flex w-full items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                      {cartCount}
                    </span>
                    <span>{placeOrder.isPending ? t("order.placingOrder") : t("order.placeOrder")}</span>
                  </div>
                  <span className="text-lg font-black tracking-tight">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
              </Button>
            </div>

            {placeOrder.isError && (
              <p className="mt-2 text-center text-xs font-semibold text-[#F03A2A]">
                {placeOrder.error instanceof ApiError
                  ? placeOrder.error.message
                  : t("order.couldNotPlace")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
