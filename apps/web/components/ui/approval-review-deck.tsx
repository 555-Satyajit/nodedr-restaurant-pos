"use client";

import * as React from "react";
import { Check, X, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ProposalItem {
  name: string;
  price?: number;
  category?: string;
  isVeg?: boolean;
  portionYield?: number;
}

export interface ProposalIngredient {
  ingredientName: string;
  quantity: number;
  unit: string;
}

export interface ProposalData {
  title: string;
  summary: string;
  toolName?: string;
  category?: string;
  items?: ProposalItem[];
  bomLines?: ProposalIngredient[];
  deleteItems?: string[];
  parameters?: Record<string, unknown>;
}

export interface ApprovalReviewDeckProps {
  proposal: ProposalData;
  onApprove: () => void;
  onReject: () => void;
  isExecuting?: boolean;
  isCompleted?: boolean;
  isRejected?: boolean;
  className?: string;
}

export function ApprovalReviewDeck({
  proposal,
  onApprove,
  onReject,
  isExecuting = false,
  isCompleted = false,
  isRejected = false,
  className,
}: ApprovalReviewDeckProps) {
  const items = proposal.items || [];
  const bomLines = proposal.bomLines || [];

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col text-left max-w-2xl w-full my-2 animate-in fade-in-50 duration-150",
        isCompleted && "border-emerald-500/40 bg-emerald-500/5",
        isRejected && "border-destructive/40 bg-destructive/5 opacity-80",
        className
      )}
    >
      {/* Header Container */}
      <div className="flex flex-col gap-0.5 px-4 pt-3.5 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground truncate">
            {proposal.toolName || "Action Proposal"}
          </span>
          <Badge
            variant={isCompleted ? "default" : isRejected ? "destructive" : "secondary"}
            className={cn(
              "text-[10px] px-2 py-0.5 font-medium shrink-0 rounded-full",
              isCompleted && "bg-emerald-600 hover:bg-emerald-600 text-white"
            )}
          >
            {isCompleted ? "Approved & Recorded" : isRejected ? "Cancelled" : "Review Required"}
          </Badge>
        </div>
        <p className="text-sm sm:text-base font-semibold text-foreground leading-snug">
          {proposal.title}
        </p>
      </div>

      {/* Summary */}
      {proposal.summary && (
        <div className="px-4 pb-3">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {proposal.summary}
          </p>
        </div>
      )}

      {/* Table Diff Section */}
      <div className="px-4 pb-3">
        <div className="rounded-lg border border-border/80 overflow-hidden bg-background/50">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border/80 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Entity</span>
            <span>Category</span>
            <span className="text-right">Price / Value</span>
          </div>

          {/* Menu Items */}
          {items.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1.5fr_1fr_1fr] items-center gap-2 px-3 py-2.5 border-b border-border/40 text-xs text-foreground hover:bg-muted/20 transition-colors"
            >
              <div className="font-semibold flex items-center gap-2 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span className="truncate">{item.name}</span>
              </div>
              <div className="text-muted-foreground truncate text-[11px]">
                {item.category || proposal.category || "Menu Item"}
              </div>
              <div className="text-right font-medium text-primary tabular-nums">
                {item.price ? `₹${item.price.toFixed(2)}` : "Standard"}
              </div>
            </div>
          ))}

          {/* BOM Ingredients */}
          {bomLines.length > 0 && (
            <div className="p-3 bg-muted/15 border-t border-border/40">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Recipe Bill of Materials (Automatic Stock Deduction):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {bomLines.map((line, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-background border border-border text-xs font-medium text-foreground shadow-2xs"
                  >
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span>{line.ingredientName}:</span>
                    <span className="text-primary font-semibold">{line.quantity} {line.unit}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      {!isCompleted && !isRejected && (
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-muted/20 border-t border-border/70">
          <Button
            size="sm"
            variant="ghost"
            disabled={isExecuting}
            onClick={onReject}
            className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reject</span>
          </Button>
          <Button
            size="sm"
            disabled={isExecuting}
            onClick={onApprove}
            className="h-8 px-4 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary-hover active:scale-[0.98] transition-all"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving to Database…</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 stroke-[3]" />
                <span>Approve</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
