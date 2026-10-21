"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@/lib/roles";
import { hashPassword } from "@/lib/password";
import type { Prisma } from "@prisma/client";

export type UserMutationResponse = {
  success?: boolean;
  error?: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

export type UpdateUserInput = {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string;
};

async function requireAdmin(): Promise<string | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return "Akses ditolak. Hanya Admin.";
  const user = await prisma.user.findUnique({ where: { id: currentUser.id }, select: { role: true } });
  if (!user || user.role !== Role.ADMIN) {
    return "Akses ditolak. Hanya Admin.";
  }
  return null;
}

async function countAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: Role.ADMIN } });
}

async function syncDepartmentMembershipsForRole(
  tx: Prisma.TransactionClient,
  userId: string,
  role: Role,
  name: string,
) {
  if (role === Role.STAFF) {
    const picDepartments = await tx.departmentMember.findMany({
      where: { userId, role: "PIC" },
      select: { departmentId: true },
    });
    await tx.departmentMember.updateMany({ where: { userId }, data: { role: "MEMBER" } });
    for (const { departmentId } of picDepartments) {
      const nextPic = await tx.departmentMember.findFirst({
        where: { departmentId, role: "PIC" },
        orderBy: { createdAt: "asc" },
        select: { name: true },
      });
      await tx.department.update({
        where: { id: departmentId },
        data: { picName: nextPic?.name ?? null },
      });
    }
  } else if (role === Role.DEPT_HEAD) {
    const memberships = await tx.departmentMember.findMany({
      where: { userId, status: "ACTIVE" },
      select: { departmentId: true },
    });
    for (const { departmentId } of memberships) {
      await tx.departmentMember.updateMany({
        where: { departmentId, role: "PIC" },
        data: { role: "MEMBER" },
      });
      await tx.departmentMember.updateMany({
        where: { departmentId, userId, status: "ACTIVE" },
        data: { role: "PIC", name },
      });
      await tx.department.update({ where: { id: departmentId }, data: { picName: name } });
    }
  }
}

export async function createUser(
  _prev: UserMutationResponse | null,
  input: CreateUserInput
): Promise<UserMutationResponse> {
  const deny = await requireAdmin();
  if (deny) return { error: deny };

  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password ?? "";
  const role = input.role;

  if (!name || name.length < 3) return { error: "Nama minimal 3 karakter." };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Email tidak valid." };
  }
  if (password.length < 8) return { error: "Password minimal 8 karakter." };
  if (!Object.values(Role).includes(role)) return { error: "Role tidak valid." };

  try {
    const hashed = await hashPassword(password);
    await prisma.user.create({
      data: { name, email, password: hashed, role },
    });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: `Email ${email} sudah terdaftar.` };
    }
    console.error("Create user error:", error);
    return { error: "Gagal menambah pengguna." };
  }
}

export async function updateUser(
  _prev: UserMutationResponse | null,
  input: UpdateUserInput
): Promise<UserMutationResponse> {
  const deny = await requireAdmin();
  if (deny) return { error: deny };

  const { id, name, role, password } = input;
  const email = input.email?.trim().toLowerCase();
  if (!id) return { error: "ID pengguna tidak valid." };
  if (!name || name.trim().length < 3) return { error: "Nama minimal 3 karakter." };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Email tidak valid." };
  }
  if (!Object.values(Role).includes(role)) return { error: "Role tidak valid." };

  const currentUser = await getCurrentUser();
  if (currentUser?.id === id) {
    if (role !== Role.ADMIN) {
      return { error: "Anda tidak dapat mengubah role diri sendiri." };
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!existingUser) return { error: "Pengguna tidak ditemukan." };
  if (existingUser.role === Role.ADMIN && role !== Role.ADMIN && (await countAdmins()) <= 1) {
    return { error: "Tidak dapat menurunkan role Admin terakhir." };
  }

  try {
    const data: { name: string; email: string; role: Role; password?: string } = {
      name: name.trim(),
      email,
      role,
    };
    if (password && password.length >= 8) {
      data.password = await hashPassword(password);
    } else if (password && password.length < 8) {
      return { error: "Password baru minimal 8 karakter." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      if (existingUser.role !== role) {
        await syncDepartmentMembershipsForRole(tx, id, role, data.name);
      }
    });
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/department");
    return { success: true };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: "Email sudah terdaftar." };
    }
    console.error("Update user error:", error);
    return { error: "Gagal memperbarui pengguna." };
  }
}

export async function deleteUser(
  _prev: UserMutationResponse | null,
  input: { id: string }
): Promise<UserMutationResponse> {
  const deny = await requireAdmin();
  if (deny) return { error: deny };

  const { id } = input;
  if (!id) return { error: "ID pengguna tidak valid." };

  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Sesi tidak ditemukan." };
  if (currentUser.id === id) {
    return { error: "Anda tidak dapat menghapus akun sendiri." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id }, select: { role: true } });
      if (!target) return { error: "Pengguna tidak ditemukan." } as const;
      if (target.role === Role.ADMIN) {
        const adminCount = await tx.user.count({ where: { role: Role.ADMIN } });
        if (adminCount <= 1) {
          return { error: "Tidak dapat menghapus Admin terakhir. Tambahkan Admin baru terlebih dahulu." } as const;
        }
      }
      await tx.user.delete({ where: { id } });
      return { success: true } as const;
    });
    if ("error" in result) return { error: result.error };
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/department");
    return { success: true };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
      return { error: "Pengguna memiliki riwayat PPD dan tidak dapat dihapus agar histori tetap tersimpan." };
    }
    console.error("Delete user error:", error);
    return { error: "Gagal menghapus pengguna." };
  }
}

export async function getUsersAction() {
  const deny = await requireAdmin();
  if (deny) return { error: deny };
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { users };
  } catch (error) {
    console.error("Get users error:", error);
    return { error: "Gagal mengambil data pengguna." };
  }
}

export async function updateUserRoleAction(
  _prev: UserMutationResponse | null,
  formData: FormData
): Promise<UserMutationResponse> {
  const deny = await requireAdmin();
  if (deny) return { error: deny };

  const targetUserId = formData.get("userId")?.toString();
  const newRole = formData.get("role")?.toString() as Role;

  if (!targetUserId || !newRole) {
    return { error: "ID pengguna dan role baru wajib diisi." };
  }
  if (!Object.values(Role).includes(newRole)) {
    return { error: "Role tidak valid." };
  }

  const currentUser = await getCurrentUser();
  if (currentUser?.id === targetUserId) {
    return { error: "Anda tidak dapat mengubah role diri sendiri." };
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true, name: true, email: true } });
  if (!targetUser) return { error: "Pengguna tidak ditemukan." };
  if (targetUser.role === Role.ADMIN && newRole !== Role.ADMIN && (await countAdmins()) <= 1) {
    return { error: "Tidak dapat menurunkan role Admin terakhir." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: targetUserId }, data: { role: newRole } });
      if (targetUser.role !== newRole) {
        await syncDepartmentMembershipsForRole(tx, targetUserId, newRole, targetUser.name?.trim() || targetUser.email);
      }
    });
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/department");
    return { success: true };
  } catch (error) {
    console.error("Update role error:", error);
    return { error: "Gagal mengubah role pengguna." };
  }
}
