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
  year: number;
};

type DepartmentUpdateInput = DepartmentInput & { id: string };

const canManageDepartments = async () => {
  const session = await getCurrentUser();
  if (!session) return false;
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
  return user?.role === Role.ADMIN;
};

const getActor = async () => {
  const session = await getCurrentUser();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, role: true },
  });
};

const canManageDepartmentMembers = async (actor: { id: string; role: string }, departmentId: string) => {
  if (actor.role === Role.ADMIN) return true;
  if (actor.role !== Role.DEPT_HEAD) return false;
  const membership = await prisma.departmentMember.findFirst({
    where: {
      userId: actor.id,
      departmentId,
      role: "PIC",
      status: "ACTIVE",
      department: { status: "ACTIVE" },
    },
    select: { id: true },
  });
  return Boolean(membership);
};

const toStatus = (status: DepartmentInput["status"]) => status === "Aktif" ? "ACTIVE" : "INACTIVE";

const loadDepartment = async (id: string, year: number): Promise<Department | undefined> =>
  (await getDepartmentsForView(year)).find((department) => department.id === id);

export async function getDepartmentsByBudgetYearAction(year: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return { error: "Tahun anggaran tidak valid." };
  try {
    const actor = await getActor();
    if (!actor || (actor.role !== Role.ADMIN && actor.role !== Role.DEPT_HEAD && actor.role !== Role.STAFF)) {
      return { error: "Akses ditolak." };
    }
    if (actor.role === Role.ADMIN) return { data: await getDepartmentsForView(year) };

    const membershipRole = actor.role === Role.DEPT_HEAD ? "PIC" : "MEMBER";
    const memberships = await prisma.departmentMember.findMany({
      where: {
        userId: actor.id,
        role: membershipRole,
        status: "ACTIVE",
        department: { status: "ACTIVE" },
      },
      select: { departmentId: true },
    });
    return {
      data: await getDepartmentsForView(year, memberships.map((membership) => membership.departmentId)),
    };
  } catch (error) {
    console.error("Load departments by budget year error:", error);
    return { error: "Gagal memuat anggaran departemen." };
  }
}

export async function createDepartmentAction(input: DepartmentInput) {
  if (!(await canManageDepartments())) return { error: "Hanya Admin yang dapat mengelola departemen." };

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name || !code) return { error: "Nama dan kode departemen wajib diisi." };

  try {
    const department = await prisma.department.create({
      data: {
        name,
        code,
        status: toStatus(input.status),
        picName: input.pic.trim() || null,
        description: input.description.trim() || null,
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

export async function deleteDepartmentAction(id: string) {
  if (!(await canManageDepartments())) return { error: "Hanya Admin yang dapat menghapus departemen." };
  if (typeof id !== "string" || !id.trim()) return { error: "Departemen tidak valid." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const department = await tx.department.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { accounts: true, ppdRequests: true } },
        },
      });
      if (!department) return { error: "Departemen tidak ditemukan." } as const;

      if (department._count.accounts > 0 || department._count.ppdRequests > 0) {
        return { error: "Departemen masih memiliki account budget atau riwayat PPD. Nonaktifkan departemen agar riwayat tetap tersimpan." } as const;
      }

      if (department.status === "ACTIVE") {
        const activeCount = await tx.department.count({ where: { status: "ACTIVE" } });
        if (activeCount <= 1) return { error: "Sistem harus memiliki minimal satu departemen aktif." } as const;
      }

      await tx.department.delete({ where: { id } });
      return { id: department.id, name: department.name } as const;
    });

    if ("error" in result) return { error: result.error };
    revalidatePath("/dashboard/department");
    revalidatePath("/dashboard/budget");
    revalidatePath("/dashboard/ppd");
    return { success: true, ...result };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
      return { error: "Departemen masih memiliki data terkait dan tidak dapat dihapus." };
    }
    console.error("Delete department error:", error);
    return { error: "Gagal menghapus departemen." };
  }
}

