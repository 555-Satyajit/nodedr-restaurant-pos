"use client";

import { Plus, Trash2, FileText } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePurchaseRequest, useIngredients } from "@/hooks/use-inventory";
import { ApiError } from "@/lib/api";

interface Row {
  ingredientId: string;
  quantityRequested: string;
}

const emptyRow: Row = { ingredientId: "", quantityRequested: "" };

export function CreatePurchaseRequestDialog({ branchId }: { branchId: string | null }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([{ ...emptyRow }]);
  const { data: ingredients } = useIngredients(branchId);
  const createRequest = useCreatePurchaseRequest(branchId);

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const canSubmit =
    rows.length > 0 && rows.every((r) => r.ingredientId && Number(r.quantityRequested) > 0);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createRequest.mutate(
      {
        notes: notes || undefined,
        items: rows.map((r) => ({
          ingredientId: r.ingredientId,
          quantityRequested: Number(r.quantityRequested),
        })),
      },
      {
        onSuccess: (request) => {
          toast.success(`${request.requestNumber} created`);
          setOpen(false);
          setNotes("");
          setRows([{ ...emptyRow }]);
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not create purchase request"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="h-11 sm:h-9 rounded-xl text-xs font-semibold gap-1.5 active:scale-98">
            <Plus className="h-4 w-4" />
            <span>New Request</span>
          </Button>
        }
      />
      <DialogContent className="flex flex-col max-h-[92dvh] sm:max-h-[85vh] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Sticky Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/80 shrink-0 bg-background">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">New Purchase Request</DialogTitle>
              <DialogDescription className="text-xs">
                Submit an internal kitchen requisition for review and purchasing approval
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form id="purchase-request-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Requested Items *</Label>
              <span className="text-[11px] text-muted-foreground">{rows.length} line(s)</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {rows.map((row, index) => (
                <div key={index} className="flex items-center gap-2 p-2.5 rounded-xl border border-border/70 bg-muted/20">
                  <Select
                    value={row.ingredientId}
                    onValueChange={(v) => updateRow(index, { ingredientId: v ?? "" })}
                  >
                    <SelectTrigger className="flex-1 h-10 sm:h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Select ingredient" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients?.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Qty"
                    className="w-24 sm:w-28 h-10 sm:h-9 text-xs rounded-lg"
                    value={row.quantityRequested}
                    onChange={(e) => updateRow(index, { quantityRequested: e.target.value })}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl text-muted-foreground hover:text-destructive shrink-0"
                    disabled={rows.length === 1}
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 sm:h-8 rounded-xl text-xs font-semibold gap-1.5 w-full sm:w-fit active:scale-98 mt-1"
              onClick={() => setRows((prev) => [...prev, { ...emptyRow }])}
            >
              <Plus className="h-4 w-4" />
              <span>Add Ingredient</span>
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pr-notes" className="text-xs font-medium text-foreground">
              Requisition Notes (Optional)
            </Label>
            <Textarea
              id="pr-notes"
              rows={2}
              placeholder="e.g. Needed urgently for weekend banquet prep..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs rounded-xl resize-none"
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
            form="purchase-request-form"
            disabled={!canSubmit || createRequest.isPending}
            className="w-full sm:w-auto h-11 sm:h-9 rounded-xl text-xs font-semibold"
          >
            {createRequest.isPending ? "Submitting…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
