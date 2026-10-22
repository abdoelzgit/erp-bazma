import Link from "next/link";
import {
  ArrowUpRightIcon,
  CoinsIcon,
  FileTextIcon,
  RowsIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { getCurrentUser } from "@/lib/session";
import { isRouteAllowed } from "@/lib/route-permissions";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const metadata = {
  title: "Beranda",
};

const modules = [
  {
    title: "Permohonan dana",
    description: "Buat dan tinjau permohonan pencairan dana.",
    href: "/dashboard/ppd",
    icon: FileTextIcon,
  },
  {
    title: "Departemen",
    description: "Kelola data dan anggota departemen.",
    href: "/dashboard/department",
    icon: RowsIcon,
  },
  {
    title: "Anggaran",
    description: "Kelola alokasi anggaran per departemen.",
    href: "/dashboard/budget",
    icon: CoinsIcon,
  },
  {
    title: "Pengguna",
    description: "Kelola akun dan peran pengguna.",
    href: "/dashboard/users",
    icon: UsersIcon,
  },
];

export default async function Page() {
  const session = await getCurrentUser();
  const allowedModules = modules.filter((module) =>
    isRouteAllowed(module.href, session?.role),
  );

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-3">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Beranda</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Modul kerja</h1>
          <p className="text-sm text-muted-foreground">
            Pilih modul untuk melanjutkan pekerjaan Anda.
          </p>
        </div>

        {allowedModules.length > 0 ? (
          <nav
            aria-label="Modul kerja"
            className="max-w-3xl overflow-hidden rounded-lg border bg-card"
          >
            <ul className="divide-y divide-border">
              {allowedModules.map(({ title, description, href, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex min-h-20 items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {title}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {description}
                      </span>
                    </span>
                    <ArrowUpRightIcon
                      className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <p className="max-w-3xl rounded-lg border bg-muted/20 p-5 text-sm text-muted-foreground">
            Belum ada modul yang dapat diakses oleh akun ini.
          </p>
        )}
      </main>
    </>
  );
}
