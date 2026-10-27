"use server";

import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { revalidatePath } from "next/cache";
import { PPDApprovalAction, PPDApprovalStage, PPDStatus, PPDType, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canUserCreatePpdInDepartment } from "@/lib/ppd-access";
import { canReadPpdRequest } from "@/lib/ppd-read-access";
import { normalizePpdRevisionSnapshot, samePpdRevisionSnapshot, type PpdRevisionSnapshot } from "@/lib/ppd-revision";
import { canEditPpdRevision } from "@/lib/ppd-revision-access";
import { isPpdAttachmentUrlForPrefix } from "@/lib/ppd-attachment-name";

type PpdDraftInput = {
  id?: string;
  title: string;
  description: string;
  departmentId: string;
  submissionType: string;
  paymentType: string;
  bank: string;
  accountNo: string;
  limitFund: number;
  year: number;
  month: number;
  items: Array<{ accountId: string | null; title: string; description: string; attachmentName: string; attachmentNames?: string[]; amount: number }>;
};

const submissionTypes: Record<string, PPDType> = {
  "Uang Muka": PPDType.UANG_MUKA,
  UANG_MUKA: PPDType.UANG_MUKA,
  Pembayaran: PPDType.PEMBAYARAN,
  PEMBAYARAN: PPDType.PEMBAYARAN,
};

function snapshotFromRequest(request: {
  title: string;
  description: string | null;
  departmentId: string;
  type: PPDType;
  paymentType: string;
  bankName: string | null;
  accountNo: string | null;
  limitFund: number | Prisma.Decimal;
  year: number;
  month: number;
  items: Array<{ accountId: string | null; title: string; description: string; attachmentUrl: string | null; attachmentUrls?: string[]; amount: number | Prisma.Decimal }>;
}): PpdRevisionSnapshot {
  return normalizePpdRevisionSnapshot({
    title: request.title,
    description: request.description ?? "",
    departmentId: request.departmentId,
    submissionType: request.type,
    paymentType: request.paymentType,
    bank: request.bankName ?? "",
    accountNo: request.accountNo ?? "",
    limitFund: Number(request.limitFund),
    year: request.year,
    month: request.month,
    rows: request.items.map((item) => ({
      accountId: item.accountId,
      title: item.title,
      description: item.description,
      attachmentName: [item.attachmentUrl, ...(item.attachmentUrls ?? [])].filter(Boolean).join("\n"),
      amount: Number(item.amount),
    })),
  });
}

async function getUserId() {
  const session = await getCurrentUser();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true } });
  return user?.id ?? null;
}

function isValidInput(input: PpdDraftInput) {
  return Boolean(
    input.departmentId && submissionTypes[input.submissionType || "UANG_MUKA"] &&
    Number.isInteger(input.year) && input.year >= 1900 && input.year <= 2100 &&
    Number.isInteger(input.month) && input.month >= 1 && input.month <= 12 &&
    Number.isFinite(input.limitFund) && input.limitFund >= 0 &&
    input.items.length <= 200 && input.items.every((item) => Number.isFinite(item.amount) && item.amount >= 0),
  );
}

