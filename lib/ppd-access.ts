import { Role, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getPpdDepartmentAccessWhere(userId: string): Promise<Prisma.DepartmentWhereInput | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return null;

  if (user.role === Role.ADMIN || user.role === Role.FINANCE) {
    return { status: "ACTIVE" };
  }

  return {
    status: "ACTIVE",
    members: { some: { userId, status: "ACTIVE" } },
  };
}

export async function canUserCreatePpdInDepartment(userId: string, departmentId: string) {
  const accessWhere = await getPpdDepartmentAccessWhere(userId);
  if (!accessWhere) return false;

  const department = await prisma.department.findFirst({
    where: { ...accessWhere, id: departmentId },
    select: { id: true },
  });
  return Boolean(department);
}
