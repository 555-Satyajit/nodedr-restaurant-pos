"use client";

import { useState } from "react";
import { 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  ChefHat, 
  Clock, 
  Cog, 
  Download, 
  Factory, 
  FileSpreadsheet, 
  FileText, 
  History, 
  Layers, 
  MapPin, 
  PackageCheck, 
  Plus, 
  RefreshCcw, 
  RotateCcw, 
  SlidersHorizontal, 
  Sparkles, 
  User 
} from "lucide-react";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { StockJournalVoucher } from "@/components/inventory/stock-journal-voucher";
import { ManufacturingBatchDialog } from "@/components/inventory/manufacturing-batch-dialog";
import { useMfgSettings, useSetMfgEnabled } from "@/hooks/use-manufacturing";
import { ProductionEntryDialog, selectClass } from "@/components/inventory/production-entry-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import {
  csvUrl,
  type ProductionEntry,
  useProductionAction,
  useProductionEntries,
  useProductionReport,
  useStockItems,
} from "@/hooks/use-stock-journal";
import { ApiError } from "@/lib/api";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);
const startOf = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : undefined);
const endOf = (d: string) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : undefined);

const STATUS_LABEL = { DRAFT: "Draft", POSTED: "Posted", VOIDED: "Reversed" } as const;