export async function savePpdDraftAction(input: PpdDraftInput) {
  const userId = await getUserId();
  if (!userId) return { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." };
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (actor?.role !== Role.STAFF) return { error: "Hanya role User yang dapat membuat atau mengubah draft PPD." };
  if (!isValidInput(input)) return { error: "Data draft PPD tidak valid." };
  if (!(await canUserCreatePpdInDepartment(userId, input.departmentId))) {
    return { error: "Anda tidak memiliki akses membuat PPD di departemen tersebut." };
  }

  try {
    const department = await prisma.department.findFirst({
      where: { id: input.departmentId, status: "ACTIVE" }, select: { id: true },
    });
    if (!department) return { error: "Departemen tidak ditemukan atau sudah nonaktif." };

    const accountIds = [...new Set(input.items.flatMap((item) => item.accountId ? [item.accountId] : []))];
    const validAccounts = await prisma.budgetAccount.findMany({
      where: { id: { in: accountIds }, departmentId: department.id, isActive: true }, select: { id: true },
    });
    if (validAccounts.length !== accountIds.length) {
      return { error: "Account harus aktif dan berasal dari departemen yang dipilih." };
    }

    const itemTotal = input.items.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = submissionTypes[input.submissionType || "UANG_MUKA"] === PPDType.UANG_MUKA
      ? itemTotal
      : input.limitFund;
    const data = {
      title: input.title.trim(),
      description: input.description.trim() || null,
      departmentId: department.id,
      type: submissionTypes[input.submissionType || "UANG_MUKA"],
      paymentType: input.paymentType || "Transfer",
      bankName: input.bank || null,
      accountNo: input.accountNo || null,
      totalAmount,
      limitFund: input.limitFund,
      year: input.year,
      month: input.month,
    };
    const id = await prisma.$transaction(async (tx) => {
      let requestId = input.id;
      if (requestId) {
        const existing = await tx.pPDRequest.findFirst({
          where: { id: requestId, requestedById: userId, status: PPDStatus.DRAFT },
          select: { id: true, status: true },
        });
        if (!existing) throw new Error("Draft tidak ditemukan atau sudah dikirim.");
        const updated = await tx.pPDRequest.updateMany({
          where: { id: requestId, requestedById: userId, status: existing.status },
          data,
        });
        if (!updated.count) throw new Error("Draft tidak ditemukan atau sudah dikirim.");
        await tx.pPDItem.deleteMany({ where: { requestId } });
      } else {
        const created = await tx.pPDRequest.create({
          data: {
            ...data,
            no: `PPD-${input.year}${String(input.month).padStart(2, "0")}-${randomUUID()}`,
            requestedById: userId,
          },
        });
        requestId = created.id;
      }

      if (input.items.length) {
        const attachmentPrefix = `/api/ppd/attachments/${encodeURIComponent(requestId!)}/`;
        for (const item of input.items) {
          const attachmentNames = item.attachmentNames?.length ? [...new Set(item.attachmentNames)] : item.attachmentName ? [item.attachmentName] : [];
          if (attachmentNames.length > 50 || attachmentNames.some((url) => typeof url !== "string" || !isPpdAttachmentUrlForPrefix(url, attachmentPrefix))) {
            throw new Error("Lampiran harus diunggah ke draft PPD ini.");
          }
        }
        await tx.pPDItem.createMany({
          data: input.items.map((item) => {
            const attachmentNames = item.attachmentNames?.length ? [...new Set(item.attachmentNames)] : item.attachmentName ? [item.attachmentName] : [];
            return {
              requestId: requestId!,
              accountId: item.accountId,
              title: item.title.trim(),
              description: item.description,
              attachmentUrl: attachmentNames[0] ?? null,
              attachmentUrls: attachmentNames.slice(1),
              amount: item.amount,
            };
          }),
        });
      }
      return requestId!;
    });

    revalidatePath("/dashboard/ppd");
    revalidatePath("/dashboard/budget");
    return { success: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan draft PPD.";
    return { error: ["Draft tidak ditemukan", "Belum ada perubahan", "Ubah isi PPD"].some((prefix) => message.startsWith(prefix)) ? message : "Gagal menyimpan draft PPD." };
  }
}

export async function deletePpdDraftAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." };
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (actor?.role !== Role.STAFF) return { error: "Role Anda tidak dapat mengelola draft PPD." };
  const result = await prisma.pPDRequest.deleteMany({ where: { id, requestedById: userId, status: "DRAFT" } });
  if (!result.count) return { error: "Draft tidak ditemukan atau sudah dikirim." };
  revalidatePath("/dashboard/ppd");
  revalidatePath("/dashboard/budget");
  return { success: true };
}

export async function cancelPpdRequestAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." };
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (actor?.role !== Role.STAFF) return { error: "Role Anda tidak dapat membatalkan PPD sebagai pemohon." };
  try {
    const event = await prisma.$transaction(async (tx) => {
      const request = await tx.pPDRequest.findFirst({
        where: {
          id,
          requestedById: userId,
          status: {
            in: [
              PPDStatus.PENDING_DEPT_HEAD,
              PPDStatus.PENDING_FINANCE,
              PPDStatus.PENDING_EXECUTIVE,
              PPDStatus.RETURNED_FOR_REVISION,
            ],
          },
        },
        select: { id: true, status: true, revisionReturnStage: true },
      });
      if (!request) throw new Error("PPD tidak dapat dibatalkan pada status saat ini.");
      const stage = request.status === PPDStatus.PENDING_FINANCE
        ? PPDApprovalStage.FINANCE
        : request.status === PPDStatus.PENDING_EXECUTIVE
          ? PPDApprovalStage.EXECUTIVE
          : request.status === PPDStatus.RETURNED_FOR_REVISION
            ? request.revisionReturnStage ?? PPDApprovalStage.DEPT_HEAD
            : PPDApprovalStage.DEPT_HEAD;
      const updated = await tx.pPDRequest.updateMany({
        where: { id: request.id, requestedById: userId, status: request.status },
        data: { status: PPDStatus.CANCELLED, revisionReturnStage: null },
      });
      if (!updated.count) throw new Error("Status PPD berubah. Muat ulang halaman dan coba lagi.");
      return tx.pPDApprovalEvent.create({
        data: {
          requestId: request.id,
          actorId: userId,
          stage,
          action: PPDApprovalAction.CANCELLED,
          fromStatus: request.status,
          toStatus: PPDStatus.CANCELLED,
          note: "Dibatalkan oleh pemohon.",
        },
        select: { id: true, stage: true, fromStatus: true, toStatus: true, createdAt: true },
      });
    });
    revalidatePath("/dashboard/ppd");
    revalidatePath("/dashboard/budget");
    revalidatePath("/dashboard/ppd/approval");
    return {
      success: true,
      event: { ...event, createdAt: event.createdAt.toISOString() },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "PPD gagal dibatalkan." };
  }
}

const reservationStatuses: PPDStatus[] = [
  PPDStatus.DRAFT,
  PPDStatus.PENDING_DEPT_HEAD,
  PPDStatus.PENDING_FINANCE,
  PPDStatus.PENDING_EXECUTIVE,
  PPDStatus.RETURNED_FOR_REVISION,
  PPDStatus.PENDING_FINANCE_PAYMENT,
  PPDStatus.PENDING_ACCOUNTABILITY,
  PPDStatus.PENDING_FINANCE_SETTLEMENT,
  PPDStatus.PENDING_APPLICANT_REFUND,
  PPDStatus.PENDING_FINANCE_REFUND_VERIFICATION,
];

