"use client";

import { useState, useTransition } from "react";
import { deleteUser } from "@/app/actions/user";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; name: string; email: string };
  currentUserId: string;
  onSuccess?: () => void;
}

export function UserDeleteDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  onSuccess,
}: UserDeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isSelf = user.id === currentUserId;

  const handleDelete = () => {
    if (isSelf) {
      setError("Anda tidak dapat menghapus akun sendiri.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteUser(null, { id: user.id });
      if (result.error) {
        setError(result.error);
      } else {
        onOpenChange(false);
        onSuccess?.();
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Pengguna</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus pengguna <strong>{user.name}</strong> ({user.email})?
            <br />
            <span className="text-destructive mt-2 block text-xs">
              Tindakan ini tidak dapat dibatalkan.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending || isSelf}>
            {isPending ? "Menghapus..." : "Ya, Hapus"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
