"use client";

import type { IngredientUnit } from "@nodedr-restaurant/types";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { 
  AlertCircle,
  ArrowRight, 
  Check, 
  CheckCircle2, 
  ClipboardCheck, 
  Eye, 
  EyeOff, 
  FileCheck, 
  FileText,
  HelpCircle, 
  MapPin, 
  Package, 
  RefreshCcw, 
  RotateCcw, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  Warehouse 
} from "lucide-react";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { selectClass } from "@/components/inventory/production-entry-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useBranch } from "@/hooks/use-branch";
import { useIngredients } from "@/hooks/use-inventory";
import { type StockTakeResult, usePlaceMatrix, useStockItems, useStockTake } from "@/hooks/use-stock-journal";
import { ApiError } from "@/lib/api";
import { rank, STOCK_CATEGORIES, STORAGE_AREAS } from "@/lib/restaurant-stock";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export default function StockTakePage() {
  const { branchId } = useBranch();
  const searchParams = useSearchParams();
  const initialArea = searchParams.get("area") ?? "";

  const { data: ingredients, isLoading } = useIngredients(branchId);
  const { data: units } = useStockItems(branchId);
  const take = useStockTake(branchId);
  const { data: matrix } = usePlaceMatrix(branchId);
  const places = matrix?.locations ?? [];

  const [area, setArea] = useState(initialArea);
  const [blind, setBlind] = useState(false);
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [counts, setCounts] = useState<Record<string, { v: string; u: IngredientUnit | "" }>>({});
  const [result, setResult] = useState<StockTakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(() => `web-${crypto.randomUUID()}`);

  const items = useMemo(() => (ingredients ?? []).filter((i) => i.isActive !== false), [ingredients]);
  const areas = places.length 
    ? places.map((p) => p.name) 
    : [...new Set(items.map((i) => i.storageLocation).filter((x): x is string => !!x))].sort((a, b) => rank(STORAGE_AREAS, a) - rank(STORAGE_AREAS, b));

  const place = places.find((p) => p.name === area);
  const placeLevel = (id: string) => (place ? matrix?.items.find((m) => m.id === id)?.levels[place.id] : undefined);

  const shown = useMemo(() => {
    return items
      .filter((i) => {
        const matchesArea = !area || place || i.storageLocation === area;
        const matchesSearch = !search.trim() || 
          i.name.toLowerCase().includes(search.toLowerCase()) || 
          (i.category && i.category.toLowerCase().includes(search.toLowerCase())) ||
          (i.storageLocation && i.storageLocation.toLowerCase().includes(search.toLowerCase()));
        return matchesArea && matchesSearch;
      })
      .sort((a, b) => 
        rank(STOCK_CATEGORIES, a.category) - rank(STOCK_CATEGORIES, b.category) || 
        (a.category ?? "").localeCompare(b.category ?? "") || 
        a.name.localeCompare(b.name)
      );
  }, [items, area, place, search]);

  const unitsOf = (id: string) => units?.find((u) => u.id === id)?.units ?? [];
  const filled = useMemo(() => Object.entries(counts).filter(([, c]) => c.v.trim() !== ""), [counts]);

  const submit = () => {
    setError(null);
    take.mutate(
      { 
        area: area || undefined, 
        note: note || undefined, 
        idempotencyKey: key, 
        lines: filled.map(([id, c]) => ({ 
          ingredientId: id, 
          counted: c.v.trim(), 
          unit: (c.u || items.find((i) => i.id === id)!.unit) as IngredientUnit 
        })) 
      },
      {
        onSuccess: (r) => { 
          setResult(r); 
          setCounts({}); 
          setKey(`web-${crypto.randomUUID()}`); 
          toast.success("Stock count successfully saved and adjustments booked"); 
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : "Could not save the count. Nothing was changed."),
      },
    );
  };

  // Result Summary Screen after Saving Count
  if (result) {
    const changed = result.lines.filter((l) => Number(l.difference) !== 0);

    return (
      <div className="flex flex-col gap-6">
        <StockTakeHeader />
        <InventoryTabs />

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-xs flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Stock Count Saved</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                <strong>{result.lines.length}</strong> item{result.lines.length === 1 ? "" : "s"} audited.{" "}
                {changed.length > 0 ? (
                  <span>
                    <strong>{changed.length}</strong> variance{changed.length === 1 ? "" : "s"} booked into the stock ledger.
                  </span>
                ) : (
                  <span>All counted items matched system quantities exactly!</span>
                )}
              </p>
            </div>
          </div>

          {/* Variance Breakdown */}
          {changed.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-background overflow-hidden shadow-2xs">
              <div className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                Discrepancies & Adjustments Booked
              </div>
              <ul className="divide-y divide-border/60 text-xs sm:text-sm">
                {changed.map((l) => {
                  const diffNum = Number(l.difference);
                  const isNegative = diffNum < 0;
                  return (
                    <li key={l.ingredientId} className="flex items-center justify-between px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{l.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Expected {l.expected} {l.unit} → Counted {l.counted} {l.unit}
                        </span>
                      </div>
                      <Badge
                        variant={isNegative ? "destructive" : "outline"}
                        className={cn(
                          "tabular-nums text-xs font-semibold px-2.5 py-1",
                          !isNegative && "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                        )}
                      >
                        {diffNum > 0 ? `+${l.difference}` : l.difference} {l.unit}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={() => setResult(null)} className="rounded-xl shadow-xs">
              Start Another Count
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6 pb-36 lg:pb-24">
      <StockTakeHeader />
      <InventoryTabs />

      {/* Control Toolbar Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs">
        {/* Storage Area Picker */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="area-select" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Warehouse className="h-3.5 w-3.5 text-primary" />
              <span>Storage Area</span>
            </label>

            {/* Blind Count Switch */}
            <div className="flex items-center gap-2">
              {blind ? (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <label htmlFor="blind-toggle" className="text-xs text-muted-foreground cursor-pointer select-none">
                Blind count
              </label>
              <Switch
                id="blind-toggle"
                size="sm"
                checked={blind}
                onCheckedChange={setBlind}
              />
            </div>
          </div>

          {/* Area Selector: Native Select on Mobile (44pt), iOS segmented pills on Desktop */}
          <div className="block sm:hidden">
            <select
              id="area-select"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground outline-none transition-colors"
            >
              <option value="">All Storage Areas</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <button
              type="button"
              aria-pressed={!area}
              onClick={() => setArea("")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all active:scale-96",
                !area
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/60"
              )}
            >
              All Storage Areas
            </button>
            {areas.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={area === a}
                onClick={() => setArea(a)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all active:scale-96",
                  area === a
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/60"
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar + Progress Pill */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2.5 border-t border-border/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items on shelf…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 sm:h-9 text-xs sm:text-sm rounded-xl bg-background border-border/70"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <span>
              <strong>{filled.length}</strong> of <strong>{shown.length}</strong> counted
            </span>
            {filled.length > 0 && (
              <button
                type="button"
                onClick={() => setCounts({})}
                className="text-[11px] text-muted-foreground hover:text-destructive underline ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Stock Counting List */}
      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        /* Empty State */
        <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center rounded-2xl border-dashed">
          <Package className="h-8 w-8 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">No items to count in this view</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {search
              ? `No ingredients matched "${search}". Clear your search query to see other items.`
              : "No active ingredients found in this storage area. Select 'All Storage Areas' or add items."}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((i, idx) => {
            const c = counts[i.id] ?? { v: "", u: "" as const };
            const sys = place ? Number(placeLevel(i.id) ?? 0) : Number(i.currentStock);
            const isEntered = c.v.trim() !== "";
            const diff = isEntered && c.u === "" ? Number(c.v) - sys : null;
            const isHeader = idx === 0 || shown[idx - 1].category !== i.category;

            return (
              <div key={i.id} className="flex flex-col gap-1.5">
                {isHeader && (
                  <div className="flex items-center gap-2 mt-3 mb-1 px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {i.category || "General Inventory"}
                    </span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>
                )}

                <div
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all shadow-2xs",
                    isEntered
                      ? "border-primary/50 bg-primary/[0.02] ring-1 ring-primary/20"
                      : "border-border/80 bg-card hover:border-border"
                  )}
                >
                  {/* Left: Item Information */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">{i.name}</span>
                      {i.kind === "PREPARED" && (
                        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                          Kitchen Prep
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3" />
                      <span>{i.storageLocation ?? "Unassigned Location"}</span>
                      {!blind && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-foreground">
                            System: {place ? placeLevel(i.id) ?? 0 : i.currentStock} {i.unit}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Count Input & Variance Preview */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Variance Badge */}
                    {!blind && diff !== null && (
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums px-2 py-1 rounded-md shrink-0",
                          diff === 0
                            ? "text-emerald-600 bg-emerald-500/10"
                            : diff < 0
                            ? "text-destructive bg-destructive/10"
                            : "text-amber-600 bg-amber-500/10"
                        )}
                      >
                        {diff > 0 ? `+${diff}` : diff} {i.unit}
                      </span>
                    )}

                    {/* Numeric Count Input */}
                    <div className="w-28 sm:w-32">
                      <Input
                        aria-label={`Counted ${i.name}`}
                        inputMode="decimal"
                        placeholder="Count"
                        value={c.v}
                        onChange={(e) =>
                          setCounts({ ...counts, [i.id]: { ...c, v: e.target.value } })
                        }
                        className={cn(
                          "h-9 text-xs sm:text-sm font-semibold tabular-nums rounded-xl",
                          isEntered && "border-primary focus-visible:ring-primary"
                        )}
                      />
                    </div>

                    {/* Unit Selector */}
                    <div className="w-20">
                      <select
                        aria-label={`Unit for ${i.name}`}
                        className={cn(selectClass, "h-9 text-xs rounded-xl")}
                        value={c.u || i.unit}
                        onChange={(e) =>
                          setCounts({
                            ...counts,
                            [i.id]: {
                              ...c,
                              u: e.target.value === i.unit ? "" : (e.target.value as IngredientUnit),
                            },
                          })
                        }
                      >
                        {(unitsOf(i.id).length ? unitsOf(i.id) : [i.unit]).map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Sticky Action Bar */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 lg:left-64 right-0 z-20 border-t border-border/80 bg-background/95 backdrop-blur-md px-3.5 py-2.5 sm:px-6 shadow-lg">
        <div className="flex flex-row items-center justify-between gap-2.5">
          {/* Note Input with responsive 44pt mobile height */}
          <div className="relative flex-1 max-w-sm sm:max-w-md">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              aria-label="Audit Note"
              placeholder="Audit note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="pl-8 sm:pl-9 h-11 sm:h-9 text-xs sm:text-sm rounded-xl bg-background border-border/80"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-foreground">
                {filled.length} item{filled.length === 1 ? "" : "s"} ready
              </span>
              <span className="text-[10px] text-muted-foreground">Uncounted items are skipped</span>
            </div>

            {error && <span role="alert" className="text-xs text-destructive max-w-xs truncate">{error}</span>}

            <Button
              disabled={filled.length === 0 || take.isPending}
              onClick={submit}
              className="rounded-xl h-11 sm:h-9 px-3.5 sm:px-4 text-xs font-semibold shadow-xs active:scale-98 whitespace-nowrap"
            >
              {take.isPending ? "Booking…" : `Save Count (${filled.length})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StockTakeHeader() {
  return (
    <div className="flex flex-col gap-1 pb-0.5">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Stock Take Audit
        </h1>
        <Badge variant="secondary" className="text-[11px] font-medium text-muted-foreground border-border/70">
          Physical Count
        </Badge>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground">
        Perform shelf audits room-by-room. Enter physical counts; differences are automatically posted to the stock ledger.
      </p>
    </div>
  );
}
