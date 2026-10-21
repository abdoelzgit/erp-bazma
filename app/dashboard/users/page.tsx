import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getUsersAction } from "@/app/actions/user";
import { Role } from "@/lib/roles";
import { UserTable } from "@/components/users/user-table";

function UsersPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-4 w-72 rounded bg-muted animate-pulse" />
      </div>

      <div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">
        Memuat data pengguna...
      </div>
    </div>
  );
}

async function UsersManagement() {
  const user = await getCurrentUser();

  if (!user || user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }

  const result = await getUsersAction();

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola Pengguna</h1>
        <p className="text-sm text-muted-foreground">
          Kelola akun pengguna dan hak akses role di sistem ERP Bazma.
        </p>
      </div>

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
            {result.error || !result.users ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-destructive">
                  Gagal memuat data pengguna: {result.error}
                </td>
              </tr>
            ) : (
              result.users.map((u) => (
                <UserTable
                  key={u.id}
                  id={u.id}
                  name={u.name}
                  email={u.email}
                  role={u.role as Role}
                  createdAt={u.createdAt}
                  currentUserId={user.id}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<UsersPageSkeleton />}>
      <UsersManagement />
    </Suspense>
  );
}