export default function ProductionPage() {
  const { branchId } = useBranch();
  const { data: me } = useCurrentUser();
  const canReverse = hasPermission(me?.user, "production.void");
  const canAdmin = hasPermission(me?.user, "settings.manage");

  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [productId, setProductId] = useState("");
  const [shift, setShift] = useState("");
  const [location, setLocation] = useState("");

  const filters = { from: startOf(from), to: endOf(to), productId, shift, location };
  const { data: items } = useStockItems(branchId);
  const { data: entries, isLoading, isError } = useProductionEntries(branchId, filters);
  const { data: report } = useProductionReport(branchId, filters);
  const act = useProductionAction(branchId);

  const [creating, setCreating] = useState(false);
  const [costed, setCosted] = useState(false);
  const [voucher, setVoucher] = useState(false);
  const { data: mfg } = useMfgSettings(branchId);
  const setMfg = useSetMfgEnabled(branchId);

  const [correcting, setCorrecting] = useState<ProductionEntry | null>(null);
  const [voiding, setVoiding] = useState<ProductionEntry | null>(null);
  const [reason, setReason] = useState("");
  const [voidError, setVoidError] = useState<string | null>(null);

  const doVoid = () => {
    if (!voiding) return;
    setVoidError(null);
    act.mutate(
      { id: voiding.id, action: "void", body: { reason } },
      {
        onSuccess: () => {
          toast.success("Entry reversed. Raw ingredients returned to stock.");
          setVoiding(null);
          setReason("");
        },
        onError: (e) => setVoidError(e instanceof ApiError ? e.message : "Could not reverse entry"),
      },
    );
  };

  const totalEntries = entries?.length ?? 0;
  const postedEntries = entries?.filter((e) => e.status === "POSTED").length ?? 0;
  const draftEntries = entries?.filter((e) => e.status === "DRAFT").length ?? 0;

  return (
    <div className="flex flex-col gap-5 sm:gap-6 pb-20">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Kitchen Production & Prep
            </h1>
            <Badge variant="secondary" className="text-[11px] font-medium text-muted-foreground border-border/70">
              Batch Manufacturing
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Record kitchen cooking batches, consume raw ingredients, and yield finished prepared foods
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setVoucher(true)} 
            className="rounded-xl text-xs gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Journal Voucher</span>
          </Button>

          {mfg?.enabled && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCosted(true)} 
              className="rounded-xl text-xs gap-1.5 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Guided Costed Batch</span>
            </Button>
          )}

          <Button 
            size="sm" 
            onClick={() => setCreating(true)} 
            className="rounded-xl text-xs font-semibold shadow-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{mfg?.enabled ? "Standard Batch" : "New Production Entry"}</span>
          </Button>
        </div>
      </div>

      <InventoryTabs />

      {/* Manufacturing Mode Banner */}
      {canAdmin && mfg && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0", mfg.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              <Factory className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-semibold text-foreground">
                Kitchen Recipe Costing & Manufacturing: {mfg.enabled ? "Enabled" : "Disabled"}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                {mfg.enabled
                  ? "Batches automatically compute real ingredient unit costs and margin markups. Integrated with the live POS."
                  : "Turn costing on to track exact recipe yields, unit preparation costs, and suggested menu retail pricing."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <span className="text-xs text-muted-foreground select-none">Costing Engine</span>
            <Switch
              size="sm"
              checked={mfg.enabled}
              onCheckedChange={() => {
                if (!mfg.enabled || window.confirm("Turn off manufacturing costing? Past batches remain stored.")) {
                  setMfg.mutate(!mfg.enabled, { onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to toggle costing") });
                }
              }}
              disabled={setMfg.isPending}
            />
          </div>
        </div>
      )}

      {/* Production Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Recorded Batches</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ChefHat className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex flex-col">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {totalEntries}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              In selected date range
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Posted & Deducted</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <PackageCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex flex-col">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">
              {postedEntries}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              Stock levels adjusted
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Pending Drafts</span>
            <div className={cn("flex h-7 w-7 items-center justify-center rounded-xl", draftEntries > 0 ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground")}>
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex flex-col">
            <span className={cn("text-xl sm:text-2xl font-bold tracking-tight tabular-nums", draftEntries > 0 ? "text-amber-500" : "text-foreground")}>
              {draftEntries}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              Awaiting final verification
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Unique Outputs</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex flex-col">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {report?.produced.length ?? 0}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              Distinct items prepared
            </span>
          </div>
        </div>
      </div>

      {/* Date & Filter Toolbar Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Filter Production History</span>
          </span>

          <a
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            href={csvUrl("production/export.csv", branchId, filters)}
            download
          >
            <Download className="h-3 w-3 text-muted-foreground" />
            <span>Export CSV</span>
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* From Date */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="f-from" className="text-[11px] text-muted-foreground">From Date</Label>
            <Input
              id="f-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 text-xs rounded-xl bg-background"
            />
          </div>

          {/* To Date */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="f-to" className="text-[11px] text-muted-foreground">To Date</Label>
            <Input
              id="f-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 text-xs rounded-xl bg-background"
            />
          </div>

          {/* Product Filter */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="f-prod" className="text-[11px] text-muted-foreground">Prepared Dish</Label>
            <select
              id="f-prod"
              className={cn(selectClass, "h-9 text-xs rounded-xl bg-background")}
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">All Prepared Items</option>
              {(items ?? [])
                .filter((i) => i.kind === "PREPARED")
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Shift Filter */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="f-shift" className="text-[11px] text-muted-foreground">Kitchen Shift</Label>
            <select
              id="f-shift"
              className={cn(selectClass, "h-9 text-xs rounded-xl bg-background")}
              value={shift}
              onChange={(e) => setShift(e.target.value)}
            >
              <option value="">All Shifts</option>
              {["Morning", "Afternoon", "Evening", "Night"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="f-loc" className="text-[11px] text-muted-foreground">Kitchen Station</Label>
            <Input
              id="f-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Main Kitchen, Bakery"
              className="h-9 text-xs rounded-xl bg-background"
            />
          </div>
        </div>
      </div>

      {/* Production Summary Cards (Output vs Inputs) */}
      {report && report.entryCount > 0 && (
        <section aria-label="Daily summary" className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {/* Produced Items Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Food Produced (Outputs)
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                {report.produced.length} item{report.produced.length === 1 ? "" : "s"}
              </span>
            </div>

            <ul className="flex flex-col gap-2 divide-y divide-border/40 text-xs sm:text-sm">
              {report.produced.map((p) => (
                <li key={p.ingredientId} className="flex items-center justify-between pt-1.5 first:pt-0">
                  <span className="font-semibold text-foreground">{p.name}</span>
                  <Badge variant="secondary" className="font-bold tabular-nums text-xs px-2.5 py-0.5">
                    +{p.quantity} {p.unit}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          {/* Consumed Raw Materials Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Ingredients Deducted (Inputs)
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                {report.consumed.length} item{report.consumed.length === 1 ? "" : "s"}
              </span>
            </div>

            <ul className="flex flex-col gap-2 divide-y divide-border/40 text-xs sm:text-sm">
              {report.consumed.map((p) => (
                <li key={p.ingredientId} className="flex items-center justify-between pt-1.5 first:pt-0">
                  <span className="text-foreground">{p.name}</span>
                  <span className="font-semibold tabular-nums text-xs text-muted-foreground">
                    -{p.quantity} {p.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Production Entries List */}
      <section aria-label="Entries" className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Production Entry Records
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <Card className="p-8 text-center text-sm text-destructive rounded-2xl border-dashed">
            Could not load production records. Please check your connection.
          </Card>
        ) : entries && entries.length > 0 ? (
          <div className="flex flex-col gap-3">
            {entries.map((e) => {
              const isPosted = e.status === "POSTED";
              const isDraft = e.status === "DRAFT";
              const isVoided = e.status === "VOIDED";

              return (
                <div
                  key={e.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs hover:border-border transition-all"
                >
                  {/* Top Bar: Entry No, Badge, Metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{e.entryNo}</span>
                      <Badge
                        variant={isPosted ? "default" : isVoided ? "destructive" : "secondary"}
                        className={cn(
                          "text-[10px] uppercase font-semibold px-2 py-0.2",
                          isPosted && "bg-emerald-600 hover:bg-emerald-600"
                        )}
                      >
                        {STATUS_LABEL[e.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.producedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {e.shift && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {e.shift}
                        </span>
                      )}
                      {e.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {e.location}
                        </span>
                      )}
                      {e.responsibleName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {e.responsibleName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body: Made vs Used Grid */}
                  <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                    {/* Outputs */}
                    <div className="flex flex-col gap-1.5 rounded-xl bg-primary/[0.03] border border-primary/10 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        Prepared Food (Yield)
                      </span>
                      <div className="flex flex-col gap-1">
                        {e.lines
                          .filter((l) => l.role === "OUTPUT")
                          .map((l) => (
                            <div key={l.id} className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">{l.ingredient.name}</span>
                              <span className="font-bold tabular-nums text-primary">
                                +{l.enteredQuantity} {l.enteredUnit}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="flex flex-col gap-1.5 rounded-xl bg-muted/40 border border-border/40 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Raw Ingredients (Consumed)
                      </span>
                      <div className="flex flex-col gap-1">
                        {e.lines
                          .filter((l) => l.role === "INPUT")
                          .map((l) => (
                            <div key={l.id} className="flex items-center justify-between">
                              <span className="text-foreground">{l.ingredient.name}</span>
                              <span className="font-medium tabular-nums text-muted-foreground">
                                -{l.enteredQuantity} {l.enteredUnit}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Audit / Correction Cues */}
                  {e.voidReason && (
                    <div className="text-xs text-destructive rounded-lg bg-destructive/10 p-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Reversed: {e.voidReason}</span>
                    </div>
                  )}

                  {e.correctsEntry && (
                    <p className="text-xs text-muted-foreground">
                      Correction for earlier entry <strong>{e.correctsEntry.entryNo}</strong>
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                    {isDraft && (
                      <Button
                        size="sm"
                        className="rounded-xl h-8 px-3 text-xs font-semibold"
                        onClick={() =>
                          act.mutate(
                            { id: e.id, action: "post" },
                            {
                              onSuccess: () => toast.success("Production batch posted to stock"),
                              onError: (er) =>
                                toast.error(er instanceof ApiError ? er.message : "Could not post batch"),
                            }
                          )
                        }
                      >
                        Post Batch to Stock
                      </Button>
                    )}

                    {isPosted && canReverse && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCorrecting(e)}
                          className="rounded-xl h-8 text-xs"
                        >
                          Correct Batch
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setVoiding(e);
                            setVoidError(null);
                          }}
                          className="rounded-xl h-8 text-xs"
                        >
                          Reverse Entry
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center rounded-2xl border-dashed bg-card/60">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ChefHat className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="text-base font-semibold text-foreground">No Production Batches Found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                No food preparation batches have been recorded for the selected date range. Record a daily prep batch to update raw stock.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setCreating(true)}
              className="rounded-xl text-xs font-semibold shadow-xs gap-1.5 mt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record First Batch</span>
            </Button>
          </Card>
        )}
      </section>

      {/* Dialog Modals */}
      {voucher && <StockJournalVoucher branchId={branchId} open onOpenChange={setVoucher} />}
      {costed && <ManufacturingBatchDialog branchId={branchId} open onOpenChange={setCosted} />}
      {creating && <ProductionEntryDialog key="new" branchId={branchId} open onOpenChange={setCreating} />}
      {correcting && (
        <ProductionEntryDialog
          key={correcting.id}
          branchId={branchId}
          open
          correcting={correcting}
          onOpenChange={(o) => !o && setCorrecting(null)}
        />
      )}

      {/* Reverse / Void Confirmation Dialog */}
      <Dialog open={!!voiding} onOpenChange={(o) => !o && setVoiding(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reverse {voiding?.entryNo}?</DialogTitle>
            <DialogDescription>
              Consumed raw ingredients will be returned to stock, and the prepared output quantity will be deducted. The entry remains preserved in history as reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="v-reason" className="text-xs font-medium text-foreground">
              Reason for Reversal
            </Label>
            <Input
              id="v-reason"
              placeholder="e.g. Batch spoiled, wrong ingredient ratio entered"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
              className="h-9 text-xs rounded-xl"
            />
          </div>
          {voidError && <p role="alert" className="text-xs text-destructive rounded-lg bg-destructive/10 p-2">{voidError}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setVoiding(null)}>
              Keep Batch
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 3 || act.isPending}
              onClick={doVoid}
            >
              {act.isPending ? "Reversing…" : "Confirm Reversal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
