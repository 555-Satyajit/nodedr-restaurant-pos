"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ClipboardPaste, TriangleAlert, Receipt, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSupplierInvoice, useParseInvoiceText, useSuppliers, type ParsedInvoice } from "@/hooks/use-inventory";
import { ApiError } from "@/lib/api";

export function CreateInvoiceDialog({ branchId }: { branchId: string | null }) {
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const { data: suppliers } = useSuppliers(branchId);
  const createInvoice = useCreateSupplierInvoice(branchId);
  const parseText = useParseInvoiceText(branchId);
  const [pasted, setPasted] = useState("");
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);

  const readInvoice = () => {
    parseText.mutate(pasted, {
      onSuccess: (r) => {
        setParsed(r);
        if (r.invoiceNumber) setInvoiceNumber(r.invoiceNumber);
        if (r.invoiceDate) setInvoiceDate(r.invoiceDate);
        if (r.dueDate) setDueDate(r.dueDate);
        if (r.totalAmount !== null) setTotalAmount(String(r.totalAmount));
        // Only pre-pick a supplier on an exact (case-insensitive) name match.
        const match = suppliers?.find((s) => r.supplierName && s.name.trim().toLowerCase() === r.supplierName.trim().toLowerCase());
        if (match) setSupplierId(match.id);
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not read the invoice text"),
    });
  };

  const canSubmit = !!supplierId && !!invoiceNumber.trim() && Number(totalAmount) > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createInvoice.mutate(
      {
        supplierId,
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        totalAmount: Number(totalAmount),
      },
      {
        onSuccess: (inv) => {
          toast.success(`Invoice ${inv.invoiceNumber} recorded`);
          setOpen(false);
          setInvoiceNumber("");
          setTotalAmount("");
          setDueDate("");
          setPasted("");
          setParsed(null);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not record invoice"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="h-11 sm:h-9 rounded-xl text-xs font-semibold gap-1.5 active:scale-98">
            <Plus className="h-4 w-4" />
            <span>Record Invoice</span>
          </Button>
        }
      />
      <DialogContent className="flex flex-col max-h-[92dvh] sm:max-h-[85vh] sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Sticky Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/80 shrink-0 bg-background">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">Record Supplier Invoice</DialogTitle>
              <DialogDescription className="text-xs">
                Log a vendor bill to manage payments and track pending balances
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form id="invoice-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5">
          {/* AI / Quick-paste helper */}
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <ClipboardPaste className="h-3.5 w-3.5" />
                Paste invoice text
              </span>
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="h-7 text-[11px] rounded-lg"
                disabled={!pasted.trim() || parseText.isPending}
                onClick={readInvoice}
              >
                {parseText.isPending ? "Reading…" : "Auto-fill fields"}
              </Button>
            </div>
            <Textarea
              rows={2}
              placeholder="Paste raw invoice text or email body to auto-fill..."
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              className="text-xs rounded-lg resize-none bg-background/80"
            />
            {parsed?.warnings && parsed.warnings.length > 0 && (
              <p className="text-[11px] text-warning flex items-center gap-1">
                <TriangleAlert className="h-3 w-3 shrink-0" />
                Please verify: {parsed.warnings.join(", ")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Vendor / Supplier *</Label>
            <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? "")}>
              <SelectTrigger className="h-11 sm:h-9 text-xs sm:text-sm rounded-xl">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Invoice Number *</Label>
              <Input
                placeholder="e.g. INV-9042"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="h-10 sm:h-9 text-xs rounded-xl uppercase font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Total Amount (₹) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="h-10 sm:h-9 text-xs rounded-xl font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-10 sm:h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 sm:h-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <DialogFooter className="p-3 sm:p-4 border-t border-border/80 bg-background shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-11 sm:h-9 rounded-xl text-xs"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="invoice-form"
            disabled={!canSubmit || createInvoice.isPending}
            className="w-full sm:w-auto h-11 sm:h-9 rounded-xl text-xs font-semibold"
          >
            {createInvoice.isPending ? "Recording…" : "Save Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
