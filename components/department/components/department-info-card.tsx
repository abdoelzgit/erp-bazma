"use client";

import { formatRupiah } from "@/lib/utils";
import type { Department } from "../department-view.types";

export type DepartmentInfoCardProps = {
  dept: Department;
};

export function DepartmentInfoCard({ dept }: DepartmentInfoCardProps) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
      <h2 className="font-semibold text-sm">Informasi departemen</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Kode departemen</span>
          <p className="font-semibold text-sm text-foreground">{dept.code}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Penanggung jawab</span>
          <p className="font-semibold text-sm text-foreground">{dept.pic}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Jumlah anggota</span>
          <p className="font-semibold text-sm text-foreground">{dept.members.length} pengguna</p>
        </div>
      </div>

      <div className="pt-2 border-t space-y-1">
        <span className="text-xs text-muted-foreground">Deskripsi</span>
        <p className="text-xs text-foreground leading-relaxed">{dept.description || "-"}</p>
      </div>
    </div>
  );
}
