"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { 
  Building2, 
  ChevronRight, 
  Clock, 
  FileCheck, 
  FileSpreadsheet, 
  FileText, 
  History, 
  PackageCheck, 
  Plus, 
  Search, 
  ShoppingBag, 
  Truck 
} from "lucide-react";
import { StockJournalVoucher } from "@/components/inventory/stock-journal-voucher";
import { Button } from "@/components/ui/button";
import { CreatePoDialog } from "@/components/inventory/create-po-dialog";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { usePurchaseOrders, type PurchaseOrder } from "@/hooks/use-inventory";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  PurchaseOrder["status"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; badgeClass?: string }
> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Dispatched", variant: "outline", badgeClass: "border-primary/40 text-primary bg-primary/5" },
  PARTIALLY_RECEIVED: { label: "Partially Received", variant: "outline", badgeClass: "border-warning text-warning bg-warning/10" },
  RECEIVED: { label: "Received (GRN)", variant: "default", badgeClass: "bg-emerald-600 hover:bg-emerald-600 text-white" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export default function PurchaseOrdersPage() {
  const { branchId } = useBranch();
  const { data: orders, isLoading, isError } = usePurchaseOrders(branchId);
  const [making, setMaking] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((po) => {
      const matchesSearch =
        !search.trim() ||
        po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        po.supplier.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || po.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const totalOrders = orders?.length ?? 0;
  const pendingOrders = orders?.filter((po) => po.status === "SENT" || po.status === "PARTIALLY_RECEIVED").length ?? 0;
  const totalValue = orders?.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0) ?? 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-24 sm:pb-20">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">
              Purchase Orders
            </h1>
            <Badge variant="secondary" className="text-[11px] font-medium text-muted-foreground border-border/70">
              Procurement
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage vendor purchasing, goods receipt notes (GRN), and invoice reconciliation
          </p>
        </div>

        {/* Action Buttons: 44pt mobile touch targets with clear prominence */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMaking(true)}
            className="flex-1 sm:flex-initial h-11 sm:h-9 rounded-xl text-xs font-medium gap-1.5 active:scale-98 transition-transform"
          >
            <FileSpreadsheet className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
            <span>Journal</span>
          </Button>
          <div className="flex-1 sm:flex-initial [&>button]:w-full [&>button]:h-11 sm:[&>button]:h-9 [&>button]:rounded-xl [&>button]:active:scale-98 [&>button]:transition-transform">
            <CreatePoDialog branchId={branchId} />
          </div>
        </div>
      </div>

      <InventoryTabs />

      {/* KPI Overview Cards: Compact 3-column scrollable or grid with Apple HIG styling */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">Total POs</span>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums my-1">
            {totalOrders}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">All created</span>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">Open / Transit</span>
          <span className={cn("text-xl sm:text-2xl font-bold tracking-tight tabular-nums my-1", pendingOrders > 0 ? "text-primary" : "text-foreground")}>
            {pendingOrders}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">Pending GRN</span>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">Purchasing Spend</span>
          <span className="text-base sm:text-2xl font-bold tracking-tight text-foreground tabular-nums my-1 truncate">
            {formatCurrency(totalValue)}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">Total spend</span>
        </div>
      </div>

      {/* Filter & Search Toolbar: iOS segmented control style with 44pt touch area */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-2 sm:p-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PO # or vendor name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 sm:h-9 text-xs sm:text-sm rounded-xl bg-background border-border/70"
          />
        </div>

        {/* iOS Segmented Control (Apple HIG: Segmented controls) */}
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/60 overflow-x-auto scrollbar-none">
          {[
            { id: "ALL", label: "All" },
            { id: "SENT", label: "Open" },
            { id: "RECEIVED", label: "Received" },
            { id: "DRAFT", label: "Drafts" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={cn(
                "flex-1 sm:flex-initial min-h-[36px] sm:min-h-[30px] px-3.5 py-1 text-xs font-semibold rounded-lg transition-all text-center whitespace-nowrap active:scale-96",
                statusFilter === s.id
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Orders Table & Mobile Cards */}
      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center text-sm text-destructive rounded-2xl border-dashed">
          Could not load purchase orders. Please check your connection.
        </Card>
      ) : filteredOrders.length > 0 ? (
        <>
          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
                  <TableHead className="font-semibold text-xs text-foreground py-3">PO Number</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground py-3">Vendor / Supplier</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground py-3">Delivery Status</TableHead>
                  <TableHead className="text-right font-semibold text-xs text-foreground py-3">Lines</TableHead>
                  <TableHead className="text-right font-semibold text-xs text-foreground py-3">Order Total</TableHead>
                  <TableHead className="text-right font-semibold text-xs text-foreground py-3">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((po) => {
                  const cfg = STATUS_CONFIG[po.status] ?? { label: po.status, variant: "secondary" as const };
                  return (
                    <TableRow key={po.id} className="transition-colors hover:bg-muted/30 group">
                      <TableCell className="py-3">
                        <Link
                          href={`/inventory/purchase-orders/${po.id}`}
                          className="font-bold text-sm text-primary hover:underline flex items-center gap-1.5"
                        >
                          <span>{po.poNumber}</span>
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{po.supplier.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant={cfg.variant}
                          className={cn("text-[10px] uppercase font-semibold px-2 py-0.2", cfg.badgeClass)}
                        >
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums text-xs text-muted-foreground">
                        {po.items.length} {po.items.length === 1 ? "line" : "lines"}
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums font-bold text-sm text-foreground">
                        {formatCurrency(po.totalAmount)}
                      </TableCell>
                      <TableCell className="py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View (< md) with Apple HIG touch-first styling */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredOrders.map((po) => {
              const cfg = STATUS_CONFIG[po.status] ?? { label: po.status, variant: "secondary" as const };
              return (
                <Link
                  key={po.id}
                  href={`/inventory/purchase-orders/${po.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs active:bg-secondary/50 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-base text-primary">{po.poNumber}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                    <Badge
                      variant={cfg.variant}
                      className={cn("text-[10px] uppercase font-semibold px-2.5 py-0.5", cfg.badgeClass)}
                    >
                      {cfg.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground font-medium text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{po.supplier.name}</span>
                    </span>
                    <span>{new Date(po.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-border/60 text-xs">
                    <span className="text-muted-foreground">{po.items.length} line item(s)</span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {formatCurrency(po.totalAmount)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        /* Empty State */
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center rounded-2xl border-dashed bg-card/60">
          <FileText className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">
            {search || statusFilter !== "ALL" ? "No matching purchase orders" : "No Purchase Orders Yet"}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {search || statusFilter !== "ALL"
              ? "Try adjusting your search terms or clearing your status filter."
              : "Generate an order to send to your ingredient supplier and book received stock."}
          </p>
          {statusFilter === "ALL" && !search && (
            <div className="pt-2">
              <CreatePoDialog branchId={branchId} />
            </div>
          )}
        </Card>
      )}

      {making && <StockJournalVoucher branchId={branchId} open onOpenChange={setMaking} />}
    </div>
  );
}
