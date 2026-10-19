"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@/lib/roles";
import { getDepartmentsForView } from "@/lib/department-data";
import type { Department, Member } from "@/components/department/department-view.types";

type DepartmentInput = {
  name: string;
  code: string;
  pic: string;
  description: string;
  status: "Aktif" | "Nonaktif";
  totalBudget: number;
  year: number;
};

type DepartmentUpdateInput = Omit<DepartmentInput, "totalBudget"> & { id: string };

const canManageDepartments = async () => {
  const session = await getCurrentUser();
  if (!session) return false;
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
  return user?.role === Role.ADMIN;
};

const toStatus = (status: DepartmentInput["status"]) => status === "Aktif" ? "ACTIVE" : "INACTIVE";

const loadDepartment = async (id: string, year: number): Promise<Department | undefined> =>
  (await getDepartmentsForView(year)).find((department) => department.id === id);

export async function createDepartmentAction(input: DepartmentInput) {
  if (!(await canManageDepartments())) return { error: "Hanya Admin yang dapat mengelola departemen." };

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  const amount = Number(input.totalBudget);
  if (!name || !code) return { error: "Nama dan kode departemen wajib diisi." };
  if (!Number.isFinite(amount) || amount < 0) return { error: "Anggaran tahunan tidak valid." };

  try {
    const department = await prisma.department.create({
      data: {
        name,
        code,
        status: toStatus(input.status),
        picName: input.pic.trim() || null,
        description: input.description.trim() || null,
        annualBudgets: { create: { year: input.year, allocatedAmount: amount } },
      },
    });
    const data = await loadDepartment(department.id, input.year);
    revalidatePath("/dashboard/department");
    revalidatePath("/dashboard/budget");
    return { success: true, data };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: "Kode departemen sudah digunakan." };
    }
    console.error("Create department error:", error);
    return { error: "Gagal menyimpan departemen." };
  }
}

export async function updateDepartmentAction(input: DepartmentUpdateInput) {
  if (!(await canManageDepartments())) return { error: "Hanya Admin yang dapat mengelola departemen." };

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!input.id || !name || !code) return { error: "Nama dan kode departemen wajib diisi." };

  if (input.status === "Nonaktif") {
    const [department, activeCount] = await Promise.all([
      prisma.department.findUnique({ where: { id: input.id }, select: { status: true } }),
      prisma.department.count({ where: { status: "ACTIVE" } }),
    ]);
    if (department?.status === "ACTIVE" && activeCount <= 1) {
      return { error: "Sistem harus memiliki minimal satu departemen aktif." };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const picMembership = await tx.departmentMember.findFirst({
        where: { departmentId: input.id, role: "PIC" },
      });
      if (picMembership) {
        if (input.pic.trim()) {
          await tx.departmentMember.update({
            where: { id: picMembership.id },
            data: { name: input.pic.trim() },
          });
        } else {
          await tx.departmentMember.update({
            where: { id: picMembership.id },
            data: { role: "MEMBER" },
          });
        }
      }
      await tx.department.update({
        where: { id: input.id },
        data: {
          name,
          code,
          status: toStatus(input.status),
          picName: input.pic.trim() || null,
          description: input.description.trim() || null,
        },
      });
    });
    const data = await loadDepartment(input.id, input.year);
    revalidatePath("/dashboard/department");
    revalidatePath("/dashboard/budget");
    return { success: true, data };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: "Kode departemen sudah digunakan." };
    }
    console.error("Update department error:", error);
    return { error: "Gagal memperbarui departemen." };
  }
}

export async function archiveDepartmentAction(id: string) {
  if (!(await canManageDepartments())) return { error: "Hanya Admin yang dapat mengelola departemen." };
  if (!id) return { error: "Departemen tidak ditemukan." };

  try {
    const [existingDepartment, activeCount] = await Promise.all([
      prisma.department.findUnique({ where: { id }, select: { status: true } }),
      prisma.department.count({ where: { status: "ACTIVE" } }),
    ]);
    if (!existingDepartment) return { error: "Departemen tidak ditemukan." };
    if (existingDepartment.status === "ACTIVE" && activeCount <= 1) {
      return { error: "Sistem harus memiliki minimal satu departemen aktif." };
    }
    const updatedDepartment = await prisma.department.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    revalidatePath("/dashboard/department");
    revalidatePath("/dashboard/budget");
    return { success: true, id: updatedDepartment.id };
  } catch (error) {
    console.error("Archive department error:", error);
    return { error: "Gagal menonaktifkan departemen." };
  }
}

