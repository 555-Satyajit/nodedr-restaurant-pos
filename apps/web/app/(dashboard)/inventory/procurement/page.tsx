"use client";

import { useState } from "react";
import { 
  Building2, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  CreditCard, 
  FileCheck, 
  FileText, 
  History, 
  MoreHorizontal, 
  Package, 
  Plus, 
  Receipt, 
  Sparkles, 
  Truck 
} from "lucide-react";
import { CreateInvoiceDialog } from "@/components/inventory/create-invoice-dialog";
import { CreatePurchaseRequestDialog } from "@/components/inventory/create-purchase-request-dialog";
import { CreateQuotationDialog } from "@/components/inventory/create-quotation-dialog";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { RecordPaymentDialog } from "@/components/inventory/record-payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  usePurchaseRequests,
  useQuotations,
  useSupplierInvoices,
  useUpdatePurchaseRequestStatus,
  useUpdateQuotationStatus,
  type PurchaseRequest,
  type SupplierInvoice,
  type SupplierQuotation,
} from "@/hooks/use-inventory";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const REQUEST_NEXT: Record<PurchaseRequest["status"], PurchaseRequest["status"][]> = {
  DRAFT: ["PENDING_APPROVAL"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: [],
  CONVERTED: [],
};

const QUOTATION_NEXT: Record<SupplierQuotation["status"], SupplierQuotation["status"][]> = {
  DRAFT: ["RECEIVED"],
  RECEIVED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: [],
  REJECTED: [],
};

const INVOICE_BADGE: Record<
  SupplierInvoice["status"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; badgeClass?: string }
> = {
  UNPAID: { label: "Unpaid", variant: "outline", badgeClass: "border-warning text-warning bg-warning/10" },
  PARTIALLY_PAID: { label: "Partially Paid", variant: "secondary" },
  PAID: { label: "Fully Paid", variant: "default", badgeClass: "bg-emerald-600 hover:bg-emerald-600 text-white" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

function EmptySectionState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

function PurchaseRequestsSection({ branchId }: { branchId: string | null }) {
  const { data: requests, isLoading } = usePurchaseRequests(branchId);
  const updateStatus = useUpdatePurchaseRequestStatus(branchId);

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Purchase Requests</h2>
            <p className="text-xs text-muted-foreground">Kitchen indent requisitions awaiting manager sign-off</p>
          </div>
        </div>
        <div className="[&>button]:w-full sm:[&>button]:w-auto [&>button]:h-11 sm:[&>button]:h-9 [&>button]:rounded-xl [&>button]:active:scale-98">
          <CreatePurchaseRequestDialog branchId={branchId} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : requests && requests.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold py-2.5">Request #</TableHead>
                  <TableHead className="text-xs font-semibold py-2.5">Requested By</TableHead>
                  <TableHead className="text-xs font-semibold py-2.5">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold py-2.5">Items</TableHead>
                  <TableHead className="text-right text-xs font-semibold py-2.5">Date</TableHead>
                  <TableHead className="w-20 text-right font-semibold text-xs py-2.5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const next = REQUEST_NEXT[r.status];
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/20">
                      <TableCell className="font-semibold text-xs text-foreground py-2.5">{r.requestNumber}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-2.5">{r.requestedBy?.name || "Kitchen"}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground tabular-nums py-2.5">
                        {r.items.length} item(s)
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground py-2.5">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        {next.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <button type="button" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-40 p-1 shadow-lg">
                              {next.map((status) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() => updateStatus.mutate({ id: r.id, status })}
                                  className="text-xs cursor-pointer"
                                >
                                  Mark as {status.toLowerCase().replace("_", " ")}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View (< md) with Apple HIG touch-first styling */}
          <div className="md:hidden flex flex-col divide-y divide-border/60">
            {requests.map((r) => {
              const next = REQUEST_NEXT[r.status];
              return (
                <div key={r.id} className="flex flex-col gap-2.5 p-4 active:bg-secondary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{r.requestNumber}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      {r.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>By: <strong className="text-foreground font-medium">{r.requestedBy?.name || "Staff"}</strong></span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                    <span className="text-muted-foreground">{r.items.length} item(s) requested</span>
                    {next.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {next.map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus.mutate({ id: r.id, status })}
                            className="text-xs h-8 px-2.5 rounded-lg active:scale-96"
                          >
                            Mark {status.toLowerCase().replace("_", " ")}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <EmptySectionState
          title="No purchase requests yet"
          description="Kitchen teams submit purchase requests to notify management of items needing restocking."
        />
      )}
    </div>
  );
}

function QuotationsSection({ branchId }: { branchId: string | null }) {
  const { data: quotations, isLoading } = useQuotations(branchId);
  const updateStatus = useUpdateQuotationStatus(branchId);

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Supplier Quotations</h2>
            <p className="text-xs text-muted-foreground">Compare supplier pricing bids prior to creating POs</p>
          </div>
        </div>
        <div className="[&>button]:w-full sm:[&>button]:w-auto [&>button]:h-11 sm:[&>button]:h-9 [&>button]:rounded-xl [&>button]:active:scale-98">
          <CreateQuotationDialog branchId={branchId} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : quotations && quotations.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold py-2.5">Quotation #</TableHead>
                  <TableHead className="text-xs font-semibold py-2.5">Supplier</TableHead>
                  <TableHead className="text-xs font-semibold py-2.5">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold py-2.5">Total</TableHead>
                  <TableHead className="w-20 text-right font-semibold text-xs py-2.5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => {
                  const next = QUOTATION_NEXT[q.status];
                  const total = q.items.reduce(
                    (sum, it) => sum + (Number(it.quantityQuoted) || 0) * (Number(it.unitPrice) || 0),
                    0
                  );
                  return (
                    <TableRow key={q.id} className="hover:bg-muted/20">
                      <TableCell className="font-semibold text-xs text-foreground py-2.5">{q.quotationNumber}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-2.5">{q.supplier.name}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                          {q.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold tabular-nums text-foreground py-2.5">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        {next.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <button type="button" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-40 p-1 shadow-lg">
                              {next.map((status) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() => updateStatus.mutate({ id: q.id, status })}
                                  className="text-xs cursor-pointer"
                                >
                                  Mark as {status.toLowerCase()}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-border/60">
            {quotations.map((q) => {
              const next = QUOTATION_NEXT[q.status];
              const total = q.items.reduce(
                (sum, it) => sum + (Number(it.quantityQuoted) || 0) * (Number(it.unitPrice) || 0),
                0
              );
              return (
                <div key={q.id} className="flex flex-col gap-2 p-4 active:bg-secondary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{q.quotationNumber}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      {q.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {q.supplier.name}
                    </span>
                    <span className="font-bold tabular-nums text-foreground text-sm">{formatCurrency(total)}</span>
                  </div>
                  {next.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
                      <span className="text-[11px] text-muted-foreground">Action:</span>
                      {next.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: q.id, status })}
                          className="text-xs h-8 px-2.5 rounded-lg active:scale-96"
                        >
                          Mark {status.toLowerCase()}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <EmptySectionState
          title="No quotations on record"
          description="Log price quotes from suppliers before committing to large purchase orders."
        />
      )}
    </div>
  );
}

function SupplierInvoicesSection({ branchId }: { branchId: string | null }) {
  const { data: invoices, isLoading } = useSupplierInvoices(branchId);

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Supplier Invoices & Payables</h2>
            <p className="text-xs text-muted-foreground">Track vendor bills and record outbound payment receipts</p>
          </div>
        </div>
        <div className="[&>button]:w-full sm:[&>button]:w-auto [&>button]:h-11 sm:[&>button]:h-9 [&>button]:rounded-xl [&>button]:active:scale-98">
          <CreateInvoiceDialog branchId={branchId} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : invoices && invoices.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold py-2.5">Invoice #</TableHead>
                  <TableHead className="text-xs font-semibold py-2.5">Supplier</TableHead>
                  <TableHead className="text-xs font-semibold py-2.5">Payment Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold py-2.5">Total</TableHead>
                  <TableHead className="text-right text-xs font-semibold py-2.5">Amount Paid</TableHead>
                  <TableHead className="w-32 text-right font-semibold text-xs py-2.5">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const badge = INVOICE_BADGE[inv.status] ?? { label: inv.status, variant: "secondary" as const };

                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/20">
                      <TableCell className="font-semibold text-xs text-foreground py-2.5">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-2.5">{inv.supplier.name}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant={badge.variant} className={cn("text-[10px] uppercase font-semibold", badge.badgeClass)}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold tabular-nums text-foreground py-2.5">
                        {formatCurrency(inv.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground py-2.5">
                        {formatCurrency(inv.amountPaid)}
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                          <div className="flex justify-end">
                            <RecordPaymentDialog branchId={branchId} invoice={inv} />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View (< md) with Apple HIG touch-first styling */}
          <div className="md:hidden flex flex-col divide-y divide-border/60">
            {invoices.map((inv) => {
              const badge = INVOICE_BADGE[inv.status] ?? { label: inv.status, variant: "secondary" as const };
              const balanceDue = Number(inv.totalAmount) - Number(inv.amountPaid);

              return (
                <div key={inv.id} className="flex flex-col gap-2.5 p-4 active:bg-secondary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{inv.invoiceNumber}</span>
                    <Badge variant={badge.variant} className={cn("text-[10px] uppercase font-semibold", badge.badgeClass)}>
                      {badge.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {inv.supplier.name}
                    </span>
                    <span className="font-bold text-foreground text-sm tabular-nums">{formatCurrency(inv.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <div className="flex flex-col text-[11px] text-muted-foreground">
                      <span>Paid: {formatCurrency(inv.amountPaid)}</span>
                      {balanceDue > 0 && (
                        <span className="font-semibold text-warning">Due: {formatCurrency(balanceDue)}</span>
                      )}
                    </div>
                    {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                      <div className="[&>button]:h-9 [&>button]:px-3 [&>button]:rounded-xl [&>button]:text-xs [&>button]:font-medium [&>button]:active:scale-96">
                        <RecordPaymentDialog branchId={branchId} invoice={inv} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <EmptySectionState
          title="No vendor invoices"
          description="Invoices received from suppliers can be recorded here to track accounts payable."
        />
      )}
    </div>
  );
}

export default function ProcurementPage() {
  const { branchId } = useBranch();

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-24 sm:pb-20">
      {/* Page Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">
              Procurement & Vendor Invoices
            </h1>
            <Badge variant="secondary" className="text-[11px] font-medium text-muted-foreground border-border/70">
              Accounts Payable
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Coordinate internal purchase requests, supplier quotations, and vendor invoice settlements
          </p>
        </div>
      </div>

      <InventoryTabs />

      {/* 3 Main Procurement Lifecycles */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <PurchaseRequestsSection branchId={branchId} />
        <QuotationsSection branchId={branchId} />
        <SupplierInvoicesSection branchId={branchId} />
      </div>
    </div>
  );
}
