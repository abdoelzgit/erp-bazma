"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword } from "@/lib/password";
import {
  setSessionCookie,
  deleteSessionCookie,
  signSessionToken,
} from "@/lib/session";

export type AuthActionResponse = {
  success?: boolean;
  error?: string;
};

function getSafeRedirectTarget(value: FormDataEntryValue | null): string {
  const target = value?.toString() ?? "";
  if (!target.startsWith("/dashboard") || target.startsWith("//") || target.includes("\\")) {
    return "/dashboard";
  }
  return target;
}

/**
 * Server Action untuk Login Pengguna
 */
export async function loginAction(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const redirectTarget = getSafeRedirectTarget(formData.get("callbackUrl"));

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  try {
    // 1. Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: "Email atau password salah." };
    }

    // 2. Verifikasi password dengan bcryptjs
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return { error: "Email atau password salah." };
    }

    // 3. Buat JWT Token dan simpan di HttpOnly Cookie
    const token = await signSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await setSessionCookie(token);
  } catch (error) {
    console.error("Login error:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memproses login.",
    };
  }

  // Redirect ke dashboard setelah login sukses
  redirect(redirectTarget);
}

/**
 * Server Action untuk Registrasi / Buat Akun Baru
 */
export async function registerAction(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  if (password.length < 6) {
    return { error: "Password minimal 6 karakter." };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "Email sudah terdaftar." };
    }

    // Hash password menggunakan bcryptjs
    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
      },
    });

    // Otomatis login setelah registrasi
    const token = await signSessionToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    });

    await setSessionCookie(token);
  } catch (error) {
    console.error("Registration error:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Gagal membuat akun.",
    };
  }

  redirect("/dashboard");
}

/**
 * Server Action untuk Logout Pengguna
 */
export async function logoutAction() {
  await deleteSessionCookie();
  redirect("/login");
}