export async function savePpdRevisionAction(input: {
  id: string;
  items: Array<{ id: string; title: string; amount: number; attachmentNames: string[] }>;
}) {
  const actor = await getActor();
  if (!actor) return { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." };
  if (!input || typeof input.id !== "string" || !input.id || !Array.isArray(input.items) ||
    input.items.some((item) => !item || typeof item.id !== "string" || typeof item.title !== "string" || item.title.length > 300 || !Number.isFinite(item.amount) || item.amount < 0 || !Array.isArray(item.attachmentNames) || item.attachmentNames.some((url) => typeof url !== "string"))) {
    return { error: "Data revisi PPD tidak valid." };
  }
  if (!(await canEditPpdRevision(actor.id, input.id))) {
    return { error: "Anda tidak ditugaskan untuk mengedit revisi PPD ini." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.pPDRequest.findFirst({
        where: { id: input.id, status: PPDStatus.RETURNED_FOR_REVISION },
        include: {
          items: true,
          approvalEvents: {
            where: { action: PPDApprovalAction.REVISION_REQUESTED },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, snapshot: true },
          },
        },
      });
      if (!request) throw new Error("Tugas revisi sudah berubah atau tidak ditemukan.");
      if (input.items.length > 200 || new Set(input.items.map((item) => item.id)).size !== input.items.length) {
        throw new Error("Jumlah rincian tidak boleh lebih dari 200 dan baris tidak boleh duplikat.");
      }
      const existingItemIds = new Set(request.items.map((item) => item.id));
      const submittedItemIds = new Set(input.items.map((item) => item.id));
      if (input.items.some((item) => !existingItemIds.has(item.id) && !/^new-[0-9a-f-]{36}$/i.test(item.id))) {
        throw new Error("Identitas baris tidak valid.");
      }
      const inputById = new Map(input.items.map((item) => [item.id, item]));
      const attachmentPrefix = `/api/ppd/attachments/${encodeURIComponent(request.id)}/`;
      const validateNewAttachments = (attachmentNames: string[], existingAttachments: string[] = []) => {
        if (attachmentNames.filter((url) => !existingAttachments.includes(url)).some((url) => !isPpdAttachmentUrlForPrefix(url, attachmentPrefix))) throw new Error("Lampiran harus diunggah ke PPD ini.");
      };
      const changedItems = request.items.filter((item) => submittedItemIds.has(item.id)).map((item) => {
        const edited = inputById.get(item.id);
        if (!edited) throw new Error("Baris rincian tidak valid.");
        const attachmentNames = [...new Set(edited.attachmentNames)];
        const existingAttachments = [item.attachmentUrl, ...item.attachmentUrls].filter((url): url is string => Boolean(url));
        if (existingAttachments.some((url) => !attachmentNames.includes(url))) throw new Error("Lampiran yang sudah ada tidak dapat dihapus melalui revisi ini.");
        validateNewAttachments(attachmentNames, existingAttachments);
        return { ...item, title: edited.title.trim(), amount: edited.amount, attachmentUrls: attachmentNames.filter((url) => url !== item.attachmentUrl) };
      });
      const newRows = input.items.filter((item) => !existingItemIds.has(item.id)).map((item) => {
        if (!/^new-[0-9a-f-]{36}$/i.test(item.id)) throw new Error("Identitas baris baru tidak valid.");
        const attachmentNames = [...new Set(item.attachmentNames)];
        validateNewAttachments(attachmentNames);
        const templateItem = request.items.find((existing) => existing.accountId);
        return {
          temporaryId: item.id,
          accountId: templateItem?.accountId ?? null,
          amount: item.amount,
          title: item.title.trim(),
          description: "",
          attachmentUrls: attachmentNames,
        };
      });

      const revisionEvent = request.approvalEvents[0];
      const baseline = revisionEvent?.snapshot
        ? normalizePpdRevisionSnapshot(revisionEvent.snapshot as unknown as PpdRevisionSnapshot)
        : snapshotFromRequest(request);
      const revisedSnapshot = snapshotFromRequest({
        ...request,
        items: [...changedItems, ...newRows.map((item) => ({
          ...item,
          attachmentUrl: null,
        }))],
      });
      if (samePpdRevisionSnapshot(baseline, revisedSnapshot)) {
        throw new Error("Ubah judul, nominal, lampiran, atau jumlah baris sebelum menyimpan revisi.");
      }

      const revisedTotal = [...changedItems, ...newRows].reduce((sum, item) => sum + Number(item.amount), 0);
      const updated = await tx.pPDRequest.updateMany({
        where: { id: request.id, status: PPDStatus.RETURNED_FOR_REVISION },
        data: {
          ...(request.type === PPDType.UANG_MUKA ? { totalAmount: revisedTotal, limitFund: revisedTotal } : {}),
        },
      });
      if (!updated.count) throw new Error("Tugas revisi sudah berubah. Muat ulang halaman.");
      for (const item of changedItems) {
        await tx.pPDItem.updateMany({
          where: { id: item.id, requestId: request.id },
          data: { title: item.title, amount: item.amount, attachmentUrls: item.attachmentUrls },
        });
      }
      const removedItemIds = request.items.filter((item) => !submittedItemIds.has(item.id)).map((item) => item.id);
      if (removedItemIds.length) {
        await tx.pPDItem.deleteMany({ where: { id: { in: removedItemIds }, requestId: request.id } });
      }
      const createdRows = await Promise.all(newRows.map((item) => tx.pPDItem.create({
        data: {
          requestId: request.id,
          accountId: item.accountId,
          title: item.title,
          description: item.description,
          amount: item.amount,
          attachmentUrls: item.attachmentUrls,
        },
      })));
      const createdByTemporaryId = new Map(newRows.map((item, index) => [item.temporaryId, createdRows[index]]));
      if (revisionEvent && !revisionEvent.snapshot) {
        await tx.pPDApprovalEvent.update({ where: { id: revisionEvent.id }, data: { snapshot: baseline as Prisma.InputJsonValue } });
      }
      const changedById = new Map(changedItems.map((item) => [item.id, item]));
      const savedItems = input.items.map((item) => existingItemIds.has(item.id)
        ? changedById.get(item.id)!
        : createdByTemporaryId.get(item.id)!);
      return { baseline, items: savedItems };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/dashboard/ppd");
    revalidatePath("/dashboard/ppd/approval");
    revalidatePath("/dashboard/budget");
    return {
      success: true,
      revisionSnapshot: result.baseline,
      rows: result.items.map((item) => ({
        id: item.id,
        accountId: item.accountId,
        title: item.title,
        description: item.description,
        attachmentName: item.attachmentUrl ?? "",
        attachmentNames: [item.attachmentUrl, ...item.attachmentUrls].filter((url): url is string => Boolean(url)),
        amount: Number(item.amount),
      })),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { error: "PPD sedang diperbarui oleh pengguna lain. Muat ulang halaman lalu coba lagi." };
    }
    return { error: error instanceof Error ? error.message : "Gagal menyimpan revisi PPD." };
  }
}

export async function submitPpdDraftAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." };
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!actor) return { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." };
  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.pPDRequest.findFirst({
        where: { id, status: { in: [PPDStatus.DRAFT, PPDStatus.RETURNED_FOR_REVISION] } },
        include: {
          items: true,
          department: { select: { status: true } },
          approvalEvents: {
            where: { action: PPDApprovalAction.REVISION_REQUESTED },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { stage: true, snapshot: true },
          },
        },
      });
      if (!request) throw new Error("Draft tidak ditemukan atau tidak dapat dikirim ulang.");
      if (request.department.status !== "ACTIVE") throw new Error("Departemen PPD sudah tidak aktif.");
      if (request.status === PPDStatus.RETURNED_FOR_REVISION) {
        if (!(await canEditPpdRevision(userId, request.id))) throw new Error("Anda tidak ditugaskan untuk mengirim ulang revisi PPD ini.");
        const currentSnapshot = snapshotFromRequest(request);
        const savedBaseline = request.approvalEvents[0]?.snapshot;
        const baseline = savedBaseline
          ? normalizePpdRevisionSnapshot(savedBaseline as unknown as PpdRevisionSnapshot)
          : currentSnapshot;
        if (samePpdRevisionSnapshot(currentSnapshot, baseline)) {
          throw new Error("Ubah isi PPD sebelum mengirim ulang revisi.");
        }
      } else {
        if (actor.role !== Role.STAFF || request.requestedById !== userId) {
          throw new Error("Hanya pemohon yang dapat mengirim draft PPD.");
        }
        if (!(await canUserCreatePpdInDepartment(userId, request.departmentId))) {
          throw new Error("Anda tidak lagi memiliki akses membuat PPD di departemen tersebut.");
        }
      }
      if (!request.title.trim()) throw new Error("Lengkapi judul pengajuan sebelum mengirim.");
      if (request.type === PPDType.UANG_MUKA && (request.items.length === 0 || request.items.some((item) => !item.accountId))) {
        throw new Error("Lengkapi account pada minimal satu item sebelum mengirim.");
      }
      if (request.type === PPDType.PEMBAYARAN && Number(request.totalAmount) <= 0) {
        throw new Error("Jumlah pengajuan harus lebih dari nol.");
      }
      if (Number(request.totalAmount) > Number(request.limitFund)) throw new Error("Total item melebihi limit dana.");

      if (request.type === PPDType.UANG_MUKA) {
        const requestedByAccount = new Map<string, number>();
        for (const item of request.items) {
          if (!item.accountId) continue;
          requestedByAccount.set(item.accountId, (requestedByAccount.get(item.accountId) ?? 0) + Number(item.amount));
        }
        const budgets = await tx.monthlyBudget.findMany({
          where: { accountId: { in: [...requestedByAccount.keys()] }, year: request.year, month: request.month },
          select: { accountId: true, amount: true, realizedAmount: true },
        });
        const budgetByAccount = new Map(budgets.map((budget) => [budget.accountId, budget]));
        const otherReservations = await tx.pPDRequest.findMany({
          where: {
            id: { not: request.id },
            type: PPDType.UANG_MUKA,
            year: request.year,
            month: request.month,
            status: { in: reservationStatuses },
            items: { some: { accountId: { in: [...requestedByAccount.keys()] } } },
          },
          select: { items: { select: { accountId: true, amount: true } } },
        });
        const reservedByAccount = new Map<string, number>();
        for (const other of otherReservations) {
          for (const item of other.items) {
            if (item.accountId) reservedByAccount.set(item.accountId, (reservedByAccount.get(item.accountId) ?? 0) + Number(item.amount));
          }
        }
        for (const [accountId, requested] of requestedByAccount) {
          const budget = budgetByAccount.get(accountId);
          if (!budget) throw new Error("Budget bulanan belum tersedia untuk salah satu account.");
          const remaining = Number(budget.amount) - Number(budget.realizedAmount) - (reservedByAccount.get(accountId) ?? 0);
          if (requested > remaining) throw new Error("Saldo anggaran tidak cukup karena total reservasi melebihi sisa budget.");
        }
      }

      const revisionReviewerStage = request.status === PPDStatus.RETURNED_FOR_REVISION
        ? request.approvalEvents[0]?.stage
        : PPDApprovalStage.DEPT_HEAD;
      const nextStatus = revisionReviewerStage === PPDApprovalStage.EXECUTIVE
        ? PPDStatus.PENDING_EXECUTIVE
        : revisionReviewerStage === PPDApprovalStage.FINANCE
          ? PPDStatus.PENDING_FINANCE
          : PPDStatus.PENDING_DEPT_HEAD;
      const updated = await tx.pPDRequest.updateMany({
        where: { id: request.id, status: request.status },
        data: { status: nextStatus, revisionReturnStage: null },
      });
      if (!updated.count) throw new Error("Status PPD berubah. Muat ulang halaman dan coba lagi.");
      await tx.pPDApprovalEvent.create({
        data: {
          requestId: request.id,
          actorId: userId,
          stage: nextStatus === PPDStatus.PENDING_EXECUTIVE
            ? PPDApprovalStage.EXECUTIVE
            : nextStatus === PPDStatus.PENDING_FINANCE
              ? PPDApprovalStage.FINANCE
              : PPDApprovalStage.DEPT_HEAD,
          action: PPDApprovalAction.SUBMITTED,
          fromStatus: request.status,
          toStatus: nextStatus,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/dashboard/ppd");
    revalidatePath("/dashboard/ppd/approval");
    revalidatePath("/dashboard/budget");
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { error: "Ada pengajuan lain yang sedang memakai saldo budget. Muat ulang lalu kirim kembali." };
    }
    return { error: error instanceof Error ? error.message : "Gagal mengirim PPD." };
  }
}

async function getActor() {
  const session = await getCurrentUser();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true } });
}