export async function addDepartmentMemberAction(input: {
  departmentId: string;
  userId: string;
  year: number;
}) {
  if (!input.departmentId || !input.userId || !Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) {
    return { error: "Departemen, pengguna, atau tahun tidak valid." };
  }
  const actor = await getActor();
  if (!actor || !(await canManageDepartmentMembers(actor, input.departmentId))) {
    return { error: "Anda tidak memiliki akses mengelola anggota departemen ini." };
  }

  try {
    const { member, userRole } = await prisma.$transaction(async (tx) => {
      const [department, user] = await Promise.all([
        tx.department.findUnique({ where: { id: input.departmentId }, select: { status: true } }),
        tx.user.findUnique({ where: { id: input.userId }, select: { id: true, name: true, email: true, role: true } }),
      ]);
      if (!department || department.status !== "ACTIVE") throw new Error("Departemen tidak aktif atau tidak ditemukan.");
      if (!user) throw new Error("Pengguna tidak ditemukan.");
      if (actor.role === Role.DEPT_HEAD && user.role !== Role.STAFF) {
        throw new Error("Dept Head hanya dapat menambahkan pengguna ber-role Staff.");
      }

      const departmentRole = user.role === Role.DEPT_HEAD ? "PIC" : "MEMBER";
      const name = user.name?.trim() || user.email;
      const email = user.email.toLowerCase();
      const existingMembership = await tx.departmentMember.findUnique({
        where: { departmentId_userId: { departmentId: input.departmentId, userId: user.id } },
      });
      if (existingMembership?.status === "ACTIVE") {
        throw new Error("Pengguna tersebut sudah terdaftar di departemen ini.");
      }

      if (departmentRole === "PIC") {
        await tx.departmentMember.updateMany({
          where: { departmentId: input.departmentId, role: "PIC" },
          data: { role: "MEMBER" },
        });
      }
      const memberData = { name, email, role: departmentRole, status: "ACTIVE" as const };
      const created = existingMembership
        ? await tx.departmentMember.update({
            where: { id: existingMembership.id },
            data: memberData,
          })
        : await tx.departmentMember.create({
            data: { ...memberData, departmentId: input.departmentId, userId: user.id },
          });
      if (departmentRole === "PIC") {
        await tx.department.update({ where: { id: input.departmentId }, data: { picName: name } });
      }
      return { member: created, userRole: user.role };
    });

    const data: Member = {
      id: member.id,
      userId: member.userId,
      name: member.name,
      email: member.email,
      userRole,
      role: member.role === "PIC" ? "Penanggung jawab" : "Anggota",
      status: member.status === "ACTIVE" ? "Aktif" : "Nonaktif",
    };
    revalidatePath("/dashboard/department");
    return { success: true, data };
  } catch (error) {
    if (error instanceof Error && error.message === "Pengguna tersebut sudah terdaftar di departemen ini.") {
      return { error: error.message };
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: "Pengguna tersebut sudah terdaftar di departemen ini." };
    }
    console.error("Add department member error:", error);
    const message = error instanceof Error && (
      error.message === "Pengguna tidak ditemukan."
      || error.message.startsWith("Departemen")
      || error.message.startsWith("Dept Head")
    )
      ? error.message
      : "Gagal menambahkan anggota.";
    return { error: message };
  }
}

export async function removeDepartmentMemberAction(input: {
  departmentId: string;
  memberId: string;
}) {
  const actor = await getActor();
  if (!actor || !input.departmentId || !(await canManageDepartmentMembers(actor, input.departmentId))) {
    return { error: "Anda tidak memiliki akses mengelola anggota departemen ini." };
  }
  try {
    const member = await prisma.departmentMember.findFirst({
      where: { id: input.memberId, departmentId: input.departmentId },
      include: { user: { select: { role: true } } },
    });
    if (!member) return { error: "Anggota tidak ditemukan." };
    if (actor.role === Role.DEPT_HEAD && (member.role !== "MEMBER" || member.user?.role !== Role.STAFF)) {
      return { error: "Dept Head hanya dapat mengeluarkan anggota dengan role Staff." };
    }

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
