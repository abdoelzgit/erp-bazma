import { Suspense } from "react";
import { getCurrentUser } from "@/lib/session";
import { AppSidebar } from "@/components/app-sidebar";
import { prisma } from "@/lib/prisma";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

async function DashboardContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } })
    : null;

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

function DashboardSkeleton() {
  return (
    <SidebarProvider>
      <div className="w-64 border-r bg-muted/20" />
      <SidebarInset>
        <div className="p-6">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent>{children}</DashboardContent>
    </Suspense>
  );
}
