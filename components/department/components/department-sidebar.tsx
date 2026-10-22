"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Department } from "../department-view.types";

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
  return (
    <aside className="flex w-full shrink-0 flex-col border-r bg-muted/20 lg:h-full lg:min-h-0 lg:w-88">
      <div className="shrink-0 space-y-3.5 border-b p-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Departemen</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola data, anggaran, dan anggota.
          </p>
        </div>

        {canManageDepartments && (
          <Button onClick={onAdd} variant="outline" className="w-full justify-center gap-1.5 text-xs font-semibold h-9">
            <PlusIcon className="size-3.5" />
            Tambah departemen
          </Button>
        )}

        <div className="space-y-1">
          <label htmlFor="dept-search" className="text-xs font-medium text-foreground">Cari departemen</label>
          <Input id="dept-search" placeholder="Cari nama atau kode..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="h-9 text-xs bg-background" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <label htmlFor="dept-status-filter" className="text-[11px] font-medium text-muted-foreground">Status</label>
            <select id="dept-status-filter" value={status} onChange={(e) => onStatusChange(e.target.value)} className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              <option value="Semua">Semua</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="dept-year-filter" className="text-[11px] font-medium text-muted-foreground">Tahun anggaran</label>
            <select id="dept-year-filter" value={year} onChange={(e) => onYearChange(e.target.value)} className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              <option value={String(new Date().getFullYear())}>{new Date().getFullYear()}</option>
              <option value={String(new Date().getFullYear() - 1)}>{new Date().getFullYear() - 1}</option>
              <option value="Semua">Semua</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground pt-1">
          {/* Will be filled by parent */}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 overscroll-contain">
        <div className="divide-y divide-border/60">
          {departments.map((dept) => {
          const isSelected = dept.id === selectedDeptId;
          return (
            <button
              type="button"
              key={dept.id}
              onClick={() => onSelect(dept.id)}
              aria-pressed={isSelected}
              className={`relative block w-full p-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${isSelected ? "bg-accent/80 text-accent-foreground" : "hover:bg-muted/50"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm leading-tight text-foreground">{dept.name}</h3>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border ${dept.status === "Aktif" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"}`}>
                  {dept.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>{dept.code}</span>
                <span>{dept.members.length} anggota</span>
              </div>

              <div className="flex items-center justify-between mt-2 pt-1 text-xs">
                <span className={`font-semibold text-foreground ${isSelected ? "text-muted-foreground font-medium" : "text-primary hover:underline"}`}>
                  {isSelected ? "Dipilih" : "Lihat detail →"}
                </span>
              </div>
            </button>
          );
          })}

          {departments.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t bg-muted/10 p-3.5 text-xs text-muted-foreground space-y-0.5">
        {/* Will be filled by parent */}
      </div>
    </aside>
  );
}