export async function decidePpdAction(input: { id: string; decision: "approve" | "revise" | "cancel"; note?: string }) {
  const actor = await getActor();
  if (!actor) return { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." };
  if (!input || typeof input.id !== "string" || !input.id || !["approve", "revise", "cancel"].includes(input.decision)) {
    return { error: "Keputusan PPD tidak valid." };
  }
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if ((input.decision !== "approve" && !note) || note.length > 2000) {
    return { error: input.decision === "approve" ? "Catatan terlalu panjang." : "Catatan wajib diisi (maksimal 2.000 karakter)." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.pPDRequest.findUnique({
        where: { id: input.id },
        include: { items: true, paymentProof: true, accountabilityReport: true, department: { select: { status: true } } },
      });
      if (!request) throw new Error("PPD tidak ditemukan.");
      if (request.requestedById === actor.id) throw new Error("Anda dapat melihat PPD sendiri, tetapi tidak dapat memprosesnya sebagai reviewer.");
      if (request.department.status !== "ACTIVE") throw new Error("Departemen PPD sudah tidak aktif.");

      const stage = request.status === PPDStatus.PENDING_DEPT_HEAD
        ? PPDApprovalStage.DEPT_HEAD
        : request.status === PPDStatus.PENDING_FINANCE
          ? PPDApprovalStage.FINANCE
          : request.status === PPDStatus.PENDING_EXECUTIVE
            ? PPDApprovalStage.EXECUTIVE
            : null;
      if (!stage) throw new Error("PPD ini tidak sedang menunggu keputusan reviewer.");

      const roleAllowed =
        (stage === PPDApprovalStage.DEPT_HEAD && actor.role === Role.DEPT_HEAD) ||
        (stage === PPDApprovalStage.FINANCE && actor.role === Role.FINANCE) ||
        (stage === PPDApprovalStage.EXECUTIVE && actor.role === Role.EXECUTIVE);
      if (!roleAllowed) throw new Error("PPD hanya dapat diproses oleh reviewer pada tahap aktifnya.");
      if (stage === PPDApprovalStage.DEPT_HEAD && actor.role === Role.DEPT_HEAD) {
        const assignment = await tx.departmentMember.findFirst({
          where: { userId: actor.id, departmentId: request.departmentId, role: "PIC", status: "ACTIVE" },
          select: { id: true },
        });
        if (!assignment) throw new Error("PPD ini bukan tanggung jawab departemen Anda.");
      }

      let nextStatus: PPDStatus;
      let revisionReturnStage: PPDApprovalStage | null = null;
      let action: PPDApprovalAction;
      if (input.decision === "approve") {
        nextStatus = stage === PPDApprovalStage.DEPT_HEAD
          ? PPDStatus.PENDING_FINANCE
          : stage === PPDApprovalStage.FINANCE
            ? PPDStatus.PENDING_EXECUTIVE
            : request.type === PPDType.UANG_MUKA && request.accountabilityReport && request.paymentProof
              ? Math.round(Number(request.accountabilityReport.totalAmount) * 100) < Math.round(Number(request.paymentProof.paidAmount) * 100)
                ? PPDStatus.PENDING_APPLICANT_REFUND
                : PPDStatus.PENDING_FINANCE_SETTLEMENT
              : PPDStatus.PENDING_FINANCE_PAYMENT;
        action = PPDApprovalAction.APPROVED;
      } else if (input.decision === "revise") {
        nextStatus = PPDStatus.RETURNED_FOR_REVISION;
        revisionReturnStage = stage;
        action = PPDApprovalAction.REVISION_REQUESTED;
      } else {
        nextStatus = PPDStatus.CANCELLED;
        action = PPDApprovalAction.CANCELLED;
      }

      const updated = await tx.pPDRequest.updateMany({
        where: { id: request.id, status: request.status },
        data: { status: nextStatus, revisionReturnStage },
      });
      if (!updated.count) throw new Error("PPD sudah diproses oleh pengguna lain. Muat ulang antrean.");
      await tx.pPDApprovalEvent.create({
        data: {
          requestId: request.id,
          actorId: actor.id,
          stage,
          action,
          fromStatus: request.status,
          toStatus: nextStatus,
          note: note || null,
          ...(action === PPDApprovalAction.REVISION_REQUESTED
            ? { snapshot: snapshotFromRequest(request) as Prisma.InputJsonValue }
            : {}),
        },
      });
    });
    revalidatePath("/dashboard/ppd");
    revalidatePath("/dashboard/ppd/approval");
    revalidatePath("/dashboard/budget");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Keputusan PPD gagal disimpan." };
  }
}

