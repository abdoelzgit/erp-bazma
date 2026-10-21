import { prisma } from "@/lib/prisma";
import type { Department as DepartmentViewModel } from "@/components/department/department-view.types";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);

export async function getDepartmentsForView(year: number): Promise<DepartmentViewModel[]> {
  const departments = await prisma.department.findMany({
    include: {
      members: {
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      },
      accounts: { include: { budgets: { where: { year } } } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return departments.map((department) => {
    const pic = department.members.find((member) => member.role === "PIC")?.name
      ?? department.picName
      ?? "-";
    const usedBudget = department.accounts.reduce(
      (sum, account) => sum + account.budgets.reduce((accountSum, budget) => accountSum + Number(budget.realizedAmount), 0),
      0,
    );
    const totalBudget = department.accounts.reduce(
      (sum, account) => sum + account.budgets.reduce((accountSum, budget) => accountSum + Number(budget.amount), 0),
      0,
    );

    return {
      id: department.id,
      name: department.name,
      code: department.code,
      status: department.status === "ACTIVE" ? "Aktif" : "Nonaktif",
      pic,
      description: department.description ?? "",
      totalBudget,
      usedBudget,
      year,
      updatedAt: formatDate(department.updatedAt),
      updatedBy: "Sistem",
      members: department.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        name: member.user?.name ?? member.name,
        email: member.user?.email ?? member.email,
        userRole: member.user?.role ?? null,
        role: member.role === "PIC" ? "Penanggung jawab" as const : "Anggota" as const,
        status: member.status === "ACTIVE" ? "Aktif" as const : "Nonaktif" as const,
      })),
    };
  });
}
