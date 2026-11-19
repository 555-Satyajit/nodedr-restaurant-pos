"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Building2, 
  ChevronRight, 
  FileText, 
  Mail, 
  MapPin, 
  MoreVertical, 
  Pencil, 
  Phone, 
  Plus, 
  Receipt, 
  Search, 
  Sparkles, 
  Trash2, 
  Truck, 
  User 
} from "lucide-react";
import { AddSupplierDialog } from "@/components/inventory/add-supplier-dialog";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useBranch } from "@/hooks/use-branch";
import { useDeleteSupplier, useSuppliers, type Supplier } from "@/hooks/use-inventory";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export default function SuppliersPage() {
  const { branchId } = useBranch();
  const [search, setSearch] = useState("");
  const { data: suppliers, isLoading, isError } = useSuppliers(branchId);
  const deleteSupplier = useDeleteSupplier(branchId);

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactName && s.contactName.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.gstNumber && s.gstNumber.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const handleDelete = (s: Supplier) => {
    if (!confirm(`Are you sure you want to remove supplier "${s.name}"? Past purchase orders will remain intact.`)) return;
    deleteSupplier.mutate(s.id, {
      onSuccess: () => toast.success(`Supplier "${s.name}" removed`),
      onError: () => toast.error("Could not delete supplier"),
    });
  };

  const totalSuppliers = suppliers?.length ?? 0;
  const activeSuppliers = suppliers?.filter((s) => s.isActive !== false).length ?? 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-24 sm:pb-20">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">
              Suppliers & Vendors
            </h1>
            <Badge variant="secondary" className="text-[11px] font-medium text-muted-foreground border-border/70">
              Procurement
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage food vendors, distributor contact persons, GST tax numbers, and purchase history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto [&>button]:h-11 sm:[&>button]:h-9 [&>button]:rounded-xl [&>button]:active:scale-98">
            <AddSupplierDialog branchId={branchId} />
          </div>
        </div>
      </div>

      <InventoryTabs />

      {/* KPI Overview Cards: 3-column glanceable cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">Registered</span>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums my-1">
            {totalSuppliers}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">Directory</span>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">Active Partners</span>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 tabular-nums my-1">
            {activeSuppliers}
          </span>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">Ready for POs</span>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">Procurement</span>
          <Link
            href="/inventory/purchase-orders"
            className="text-xs sm:text-sm font-semibold text-primary hover:underline my-1.5 flex items-center gap-0.5"
          >
            <span className="truncate">Open POs</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </Link>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">Payables</span>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers by name, phone, GST…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 sm:h-9 text-xs sm:text-sm rounded-xl bg-card border-border/70"
          />
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center text-sm text-destructive rounded-2xl border-dashed">
          Could not load supplier directory. Please check your connection.
        </Card>
      ) : filtered.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
                  <TableHead className="font-semibold text-xs text-foreground py-3">Supplier Name</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground py-3">Contact Person</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground py-3">Phone & Email</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground py-3">Tax / GSTIN</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground py-3">Address</TableHead>
                  <TableHead className="w-16 text-right font-semibold text-xs text-foreground py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="transition-colors hover:bg-muted/30">
                    <TableCell className="py-3 font-semibold text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <span>{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {s.contactName ? (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground/60" />
                          <span>{s.contactName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        {s.phone && (
                          <a href={`tel:${s.phone}`} className="hover:text-primary transition-colors flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground/60" />
                            <span>{s.phone}</span>
                          </a>
                        )}
                        {s.email && (
                          <a href={`mailto:${s.email}`} className="hover:text-primary transition-colors flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground/60" />
                            <span>{s.email}</span>
                          </a>
                        )}
                        {!s.phone && !s.email && <span className="text-muted-foreground/40">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 font-mono text-xs text-muted-foreground">
                      {s.gstNumber || <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground max-w-xs truncate">
                      {s.address || <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary active:scale-96 transition-transform ml-auto"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-36 p-1 shadow-lg">
                          <DropdownMenuItem
                            render={
                              <button
                                type="button"
                                onClick={() => setEditingSupplier(s)}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-secondary cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Edit</span>
                              </button>
                            }
                          />
                          <DropdownMenuItem
                            variant="destructive"
                            render={
                              <button
                                type="button"
                                onClick={() => handleDelete(s)}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            }
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View (< md) with Apple HIG touch-first styling */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs active:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-base text-foreground">{s.name}</span>
                      {s.contactName && (
                        <span className="text-xs text-muted-foreground mt-0.5">
                          Contact: <strong className="text-foreground font-medium">{s.contactName}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary active:scale-96 transition-transform"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-36 p-1 shadow-lg">
                      <DropdownMenuItem
                        render={
                          <button
                            type="button"
                            onClick={() => setEditingSupplier(s)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-secondary"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Edit</span>
                          </button>
                        }
                      />
                      <DropdownMenuItem
                        variant="destructive"
                        render={
                          <button
                            type="button"
                            onClick={() => handleDelete(s)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        }
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Touch-friendly contact pill row (HIG 44pt target area for tap-to-call) */}
                <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {s.phone ? (
                      <a
                        href={`tel:${s.phone}`}
                        className="flex items-center gap-2 font-medium text-foreground p-2 rounded-lg bg-background/80 border border-border/50 active:scale-98 transition-transform"
                      >
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        <span>{s.phone}</span>
                      </a>
                    ) : null}
                    {s.email ? (
                      <a
                        href={`mailto:${s.email}`}
                        className="flex items-center gap-2 text-muted-foreground p-2 rounded-lg bg-background/80 border border-border/50 truncate active:scale-98 transition-transform"
                      >
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        <span className="truncate">{s.email}</span>
                      </a>
                    ) : null}
                  </div>

                  {s.gstNumber && (
                    <div className="flex items-center justify-between pt-1 border-t border-border/50 font-mono text-[11px] text-foreground">
                      <span className="text-muted-foreground font-sans">GSTIN:</span>
                      <span className="font-semibold">{s.gstNumber}</span>
                    </div>
                  )}

                  {s.address && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border/50">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="line-clamp-2">{s.address}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Empty State */
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center rounded-2xl border-dashed bg-card/60">
          <Building2 className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">
            {search ? `No suppliers match "${search}"` : "No Suppliers in Directory"}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {search
              ? "Try clearing your search term to view all registered suppliers."
              : "Register your ingredient vendors and food distributors to start dispatching purchase orders."}
          </p>
          {!search && (
            <div className="pt-2">
              <AddSupplierDialog branchId={branchId} />
            </div>
          )}
        </Card>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <AddSupplierDialog
          branchId={branchId}
          supplier={editingSupplier}
          open={!!editingSupplier}
          onOpenChange={(o) => !o && setEditingSupplier(null)}
        />
      )}
    </div>
  );
}
