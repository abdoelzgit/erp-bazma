"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { PPDType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

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
  items: Array<{ accountId: string | null; description: string; attachmentName: string; amount: number }>;
};

const submissionTypes: Record<string, PPDType> = {
  "Uang Muka": PPDType.UANG_MUKA,
  UANG_MUKA: PPDType.UANG_MUKA,
  Reimbursement: PPDType.REIMBURSEMENT,
  REIMBURSEMENT: PPDType.REIMBURSEMENT,
  "Pembayaran Vendor": PPDType.PEMBAYARAN_VENDOR,
  PEMBAYARAN_VENDOR: PPDType.PEMBAYARAN_VENDOR,
};

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
  if (!isValidInput(input)) return { error: "Data draft PPD tidak valid." };

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

    const totalAmount = input.items.reduce((sum, item) => sum + item.amount, 0);
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
          where: { id: requestId, requestedById: userId, status: "DRAFT" }, select: { id: true },
        });
        if (!existing) throw new Error("Draft tidak ditemukan atau sudah dikirim.");
        await tx.pPDRequest.update({ where: { id: requestId }, data });
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
        await tx.pPDItem.createMany({
          data: input.items.map((item) => ({
            requestId: requestId!,
            accountId: item.accountId,
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
    return { error: message.includes("Draft tidak ditemukan") ? message : "Gagal menyimpan draft PPD." };
  }
}

export async function deletePpdDraftAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." };
  const result = await prisma.pPDRequest.deleteMany({ where: { id, requestedById: userId, status: "DRAFT" } });
  if (!result.count) return { error: "Draft tidak ditemukan atau sudah dikirim." };
  revalidatePath("/dashboard/ppd");
  revalidatePath("/dashboard/budget");
  return { success: true };
}

export async function submitPpdDraftAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: "Sesi pengguna tidak ditemukan. Silakan masuk kembali." };
  const request = await prisma.pPDRequest.findFirst({
    where: { id, requestedById: userId, status: "DRAFT" }, include: { items: true },
  });
  if (!request) return { error: "Draft tidak ditemukan atau sudah dikirim." };
  if (!request.title.trim() || request.items.length === 0 || request.items.some((item) => !item.accountId)) {
    return { error: "Lengkapi judul dan account pada minimal satu item sebelum mengirim." };
  }
  if (Number(request.totalAmount) > Number(request.limitFund)) {
    return { error: "Total item melebihi limit dana." };
  }
  await prisma.pPDRequest.update({ where: { id }, data: { status: "SUBMITTED" } });
  revalidatePath("/dashboard/ppd");
  revalidatePath("/dashboard/budget");
  return { success: true };
}
