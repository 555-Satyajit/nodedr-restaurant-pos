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
import { PaymentMethodButtons } from "@/components/pos/payment-method-buttons";
import { Label } from "@/components/ui/label";
import { useRecordSupplierPayment, type SupplierInvoice } from "@/hooks/use-inventory";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { CreditCard } from "lucide-react";

const METHODS = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "WALLET", "OTHER"] as const;

export function RecordPaymentDialog({
  branchId,
  invoice,
}: {
  branchId: string | null;
  invoice: SupplierInvoice;
}) {
  const [open, setOpen] = useState(false);
  const remaining = Number(invoice.totalAmount) - Number(invoice.amountPaid);
  const [amount, setAmount] = useState(() => String(remaining));
  const [method, setMethod] = useState<(typeof METHODS)[number]>("CASH");
  const [reference, setReference] = useState("");
  const recordPayment = useRecordSupplierPayment(branchId);

  const canSubmit = Number(amount) > 0 && Number(amount) <= remaining;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    recordPayment.mutate(
      {
        invoiceId: invoice.id,
        dto: { amount: Number(amount), paymentMethod: method, reference: reference || undefined },
      },
      {
        onSuccess: () => {
          toast.success("Payment recorded");
          setOpen(false);
          setReference("");
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not record payment"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs font-medium active:scale-96">
            Record payment
          </Button>
        }
      />
      <DialogContent className="flex flex-col max-h-[92dvh] sm:max-h-[85vh] sm:max-w-sm p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Sticky Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/80 shrink-0 bg-background">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">Record Payment</DialogTitle>
              <DialogDescription className="text-xs">
                {invoice.invoiceNumber} — {formatCurrency(remaining)} due
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form id="record-payment-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Payment Amount (₹) *</Label>
            <Input
              type="number"
              min="0"
              max={remaining}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 sm:h-9 text-base sm:text-sm font-bold rounded-xl"
              required
            />
            <span className="text-[11px] text-muted-foreground">
              Maximum payable: {formatCurrency(remaining)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold">Payment Method</Label>
            <PaymentMethodButtons methods={METHODS} value={method} onChange={setMethod} label="Payment method" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground">Reference / Transaction ID</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UTR / cheque no. (optional)"
              className="h-10 sm:h-9 text-xs rounded-xl"
            />
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
            form="record-payment-form"
            disabled={!canSubmit || recordPayment.isPending}
            className="w-full sm:w-auto h-11 sm:h-9 rounded-xl text-xs font-semibold"
          >
            {recordPayment.isPending ? "Recording…" : `Pay ${formatCurrency(Number(amount) || 0)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
