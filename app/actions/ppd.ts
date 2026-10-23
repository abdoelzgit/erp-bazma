"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { PPDApprovalAction, PPDApprovalStage, PPDStatus, PPDType, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canUserCreatePpdInDepartment } from "@/lib/ppd-access";
import { canReadPpdRequest } from "@/lib/ppd-read-access";
import { normalizePpdRevisionSnapshot, samePpdRevisionSnapshot, type PpdRevisionSnapshot } from "@/lib/ppd-revision";

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
  items: Array<{ accountId: string | null; title: string; description: string; attachmentName: string; amount: number }>;
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
  items: Array<{ accountId: string | null; title: string; description: string; attachmentUrl: string | null; amount: number | Prisma.Decimal }>;
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
      attachmentName: item.attachmentUrl ?? "",
      amount: Number(item.amount),
    })),
  });
}

function snapshotFromDraftInput(input: PpdDraftInput): PpdRevisionSnapshot {
  return normalizePpdRevisionSnapshot({
    title: input.title,
    description: input.description,
    departmentId: input.departmentId,
    submissionType: submissionTypes[input.submissionType || "UANG_MUKA"],
    paymentType: input.paymentType || "Transfer",
    bank: input.bank,
    accountNo: input.accountNo,
    limitFund: input.limitFund,
    year: input.year,
    month: input.month,
    rows: input.items.map((item) => ({ ...item })),
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
    const inputSnapshot = snapshotFromDraftInput(input);

    const id = await prisma.$transaction(async (tx) => {
      let requestId = input.id;
      if (requestId) {
        const existing = await tx.pPDRequest.findFirst({
          where: { id: requestId, requestedById: userId, status: { in: [PPDStatus.DRAFT, PPDStatus.RETURNED_FOR_REVISION] } },
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
        if (!existing) throw new Error("Draft tidak ditemukan atau sudah dikirim.");
        if (existing.status === PPDStatus.RETURNED_FOR_REVISION) {
          const currentSnapshot = snapshotFromRequest(existing);
          const revisionEvent = existing.approvalEvents[0];
          const baseline = revisionEvent?.snapshot
            ? normalizePpdRevisionSnapshot(revisionEvent.snapshot as unknown as PpdRevisionSnapshot)
            : currentSnapshot;
          if (samePpdRevisionSnapshot(baseline, inputSnapshot)) {
            throw new Error("Ubah isi PPD sebelum menyimpan revisi.");
          }
          if (revisionEvent && !revisionEvent.snapshot) {
            await tx.pPDApprovalEvent.update({ where: { id: revisionEvent.id }, data: { snapshot: baseline as Prisma.InputJsonValue } });
          }
        }
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
          if (item.attachmentName && (
            !item.attachmentName.startsWith(attachmentPrefix) ||
            !/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.test(item.attachmentName.slice(attachmentPrefix.length))
          )) {
            throw new Error("Lampiran harus diunggah ke draft PPD ini.");
          }
        }
        await tx.pPDItem.createMany({
          data: input.items.map((item) => ({
            requestId: requestId!,
            accountId: item.accountId,
            title: item.title.trim(),
            description: item.description,
            attachmentUrl: item.attachmentName || null,
            amount: item.amount,
          })),
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
];

export async function submitPpdDraftAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." };
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (actor?.role !== Role.STAFF) return { error: "Hanya role User yang dapat mengirim PPD." };
  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.pPDRequest.findFirst({
        where: { id, requestedById: userId, status: { in: [PPDStatus.DRAFT, PPDStatus.RETURNED_FOR_REVISION] } },
        include: {
          items: true,
          approvalEvents: {
            where: { action: PPDApprovalAction.REVISION_REQUESTED },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { snapshot: true },
          },
        },
      });
      if (!request) throw new Error("Draft tidak ditemukan atau tidak dapat dikirim ulang.");
      if (request.status === PPDStatus.RETURNED_FOR_REVISION) {
        const currentSnapshot = snapshotFromRequest(request);
        const savedBaseline = request.approvalEvents[0]?.snapshot;
        const baseline = savedBaseline
          ? normalizePpdRevisionSnapshot(savedBaseline as unknown as PpdRevisionSnapshot)
          : currentSnapshot;
        if (samePpdRevisionSnapshot(currentSnapshot, baseline)) {
          throw new Error("Ubah isi PPD sebelum mengirim ulang revisi.");
        }
      }
      if (!(await canUserCreatePpdInDepartment(userId, request.departmentId))) {
        throw new Error("Anda tidak lagi memiliki akses membuat PPD di departemen tersebut.");
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

      const nextStatus = request.status === PPDStatus.DRAFT
        ? PPDStatus.PENDING_DEPT_HEAD
        : request.revisionReturnStage === PPDApprovalStage.FINANCE
          ? PPDStatus.PENDING_FINANCE
          : PPDStatus.PENDING_DEPT_HEAD;
      const updated = await tx.pPDRequest.updateMany({
        where: { id: request.id, requestedById: userId, status: request.status },
        data: { status: nextStatus, revisionReturnStage: null },
      });
      if (!updated.count) throw new Error("Status PPD berubah. Muat ulang halaman dan coba lagi.");
      await tx.pPDApprovalEvent.create({
        data: {
          requestId: request.id,
          actorId: userId,
          stage: nextStatus === PPDStatus.PENDING_FINANCE ? PPDApprovalStage.FINANCE : PPDApprovalStage.DEPT_HEAD,
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
        include: { items: true, department: { select: { status: true } } },
      });
      if (!request) throw new Error("PPD tidak ditemukan.");
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
            : PPDStatus.PENDING_FINANCE_PAYMENT;
        action = PPDApprovalAction.APPROVED;
      } else if (input.decision === "revise") {
        nextStatus = PPDStatus.RETURNED_FOR_REVISION;
        revisionReturnStage = stage === PPDApprovalStage.EXECUTIVE
          ? PPDApprovalStage.FINANCE
          : PPDApprovalStage.DEPT_HEAD;
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
      if (Math.round(input.paidAmount * 100) !== Math.round(Number(request.totalAmount) * 100)) {
        throw new Error("Nominal pembayaran harus sama dengan total PPD.");
      }
      const updated = await tx.pPDRequest.updateMany({
        where: { id: request.id, status: PPDStatus.PENDING_FINANCE_PAYMENT },
        data: { status: PPDStatus.PAID },
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
      for (const item of request.items) {
        if (!item.accountId || Number(item.amount) <= 0) continue;
        const realized = await tx.monthlyBudget.updateMany({
          where: { accountId: item.accountId, year: request.year, month: request.month },
          data: { realizedAmount: { increment: item.amount } },
        });
        if (realized.count !== 1) throw new Error("Budget item tidak ditemukan; realisasi pembayaran belum dapat dicatat.");
      }
      await tx.pPDApprovalEvent.create({
        data: {
          requestId: request.id,
          actorId: actor.id,
          stage: PPDApprovalStage.PAYMENT,
          action: PPDApprovalAction.PAYMENT_VERIFIED,
          fromStatus: PPDStatus.PENDING_FINANCE_PAYMENT,
          toStatus: PPDStatus.PAID,
          note: note || "Pembayaran dan bukti telah diverifikasi Finance.",
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
