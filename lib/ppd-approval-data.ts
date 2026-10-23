import { PPDStatus, Role } from "@prisma/client";
import type { PpdApprovalQueueItem } from "@/components/ppd/ppd.types";
import type { PpdRevisionSnapshot } from "@/lib/ppd-revision";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const pendingStatuses = [
  PPDStatus.PENDING_DEPT_HEAD,
  PPDStatus.PENDING_FINANCE,
  PPDStatus.PENDING_EXECUTIVE,
  PPDStatus.PENDING_FINANCE_PAYMENT,
];

export async function getPpdApprovalQueueData(): Promise<{
  role: Role | null;
  items: PpdApprovalQueueItem[];
}> {
  const session = await getCurrentUser();
  if (!session) return { role: null, items: [] };
  const actor = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true } });
  if (!actor) return { role: null, items: [] };

  const stageStatuses = actor.role === Role.DEPT_HEAD
    ? [PPDStatus.PENDING_DEPT_HEAD]
    : actor.role === Role.FINANCE
      ? [PPDStatus.PENDING_FINANCE, PPDStatus.PENDING_FINANCE_PAYMENT]
      : actor.role === Role.EXECUTIVE
        ? [PPDStatus.PENDING_EXECUTIVE]
        : actor.role === Role.ADMIN
          ? Object.values(PPDStatus)
          : [];
  if (!stageStatuses.length) return { role: actor.role, items: [] };

  const requests = await prisma.pPDRequest.findMany({
    where: {
      status: { in: stageStatuses },
      department: actor.role === Role.ADMIN
        ? {}
        : {
            status: "ACTIVE",
            ...(actor.role === Role.DEPT_HEAD
              ? { members: { some: { userId: actor.id, role: "PIC", status: "ACTIVE" } } }
              : {}),
          },
    },
    include: {
      department: { select: { name: true } },
      requestedBy: { select: { name: true, email: true } },
      items: { include: { account: { select: { name: true } } } },
      approvalEvents: { include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
      paymentProof: true,
    },
    orderBy: { updatedAt: "asc" },
  });

  return {
    role: actor.role,
    items: requests.map((request) => ({
      id: request.id,
      no: request.no,
      title: request.title,
      description: request.description ?? "",
      category: request.type,
      timeAgo: request.updatedAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
      deptId: request.departmentId,
      departmentName: request.department.name,
      requesterName: request.requestedBy.name || request.requestedBy.email,
      submissionType: request.type,
      paymentType: request.paymentType,
      bank: request.bankName ?? "",
      accountNo: request.accountNo ?? "",
      limitFund: String(Number(request.totalAmount)),
      formLimitFund: String(Number(request.limitFund)),
      status: request.status,
      revisionReturnStage: request.revisionReturnStage === "FINANCE" ? "FINANCE" : request.revisionReturnStage === "DEPT_HEAD" ? "DEPT_HEAD" : null,
      revisionSnapshot: (request.approvalEvents.filter((event) => event.action === "REVISION_REQUESTED").at(-1)?.snapshot as PpdRevisionSnapshot | null | undefined) ?? null,
      year: request.year,
      month: request.month,
      updatedAt: request.updatedAt.toISOString(),
      createdAt: request.createdAt.toISOString(),
      rows: request.items.map((item) => ({
        id: item.id,
        accountId: item.accountId,
        accountName: item.account?.name ?? null,
        title: item.title,
        description: item.description,
        attachmentName: item.attachmentUrl ?? "",
        amount: Number(item.amount),
      })),
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
    })),
  };
}

export async function getPpdPendingCount(userId: string, role: Role) {
  const statusList = role === Role.DEPT_HEAD
    ? [PPDStatus.PENDING_DEPT_HEAD]
    : role === Role.FINANCE
      ? [PPDStatus.PENDING_FINANCE, PPDStatus.PENDING_FINANCE_PAYMENT]
      : role === Role.EXECUTIVE
        ? [PPDStatus.PENDING_EXECUTIVE]
        : role === Role.ADMIN
          ? pendingStatuses
          : [];
  if (!statusList.length) return 0;
  return prisma.pPDRequest.count({
    where: {
      status: { in: statusList },
      department: {
        ...(role === Role.ADMIN ? {} : { status: "ACTIVE" }),
        ...(role === Role.DEPT_HEAD
          ? { members: { some: { userId, role: "PIC", status: "ACTIVE" } } }
          : {}),
      },
    },
  });
}
