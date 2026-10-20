"use client";

import { formatRupiah } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Department } from "../department-view.types";

export type DepartmentBudgetCardProps = {
  dept: Department;
};

export function DepartmentBudgetCard({ dept }: DepartmentBudgetCardProps) {
  const totalBudget = dept.totalBudget;
  const usedBudget = dept.usedBudget;
  const remainingBudget = Math.max(0, totalBudget - usedBudget);
  const budgetPercentage = totalBudget > 0 ? Math.min(100, Math.round((usedBudget / totalBudget) * 100)) : 0;

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Anggaran departemen</h2>
        <Badge variant="outline" className="text-xs font-normal">Tahun {dept.year}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-muted/40 border">
          <div className="text-xs text-muted-foreground">Total anggaran</div>
          <div className="text-xl lg:text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">
            {formatRupiah(totalBudget)}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/40 border">
          <div className="text-xs text-muted-foreground">Terpakai</div>
          <div className="text-xl lg:text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">
            {formatRupiah(usedBudget)}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/40 border">
          <div className="text-xs text-muted-foreground">Sisa anggaran</div>
          <div className="text-xl lg:text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">
            {formatRupiah(remainingBudget)}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Pemakaian {budgetPercentage}% dari total anggaran</span>
          <span>1 Jan – 31 Des {dept.year}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-foreground transition-all duration-500 rounded-full" style={{ width: `${budgetPercentage}%` }} />
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground border-t pt-3">
        Total ini dihitung dari akumulasi budget bulanan semua account pada halaman Budget.
      </div>
    </div>
  );
}
