"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canManageBudget } from "@/lib/budget-permissions";

type BudgetScope =
  | { type: "annual"; year: number }
  | { type: "table"; departmentId: string; year: number; month: number };

type BudgetImportRow = { accountId: string; year: number; month: number; amount: number };

function isValidPeriod(year: number, month: number) {
  return Number.isInteger(year) && year >= 1900 && year <= 2100 && Number.isInteger(month) && month >= 1 && month <= 12;
}

export async function updateMonthlyBudgetAction(input: {
  accountId: string;
  year: number;
  month: number;
  amount: number;
}) {
  if (!(await canManageBudget())) return { error: "Hanya Admin atau Keuangan yang dapat mengubah budget." };
  if (!input.accountId || !isValidPeriod(input.year, input.month) || !Number.isFinite(input.amount) || input.amount < 0) {
    return { error: "Data budget tidak valid." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.budgetAccount.findUnique({ where: { id: input.accountId }, select: { isActive: true } });
      if (!account?.isActive) return "inactive" as const;
      const existing = await tx.monthlyBudget.findUnique({
        where: { accountId_year_month: { accountId: input.accountId, year: input.year, month: input.month } },
      });
      if (input.amount < Number(existing?.realizedAmount ?? 0)) return "below-realized" as const;
      await tx.monthlyBudget.upsert({
        where: { accountId_year_month: { accountId: input.accountId, year: input.year, month: input.month } },
        update: { amount: input.amount },
        create: { accountId: input.accountId, year: input.year, month: input.month, amount: input.amount },
      });
      return "saved" as const;
    });
    if (result === "inactive") return { error: "Akun anggaran sudah nonaktif." };
    if (result === "below-realized") return { error: "Budget tidak boleh di bawah jumlah realisasi." };
    revalidatePath("/dashboard/budget");
    revalidatePath("/dashboard/department");
    return { success: true };
  } catch (error) {
    console.error("Update monthly budget error:", error);
    return { error: "Gagal menyimpan budget." };
  }
}

export async function createMonthlyBudgetAction(input: {
  accountId: string;
  year: number;
  month: number;
  amount: number;
}) {
  if (!(await canManageBudget())) return { error: "Hanya Admin atau Keuangan yang dapat membuat budget." };
  if (!input.accountId || !isValidPeriod(input.year, input.month) || !Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "Data budget tidak valid." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.budgetAccount.findUnique({ where: { id: input.accountId }, select: { isActive: true } });
      if (!account?.isActive) return "inactive" as const;
      await tx.monthlyBudget.create({
        data: { accountId: input.accountId, year: input.year, month: input.month, amount: input.amount },
      });
      return "created" as const;
    });
    if (result === "inactive") return { error: "Akun anggaran sudah nonaktif." };
    revalidatePath("/dashboard/budget");
    revalidatePath("/dashboard/department");
    return { success: true };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: "Account ini sudah memiliki budget untuk periode tersebut." };
    }
    console.error("Create monthly budget error:", error);
    return { error: "Gagal membuat budget." };
  }
}

export async function createBudgetAccountAndBudgetAction(input: {
  departmentId: string;
  code: string;
  name: string;
  year: number;
  month: number;
  amount: number;
}) {
  if (!(await canManageBudget())) return { error: "Hanya Admin atau Keuangan yang dapat membuat akun anggaran." };
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!input.departmentId || !code || !name || !isValidPeriod(input.year, input.month) || !Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "Nama account, kode account, periode, dan nominal budget wajib diisi dengan benar." };
  }

  try {
    const account = await prisma.$transaction(async (tx) => {
      const department = await tx.department.findUnique({
        where: { id: input.departmentId },
        select: { id: true, status: true },
      });
      if (!department || department.status !== "ACTIVE") throw new Error("Departemen tidak aktif atau tidak ditemukan.");

      const created = await tx.budgetAccount.create({
        data: {
          departmentId: input.departmentId,
          code,
          name,
          budgets: { create: { year: input.year, month: input.month, amount: input.amount } },
        },
        select: { id: true, departmentId: true, code: true, name: true, isActive: true },
      });
      return created;
    });

    revalidatePath("/dashboard/budget");
    revalidatePath("/dashboard/department");
    revalidatePath("/dashboard/ppd");
    return { success: true, data: account };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: "Kode atau nama account sudah digunakan di departemen ini." };
    }
    const message = error instanceof Error && error.message.startsWith("Departemen")
      ? error.message
      : "Gagal membuat account dan budget.";
    console.error("Create budget account and budget error:", error);
    return { error: message };
  }
}

