"use client";

import { Plus, Trash2, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIngredients, useCreatePurchaseOrder, useSuppliers } from "@/hooks/use-inventory";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface Row {
  ingredientId: string;
  quantityOrdered: string;
  unitCost: string;
}

const emptyRow: Row = { ingredientId: "", quantityOrdered: "", unitCost: "" };

const nativeSelectClass =
  "h-11 sm:h-9 w-full rounded-xl border border-input bg-background px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CreatePoDialog({ branchId }: { branchId: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [rows, setRows] = useState<Row[]>([{ ...emptyRow }]);
  const { data: suppliers } = useSuppliers(branchId);
  const { data: ingredients } = useIngredients(branchId);
  const createPo = useCreatePurchaseOrder(branchId);

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const total = rows.reduce(
    (sum, r) => sum + (Number(r.quantityOrdered) || 0) * (Number(r.unitCost) || 0),
    0,
  );

  const canSubmit =
    !!supplierId &&
    rows.length > 0 &&
    rows.every((r) => r.ingredientId && Number(r.quantityOrdered) > 0 && Number(r.unitCost) >= 0);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createPo.mutate(
      {
        supplierId,
        items: rows.map((r) => ({
          ingredientId: r.ingredientId,
          quantityOrdered: Number(r.quantityOrdered),
          unitCost: Number(r.unitCost),
        })),
      },
      {
        onSuccess: (po) => {
          toast.success(`Purchase order ${po.poNumber} created`);
          setOpen(false);
          setSupplierId("");
          setRows([{ ...emptyRow }]);
          router.push(`/inventory/purchase-orders/${po.id}`);
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not create purchase order"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="h-11 sm:h-9 rounded-xl shadow-xs gap-1.5 font-semibold active:scale-98">
            <Plus className="h-4 w-4" />
            <span>New Purchase Order</span>
          </Button>
        }
      />
      <DialogContent className="flex flex-col max-h-[92dvh] sm:max-h-[85vh] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Sticky Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/80 shrink-0 bg-background">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">New Purchase Order</DialogTitle>
              <DialogDescription className="text-xs">
                Draft an order with line items and unit pricing for vendor fulfillment
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body with padding-bottom for the sticky footer */}
        <form id="create-po-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 pb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Vendor / Supplier *</Label>
            <select
              aria-label="Vendor / Supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={nativeSelectClass}
              required
            >
              <option value="">Choose supplier…</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Order Line Items</Label>
              <span className="text-[11px] text-muted-foreground">{rows.length} item(s)</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {rows.map((row, index) => {
                const lineTotal = (Number(row.quantityOrdered) || 0) * (Number(row.unitCost) || 0);

                return (
                  <div key={index} className="flex flex-col gap-2.5 p-3 rounded-xl border border-border/70 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Select ingredient"
                        value={row.ingredientId}
                        onChange={(e) => updateRow(index, { ingredientId: e.target.value })}
                        className={`${nativeSelectClass} flex-1`}
                        required
                      >
                        <option value="">Select ingredient…</option>
                        {ingredients?.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.unit})
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={rows.length === 1}
                        onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                        className="h-11 w-11 sm:h-9 sm:w-9 rounded-xl text-muted-foreground hover:text-destructive shrink-0 active:scale-96"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Quantity</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          placeholder="Qty"
                          className="h-11 sm:h-9 text-xs sm:text-sm rounded-xl tabular-nums font-semibold"
                          value={row.quantityOrdered}
                          onChange={(e) => updateRow(index, { quantityOrdered: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Rate / Unit (₹)</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Rate"
                          className="h-11 sm:h-9 text-xs sm:text-sm rounded-xl tabular-nums font-semibold"
                          value={row.unitCost}
                          onChange={(e) => updateRow(index, { unitCost: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground">Line subtotal:</span>
                      <span className="font-bold tabular-nums text-foreground">{formatCurrency(lineTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, { ...emptyRow }])}
              className="h-11 sm:h-9 rounded-xl text-xs font-semibold gap-1.5 w-full sm:w-fit active:scale-98 mt-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add another line</span>
            </Button>
          </div>
        </form>

        {/* Sticky Footer: m-0, w-full, responsive flex layout with total on leading side and actions on trailing */}
        <div className="m-0 p-3.5 sm:p-4 border-t border-border/80 bg-background shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg">
          <div className="flex items-center justify-between sm:justify-start gap-2 text-xs sm:text-sm">
            <span className="font-medium text-muted-foreground whitespace-nowrap">Estimated PO Total:</span>
            <span className="text-lg sm:text-xl font-bold tabular-nums text-foreground whitespace-nowrap">{formatCurrency(total)}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-initial h-11 sm:h-9 rounded-xl text-xs font-medium active:scale-98"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-po-form"
              disabled={!canSubmit || createPo.isPending}
              className="flex-1 sm:flex-initial h-11 sm:h-9 rounded-xl text-xs font-semibold active:scale-98"
            >
              {createPo.isPending ? "Creating PO…" : "Create & Send PO"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