export async function getPpdCommentsAction(requestId: string) {
  const actor = await getActor();
  if (!actor) return { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." };
  if (typeof requestId !== "string" || !requestId) {
    return { error: "Anda tidak memiliki akses ke komentar PPD ini." };
  }
  const request = await prisma.pPDRequest.findUnique({ where: { id: requestId }, select: { status: true } });
  if (!request || request.status === PPDStatus.DRAFT || !(await canReadPpdRequest(actor.id, requestId))) {
    return { error: "Anda tidak memiliki akses ke komentar PPD ini." };
  }
  const comments = await prisma.pPDComment.findMany({
    where: { requestId },
    include: { author: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return {
    comments: comments.map((comment) => ({
      id: comment.id,
      authorName: comment.author.name || comment.author.email,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
    })),
  };
}

export async function addPpdCommentAction(input: { requestId: string; body: string }) {
  const actor = await getActor();
  if (!actor) return { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." };
  const requestId = typeof input?.requestId === "string" ? input.requestId : "";
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  if (!requestId || !body || body.length > 2000) {
    return { error: "Komentar wajib diisi dan maksimal 2.000 karakter." };
  }
  const request = await prisma.pPDRequest.findUnique({ where: { id: requestId }, select: { status: true } });
  if (!request || request.status === PPDStatus.DRAFT || !(await canReadPpdRequest(actor.id, requestId))) {
    return { error: "Anda tidak memiliki akses untuk memberi komentar pada PPD ini." };
  }
  const comment = await prisma.pPDComment.create({
    data: { requestId, authorId: actor.id, body },
    include: { author: { select: { name: true, email: true } } },
  });
  revalidatePath("/dashboard/ppd");
  return { comment: {
    id: comment.id,
    authorName: comment.author.name || comment.author.email,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  } };
}

export async function submitPpdPaymentAction(input: {
  id: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  paidAmount: number;
  paidAt: string;
  referenceNumber: string;
  note: string;
}) {
  const actor = await getActor();
  if (!actor || actor.role !== Role.FINANCE) return { error: "Hanya Finance yang dapat memproses pembayaran PPD." };
  if (!input || typeof input !== "object") return { error: "Data pembayaran tidak valid." };
  const note = typeof input.note === "string" ? input.note.trim() : "";
  const referenceNumber = typeof input.referenceNumber === "string" ? input.referenceNumber.trim() : "";
  const originalFileName = typeof input.originalFileName === "string" ? input.originalFileName.trim() : "";
  if (typeof input.id !== "string" || !input.id || typeof input.fileName !== "string" || !input.fileName ||
    typeof input.mimeType !== "string" || !Number.isFinite(input.paidAmount) || input.paidAmount <= 0 ||
    !Number.isInteger(input.fileSize) || input.fileSize <= 0 || typeof input.paidAt !== "string" || !Number.isFinite(Date.parse(input.paidAt))) {
    return { error: "Lengkapi data pembayaran dan bukti yang valid." };
  }
  if (note.length > 2000 || referenceNumber.length > 120 || originalFileName.length > 255) {
    return { error: "Data pembayaran melebihi batas panjang yang diizinkan." };
  }
  const { readFile } = await import("node:fs/promises");
  const { join, basename } = await import("node:path");
  const { isValidPpdAttachmentContent, PPD_ATTACHMENT_DIRECTORY, PPD_ATTACHMENT_MAX_BYTES, PPD_ATTACHMENT_TYPES } = await import("@/lib/ppd-attachments");
  if (!/^[a-z0-9]{20,32}$/i.test(input.id)) return { error: "PPD tidak valid." };
  const fileName = basename(input.fileName);
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.test(fileName)) return { error: "Bukti pembayaran tidak valid." };
  if (!Object.hasOwn(PPD_ATTACHMENT_TYPES, input.mimeType) || input.fileSize > PPD_ATTACHMENT_MAX_BYTES) {
    return { error: "Tipe atau ukuran bukti pembayaran tidak valid." };
  }

  try {
    const path = join(PPD_ATTACHMENT_DIRECTORY, input.id, "payment", fileName);
    const file = await readFile(path);
    if (file.length !== input.fileSize) return { error: "Ukuran bukti pembayaran berubah. Unggah ulang file." };
    if (!isValidPpdAttachmentContent(input.mimeType as keyof typeof PPD_ATTACHMENT_TYPES, file)) {
      return { error: "Isi file bukti pembayaran tidak sesuai dengan jenisnya." };
    }
    await prisma.$transaction(async (tx) => {
      const request = await tx.pPDRequest.findFirst({
        where: { id: input.id, status: PPDStatus.PENDING_FINANCE_PAYMENT, department: { status: "ACTIVE" } },
        include: { items: true },
      });
      if (!request) throw new Error("PPD tidak berada pada antrean pembayaran Finance.");
      if (request.requestedById === actor.id) throw new Error("Pengaju tidak dapat memproses pembayaran PPD miliknya sendiri.");
      if (Math.round(input.paidAmount * 100) !== Math.round(Number(request.totalAmount) * 100)) {
        throw new Error("Nominal pembayaran harus sama dengan total PPD.");
      }
      const nextStatus = request.type === PPDType.UANG_MUKA ? PPDStatus.PENDING_ACCOUNTABILITY : PPDStatus.PAID;
      const updated = await tx.pPDRequest.updateMany({
        where: { id: request.id, status: PPDStatus.PENDING_FINANCE_PAYMENT },
        data: { status: nextStatus },
      });
      if (!updated.count) throw new Error("PPD sudah diproses oleh Finance lain.");
      await tx.pPDPaymentProof.create({
        data: {
          requestId: request.id,
          uploadedById: actor.id,
          originalFileName,
          storagePath: `${request.id}/payment/${fileName}`,
          mimeType: input.mimeType,
          fileSize: file.length,
          paidAmount: input.paidAmount,
          paidAt: new Date(input.paidAt),
          referenceNumber: referenceNumber || null,
          financeNote: note || null,
        },
      });
      if (request.type === PPDType.PEMBAYARAN) {
        for (const item of request.items) {
          if (!item.accountId || Number(item.amount) <= 0) continue;
          const realized = await tx.monthlyBudget.updateMany({
            where: { accountId: item.accountId, year: request.year, month: request.month },
            data: { realizedAmount: { increment: item.amount } },
          });
          if (realized.count !== 1) throw new Error("Budget item tidak ditemukan; realisasi pembayaran belum dapat dicatat.");
        }
      }
      await tx.pPDApprovalEvent.create({
        data: {
          requestId: request.id,
          actorId: actor.id,
          stage: PPDApprovalStage.PAYMENT,
          action: PPDApprovalAction.PAYMENT_VERIFIED,
          fromStatus: PPDStatus.PENDING_FINANCE_PAYMENT,
          toStatus: nextStatus,
          note: note || (request.type === PPDType.UANG_MUKA
            ? "Uang muka dibayarkan. Menunggu laporan pertanggungjawaban pemohon."
            : "Pembayaran dan bukti telah diverifikasi Finance."),
        },
      });
    });
    revalidatePath("/dashboard/ppd");
    revalidatePath("/dashboard/ppd/approval");
    revalidatePath("/dashboard/budget");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Pembayaran gagal diverifikasi." };
  }
}

function attachmentFileName(fileName: string) {
  const name = basename(fileName);
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.test(name)) throw new Error("Bukti penyelesaian tidak valid.");
  return name;
}

async function verifyStoredSettlementFile(requestId: string, fileName: string, mimeType: string, fileSize: number, folder: "top_up" | "refund") {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { isValidPpdAttachmentContent, PPD_ATTACHMENT_DIRECTORY, PPD_ATTACHMENT_MAX_BYTES, PPD_ATTACHMENT_TYPES } = await import("@/lib/ppd-attachments");
  if (!Object.hasOwn(PPD_ATTACHMENT_TYPES, mimeType) || !Number.isInteger(fileSize) || fileSize <= 0 || fileSize > PPD_ATTACHMENT_MAX_BYTES) {
    throw new Error("Tipe atau ukuran bukti penyelesaian tidak valid.");
  }
  const name = attachmentFileName(fileName);
  const path = join(PPD_ATTACHMENT_DIRECTORY, requestId, "settlement", folder, name);
  const bytes = await readFile(path);
  if (bytes.length !== fileSize || !isValidPpdAttachmentContent(mimeType as keyof typeof PPD_ATTACHMENT_TYPES, bytes)) {
    throw new Error("Isi bukti penyelesaian berubah atau tidak sesuai. Unggah ulang file.");
  }
  return { name, path: `${requestId}/settlement/${folder}/${name}`, size: bytes.length };
}

async function realizeAccountabilityItems(tx: Prisma.TransactionClient, request: {
  year: number;
  month: number;
  accountabilityReport: { items: Array<{ accountId: string | null; amount: number | Prisma.Decimal }> } | null;
}) {
  if (!request.accountabilityReport) throw new Error("Laporan pertanggungjawaban tidak ditemukan.");
  for (const item of request.accountabilityReport.items) {
    if (!item.accountId || Number(item.amount) <= 0) continue;
    const updated = await tx.monthlyBudget.updateMany({
      where: { accountId: item.accountId, year: request.year, month: request.month },
      data: { realizedAmount: { increment: item.amount } },
    });
    if (updated.count !== 1) throw new Error("Budget item laporan tidak ditemukan; realisasi belum dapat dicatat.");
  }
}

export async function submitPpdAccountabilityAction(input: {
  id: string;
  items: Array<{ accountId: string | null; title: string; description: string; attachmentNames: string[]; amount: number }>;
}) {
  const actor = await getActor();
  if (!actor || actor.role !== Role.STAFF) return { error: "Hanya pemohon yang dapat mengirim laporan pertanggungjawaban." };
  if (!input || typeof input.id !== "string" || !input.id || !Array.isArray(input.items) || input.items.length === 0 || input.items.length > 200) {
    return { error: "Laporan harus berisi setidaknya satu baris." };
  }
  if (input.items.some((item) => !item || typeof item.title !== "string" || item.title.trim().length === 0 || item.title.length > 300 || typeof item.description !== "string" || item.description.length > 2000 || !Number.isFinite(item.amount) || item.amount <= 0 || !Array.isArray(item.attachmentNames) || item.attachmentNames.some((name) => typeof name !== "string"))) {
    return { error: "Isi laporan pertanggungjawaban tidak valid." };
  }
  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.pPDRequest.findFirst({
        where: { id: input.id, requestedById: actor.id, type: PPDType.UANG_MUKA, status: PPDStatus.PENDING_ACCOUNTABILITY },
        include: { paymentProof: true },
      });
      if (!request?.paymentProof) throw new Error("Pengajuan tidak menunggu laporan atau bukti uang muka belum tersedia.");
      const accounts = [...new Set(input.items.flatMap((item) => item.accountId ? [item.accountId] : []))];
      if (input.items.some((item) => !item.accountId)) throw new Error("Setiap baris laporan harus memilih account anggaran.");
      const validAccounts = await tx.budgetAccount.findMany({ where: { id: { in: accounts }, departmentId: request.departmentId, isActive: true }, select: { id: true } });
      if (validAccounts.length !== accounts.length) throw new Error("Account laporan harus aktif dan berasal dari departemen pengajuan.");
      const attachmentPrefix = `/api/ppd/attachments/${encodeURIComponent(request.id)}/`;
      for (const item of input.items) for (const url of item.attachmentNames) {
        if (!isPpdAttachmentUrlForPrefix(url, attachmentPrefix)) {
          throw new Error("Lampiran laporan harus diunggah ke PPD ini.");
        }
      }
      const total = input.items.reduce((sum, item) => sum + item.amount, 0);
      const nextStatus = PPDStatus.PENDING_DEPT_HEAD;
      const report = await tx.pPDAccountabilityReport.create({
        data: {
          requestId: request.id,
          submittedById: actor.id,
          totalAmount: total,
          items: { create: input.items.map((item) => ({
            accountId: item.accountId,
            title: item.title.trim(),
            description: item.description.trim(),
            amount: item.amount,
            attachmentUrl: item.attachmentNames[0] ?? null,
            attachmentUrls: item.attachmentNames.slice(1),
          })) },
        },
      });
      const updated = await tx.pPDRequest.updateMany({ where: { id: request.id, status: PPDStatus.PENDING_ACCOUNTABILITY }, data: { status: nextStatus } });
      if (!updated.count) throw new Error("Status pengajuan berubah. Muat ulang halaman lalu coba lagi.");
      await tx.pPDApprovalEvent.create({
        data: { requestId: request.id, actorId: actor.id, stage: PPDApprovalStage.DEPT_HEAD, action: PPDApprovalAction.ACCOUNTABILITY_SUBMITTED, fromStatus: PPDStatus.PENDING_ACCOUNTABILITY, toStatus: nextStatus, note: `Laporan pertanggungjawaban sebesar Rp${total.toLocaleString("id-ID")} dikirim untuk approval ulang.` },
      });
      void report;
    });
    revalidatePath("/dashboard/ppd");
    revalidatePath("/dashboard/ppd/approval");
    revalidatePath("/dashboard/budget");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal mengirim laporan pertanggungjawaban." };
  }
}