export async function removeBudgetAccountAction(accountId: string) {
  if (!(await canManageBudget())) return { error: "Hanya Admin atau Keuangan yang dapat mengelola akun anggaran." };
  if (!accountId) return { error: "Akun anggaran tidak valid." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.budgetAccount.findUnique({
        where: { id: accountId },
        select: {
          isActive: true,
          _count: { select: { budgets: true, ppdItems: true } },
        },
      });
      if (!account) return { mode: "missing" as const };
      if (!account.isActive) return { mode: "inactive" as const };

      if (account._count.budgets > 0 || account._count.ppdItems > 0) {
        await tx.budgetAccount.update({ where: { id: accountId }, data: { isActive: false } });
        return { mode: "deactivated" as const };
      }

      await tx.budgetAccount.delete({ where: { id: accountId } });
      return { mode: "deleted" as const };
    });

    if (result.mode === "missing") return { error: "Akun anggaran tidak ditemukan." };
    if (result.mode === "inactive") return { error: "Akun anggaran sudah nonaktif." };
    revalidatePath("/dashboard/budget");
    revalidatePath("/dashboard/ppd");
    revalidatePath("/dashboard/department");
    return { success: true, mode: result.mode };
  } catch (error) {
    console.error("Remove budget account error:", error);
    return { error: "Gagal menghapus atau menonaktifkan akun anggaran." };
  }
}

export async function importMonthlyBudgetsAction(input: { scope: BudgetScope; rows: BudgetImportRow[] }) {
  if (!(await canManageBudget())) return { error: "Hanya Admin atau Keuangan yang dapat mengimpor budget." };
  if (!input.rows.length || input.rows.length > 1000) return { error: "Jumlah baris import tidak valid (maksimal 1.000)." };

  const seen = new Set<string>();
  for (const row of input.rows) {
    if (!row.accountId || !isValidPeriod(row.year, row.month) || !Number.isFinite(row.amount) || row.amount < 0) {
      return { error: "File berisi baris budget dengan nilai yang tidak valid." };
    }
    if (input.scope.type === "annual" && row.year !== input.scope.year) {
      return { error: "Import tahunan hanya boleh berisi data untuk tahun yang dipilih." };
    }
    if (input.scope.type === "table" &&
      (row.year !== input.scope.year || row.month !== input.scope.month)) {
      return { error: "Import tabel hanya boleh berisi data untuk periode yang sedang dibuka." };
    }
    const key = `${row.accountId}|${row.year}|${row.month}`;
    if (seen.has(key)) return { error: "File berisi lebih dari satu baris untuk account dan periode yang sama." };
    seen.add(key);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const accounts = await tx.budgetAccount.findMany({
        where: {
          id: { in: [...new Set(input.rows.map((row) => row.accountId))] },
          isActive: true,
          ...(input.scope.type === "table" ? { departmentId: input.scope.departmentId } : {}),
        },
        select: { id: true },
      });
      const foundIds = new Set(accounts.map((account) => account.id));
      if (input.rows.some((row) => !foundIds.has(row.accountId))) {
        throw new Error("Satu atau beberapa account tidak ditemukan pada cakupan import.");
      }

      for (const row of input.rows) {
        const key = { accountId_year_month: { accountId: row.accountId, year: row.year, month: row.month } };
        const existing = await tx.monthlyBudget.findUnique({ where: key });
        if (row.amount < Number(existing?.realizedAmount ?? 0)) {
          throw new Error("Nominal budget tidak boleh di bawah realisasi.");
        }
        await tx.monthlyBudget.upsert({
          where: key,
          update: { amount: row.amount },
          create: { accountId: row.accountId, year: row.year, month: row.month, amount: row.amount },
        });
      }
    });
    revalidatePath("/dashboard/budget");
    revalidatePath("/dashboard/department");
    return { success: true, count: input.rows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengimpor budget.";
    if (message.includes("account tidak ditemukan") || message.includes("di bawah realisasi")) {
      return { error: message };
    }
    console.error("Import monthly budgets error:", error);
    return { error: "Gagal mengimpor budget." };
  }
}
