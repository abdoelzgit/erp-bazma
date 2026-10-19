"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTHS, YEARS } from "../budget-view.constants";

export type BudgetPeriodFilterProps = {
  month: number;
  year: number;
  deptSearch: string;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onDeptSearchChange: (search: string) => void;
  totalDepartments: number;
  missingCount: number;
};

export function BudgetPeriodFilter({
  month,
  year,
  deptSearch,
  onMonthChange,
  onYearChange,
  onDeptSearchChange,
  totalDepartments,
  missingCount,
}: BudgetPeriodFilterProps) {
  return (
    <div className="space-y-3.5">
      <div className="space-y-1">
        <label htmlFor="dept-search" className="text-xs font-medium text-foreground">
          Cari departemen
        </label>
        <Input
          id="dept-search"
          placeholder="Cari nama atau kode..."
          value={deptSearch}
          onChange={(e) => onDeptSearchChange(e.target.value)}
          className="h-9 text-xs bg-background"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor="f-month" className="text-[11px] font-medium text-muted-foreground">
            Bulan
          </label>
          <Select
            value={String(month)}
            onValueChange={(v) => onMonthChange(Number(v))}
          >
            <SelectTrigger id="f-month" className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label htmlFor="f-year" className="text-[11px] font-medium text-muted-foreground">
            Tahun
          </label>
          <Select
            value={String(year)}
            onValueChange={(v) => onYearChange(Number(v))}
          >
            <SelectTrigger id="f-year" className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground pt-1">
        {totalDepartments} departemen ·{" "}
        {missingCount > 0 ? (
          <span className="text-amber-600">{missingCount} account belum diatur</span>
        ) : (
          "semua account sudah diatur"
        )}
      </div>
    </div>
  );
}
