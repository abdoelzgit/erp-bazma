import { connection } from "next/server";
import { redirect } from "next/navigation";
import { DepartmentView } from "@/components/department/department-view";
import { getDepartmentsForView } from "@/lib/department-data";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@/lib/roles";
import { getDefaultAllowedRoute } from "@/lib/route-permissions";

export const metadata = {
  title: "Departemen - ERP Bazma",
};

export default async function DepartmentPage() {
  await connection();
  const session = await getCurrentUser();
  const currentUser = session
    ? await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true } })
    : null;

  if (!currentUser || (currentUser.role !== Role.ADMIN && currentUser.role !== Role.DEPT_HEAD && currentUser.role !== Role.STAFF)) {
    redirect(getDefaultAllowedRoute(currentUser?.role));
  }

  const isAdmin = currentUser.role === Role.ADMIN;
  const isDepartmentHead = currentUser.role === Role.DEPT_HEAD;
  const allowedMembershipRole = isDepartmentHead ? "PIC" : "MEMBER";
  const [memberships, users] = await Promise.all([
    isAdmin
      ? Promise.resolve(null)
      : prisma.departmentMember.findMany({
          where: {
            userId: currentUser.id,
            role: allowedMembershipRole,
            status: "ACTIVE",
            department: { status: "ACTIVE" },
          },
          select: { departmentId: true },
        }),
    isAdmin || isDepartmentHead
      ? prisma.user.findMany({
          where: isDepartmentHead ? { role: Role.STAFF } : undefined,
          select: { id: true, name: true, email: true, role: true },
          orderBy: [{ name: "asc" }, { email: "asc" }],
        })
      : Promise.resolve([]),
  ]);
  const departmentIds = memberships?.map((membership) => membership.departmentId) ?? [];
  const departments = await getDepartmentsForView(
    new Date().getFullYear(),
    isAdmin ? undefined : departmentIds,
  );

  return (
    <DepartmentView
      initialDepartments={departments}
      userOptions={users}
      canManageDepartments={isAdmin}
      canManageMembers={isAdmin || isDepartmentHead}
      canManageAllMembers={isAdmin}
    />
  );
}
