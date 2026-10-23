import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getPpdDepartmentAccessWhere } from "@/lib/ppd-access";
import { PPDType } from "@prisma/client";
import type { PpdPageData } from "@/components/ppd/ppd.types";
import type { PpdRevisionSnapshot } from "@/lib/ppd-revision";

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
  const [requests, accountRecords, budgets, activeRequests] = await Promise.all([
    session
      ? prisma.pPDRequest.findMany({
          where: { requestedById: session.id },
          include: {
            department: { select: { name: true } },
            items: { include: { account: { select: { id: true, name: true } } } },
            approvalEvents: { include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
            paymentProof: true,
          },
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
    departmentIds.length
      ? prisma.pPDRequest.findMany({
          where: {
            departmentId: { in: departmentIds },
            status: { in: ["DRAFT", "PENDING_DEPT_HEAD", "PENDING_FINANCE", "PENDING_EXECUTIVE", "RETURNED_FOR_REVISION", "PENDING_FINANCE_PAYMENT"] },
            type: PPDType.UANG_MUKA,
          },
          select: {
            year: true,
            month: true,
            items: { select: { accountId: true, amount: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const reservedByBudget = new Map<string, number>();
  for (const request of activeRequests) {
    for (const item of request.items) {
      if (!item.accountId) continue;
      const key = budgetKey(item.accountId, request.year, request.month);
      reservedByBudget.set(key, (reservedByBudget.get(key) ?? 0) + Number(item.amount));
    }
  }

  return {
    drafts: requests.map((request) => ({
      id: request.id,
      title: request.title,
      description: request.description ?? "",
      category: request.type,
      timeAgo: request.updatedAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
      deptId: request.departmentId,
      departmentName: request.department.name,
      submissionType: request.type,
      paymentType: request.paymentType,
      bank: request.bankName ?? "",
      accountNo: request.accountNo ?? "",
      limitFund: String(Number(request.limitFund)),
      status: request.status,
      revisionReturnStage: request.revisionReturnStage === "FINANCE" ? "FINANCE" : request.revisionReturnStage === "DEPT_HEAD" ? "DEPT_HEAD" : null,
      revisionSnapshot: (request.approvalEvents.filter((event) => event.action === "REVISION_REQUESTED").at(-1)?.snapshot as PpdRevisionSnapshot | null | undefined) ?? null,
      approvalEvents: request.approvalEvents.map((event) => ({
        id: event.id,
        actorName: event.actor.name || event.actor.email,
        stage: event.stage,
        action: event.action,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        note: event.note,
        createdAt: event.createdAt.toISOString(),
      })),
      paymentProof: request.paymentProof ? {
        originalFileName: request.paymentProof.originalFileName,
        paidAmount: Number(request.paymentProof.paidAmount),
        paidAt: request.paymentProof.paidAt.toISOString(),
        referenceNumber: request.paymentProof.referenceNumber,
        financeNote: request.paymentProof.financeNote,
        fileUrl: `/api/ppd/payment-proofs/${encodeURIComponent(request.id)}`,
      } : null,
      year: request.year,
      month: request.month,
      updatedAt: request.updatedAt.toISOString(),
      rows: request.items.map((item) => ({
        id: item.id,
        accountId: item.accountId,
        accountName: item.account?.name ?? null,
        title: item.title,
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
      {
        amount: Number(budget.amount),
        realized: Number(budget.realizedAmount),
        reserved: reservedByBudget.get(budgetKey(budget.accountId, budget.year, budget.month)) ?? 0,
      },
    ])),
  };
}
