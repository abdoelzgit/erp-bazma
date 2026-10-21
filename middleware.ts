import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

import { isRouteAllowed, getDefaultAllowedRoute } from "@/lib/route-permissions";

// Rute yang membutuhkan autentikasi
const protectedRoutes = ["/dashboard"];

// Rute khusus pengunjung belum login (guest only)
const authRoutes = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Verifikasi token sesi
  const session = token ? await verifySessionToken(token) : null;
  const isAuthenticated = Boolean(session);

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // 1. Jika mengakses rute terproteksi tanpa login, arahkan ke /login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Jika sudah login dan mencoba membuka halaman login, arahkan ke rute fallback yang diizinkan
  if (isAuthRoute && isAuthenticated && session) {
    const fallbackRoute = getDefaultAllowedRoute(session.role);
    return NextResponse.redirect(new URL(fallbackRoute, request.url));
  }

  // 3. Jika mengakses rute terproteksi tetapi role tidak memiliki akses, arahkan ke rute fallback yang diizinkan
  if (isProtectedRoute && isAuthenticated && session) {
    if (!isRouteAllowed(pathname, session.role)) {
      const fallbackRoute = getDefaultAllowedRoute(session.role);
      if (fallbackRoute !== pathname) {
        return NextResponse.redirect(new URL(fallbackRoute, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes, sesuaikan jika ada rute api publik)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
