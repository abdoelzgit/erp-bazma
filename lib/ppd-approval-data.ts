import { PPDApprovalAction, PPDApprovalStage, PPDStatus, Prisma, Role } from "@prisma/client";
import type { PpdApprovalQueueItem } from "@/components/ppd/ppd.types";
import type { PpdRevisionSnapshot } from "@/lib/ppd-revision";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const pendingStatuses = [
  PPDStatus.PENDING_DEPT_HEAD,
  PPDStatus.PENDING_FINANCE,
  PPDStatus.PENDING_EXECUTIVE,
  PPDStatus.PENDING_FINANCE_PAYMENT,
  PPDStatus.PENDING_FINANCE_SETTLEMENT,
  PPDStatus.PENDING_APPLICANT_REFUND,
  PPDStatus.PENDING_FINANCE_REFUND_VERIFICATION,
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
      ? [PPDStatus.PENDING_FINANCE, PPDStatus.PENDING_FINANCE_PAYMENT, PPDStatus.PENDING_FINANCE_SETTLEMENT, PPDStatus.PENDING_APPLICANT_REFUND, PPDStatus.PENDING_FINANCE_REFUND_VERIFICATION]
      : actor.role === Role.EXECUTIVE
        ? [PPDStatus.PENDING_EXECUTIVE]
        : actor.role === Role.ADMIN
          ? Object.values(PPDStatus)
          : [];
  if (!stageStatuses.length) return { role: actor.role, items: [] };

  const departmentScope = actor.role === Role.ADMIN
    ? {}
    : {
        status: "ACTIVE",
        ...(actor.role === Role.DEPT_HEAD
          ? { members: { some: { userId: actor.id, role: "PIC" as const, status: "ACTIVE" } } }
          : {}),
      };
  const revisionAssignmentWhere: Prisma.PPDRequestWhereInput | null = actor.role === Role.DEPT_HEAD
    ? { status: PPDStatus.RETURNED_FOR_REVISION, department: { status: "ACTIVE", members: { some: { userId: actor.id, role: "PIC" as const, status: "ACTIVE" } } } }
    : actor.role === Role.FINANCE
      ? { status: PPDStatus.RETURNED_FOR_REVISION, department: { status: "ACTIVE" } }
      : null;
  const historyStage = actor.role === Role.DEPT_HEAD
    ? PPDApprovalStage.DEPT_HEAD
    : actor.role === Role.FINANCE
      ? PPDApprovalStage.FINANCE
      : actor.role === Role.EXECUTIVE
        ? PPDApprovalStage.EXECUTIVE
        : null;
  const approvalHistoryWhere: Prisma.PPDRequestWhereInput | null = historyStage
    ? {
        OR: [
          {
            approvalEvents: {
              some: {
                stage: historyStage,
                action: {
                  in: [PPDApprovalAction.SUBMITTED, PPDApprovalAction.APPROVED, PPDApprovalAction.REVISION_REQUESTED, PPDApprovalAction.CANCELLED],
                },
              },
            },
          },
          ...(actor.role === Role.FINANCE
            ? [{
                approvalEvents: {
                  some: {
                    stage: PPDApprovalStage.PAYMENT,
                    action: {
                      in: [PPDApprovalAction.PAYMENT_VERIFIED, PPDApprovalAction.ACCOUNTABILITY_SUBMITTED, PPDApprovalAction.REFUND_SUBMITTED, PPDApprovalAction.REFUND_VERIFIED],
                    },
                  },
                },
              }]
            : []),
        ],
        department: departmentScope,
      }
    : null;

  const requests = await prisma.pPDRequest.findMany({
    where: {
      OR: [
        { requestedById: actor.id },
        { status: { in: stageStatuses }, department: departmentScope },
        ...(revisionAssignmentWhere ? [revisionAssignmentWhere] : []),
        ...(approvalHistoryWhere ? [approvalHistoryWhere] : []),
      ],
    },
    include: {
      department: { select: { name: true } },
      requestedBy: { select: { name: true, email: true } },
      items: { include: { account: { select: { name: true } } } },
      approvalEvents: { include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
      paymentProof: true,
      accountabilityReport: {
        include: {
          submittedBy: { select: { name: true, email: true } },
          items: { include: { account: { select: { name: true } } } },
        },
      },
      settlementProofs: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "asc" },
  });

  const mappedItems = requests.map((request) => ({
      id: request.id,
      no: request.no,
      title: request.title,
      description: request.description ?? "",
      category: request.type,
      timeAgo: request.updatedAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
      deptId: request.departmentId,
      departmentName: request.department.name,
      requesterName: request.requestedBy.name || request.requestedBy.email,
      isOwnRequest: request.requestedById === actor.id,
      submissionType: request.type,
      paymentType: request.paymentType,
      bank: request.bankName ?? "",
      accountNo: request.accountNo ?? "",
      limitFund: String(Number(request.totalAmount)),
      formLimitFund: String(Number(request.limitFund)),
      status: request.status,
      revisionReturnStage: request.revisionReturnStage === PPDApprovalStage.DEPT_HEAD || request.revisionReturnStage === PPDApprovalStage.FINANCE || request.revisionReturnStage === PPDApprovalStage.EXECUTIVE
        ? request.revisionReturnStage
        : null,
      revisionRequestedByStage: (() => {
        const stage = request.approvalEvents.filter((event) => event.action === "REVISION_REQUESTED").at(-1)?.stage;
        return stage === PPDApprovalStage.DEPT_HEAD || stage === PPDApprovalStage.FINANCE || stage === PPDApprovalStage.EXECUTIVE ? stage : null;
      })(),
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
        attachmentNames: [item.attachmentUrl, ...item.attachmentUrls].filter((url): url is string => Boolean(url)),
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
        id: request.paymentProof.id,
        originalFileName: request.paymentProof.originalFileName,
        paidAmount: Number(request.paymentProof.paidAmount),
        paidAt: request.paymentProof.paidAt.toISOString(),
        referenceNumber: request.paymentProof.referenceNumber,
        financeNote: request.paymentProof.financeNote,
        fileUrl: `/api/ppd/payment-proofs/${encodeURIComponent(request.id)}`,
      } : null,
      accountabilityReport: request.accountabilityReport ? {
        submittedAt: request.accountabilityReport.submittedAt.toISOString(),
        submittedByName: request.accountabilityReport.submittedBy.name || request.accountabilityReport.submittedBy.email,
        totalAmount: Number(request.accountabilityReport.totalAmount),
        rows: request.accountabilityReport.items.map((item) => ({
          id: item.id,
          accountId: item.accountId,
          accountName: item.account?.name ?? null,
          title: item.title,
          description: item.description,
          attachmentName: item.attachmentUrl ?? "",
          attachmentNames: [item.attachmentUrl, ...item.attachmentUrls].filter((url): url is string => Boolean(url)),
          amount: Number(item.amount),
        })),
      } : null,
      settlementProofs: request.settlementProofs.map((proof) => ({
        id: proof.id,
        type: proof.type,
        originalFileName: proof.originalFileName,
        amount: Number(proof.amount),
        paidAt: proof.paidAt.toISOString(),
        referenceNumber: proof.referenceNumber,
        note: proof.note,
        verifiedAt: proof.verifiedAt?.toISOString() ?? null,
        fileUrl: `/api/ppd/payment-proofs/${encodeURIComponent(request.id)}?settlementProofId=${encodeURIComponent(proof.id)}`,
      })),
    }));
  const items = mappedItems.filter((item) => item.isOwnRequest || item.status !== PPDStatus.RETURNED_FOR_REVISION ||
    (actor.role === Role.DEPT_HEAD && item.revisionRequestedByStage === PPDApprovalStage.FINANCE) ||
    (actor.role === Role.FINANCE && item.revisionRequestedByStage === PPDApprovalStage.EXECUTIVE) ||
    actor.role === Role.ADMIN);
  return { role: actor.role, items };
}

