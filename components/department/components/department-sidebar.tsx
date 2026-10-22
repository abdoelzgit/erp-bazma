"use client";

import { Fragment } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Department } from "../department-view.types";

const STATUS_OPTIONS = [
  { value: "Semua", label: "Semua" },
  { value: "Aktif", label: "Aktif" },
  { value: "Nonaktif", label: "Nonaktif" },
];

export type DepartmentSidebarProps = {
  departments: Department[];
  selectedDeptId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  canManageDepartments: boolean;
  emptyMessage: string;
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  year: string;
  onYearChange: (v: string) => void;
};

export function DepartmentSidebar({
  departments,
  selectedDeptId,
  onSelect,
  onAdd,
  canManageDepartments,
  emptyMessage,
  search,
  onSearchChange,
  status,
  onStatusChange,
  year,
  onYearChange,
}: DepartmentSidebarProps) {
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: String(currentYear), label: String(currentYear) },
    { value: String(currentYear - 1), label: String(currentYear - 1) },
    { value: "Semua", label: "Semua" },
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col border-r bg-muted/20 lg:h-full lg:min-h-0 lg:w-88">
      <div className="shrink-0 space-y-3.5 p-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Departemen</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Kelola data, anggaran, dan anggota.
          </p>
        </div>

        {canManageDepartments && (
          <Button
            type="button"
            onClick={onAdd}
            variant="outline"
            className="h-9 w-full justify-center gap-1.5 text-xs font-semibold"
          >
            <PlusIcon className="size-3.5" />
            Tambah departemen
          </Button>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="dept-search" className="text-xs">
            Cari departemen
          </Label>
          <Input
            id="dept-search"
            type="search"
            placeholder="Cari nama atau kode..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 bg-background text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="dept-status-filter" className="text-[11px] text-muted-foreground">
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(value) => value && onStatusChange(value)}
              items={STATUS_OPTIONS}
            >
              <SelectTrigger id="dept-status-filter" className="h-8 w-full bg-background text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dept-year-filter" className="text-[11px] text-muted-foreground">
              Tahun anggaran
            </Label>
            <Select
              value={year}
              onValueChange={(value) => value && onYearChange(value)}
              items={yearOptions}
            >
              <SelectTrigger id="dept-year-filter" className="h-8 w-full bg-background text-xs">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1 overscroll-contain">
        <div>
          {departments.map((dept, index) => {
            const isSelected = dept.id === selectedDeptId;
            const isActive = dept.status === "Aktif";
            return (
              <Fragment key={dept.id}>
                {index > 0 && <Separator className="bg-border/60" />}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onSelect(dept.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "h-auto w-full flex-col items-stretch justify-start gap-0 whitespace-normal rounded-none p-4 text-left font-normal",
                    isSelected
                      ? "bg-accent/80 text-accent-foreground hover:bg-accent/80"
                      : "hover:bg-muted/50",
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold leading-tight text-foreground">
                      {dept.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-4 shrink-0 px-1.5 py-0 text-[10px]",
                        isActive
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {dept.status}
                    </Badge>
                  </span>

                  <span className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{dept.code}</span>
                    <span>{dept.members.length} anggota</span>
                  </span>

                  <span
                    className={cn(
                      "mt-3 text-xs",
                      isSelected ? "font-medium text-muted-foreground" : "font-semibold text-primary",
                    )}
                  >
                    {isSelected ? "Dipilih" : "Lihat detail →"}
                  </span>
                </Button>
              </Fragment>
            );
          })}

          {departments.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">{emptyMessage}</div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}