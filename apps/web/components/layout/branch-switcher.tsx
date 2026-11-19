"use client";

import { Check, ChevronsUpDown, Store } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBranch } from "@/hooks/use-branch";

export function BranchSwitcher() {
  const { branchId, branches, setBranchId } = useBranch();
  const current = branches.find((b) => b.id === branchId);

  if (branches.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10 text-white">
        <Store className="h-4 w-4 shrink-0 text-white/70" />
        <span className="flex-1 truncate font-medium text-white">
          {current?.name ?? "Select branch"}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-white/70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {branches.map((branch) => (
          <DropdownMenuItem key={branch.id} onClick={() => setBranchId(branch.id)}>
            <span className="flex-1">{branch.name}</span>
            {branch.id === branchId && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
