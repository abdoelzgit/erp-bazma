import { Role } from "@/lib/roles";

export interface RoutePermission {
  path: string;
  roles?: Role[]; // undefined atau array kosong berarti diizinkan untuk semua pengguna terautentikasi
}

/**
 * Konfigurasi hak akses per halaman / rute dashboard.
 * Urutan rute spesifik diletakkan di atas rute umum (/dashboard).
 */
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  { path: "/dashboard/users", roles: [Role.ADMIN] },
  { path: "/dashboard/ppd/approval", roles: [Role.ADMIN, Role.DEPT_HEAD, Role.FINANCE, Role.EXECUTIVE] },
  { path: "/dashboard/department", roles: [Role.ADMIN, Role.DEPT_HEAD, Role.STAFF] },
  { path: "/dashboard/budget" }, // Semua role
  { path: "/dashboard/ppd" },    // Semua role
  { path: "/dashboard" },        // Semua role
];

/**
 * Cek apakah suatu rute diizinkan untuk role pengguna tertentu.
 */
export function isRouteAllowed(pathname: string, userRole?: string | null): boolean {
  if (!userRole) return false;

  // Cari aturan rute yang paling spesifik
  const matchedRule = ROUTE_PERMISSIONS.find(
    (rule) => pathname === rule.path || pathname.startsWith(`${rule.path}/`)
  );

  // Jika tidak terdaftar atau tidak memiliki batasan roles, izinkan
  if (!matchedRule || !matchedRule.roles || matchedRule.roles.length === 0) {
    return true;
  }

  return matchedRule.roles.includes(userRole as Role);
}

/**
 * Mengambil rute fallback pertama yang diizinkan untuk role pengguna.
 */
export function getDefaultAllowedRoute(userRole?: string | null): string {
  if (!userRole) return "/login";

  // Urutan prioritas pengecekan rute fallback
  const prioritizedRoutes = [
    "/dashboard",
    "/dashboard/ppd",
    "/dashboard/budget",
    "/dashboard/department",
    "/dashboard/users",
  ];

  for (const route of prioritizedRoutes) {
    if (isRouteAllowed(route, userRole)) {
      return route;
    }
  }

  return "/dashboard";
}
