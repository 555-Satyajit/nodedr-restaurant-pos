"use client";

import { useState, useMemo } from "react";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  Clock, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  History, 
  Plus, 
  RefreshCw, 
  RotateCcw, 
  Search, 
  SlidersHorizontal 
} from "lucide-react";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBranch } from "@/hooks/use-branch";
import { StockJournalVoucher } from "@/components/inventory/stock-journal-voucher";
import { csvUrl, useJournal, useJournalAdjust, useReceiveStock, useStockItems } from "@/hooks/use-stock-journal";
import { ApiError } from "@/lib/api";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TYPES: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; badgeClass?: string }> = {
  OPENING: { label: "Opening Balance", variant: "secondary" },
  RECEIPT: { label: "Received (GRN)", variant: "default", badgeClass: "bg-emerald-600 hover:bg-emerald-600 text-white" },
  PRODUCTION_USE: { label: "Used in Production", variant: "outline", badgeClass: "border-primary/40 text-primary bg-primary/5" },
  PRODUCTION: { label: "Finished Batch", variant: "default", badgeClass: "bg-primary text-primary-foreground" },
  CONSUMPTION: { label: "POS Sale", variant: "outline" },
  WASTE: { label: "Waste / Loss", variant: "destructive" },
  ADJUSTMENT: { label: "Adjustment", variant: "secondary", badgeClass: "border-warning/40 text-warning bg-warning/5" },
  REVERSAL: { label: "Reversal", variant: "destructive" },
};

const nativeSelectClass =
  "h-11 sm:h-9 w-full rounded-xl border border-input bg-background px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Mode = "receive" | "adjust" | null;

