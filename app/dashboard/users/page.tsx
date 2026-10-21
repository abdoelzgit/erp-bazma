import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getUsersAction } from "@/app/actions/user";
import { Role } from "@/lib/roles";
import { getDefaultAllowedRoute } from "@/lib/route-permissions";
import { UsersManagementClient } from "@/components/users/users-management-client";
import { prisma } from "@/lib/prisma";

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
  const session = await getCurrentUser();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true } })
    : null;

  if (!user || user.role !== Role.ADMIN) {
    redirect(getDefaultAllowedRoute(user?.role));
  }

  const result = await getUsersAction();

  return (
    <UsersManagementClient
      currentUserId={user.id}
      initialUsers={result.users || []}
      loadError={result.error}
    />
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<UsersPageSkeleton />}>
      <UsersManagement />
    </Suspense>
  );
}