export async function updateDepartmentAnnualBudgetAction(input: {
  departmentId: string;
  year: number;
  amount: number;
}) {
  const session = await getCurrentUser();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } })
    : null;
  if (!user || ![Role.ADMIN, Role.FINANCE].includes(user.role as Role)) {
    return { error: "Hanya Admin atau Keuangan yang dapat mengatur pagu tahunan." };
  }
  if (!input.departmentId || !Number.isInteger(input.year) || !Number.isFinite(input.amount) || input.amount < 0) {
    return { error: "Data pagu tahunan tidak valid." };
  }

  try {
    const realized = await prisma.monthlyBudget.aggregate({
      where: { year: input.year, account: { departmentId: input.departmentId } },
      _sum: { realizedAmount: true },
    });
    const minimum = Number(realized._sum.realizedAmount ?? 0);
    if (input.amount < minimum) {
      return { error: `Pagu tidak boleh di bawah realisasi ${new Intl.NumberFormat("id-ID").format(minimum)}.` };
    }

    await prisma.departmentAnnualBudget.upsert({
      where: { departmentId_year: { departmentId: input.departmentId, year: input.year } },
      update: { allocatedAmount: input.amount },
      create: { departmentId: input.departmentId, year: input.year, allocatedAmount: input.amount },
    });
    revalidatePath("/dashboard/department");
    revalidatePath("/dashboard/budget");
    return { success: true };
  } catch (error) {
    console.error("Update annual department budget error:", error);
    return { error: "Gagal memperbarui pagu tahunan." };
  }
}

export async function addDepartmentMemberAction(input: {
  departmentId: string;
  name: string;
  email: string;
  role: "Penanggung jawab" | "Anggota";
  year: number;
}) {
  if (!(await canManageDepartments())) return { error: "Hanya Admin yang dapat mengelola anggota." };
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!input.departmentId || !name || !email) return { error: "Nama dan email anggota wajib diisi." };

  try {
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const member = await prisma.$transaction(async (tx) => {
      if (input.role === "Penanggung jawab") {
        await tx.departmentMember.updateMany({
          where: { departmentId: input.departmentId, role: "PIC" },
          data: { role: "MEMBER" },
        });
      }
      const created = await tx.departmentMember.create({
        data: {
          departmentId: input.departmentId,
          userId: existingUser?.id,
          name,
          email,
          role: input.role === "Penanggung jawab" ? "PIC" : "MEMBER",
        },
      });
      if (input.role === "Penanggung jawab") {
        await tx.department.update({ where: { id: input.departmentId }, data: { picName: name } });
      }
      return created;
    });

    const data: Member = {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role === "PIC" ? "Penanggung jawab" : "Anggota",
      status: member.status === "ACTIVE" ? "Aktif" : "Nonaktif",
    };
    revalidatePath("/dashboard/department");
    return { success: true, data };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: "Anggota dengan email tersebut sudah terdaftar di departemen ini." };
    }
    console.error("Add department member error:", error);
    return { error: "Gagal menambahkan anggota." };
  }
}

export async function removeDepartmentMemberAction(input: {
  departmentId: string;
  memberId: string;
}) {
  if (!(await canManageDepartments())) return { error: "Hanya Admin yang dapat mengelola anggota." };
  try {
    const member = await prisma.departmentMember.findFirst({
      where: { id: input.memberId, departmentId: input.departmentId },
    });
    if (!member) return { error: "Anggota tidak ditemukan." };

    await prisma.$transaction(async (tx) => {
      await tx.departmentMember.delete({ where: { id: member.id } });
      if (member.role === "PIC") {
        const nextPic = await tx.departmentMember.findFirst({
          where: { departmentId: input.departmentId, role: "PIC" },
          orderBy: { createdAt: "asc" },
        });
        await tx.department.update({
          where: { id: input.departmentId },
          data: { picName: nextPic?.name ?? null },
        });
      }
    });
    revalidatePath("/dashboard/department");
    return { success: true, id: member.id };
  } catch (error) {
    console.error("Remove department member error:", error);
    return { error: "Gagal mengeluarkan anggota." };
  }
}
