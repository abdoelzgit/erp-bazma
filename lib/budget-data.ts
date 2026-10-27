import { prisma } from "@/lib/prisma";
import { budgetKey } from "@/lib/budget-utils";
import type { Account, Department, DrafLogItem } from "@/components/budget/budget-view.types";

export type BudgetPageData = {
  departments: Department[];
  accounts: Account[];
  budgets: Record<string, { amount: number; realized: number }>;
  drafLogs: DrafLogItem[];
};

export async function getBudgetPageData(): Promise<BudgetPageData> {
  const [departments, accountRecords, budgetRecords, requests] = await Promise.all([
    prisma.department.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.budgetAccount.findMany({
      where: { department: { status: "ACTIVE" } },
      select: { id: true, departmentId: true, code: true, name: true, isActive: true },
      orderBy: [{ department: { name: "asc" } }, { code: "asc" }],
    }),
    prisma.monthlyBudget.findMany({
      select: { accountId: true, year: true, month: true, amount: true, realizedAmount: true },
    }),
    prisma.pPDRequest.findMany({
      where: { status: { in: ["DRAFT", "PENDING_DEPT_HEAD", "PENDING_FINANCE", "PENDING_EXECUTIVE", "RETURNED_FOR_REVISION", "PENDING_FINANCE_PAYMENT", "PENDING_ACCOUNTABILITY", "PENDING_FINANCE_SETTLEMENT", "PENDING_APPLICANT_REFUND", "PENDING_FINANCE_REFUND_VERIFICATION"] } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    departments,
    accounts: accountRecords.map((account) => ({
      id: account.id,
      deptId: account.departmentId,
      code: account.code,
      name: account.name,
      isActive: account.isActive,
    })),
    budgets: Object.fromEntries(
      budgetRecords.map((budget) => [
        budgetKey(budget.accountId, budget.year, budget.month),
        { amount: Number(budget.amount), realized: Number(budget.realizedAmount) },
      ]),
    ),
    drafLogs: requests.flatMap((request) => request.items.flatMap((item) => {
      if (!item.accountId) return [];
      return [{
        id: item.id,
        accountId: item.accountId,
        year: request.year,
        month: request.month,
        createdAt: request.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
        description: item.description || `Dana ditahan: ${request.title}`,
        ppdNo: request.no,
        amount: Number(item.amount),
      }];
    })),
  };
}
