"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DepartmentSummary } from "../budget-view.types";
import { formatRupiah } from "@/lib/utils";

export type DepartmentBudgetListProps = {
  summaries: DepartmentSummary[];
  selectedDeptId: string;
  onSelect: (deptId: string) => void;
};

export function DepartmentBudgetList({
  summaries,
  selectedDeptId,
  onSelect,
}: DepartmentBudgetListProps) {
  return (
    <ScrollArea className="min-h-0 flex-1 overscroll-contain">
      <div className="divide-y divide-border/60">
        {summaries.map(({ dept, accountCount, missing, total }) => {
        const isSelected = dept.id === selectedDeptId;
        return (
          <button
            type="button"
            key={dept.id}
            onClick={() => onSelect(dept.id)}
            aria-pressed={isSelected}
            className={`relative block w-full p-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
              isSelected
                ? "bg-accent/80 text-accent-foreground"
                : "hover:bg-muted/50"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm leading-tight text-foreground">{dept.name}</h3>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-4 border ${
                  missing > 0
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                }`}
              >
                {missing > 0 ? `${missing} belum diatur` : "Lengkap"}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>{dept.code}</span>
              <span>{accountCount} account</span>
            </div>

            <div className="flex items-center justify-between mt-2 pt-1 text-xs">
              <span className="font-semibold text-foreground">
                {total > 0 ? formatRupiah(total) : "Belum diatur"}
              </span>
              <span
                className={`text-xs ${
                  isSelected ? "text-muted-foreground font-medium" : "text-primary hover:underline"
                }`}
              >
                {isSelected ? "Dipilih" : "Lihat detail →"}
              </span>
            </div>
          </button>
        );
        })}

        {summaries.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Tidak ada departemen yang sesuai pencarian.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
