import { connection } from "next/server";
import { DepartmentView } from "@/components/department/department-view";
import { getDepartmentsForView } from "@/lib/department-data";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@/lib/roles";

export const metadata = {
  title: "Departemen - ERP Bazma",
};

export default async function DepartmentPage() {
  await connection();
  const session = await getCurrentUser();
  const currentUser = session
    ? await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } })
    : null;
  const canManageMembers = currentUser?.role === Role.ADMIN;
  const [departments, users] = await Promise.all([
    getDepartmentsForView(new Date().getFullYear()),
    canManageMembers
      ? prisma.user.findMany({
          select: { id: true, name: true, email: true, role: true },
          orderBy: [{ name: "asc" }, { email: "asc" }],
        })
      : Promise.resolve([]),
  ]);
  return <DepartmentView initialDepartments={departments} userOptions={users} canManageMembers={canManageMembers} />;
}
