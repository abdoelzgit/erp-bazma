import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getPpdDepartmentAccessWhere } from "@/lib/ppd-access";
import type { PpdPageData } from "@/components/ppd/ppd.types";

const budgetKey = (accountId: string, year: number, month: number) => `${accountId}|${year}|${month}`;

export async function getPpdPageData(): Promise<PpdPageData> {
  const session = await getCurrentUser();
  const accessWhere = session ? await getPpdDepartmentAccessWhere(session.id) : null;
  const departments = accessWhere
    ? await prisma.department.findMany({
        where: accessWhere,
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];
  const departmentIds = departments.map((department) => department.id);
  const [requests, accountRecords, budgets] = await Promise.all([
    session && departmentIds.length
      ? prisma.pPDRequest.findMany({
          where: { requestedById: session.id, departmentId: { in: departmentIds } },
          include: { items: { include: { account: { select: { id: true, name: true } } } } },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    departmentIds.length
      ? prisma.budgetAccount.findMany({
          where: { isActive: true, departmentId: { in: departmentIds } },
          select: { id: true, departmentId: true, code: true, name: true },
          orderBy: [{ department: { name: "asc" } }, { code: "asc" }],
        })
      : Promise.resolve([]),
    departmentIds.length
      ? prisma.monthlyBudget.findMany({
          where: { account: { departmentId: { in: departmentIds } } },
          select: { accountId: true, year: true, month: true, amount: true, realizedAmount: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    drafts: requests.map((request) => ({
      id: request.id,
      title: request.title,
      description: request.description ?? "",
      category: request.type,
      timeAgo: request.updatedAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
      deptId: request.departmentId,
      submissionType: request.type,
      paymentType: request.paymentType,
      bank: request.bankName ?? "",
      accountNo: request.accountNo ?? "",
      limitFund: String(Number(request.totalAmount)),
      status: request.status === "DRAFT" ? "Draft" : "Submitted",
      year: request.createdAt.getFullYear(),
      month: request.createdAt.getMonth() + 1,
      updatedAt: request.updatedAt.toISOString(),
      rows: request.items.map((item) => ({
        id: item.id,
        accountId: item.accountId,
        accountName: item.account?.name ?? null,
        description: item.description,
        attachmentName: item.attachmentUrl ?? "",
        amount: Number(item.amount),
      })),
    })),
    departments,
    accounts: accountRecords.map((account) => ({
      id: account.id,
      deptId: account.departmentId,
      code: account.code,
      name: account.name,
    })),
    budgets: Object.fromEntries(budgets.map((budget) => [
      budgetKey(budget.accountId, budget.year, budget.month),
      { amount: Number(budget.amount), realized: Number(budget.realizedAmount) },
    ])),
  };
}
