"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Role, ROLE_COLORS, ROLE_LABELS } from "@/lib/roles";
import { RoleSelector } from "./role-selector";

interface UserTableProps {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: Date;
  currentUserId: string;
  onEdit?: (user: { id: string; name: string; email: string; role: Role }) => void;
  onDelete?: (user: { id: string; name: string; email: string }) => void;
}

export function UserTable({ id, name, email, role, createdAt, currentUserId, onEdit, onDelete }: UserTableProps) {
  const isSelf = id === currentUserId;

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
      <td className="p-4 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit?.({ id, name: name || "", email, role })}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={isSelf ? "opacity-50 cursor-not-allowed" : "text-destructive hover:text-destructive"}
          disabled={isSelf}
          onClick={() => !isSelf && onDelete?.({ id, name: name || "", email })}
        >
          Hapus
        </Button>
      </td>
    </tr>
  );
}