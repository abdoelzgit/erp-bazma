"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { UserTable } from "./user-table";
import { UserFormDialog } from "./user-form-dialog";
import { UserDeleteDialog } from "./user-delete-dialog";
import { PlusIcon } from "@phosphor-icons/react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
}

interface UsersManagementClientProps {
  currentUserId: string;
  initialUsers: User[];
  loadError?: string;
}

export function UsersManagementClient({ currentUserId, initialUsers, loadError }: UsersManagementClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string; role: Role } | null>(null);

  const handleCreate = () => {
    setFormMode("create");
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleEdit = (user: { id: string; name: string; email: string; role: Role }) => {
    setFormMode("edit");
    setSelectedUser(user);
    setFormOpen(true);
  };

  const handleDelete = (user: { id: string; name: string; email: string }) => {
    setSelectedUser({ ...user, role: "STAFF" as Role });
    setDeleteOpen(true);
  };

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Pengguna</h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun pengguna dan hak akses role di sistem ERP Bazma.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon className="size-4 mr-2" />
          Tambah Pengguna
        </Button>
      </div>

      {loadError && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Gagal memuat data pengguna: {loadError}
        </div>
      )}

      <div className="rounded-lg border">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left font-medium">Nama</th>
              <th className="p-4 text-left font-medium">Email</th>
              <th className="p-4 text-left font-medium">Role</th>
              <th className="p-4 text-left font-medium">Bergabung</th>
              <th className="p-4 text-left font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  Belum ada pengguna terdaftar.
                </td>
              </tr>
            ) : (
              initialUsers.map((u) => (
                <UserTable
                  key={u.id}
                  id={u.id}
                  name={u.name}
                  email={u.email}
                  role={u.role as Role}
                  createdAt={u.createdAt}
                  currentUserId={currentUserId}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        user={selectedUser || undefined}
        onSuccess={handleSuccess}
      />

      {selectedUser && (
        <UserDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          user={selectedUser}
          currentUserId={currentUserId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
