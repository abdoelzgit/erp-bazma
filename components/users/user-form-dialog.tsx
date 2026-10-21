"use client";

import { useEffect, useState, useTransition } from "react";
import { Role } from "@/lib/roles";
import { createUser, updateUser } from "@/app/actions/user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  user?: { id: string; name: string; email: string; role: Role };
  onSuccess?: () => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  mode,
  user,
  onSuccess,
}: UserFormDialogProps) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [role, setRole] = useState<Role>(user?.role || "STAFF");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setRole(user?.role ?? Role.STAFF);
    setPassword("");
    setError(null);
  }, [open, mode, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || name.trim().length < 3) {
      setError("Nama minimal 3 karakter");
      return;
    }
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Email tidak valid");
      return;
    }
    if (mode === "create" && (!password || password.length < 8)) {
      setError("Password minimal 8 karakter");
      return;
    }
    if (mode === "edit" && password && password.length < 8) {
      setError("Password baru minimal 8 karakter");
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createUser(null, {
              name,
              email,
              password,
              role,
            })
          : await updateUser(null, {
              id: user!.id,
              name,
              email,
              role,
              password: password || undefined,
            });

      if (result.error) {
        setError(result.error);
      } else {
        onOpenChange(false);
        onSuccess?.();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah Pengguna Baru" : "Edit Pengguna"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Buat akun pengguna baru dengan role dan password awal."
              : "Perbarui nama, email, role, atau password pengguna."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              placeholder="Contoh: Budi Santoso"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as Role)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="EXECUTIVE">Executive</SelectItem>
                <SelectItem value="FINANCE">Finance</SelectItem>
                <SelectItem value="DEPT_HEAD">Dept Head</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password {mode === "edit" && <span className="text-xs text-muted-foreground ml-1">(kosongkan jika tidak diubah)</span>}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              placeholder={mode === "create" ? "Minimal 8 karakter" : "Biarkan kosong jika tidak diubah"}
            />
          </div>

          {error && <div className="rounded bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : mode === "create" ? "Tambah" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