export async function completePpdAccountabilityAction(input: { id: string; note?: string }) {
  const actor = await getActor();
  if (!actor || actor.role !== Role.FINANCE) return { error: "Hanya Finance yang dapat menyelesaikan PPD." };
  const note = typeof input.note === "string" ? input.note.trim() : "";
  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.pPDRequest.findFirst({ where: { id: input.id, requestedById: { not: actor.id }, type: PPDType.UANG_MUKA, status: PPDStatus.PENDING_FINANCE_SETTLEMENT, department: { status: "ACTIVE" } }, include: { paymentProof: true, accountabilityReport: { include: { items: true } } } });
      if (!request?.paymentProof || !request.accountabilityReport) throw new Error("Laporan atau bukti uang muka belum tersedia.");
      if (Math.round(Number(request.accountabilityReport.totalAmount) * 100) !== Math.round(Number(request.paymentProof.paidAmount) * 100)) throw new Error("Nominal laporan tidak sama dengan uang muka; gunakan proses selisih.");
      await realizeAccountabilityItems(tx, request);
      const updated = await tx.pPDRequest.updateMany({ where: { id: request.id, status: PPDStatus.PENDING_FINANCE_SETTLEMENT }, data: { status: PPDStatus.PAID } });
      if (!updated.count) throw new Error("PPD sudah diproses Finance lain.");
      await tx.pPDApprovalEvent.create({ data: { requestId: request.id, actorId: actor.id, stage: PPDApprovalStage.PAYMENT, action: PPDApprovalAction.PAYMENT_VERIFIED, fromStatus: request.status, toStatus: PPDStatus.PAID, note: note || "Laporan sesuai dengan uang muka; PPD diselesaikan Finance." } });
    });
    revalidatePath("/dashboard/ppd"); revalidatePath("/dashboard/ppd/approval"); revalidatePath("/dashboard/budget");
    return { success: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "PPD gagal diselesaikan." }; }
}