export default function JournalPage() {
  const { branchId } = useBranch();
  const [ingredientId, setIngredientId] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filters = {
    ingredientId, type,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  };
  const { data: items } = useStockItems(branchId);
  const { data, isLoading, isError } = useJournal(branchId, filters);
  const [mode, setMode] = useState<Mode>(null);
  const [voucher, setVoucher] = useState(false);
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [text, setText] = useState("");
  const [dir, setDir] = useState<"ADD" | "REMOVE">("REMOVE");
  const [expiry, setExpiry] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const receive = useReceiveStock(branchId);
  const adjust = useJournalAdjust(branchId);
  const chosen = items?.find((i) => i.id === item);

  const close = () => { setExpiry(""); setMode(null); setItem(""); setQty(""); setUnit(""); setText(""); setErr(null); };
  const submit = () => {
    const u = (unit || chosen?.unit) as never;
    const onError = (e: unknown) => setErr(e instanceof ApiError ? e.message : "Could not save");
    if (mode === "receive") {
      receive.mutate({ ingredientId: item, quantity: qty, unit: u, reference: text || undefined, expiryDate: expiry ? new Date(`${expiry}T00:00:00`).toISOString() : undefined }, { onSuccess: () => { toast.success("Stock received"); close(); }, onError });
    } else {
      adjust.mutate({ ingredientId: item, direction: dir, quantity: qty, unit: u, reason: text }, { onSuccess: () => { toast.success("Adjustment recorded"); close(); }, onError });
    }
  };

  const totalMovements = data?.items.length ?? 0;
  const inMovements = useMemo(() => data?.items.filter((m) => Number(m.quantity) > 0).length ?? 0, [data]);
  const outMovements = useMemo(() => data?.items.filter((m) => Number(m.quantity) < 0).length ?? 0, [data]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-24 sm:pb-20">
      {/* Header & Page Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">
              Stock Journal & Ledger
            </h1>
            <Badge variant="secondary" className="text-[11px] font-medium text-muted-foreground border-border/70">
              Audit Trail
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Immutable log of all ingredient receipts, manufacturing consumption, waste, and adjustments
          </p>
        </div>

        {/* Action Buttons: 44pt Touch Targets */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode("adjust")}
            className="flex-1 sm:flex-initial h-11 sm:h-9 rounded-xl text-xs font-semibold gap-1.5 active:scale-98"
          >
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <span>Adjust</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVoucher(true)}
            className="flex-1 sm:flex-initial h-11 sm:h-9 rounded-xl text-xs font-semibold gap-1.5 active:scale-98"
          >
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <span>Voucher</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setMode("receive")}
            className="w-full sm:w-auto h-11 sm:h-9 rounded-xl text-xs font-semibold gap-1.5 active:scale-98"
          >
            <Plus className="h-4 w-4" />
            <span>Receive Stock</span>
          </Button>
        </div>
      </div>

      <InventoryTabs />

      {/* KPI Overview Cards: 3-column glanceable stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">Total Entries</span>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums my-1">
            {totalMovements}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">Filtered range</span>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">Inbound / Credits</span>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 tabular-nums my-1">
            +{inMovements}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">Receipts & Additions</span>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">Outbound / Debits</span>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-destructive tabular-nums my-1">
            -{outMovements}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">Sales & Wastage</span>
        </div>
      </div>

      {/* Filter Toolbar: Unified Apple-style Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="j-item" className="text-xs font-semibold">Ingredient</Label>
          <select
            id="j-item"
            className={nativeSelectClass}
            value={ingredientId}
            onChange={(e) => setIngredientId(e.target.value)}
          >
            <option value="">All items</option>
            {(items ?? []).map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="j-type" className="text-xs font-semibold">Movement Type</Label>
          <select
            id="j-type"
            className={nativeSelectClass}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All types</option>
            {Object.entries(TYPES).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="j-from" className="text-xs font-semibold">From Date</Label>
          <Input
            id="j-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11 sm:h-9 text-xs sm:text-sm rounded-xl"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="j-to" className="text-xs font-semibold">To Date</Label>
          <Input
            id="j-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 sm:h-9 text-xs sm:text-sm rounded-xl"
          />
        </div>

        <div className="flex items-end">
          <a
            className="flex items-center justify-center gap-1.5 w-full h-11 sm:h-9 rounded-xl border border-border/80 bg-secondary/50 hover:bg-secondary text-xs font-semibold text-foreground active:scale-98 transition-all"
            href={csvUrl("journal/export.csv", branchId, filters)}
          >
            <Download className="h-4 w-4 text-muted-foreground" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Main Table & Mobile Cards */}
      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center text-sm text-destructive rounded-2xl border-dashed">
          Could not load the stock journal ledger.
        </Card>
      ) : data && data.items.length > 0 ? (
        <>
          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
                  <TableHead className="font-semibold text-xs text-foreground py-3">Timestamp</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground py-3">Stock Item</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground py-3">Type</TableHead>
                  <TableHead className="text-right font-semibold text-xs text-foreground py-3">Quantity Delta</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground py-3">Operator</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground py-3">Audit Narration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((m) => {
                  const cfg = TYPES[m.type] ?? { label: m.type, variant: "secondary" as const };
                  const isNegative = Number(m.quantity) < 0;

                  return (
                    <TableRow key={m.id} className="hover:bg-muted/30">
                      <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="py-3 font-semibold text-xs text-foreground">
                        {m.ingredient.name}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant={cfg.variant}
                          className={cn("text-[10px] uppercase font-semibold px-2 py-0.2", cfg.badgeClass)}
                        >
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("py-3 text-right tabular-nums text-xs font-bold", isNegative ? "text-destructive" : "text-emerald-600")}>
                        {Number(m.quantity) > 0 ? "+" : ""}{m.quantity} {m.ingredient.unit}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {m.createdBy.name}{m.deviceId ? ` (${m.deviceId})` : ""}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground max-w-xs truncate" title={m.note ?? ""}>
                        {m.note || <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View (< md) with Apple HIG touch-first styling */}
          <div className="md:hidden flex flex-col gap-2.5">
            {data.items.map((m) => {
              const cfg = TYPES[m.type] ?? { label: m.type, variant: "secondary" as const };
              const isNegative = Number(m.quantity) < 0;

              return (
                <div
                  key={m.id}
                  className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs active:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground">{m.ingredient.name}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <Badge
                      variant={cfg.variant}
                      className={cn("text-[10px] uppercase font-semibold px-2 py-0.5 shrink-0", cfg.badgeClass)}
                    >
                      {cfg.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                    <span className="text-muted-foreground">
                      By: <strong className="text-foreground font-medium">{m.createdBy.name}</strong>
                    </span>
                    <span className={cn("text-base font-bold tabular-nums", isNegative ? "text-destructive" : "text-emerald-600")}>
                      {Number(m.quantity) > 0 ? "+" : ""}{m.quantity} {m.ingredient.unit}
                    </span>
                  </div>

                  {m.note && (
                    <p className="text-[11px] text-muted-foreground rounded-lg bg-muted/40 p-2 italic">
                      &ldquo;{m.note}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center rounded-2xl border-dashed bg-card/60">
          <History className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">No Stock Movements Found</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Try broadening your date filter or clearing your ingredient selection to see historical stock movements.
          </p>
        </Card>
      )}

      <p className="text-xs text-muted-foreground px-1">
        • Double-entry journal: Every stock change is permanently audited. Corrections are recorded via offsetting adjustments or reversals.
      </p>

      {voucher && <StockJournalVoucher branchId={branchId} open onOpenChange={setVoucher} />}

      {/* Adjust / Receive Modal Dialog with Sticky Footer & HIG styling */}
      <Dialog open={!!mode} onOpenChange={(o) => !o && close()}>
        <DialogContent className="flex flex-col max-h-[92dvh] sm:max-h-[85vh] sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
          {/* Sticky Header */}
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/80 shrink-0 bg-background">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {mode === "receive" ? <ArrowDownLeft className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  {mode === "receive" ? "Receive Stock" : "Adjust Stock Balance"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {mode === "receive"
                    ? "Record arriving raw materials into current inventory"
                    : "Correct physical count discrepancies with an audit reason"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Stock Item *</Label>
              <select
                aria-label="Item"
                className={nativeSelectClass}
                value={item}
                onChange={(e) => { setItem(e.target.value); setUnit(""); }}
              >
                <option value="">Choose item…</option>
                {(items ?? []).map((i) => (<option key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</option>))}
              </select>
            </div>

            {mode === "adjust" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Direction *</Label>
                <select
                  aria-label="Direction"
                  className={nativeSelectClass}
                  value={dir}
                  onChange={(e) => setDir(e.target.value as "ADD" | "REMOVE")}
                >
                  <option value="REMOVE">Remove from stock (-)</option>
                  <option value="ADD">Add to stock (+)</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-[1fr_6.5rem] gap-2.5">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Quantity *</Label>
                <Input
                  aria-label="Quantity"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="h-11 sm:h-9 text-xs sm:text-sm rounded-xl font-bold tabular-nums"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Unit</Label>
                <select
                  aria-label="Unit"
                  className={nativeSelectClass}
                  value={unit || chosen?.unit || ""}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {(chosen?.units ?? []).map((u) => (<option key={u}>{u}</option>))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">
                {mode === "receive" ? "Supplier / PO Reference" : "Audit Reason *"}
              </Label>
              <Input
                aria-label={mode === "receive" ? "Supplier or invoice reference" : "Reason"}
                placeholder={mode === "receive" ? "e.g. Inv #8402 / Fresh Produce" : "e.g. Spillage during evening prep"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-11 sm:h-9 text-xs sm:text-sm rounded-xl"
              />
            </div>

            {mode === "receive" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="h-11 sm:h-9 text-xs sm:text-sm rounded-xl"
                />
              </div>
            )}

            {err && <p role="alert" className="text-xs text-destructive rounded-lg bg-destructive/10 p-2.5">{err}</p>}
          </div>

          {/* Sticky Footer */}
          <div className="m-0 p-3.5 sm:p-4 border-t border-border/80 bg-background shrink-0 flex items-center justify-end gap-2 shadow-lg">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-initial h-11 sm:h-9 rounded-xl text-xs font-medium active:scale-98"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              disabled={!item || !qty || (mode === "adjust" && text.trim().length < 3) || receive.isPending || adjust.isPending}
              onClick={submit}
              className="flex-1 sm:flex-initial h-11 sm:h-9 rounded-xl text-xs font-semibold active:scale-98"
            >
              {receive.isPending || adjust.isPending ? "Saving…" : "Save Record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
