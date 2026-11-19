"use client";

import { useMemo, useState } from "react";
import { 
  Building2, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  Download, 
  Factory, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  Layers, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  TrendingUp, 
  Utensils 
} from "lucide-react";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { QUALITY_LABEL, QualityDialog } from "@/components/inventory/quality-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBranch } from "@/hooks/use-branch";
import { type MfgReport, mfgCsvUrl, useMfgReport, useMfgSettings } from "@/hooks/use-manufacturing";
import { useStockItems } from "@/hooks/use-stock-journal";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const day = (d: Date) => d.toISOString().slice(0, 10);
const num = (v: string | null | undefined, dp = 2) => (v == null ? "–" : Number(v).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp }));
const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; badgeClass?: string }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  POSTED: { label: "Posted", variant: "default", badgeClass: "bg-emerald-600 hover:bg-emerald-600 text-white" },
  VOIDED: { label: "Reversed", variant: "destructive" },
};

const nativeSelectClass =
  "h-11 sm:h-9 w-full rounded-xl border border-input bg-background px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function ManufacturingReportsPage() {
  const { branchId } = useBranch();
  const { data: s } = useMfgSettings(branchId);
  const { data: items } = useStockItems(branchId);
  const [from, setFrom] = useState(() => day(new Date(Date.now() - 29 * 864e5)));
  const [to, setTo] = useState(() => day(new Date()));
  const [itemId, setItemId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date" | "cost">("date");
  const [inspect, setInspect] = useState<MfgReport["batches"][number] | null>(null);
  const filters = { from: new Date(`${from}T00:00:00`).toISOString(), to: new Date(`${to}T23:59:59.999`).toISOString(), itemId, status };
  const { data, isLoading, isError, error } = useMfgReport(branchId, filters);

  const shown = useMemo(() => {
    const t = search.trim().toLowerCase();
    const rows = (data?.batches ?? []).filter((b) => !t || `${b.entryNo} ${b.item ?? ""} ${b.batchRef ?? ""}`.toLowerCase().includes(t));
    return sort === "cost" ? [...rows].sort((a, b) => Number(b.unitCost ?? 0) - Number(a.unitCost ?? 0)) : rows;
  }, [data, search, sort]);

  const daily = useMemo(() => {
    type Agg = { qty: number; unit: string; cost: number };
    const days = new Map<string, { vouchers: string[]; used: Map<string, Agg>; made: Map<string, Agg>; total: number }>();
    for (const b of data?.batches ?? []) {
      if (b.status !== "POSTED") continue;
      const d = b.producedAt.slice(0, 10);
      const e = days.get(d) ?? { vouchers: [] as string[], used: new Map<string, Agg>(), made: new Map<string, Agg>(), total: 0 };
      e.vouchers.push(b.batchRef ? `${b.entryNo} (${b.batchRef})` : b.entryNo);
      e.total += Number(b.totalCost ?? 0);
      for (const l of b.lines) {
        const map = l.role === "INPUT" ? e.used : e.made;
        const k = `${l.item}|${l.unit}`;
        const cur = map.get(k) ?? { qty: 0, unit: l.unit, cost: 0 };
        cur.qty += Number(l.quantity); cur.cost += Number(l.amount ?? 0);
        map.set(k, cur);
      }
      days.set(d, e);
    }
    return [...days.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  const dailyCsv = () => {
    const rows = [["Date", "Direction", "Item", "Quantity", "Unit", "Cost"]];
    for (const [d, e] of daily) {
      for (const [k, v] of e.used) rows.push([d, "Consumed", k.split("|")[0], String(Math.round(v.qty * 1000) / 1000), v.unit, v.cost ? v.cost.toFixed(2) : ""]);
      for (const [k, v] of e.made) rows.push([d, "Produced", k.split("|")[0], String(Math.round(v.qty * 1000) / 1000), v.unit, ""]);
    }
    const blob = new Blob([rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `daily-production-${from}-to-${to}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const totalBatches = data?.batches.length ?? 0;
  const postedBatches = data?.batches.filter((b) => b.status === "POSTED").length ?? 0;
  const totalProductionCost = data?.batches.filter((b) => b.status === "POSTED").reduce((sum, b) => sum + (Number(b.totalCost) || 0), 0) ?? 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-24 sm:pb-20">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">
              Manufacturing & Production Reports
            </h1>
            <Badge variant="secondary" className="text-[11px] font-medium text-muted-foreground border-border/70">
              Recipe Costing
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Production yields, ingredient consumption, and batch unit cost analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data && mfgCsvUrl(branchId, "batches", filters) && (
            <a
              className="flex items-center justify-center gap-1.5 h-11 sm:h-9 px-4 rounded-xl border border-border/80 bg-secondary/50 hover:bg-secondary text-xs font-semibold text-foreground active:scale-98 transition-all"
              href={mfgCsvUrl(branchId, "batches", filters)}
            >
              <Download className="h-4 w-4 text-muted-foreground" />
              <span>Export Batches CSV</span>
            </a>
          )}
        </div>
      </div>

      <InventoryTabs />

      {/* Settings notice if disabled */}
      {!s?.enabled && (
        <Card className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-warning/40 bg-warning/5 text-xs text-warning">
          <div className="flex items-center gap-2.5">
            <Factory className="h-4 w-4 shrink-0" />
            <span>Recipe costing is currently switched off. Past batches are preserved. Turn it on under <strong>Inventory &gt; Production</strong> to track unit margins.</span>
          </div>
        </Card>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">Total Batches</span>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums my-1">
            {totalBatches}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">In period</span>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">Posted Runs</span>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 tabular-nums my-1">
            {postedBatches}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">Completed production</span>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">Total Batch Value</span>
          <span className="text-base sm:text-2xl font-bold tracking-tight text-foreground tabular-nums my-1 truncate">
            {formatCurrency(totalProductionCost)}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">Realized cost</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m-from" className="text-xs font-semibold">From Date</Label>
          <Input
            id="m-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11 sm:h-9 text-xs sm:text-sm rounded-xl"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m-to" className="text-xs font-semibold">To Date</Label>
          <Input
            id="m-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 sm:h-9 text-xs sm:text-sm rounded-xl"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m-item" className="text-xs font-semibold">Finished Product</Label>
          <select
            id="m-item"
            className={nativeSelectClass}
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          >
            <option value="">All products</option>
            {(items ?? []).filter((i) => i.kind === "PREPARED").map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m-status" className="text-xs font-semibold">Batch Status</Label>
          <select
            id="m-status"
            className={nativeSelectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="POSTED">Posted</option>
            <option value="DRAFT">Draft</option>
            <option value="VOIDED">Reversed</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m-search" className="text-xs font-semibold">Search Run</Label>
          <Input
            id="m-search"
            placeholder="Batch # or item…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 sm:h-9 text-xs sm:text-sm rounded-xl"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m-sort" className="text-xs font-semibold">Sort By</Label>
          <select
            id="m-sort"
            className={nativeSelectClass}
            value={sort}
            onChange={(e) => setSort(e.target.value as "date" | "cost")}
          >
            <option value="date">Newest First</option>
            <option value="cost">Highest Cost</option>
          </select>
        </div>
      </div>

      {/* Main Batches List */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground px-0.5">Manufacturing Batches ({shown.length})</h2>

        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        ) : isError ? (
          <Card className="p-8 text-center text-sm text-destructive rounded-2xl border-dashed">
            Could not load manufacturing reports.
          </Card>
        ) : shown.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80 text-xs">
                    <TableHead className="font-semibold text-foreground py-3">Voucher #</TableHead>
                    <TableHead className="font-semibold text-foreground py-3">Finished Product</TableHead>
                    <TableHead className="font-semibold text-foreground py-3">Status</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-3">Quantity Made</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-3">Total Cost</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-3">Unit Cost</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-3">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((b) => {
                    const cfg = STATUS[b.status] ?? { label: b.status, variant: "secondary" as const };
                    return (
                      <TableRow key={b.id} className="hover:bg-muted/30">
                        <TableCell className="py-3 font-mono font-bold text-xs text-primary">
                          {b.entryNo}
                          {b.batchRef && <span className="text-[11px] font-normal text-muted-foreground ml-1.5">({b.batchRef})</span>}
                        </TableCell>
                        <TableCell className="py-3 font-semibold text-xs text-foreground">
                          {b.item ?? "Custom production"}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant={cfg.variant} className={cn("text-[10px] uppercase font-semibold", cfg.badgeClass)}>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right tabular-nums text-xs font-semibold text-foreground">
                          {num(b.quantity)} {b.unit}
                        </TableCell>
                        <TableCell className="py-3 text-right tabular-nums text-xs font-bold text-foreground">
                          {b.totalCost ? formatCurrency(b.totalCost) : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-right tabular-nums text-xs font-semibold text-foreground">
                          {b.unitCost ? formatCurrency(b.unitCost) : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(b.producedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View (< md) with Apple HIG touch-first styling */}
            <div className="md:hidden flex flex-col gap-2.5">
              {shown.map((b) => {
                const cfg = STATUS[b.status] ?? { label: b.status, variant: "secondary" as const };
                return (
                  <div
                    key={b.id}
                    className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs active:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-sm text-primary">{b.entryNo}</span>
                        <span className="font-semibold text-sm text-foreground mt-0.5">{b.item ?? "Custom production"}</span>
                      </div>
                      <Badge variant={cfg.variant} className={cn("text-[10px] uppercase font-semibold", cfg.badgeClass)}>
                        {cfg.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground">Made</span>
                        <span className="font-bold tabular-nums text-foreground">
                          {num(b.quantity)} {b.unit}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-muted-foreground">Batch Cost</span>
                        <span className="font-bold tabular-nums text-foreground">
                          {b.totalCost ? formatCurrency(b.totalCost) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center rounded-2xl border-dashed bg-card/60">
            <Utensils className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">No Production Batches Found</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              No batches recorded for this date range or filter criteria.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
