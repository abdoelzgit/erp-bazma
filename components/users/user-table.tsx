"use client";

import { Badge } from "@/components/ui/badge";
import { Role, ROLE_COLORS, ROLE_LABELS } from "@/lib/roles";
import { RoleSelector } from "./role-selector";

interface UserTableProps {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: Date;
  currentUserId: string;
}

export function UserTable({ id, name, email, role, createdAt, currentUserId }: UserTableProps) {
  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-4 text-sm font-medium">{name || "-"}</td>
      <td className="p-4 text-sm text-muted-foreground">{email}</td>
      <td className="p-4">
        <Badge variant="outline" className={`${ROLE_COLORS[role]} border`}>
          {ROLE_LABELS[role]}
        </Badge>
      </td>
      <td className="p-4 text-sm text-muted-foreground">
        {new Date(createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
      </td>
      <td className="p-4">
        <RoleSelector userId={id} currentRole={role} currentUserId={currentUserId} />
      </td>
    </tr>
  );
}