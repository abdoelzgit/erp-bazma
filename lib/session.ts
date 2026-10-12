import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "erp_session";

export interface UserSessionPayload {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

const secretKey =
  process.env.JWT_SECRET || "erp-bazma-super-secret-jwt-key-2025-secure-token";
const encodedKey = new TextEncoder().encode(secretKey);

/**
 * Buat JWT session token menggunakan jose (Edge & Node.js compatible)
 */
export async function signSessionToken(
  payload: UserSessionPayload,
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodedKey);
}

/**
 * Verifikasi JWT session token (kompatibel dengan Next.js Edge Middleware)
 */
export async function verifySessionToken(
  token: string
): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });

    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string | undefined,
      role: (payload.role as string) || "USER",
    };
  } catch {
    return null;
  }
}

/**
 * Set HTTP-Only Cookie untuk sesi login
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  });
}

/**
 * Hapus Cookie sesi saat logout
 */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Ambil data user yang sedang login dari cookie sesi di Server Components / Server Actions
 */
export async function getCurrentUser(): Promise<UserSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