export async function getPpdPendingCount(userId: string, role: Role) {
  const statusList = role === Role.DEPT_HEAD
    ? [PPDStatus.PENDING_DEPT_HEAD]
    : role === Role.FINANCE
      ? [PPDStatus.PENDING_FINANCE, PPDStatus.PENDING_FINANCE_PAYMENT, PPDStatus.PENDING_FINANCE_SETTLEMENT, PPDStatus.PENDING_APPLICANT_REFUND, PPDStatus.PENDING_FINANCE_REFUND_VERIFICATION]
      : role === Role.EXECUTIVE
        ? [PPDStatus.PENDING_EXECUTIVE]
        : role === Role.ADMIN
          ? pendingStatuses
          : [];
  if (!statusList.length) return 0;
  const approvalCount = await prisma.pPDRequest.count({
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
  const revisionStage = role === Role.DEPT_HEAD
    ? PPDApprovalStage.FINANCE
    : role === Role.FINANCE
      ? PPDApprovalStage.EXECUTIVE
      : null;
  if (!revisionStage) return approvalCount;
  const revisionTasks = await prisma.pPDRequest.findMany({
    where: {
      status: PPDStatus.RETURNED_FOR_REVISION,
      department: {
        status: "ACTIVE",
        ...(role === Role.DEPT_HEAD
          ? { members: { some: { userId, role: "PIC", status: "ACTIVE" } } }
          : {}),
      },
    },
    select: {
      approvalEvents: {
        where: { action: "REVISION_REQUESTED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { stage: true },
      },
    },
  });
  return approvalCount + revisionTasks.filter((task) => task.approvalEvents[0]?.stage === revisionStage).length;
}
