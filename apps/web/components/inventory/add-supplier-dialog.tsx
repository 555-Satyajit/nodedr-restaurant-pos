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
import { useCreateSupplier, useUpdateSupplier, type Supplier } from "@/hooks/use-inventory";
import { ApiError } from "@/lib/api";
import { Building2, Plus } from "lucide-react";

export function AddSupplierDialog({ 
  branchId, 
  supplier, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange 
}: { 
  branchId: string | null;
  supplier?: Supplier;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const [name, setName] = useState(supplier?.name ?? "");
  const [contactName, setContactName] = useState(supplier?.contactName ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [gstNumber, setGstNumber] = useState(supplier?.gstNumber ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");

  const createSupplier = useCreateSupplier(branchId);
  const updateSupplier = useUpdateSupplier(branchId);

  const reset = () => {
    setName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setGstNumber("");
    setAddress("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (supplier) {
      updateSupplier.mutate(
        {
          id: supplier.id,
          dto: {
            name,
            contactName: contactName || undefined,
            phone: phone || undefined,
            email: email || undefined,
            gstNumber: gstNumber || undefined,
            address: address || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success(`${name} updated`);
            setOpen(false);
          },
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update supplier"),
        }
      );
    } else {
      createSupplier.mutate(
        {
          name,
          contactName: contactName || undefined,
          phone: phone || undefined,
          email: email || undefined,
          gstNumber: gstNumber || undefined,
          address: address || undefined,
          isActive: true,
        },
        {
          onSuccess: () => {
            toast.success(`${name} added`);
            setOpen(false);
            reset();
          },
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not add supplier"),
        }
      );
    }
  };

  const isPending = createSupplier.isPending || updateSupplier.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!supplier && (
        <DialogTrigger
          render={
            <Button size="sm" className="rounded-xl shadow-xs gap-1.5 font-semibold">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Supplier</span>
            </Button>
          }
        />
      )}
      <DialogContent className="flex flex-col max-h-[90dvh] sm:max-h-[85vh] sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Sticky Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/80 shrink-0 bg-background">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>{supplier ? `Edit ${supplier.name}` : "New Vendor / Supplier"}</DialogTitle>
              <DialogDescription className="text-xs">
                {supplier ? "Update vendor contact and tax details" : "Register a food vendor or distributor for procurement orders"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form id="supplier-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-name" className="text-xs font-semibold">
              Business / Company Name *
            </Label>
            <Input
              id="s-name"
              placeholder="e.g. Fresh Farm Produce Ltd."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs rounded-xl"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-contact" className="text-xs font-medium text-foreground">
                Contact Person
              </Label>
              <Input
                id="s-contact"
                placeholder="e.g. Rajesh Kumar"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-phone" className="text-xs font-medium text-foreground">
                Phone Number
              </Label>
              <Input
                id="s-phone"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-email" className="text-xs font-medium text-foreground">
                Email Address
              </Label>
              <Input
                id="s-email"
                type="email"
                placeholder="orders@supplier.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-gst" className="text-xs font-medium text-foreground">
                GST / Tax ID
              </Label>
              <Input
                id="s-gst"
                placeholder="27AAACH2384K1ZE"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="h-9 text-xs rounded-xl uppercase font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-address" className="text-xs font-medium text-foreground">
              Warehouse / Physical Address
            </Label>
            <Input
              id="s-address"
              placeholder="e.g. Unit 4, APMC Market Yard"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>
        </form>

        {/* Sticky Footer */}
        <DialogFooter className="p-3 sm:p-4 border-t border-border/80 bg-background shrink-0 gap-2 flex-col sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="supplier-form" disabled={isPending} className="w-full sm:w-auto font-semibold">
            {isPending ? (supplier ? "Saving…" : "Adding…") : (supplier ? "Save Changes" : "Create Supplier")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
