"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@/lib/roles";

export type UpdateRoleResponse = {
  success?: boolean;
  error?: string;
};

export async function updateUserRoleAction(
  _prevState: UpdateRoleResponse | null,
  formData: FormData
): Promise<UpdateRoleResponse> {
  const currentUser = await getCurrentUser();

  // Hanya ADMIN yang boleh mengubah role
  if (!currentUser || currentUser.role !== Role.ADMIN) {
    return { error: "Akses ditolak. Hanya Admin yang dapat mengubah role pengguna." };
  }

  const targetUserId = formData.get("userId")?.toString();
  const newRole = formData.get("role")?.toString() as Role;

  if (!targetUserId || !newRole) {
    return { error: "ID pengguna dan role baru wajib diisi." };
  }

  // Validasi role
  if (!Object.values(Role).includes(newRole)) {
    return { error: "Role tidak valid." };
  }

  // Cegah admin mengubah role dirinya sendiri (self-demotion guard)
  if (targetUserId === currentUser.id) {
    return { error: "Anda tidak dapat mengubah role diri sendiri." };
  }

  try {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    console.error("Update role error:", error);
    return { error: "Gagal mengubah role pengguna." };
  }
}

export async function getUsersAction() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== Role.ADMIN) {
    return { error: "Akses ditolak." };
  }

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