export async function submitPpdTopUpAction(input: {
  id: string; fileName: string; originalFileName: string; mimeType: string; fileSize: number; paidAt: string; referenceNumber: string; note: string;
}) {
  const actor = await getActor();
  if (!actor || actor.role !== Role.FINANCE) return { error: "Hanya Finance yang dapat memproses transfer tambahan." };
  try {
    if (typeof input.id !== "string" || !/^[a-z0-9]{20,32}$/i.test(input.id)) throw new Error("PPD tidak valid.");
    const file = await verifyStoredSettlementFile(input.id, input.fileName, input.mimeType, input.fileSize, "top_up");
    const originalFileName = input.originalFileName.trim();
    const note = input.note.trim();
    const referenceNumber = input.referenceNumber.trim();
    if (!originalFileName || originalFileName.length > 255 || note.length > 2000 || referenceNumber.length > 120 || !Number.isFinite(Date.parse(input.paidAt))) throw new Error("Data bukti transfer tambahan tidak valid.");
    const proofId = await prisma.$transaction(async (tx) => {
      const request = await tx.pPDRequest.findFirst({ where: { id: input.id, requestedById: { not: actor.id }, type: PPDType.UANG_MUKA, status: PPDStatus.PENDING_FINANCE_SETTLEMENT, department: { status: "ACTIVE" } }, include: { paymentProof: true, accountabilityReport: { include: { items: true } } } });
      if (!request?.paymentProof || !request.accountabilityReport) throw new Error("Laporan atau bukti uang muka belum tersedia.");
      const difference = Math.round((Number(request.accountabilityReport.totalAmount) - Number(request.paymentProof.paidAmount)) * 100) / 100;
      if (difference <= 0) throw new Error("Tidak ada kekurangan dana yang perlu ditransfer.");
      const proof = await tx.pPDSettlementProof.create({ data: { requestId: request.id, type: "TOP_UP", uploadedById: actor.id, verifiedById: actor.id, originalFileName, storagePath: file.path, mimeType: input.mimeType, fileSize: file.size, amount: difference, paidAt: new Date(input.paidAt), referenceNumber: referenceNumber || null, note: note || null, verifiedAt: new Date() }, select: { id: true } });
      await realizeAccountabilityItems(tx, request);
      const updated = await tx.pPDRequest.updateMany({ where: { id: request.id, status: PPDStatus.PENDING_FINANCE_SETTLEMENT }, data: { status: PPDStatus.PAID } });
      if (!updated.count) throw new Error("PPD sudah diproses Finance lain.");
      await tx.pPDApprovalEvent.create({ data: { requestId: request.id, actorId: actor.id, stage: PPDApprovalStage.PAYMENT, action: PPDApprovalAction.PAYMENT_VERIFIED, fromStatus: request.status, toStatus: PPDStatus.PAID, note: note || `Kekurangan Rp${difference.toLocaleString("id-ID")} telah ditransfer dan diverifikasi.` } });
      return proof.id;
    });
    revalidatePath("/dashboard/ppd"); revalidatePath("/dashboard/ppd/approval"); revalidatePath("/dashboard/budget");
    return { success: true, proofId };
  } catch (error) { return { error: error instanceof Error ? error.message : "Transfer tambahan gagal diverifikasi." }; }
}

