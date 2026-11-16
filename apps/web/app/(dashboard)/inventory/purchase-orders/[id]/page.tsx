"use client";

import { ArrowLeft, Building2, Calendar, CheckCircle2, ChevronRight, Clock, FileSpreadsheet, Package, Printer, Truck, User, XCircle } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { StockJournalVoucher } from "@/components/inventory/stock-journal-voucher";
import { toast } from "@/lib/toast";
import { ReceivePoDialog } from "@/components/inventory/receive-po-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBranch } from "@/hooks/use-branch";
import {
  usePurchaseOrder,
  useUpdatePurchaseOrderStatus,
  type PurchaseOrderDetail,
} from "@/hooks/use-inventory";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; badgeClass?: string }
> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Dispatched", variant: "outline", badgeClass: "border-primary/40 text-primary bg-primary/5" },
  PARTIALLY_RECEIVED: { label: "Partially Received", variant: "outline", badgeClass: "border-warning text-warning bg-warning/10" },
  RECEIVED: { label: "Received (GRN)", variant: "default", badgeClass: "bg-emerald-600 hover:bg-emerald-600 text-white" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { branchId } = useBranch();
  const { data: po, isLoading } = usePurchaseOrder(branchId, id);
  const updateStatus = useUpdatePurchaseOrderStatus(branchId);
  const [making, setMaking] = useState(false);

  if (isLoading || !po) {
    return (
      <div className="flex flex-col gap-4 p-2 sm:p-0">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const cfg = STATUS_CONFIG[po.status] ?? { label: po.status, variant: "secondary" as const };

  const send = () =>
    updateStatus.mutate(
      { id: po.id, status: "SENT" },
      {
        onSuccess: () => toast.success("Marked as dispatched to supplier"),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update"),
      },
    );

  const cancel = () => {
    if (!confirm("Are you sure you want to cancel this purchase order?")) return;
    updateStatus.mutate(
      { id: po.id, status: "CANCELLED" },
      {
        onSuccess: () => toast.success("Purchase order cancelled"),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update"),
      },
    );
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6 pb-24 sm:pb-20">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/inventory/purchase-orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-96 transition-all w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Purchase Orders</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
                {po.poNumber}
              </h1>
              <Badge
                variant={cfg.variant}
                className={cn("text-[11px] uppercase font-bold px-2.5 py-0.5", cfg.badgeClass)}
              >
                {cfg.label}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1 text-foreground font-medium">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {po.supplier.name}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {po.createdBy.name}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {new Date(po.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action Toolbar with Apple HIG Prominence & 44pt Touch Targets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
            {po.status === "DRAFT" && (
              <Button
                size="sm"
                onClick={send}
                disabled={updateStatus.isPending}
                className="flex-1 sm:flex-initial h-11 sm:h-9 rounded-xl text-xs font-semibold active:scale-98"
              >
                <Truck className="h-4 w-4 mr-1.5" />
                <span>Mark as Dispatched</span>
              </Button>
            )}

            {(po.status === "SENT" || po.status === "PARTIALLY_RECEIVED") && (
              <div className="flex-1 sm:flex-initial [&>button]:w-full [&>button]:h-11 sm:[&>button]:h-9 [&>button]:rounded-xl [&>button]:active:scale-98 font-semibold">
                <ReceivePoDialog branchId={branchId} po={po} />
              </div>
            )}

            {po.status !== "CANCELLED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMaking(true)}
                className="flex-1 sm:flex-initial h-11 sm:h-9 rounded-xl text-xs font-medium active:scale-98"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <span>Journal</span>
              </Button>
            )}

            {(po.status === "DRAFT" || po.status === "SENT") && (
              <Button
                size="sm"
                variant="outline"
                onClick={cancel}
                disabled={updateStatus.isPending}
                className="h-11 sm:h-9 rounded-xl text-xs text-destructive hover:bg-destructive/10 active:scale-98"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                <span>Cancel</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Card: Desktop Table & Mobile Cards */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground px-0.5">Order Line Items ({po.items.length})</h2>

        {/* Desktop Table (>= md) */}
        <div className="hidden md:block rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
                <TableHead className="font-semibold text-xs text-foreground py-3">Ingredient</TableHead>
                <TableHead className="text-right font-semibold text-xs text-foreground py-3">Quantity Ordered</TableHead>
                <TableHead className="text-right font-semibold text-xs text-foreground py-3">Quantity Received</TableHead>
                <TableHead className="text-right font-semibold text-xs text-foreground py-3">Cost / Unit</TableHead>
                <TableHead className="text-right font-semibold text-xs text-foreground py-3">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="py-3 font-semibold text-xs text-foreground">
                    {item.ingredient?.name ?? item.ingredientId}
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums text-xs font-medium text-foreground">
                    {item.quantityOrdered} {item.ingredient?.unit}
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums text-xs">
                    <span className={cn(
                      "font-semibold",
                      Number(item.quantityReceived) >= Number(item.quantityOrdered)
                        ? "text-emerald-600"
                        : Number(item.quantityReceived) > 0
                        ? "text-warning"
                        : "text-muted-foreground"
                    )}>
                      {item.quantityReceived} {item.ingredient?.unit}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums text-xs text-muted-foreground">
                    {formatCurrency(item.unitCost)}
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums font-bold text-xs text-foreground">
                    {formatCurrency(Number(item.quantityOrdered) * Number(item.unitCost))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Desktop Summary Footer */}
          <div className="flex items-center justify-between border-t border-border/80 bg-muted/20 px-5 py-3 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Order Total (Aggregate Value)</span>
            <span className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(po.totalAmount)}</span>
          </div>
        </div>

        {/* Mobile View (< md): Touch-first cards */}
        <div className="md:hidden flex flex-col gap-2.5">
          {po.items.map((item) => {
            const lineTotal = Number(item.quantityOrdered) * Number(item.unitCost);
            const isFull = Number(item.quantityReceived) >= Number(item.quantityOrdered);
            const isPartial = Number(item.quantityReceived) > 0 && !isFull;

            return (
              <div
                key={item.id}
                className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-foreground">
                      {item.ingredient?.name ?? item.ingredientId}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      Rate: {formatCurrency(item.unitCost)} / {item.ingredient?.unit}
                    </span>
                  </div>
                  <span className="font-bold text-base tabular-nums text-foreground">
                    {formatCurrency(lineTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground">Ordered</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {item.quantityOrdered} {item.ingredient?.unit}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] text-muted-foreground">Received to date</span>
                    <span className={cn("font-bold tabular-nums", isFull ? "text-emerald-600" : isPartial ? "text-warning" : "text-muted-foreground")}>
                      {item.quantityReceived} {item.ingredient?.unit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mobile Order Total Card */}
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-2xs mt-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Order Value</span>
            <span className="text-xl font-bold tabular-nums text-foreground">{formatCurrency(po.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Goods Receipts (GRN) Section */}
      {po.goodsReceipts.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground px-0.5">Goods Receipts / GRN Audit Log</h2>
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs divide-y divide-border/60">
            {po.goodsReceipts.map((grn: PurchaseOrderDetail["goodsReceipts"][number]) => (
              <div key={grn.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-foreground font-mono">{grn.grnNumber}</span>
                    <span className="text-muted-foreground mt-0.5">
                      Received by <strong className="text-foreground font-medium">{grn.receivedBy.name}</strong> on {new Date(grn.receivedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <Badge variant="outline" className="text-[10px] uppercase font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                    {grn.items.length} line(s) booked into inventory
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {making && (
        <StockJournalVoucher
          branchId={branchId}
          open
          onOpenChange={setMaking}
          context={{
            batchRef: po.poNumber,
            narration: `Manufacturing from ${po.poNumber} (${po.supplier.name})`,
            sourceIds: po.items.filter((i) => Number(i.quantityReceived) > 0).map((i) => i.ingredientId),
          }}
        />
      )}
    </div>
  );
}
