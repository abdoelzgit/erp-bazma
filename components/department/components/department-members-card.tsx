"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Department, Member } from "../department-view.types";

export type DepartmentMembersCardProps = {
  dept: Department;
  memberSearch: string;
  onMemberSearchChange: (v: string) => void;
  memberRoleFilter: string;
  onMemberRoleFilterChange: (v: string) => void;
  onAddMember: () => void;
  onRemoveMember: (memberId: string, memberName: string) => void;
};

export function DepartmentMembersCard({
  dept,
  memberSearch,
  onMemberSearchChange,
  memberRoleFilter,
  onMemberRoleFilterChange,
  onAddMember,
  onRemoveMember,
}: DepartmentMembersCardProps) {
  if (!dept) return null;

  const filteredMembers = dept.members.filter((m) => {
    const matchQuery =
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase());
    const matchRole =
      memberRoleFilter === "Semua" || m.role === memberRoleFilter;
    return matchQuery && matchRole;
  });

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Anggota departemen</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            {dept.members.length} anggota
          </Badge>
          <Button variant="outline" size="sm" onClick={onAddMember} className="gap-1.5 text-xs h-7 font-medium">
            <PlusIcon className="size-3.5" />
            + Tambah anggota
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Cari nama atau email..."
            value={memberSearch}
            onChange={(e) => onMemberSearchChange(e.target.value)}
            className="h-8 text-xs bg-background"
          />
        </div>

        <select
          value={memberRoleFilter}
          onChange={(e) => onMemberRoleFilterChange(e.target.value)}
          className="h-8 px-2 rounded-md border border-input bg-background text-xs w-full sm:w-36 focus:outline-none"
        >
          <option value="Semua">Semua peran</option>
          <option value="Penanggung jawab">Penanggung jawab</option>
          <option value="Anggota">Anggota</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border/80">
        <table className="w-full caption-bottom text-xs">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground">
              <th className="p-3 text-left font-medium">Pengguna</th>
              <th className="p-3 text-left font-medium">Peran</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredMembers.map((member) => (
              <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <div className="font-semibold text-foreground">{member.name}</div>
                  <div className="text-muted-foreground text-[11px]">{member.email}</div>
                </td>
                <td className="p-3 text-muted-foreground font-medium">{member.role}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {member.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveMember(member.id, member.name)}
                    className="h-7 text-xs px-2.5 hover:bg-destructive/10 hover:text-destructive"
                  >
                    Keluarkan
                  </Button>
                </td>
              </tr>
            ))}

            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  Belum ada anggota yang terdaftar di departemen ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Mengeluarkan anggota hanya menghapus keanggotaan departemen, bukan akun pengguna.
      </p>
    </div>
  );
}
