"use client";

import { useState, useTransition } from "react";
import { Role, ROLE_LABELS, ROLE_OPTIONS } from "@/lib/roles";
import { updateUserRoleAction } from "@/app/actions/user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RoleSelectorProps {
  userId: string;
  currentRole: Role;
  currentUserId: string;
}

export function RoleSelector({
  userId,
  currentRole,
  currentUserId,
}: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isSelf = userId === currentUserId;

  const handleValueChange = (value: Role | null) => {
    if (!value || value === currentRole) return;
    setPendingRole(value);
  };

  const confirmRoleChange = () => {
    if (!pendingRole) return;

    setError(null);
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("role", pendingRole);

    startTransition(async () => {
      const result = await updateUserRoleAction(null, formData);
      if (result.error) {
        setError(result.error);
        setSelectedRole(currentRole);
      } else {
        setSelectedRole(pendingRole);
      }
      setPendingRole(null);
    });
  };

  if (isSelf) {
    return (
      <span className="text-xs text-muted-foreground italic">
        (Role Anda)
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Select
        disabled={isPending}
        value={selectedRole}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Pilih Role" />
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && <span className="text-xs text-destructive">{error}</span>}

      <AlertDialog open={!!pendingRole} onOpenChange={(open) => !open && setPendingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Perubahan Role</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengubah role pengguna ini menjadi{" "}
              <strong>{pendingRole ? ROLE_LABELS[pendingRole] : ""}</strong>?
              Perubahan hak akses akan langsung berlaku.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              {isPending ? "Menyimpan..." : "Ya, Ubah Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}