export async function submitPpdRefundProofAction(input: {
  id: string; fileName: string; originalFileName: string; mimeType: string; fileSize: number; paidAt: string; referenceNumber: string; note: string;
}) {
  const actor = await getActor();
  if (!actor || actor.role !== Role.FINANCE) return { error: "Hanya Finance yang dapat mengirim bukti pengembalian dana." };
  try {
    if (typeof input.id !== "string" || !/^[a-z0-9]{20,32}$/i.test(input.id)) throw new Error("PPD tidak valid.");
    const file = await verifyStoredSettlementFile(input.id, input.fileName, input.mimeType, input.fileSize, "refund");
    const originalFileName = input.originalFileName.trim();
    const note = input.note.trim();
    const referenceNumber = input.referenceNumber.trim();
    if (!originalFileName || originalFileName.length > 255 || note.length > 2000 || referenceNumber.length > 120 || !Number.isFinite(Date.parse(input.paidAt))) throw new Error("Data bukti pengembalian dana tidak valid.");
    const proofId = await prisma.$transaction(async (tx) => {
      const request = await tx.pPDRequest.findFirst({ where: { id: input.id, requestedById: { not: actor.id }, type: PPDType.UANG_MUKA, status: PPDStatus.PENDING_APPLICANT_REFUND, department: { status: "ACTIVE" } }, include: { paymentProof: true, accountabilityReport: true } });
      if (!request?.paymentProof || !request.accountabilityReport) throw new Error("Pengajuan tidak menunggu pengembalian dana.");
      const difference = Math.round((Number(request.paymentProof.paidAmount) - Number(request.accountabilityReport.totalAmount)) * 100) / 100;
      if (difference <= 0) throw new Error("Tidak ada kelebihan dana yang harus dikembalikan.");
      const proof = await tx.pPDSettlementProof.create({ data: { requestId: request.id, type: "REFUND", uploadedById: actor.id, originalFileName, storagePath: file.path, mimeType: input.mimeType, fileSize: file.size, amount: difference, paidAt: new Date(input.paidAt), referenceNumber: referenceNumber || null, note: note || null }, select: { id: true } });
      const updated = await tx.pPDRequest.updateMany({ where: { id: request.id, status: PPDStatus.PENDING_APPLICANT_REFUND }, data: { status: PPDStatus.PENDING_FINANCE_REFUND_VERIFICATION } });
      if (!updated.count) throw new Error("Status pengajuan berubah. Muat ulang halaman lalu coba lagi.");
      await tx.pPDApprovalEvent.create({ data: { requestId: request.id, actorId: actor.id, stage: PPDApprovalStage.PAYMENT, action: PPDApprovalAction.REFUND_SUBMITTED, fromStatus: request.status, toStatus: PPDStatus.PENDING_FINANCE_REFUND_VERIFICATION, note: note || `Finance mencatat pengembalian Rp${difference.toLocaleString("id-ID")}.` } });
      return proof.id;
    });
    revalidatePath("/dashboard/ppd"); revalidatePath("/dashboard/ppd/approval");
    return { success: true, proofId };
  } catch (error) { return { error: error instanceof Error ? error.message : "Bukti pengembalian dana gagal dikirim." }; }
}

export async function verifyPpdRefundAction(input: { id: string; note?: string }) {
  const actor = await getActor();
  if (!actor || actor.role !== Role.FINANCE) return { error: "Hanya Finance yang dapat memverifikasi pengembalian dana." };
  const note = typeof input.note === "string" ? input.note.trim() : "";
  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.pPDRequest.findFirst({ where: { id: input.id, requestedById: { not: actor.id }, type: PPDType.UANG_MUKA, status: PPDStatus.PENDING_FINANCE_REFUND_VERIFICATION, department: { status: "ACTIVE" } }, include: { paymentProof: true, accountabilityReport: { include: { items: true } }, settlementProofs: { where: { type: "REFUND" } } } });
      const proof = request?.settlementProofs[0];
      if (!request?.paymentProof || !request.accountabilityReport || !proof) throw new Error("Bukti pengembalian dana belum tersedia.");
      const expected = Math.round((Number(request.paymentProof.paidAmount) - Number(request.accountabilityReport.totalAmount)) * 100) / 100;
      if (Math.round(Number(proof.amount) * 100) !== Math.round(expected * 100) || expected <= 0) throw new Error("Nominal bukti pengembalian tidak sesuai selisih laporan.");
      await tx.pPDSettlementProof.update({ where: { id: proof.id }, data: { verifiedById: actor.id, verifiedAt: new Date(), note: note || proof.note } });
      await realizeAccountabilityItems(tx, request);
      const updated = await tx.pPDRequest.updateMany({ where: { id: request.id, status: PPDStatus.PENDING_FINANCE_REFUND_VERIFICATION }, data: { status: PPDStatus.PAID } });
      if (!updated.count) throw new Error("PPD sudah diproses Finance lain.");
      await tx.pPDApprovalEvent.create({ data: { requestId: request.id, actorId: actor.id, stage: PPDApprovalStage.PAYMENT, action: PPDApprovalAction.REFUND_VERIFIED, fromStatus: request.status, toStatus: PPDStatus.PAID, note: note || "Pengembalian dana diverifikasi; PPD diselesaikan." } });
    });
    revalidatePath("/dashboard/ppd"); revalidatePath("/dashboard/ppd/approval"); revalidatePath("/dashboard/budget");
    return { success: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "Pengembalian dana gagal diverifikasi." }; }
}
