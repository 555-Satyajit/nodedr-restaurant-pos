"use client";

import { Plus, Trash2, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateQuotation, useIngredients, useSuppliers } from "@/hooks/use-inventory";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface Row {
  ingredientId: string;
  quantityQuoted: string;
  unitPrice: string;
}

const emptyRow: Row = { ingredientId: "", quantityQuoted: "", unitPrice: "" };

const nativeSelectClass =
  "h-11 sm:h-9 w-full rounded-xl border border-input bg-background px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CreateQuotationDialog({ branchId }: { branchId: string | null }) {
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [rows, setRows] = useState<Row[]>([{ ...emptyRow }]);
  const { data: suppliers } = useSuppliers(branchId);
  const { data: ingredients } = useIngredients(branchId);
  const createQuotation = useCreateQuotation(branchId);

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const totalCalculated = rows.reduce(
    (sum, r) => sum + (Number(r.quantityQuoted) || 0) * (Number(r.unitPrice) || 0),
    0
  );

  const canSubmit =
    !!supplierId &&
    rows.length > 0 &&
    rows.every((r) => r.ingredientId && Number(r.quantityQuoted) > 0 && Number(r.unitPrice) >= 0);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createQuotation.mutate(
      {
        supplierId,
        items: rows.map((r) => ({
          ingredientId: r.ingredientId,
          quantityQuoted: Number(r.quantityQuoted),
          unitPrice: Number(r.unitPrice),
        })),
      },
      {
        onSuccess: (quotation) => {
          toast.success(`${quotation.quotationNumber} recorded`);
          setOpen(false);
          setSupplierId("");
          setRows([{ ...emptyRow }]);
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not record quotation"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="h-11 sm:h-9 rounded-xl text-xs font-semibold gap-1.5 active:scale-98">
            <Plus className="h-4 w-4" />
            <span>New Quotation</span>
          </Button>
        }
      />
      <DialogContent className="flex flex-col max-h-[92dvh] sm:max-h-[85vh] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Sticky Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/80 shrink-0 bg-background">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">Record Supplier Quotation</DialogTitle>
              <DialogDescription className="text-xs">
                Log a supplier bid with itemized quantities and unit prices
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form id="quotation-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 pb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Vendor / Supplier *</Label>
            <select
              aria-label="Vendor / Supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={nativeSelectClass}
              required
            >
              <option value="">Select a supplier…</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Items Quoted</Label>
              <span className="text-[11px] text-muted-foreground">{rows.length} line(s)</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {rows.map((row, index) => {
                const lineTotal = (Number(row.quantityQuoted) || 0) * (Number(row.unitPrice) || 0);
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
                        className="h-11 w-11 sm:h-9 sm:w-9 rounded-xl text-muted-foreground hover:text-destructive shrink-0 active:scale-96"
                        disabled={rows.length === 1}
                        onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
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
                          value={row.quantityQuoted}
                          onChange={(e) => updateRow(index, { quantityQuoted: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Unit Price (₹)</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="₹ / unit"
                          className="h-11 sm:h-9 text-xs sm:text-sm rounded-xl tabular-nums font-semibold"
                          value={row.unitPrice}
                          onChange={(e) => updateRow(index, { unitPrice: e.target.value })}
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
              className="h-11 sm:h-9 rounded-xl text-xs font-semibold gap-1.5 w-full sm:w-fit active:scale-98 mt-1"
              onClick={() => setRows((prev) => [...prev, { ...emptyRow }])}
            >
              <Plus className="h-4 w-4" />
              <span>Add Quoted Item</span>
            </Button>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="m-0 p-3.5 sm:p-4 border-t border-border/80 bg-background shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg">
          <div className="flex items-center justify-between sm:justify-start gap-2 text-xs sm:text-sm">
            <span className="font-medium text-muted-foreground whitespace-nowrap">Estimated Total:</span>
            <span className="text-lg sm:text-xl font-bold tabular-nums text-foreground whitespace-nowrap">{formatCurrency(totalCalculated)}</span>
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
              form="quotation-form"
              disabled={!canSubmit || createQuotation.isPending}
              className="flex-1 sm:flex-initial h-11 sm:h-9 rounded-xl text-xs font-semibold active:scale-98"
            >
              {createQuotation.isPending ? "Saving…" : "Save Quotation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
