import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@/lib/roles";

export async function canManageBudget() {
  const session = await getCurrentUser();
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true },
  });
  return Boolean(user && [Role.ADMIN, Role.FINANCE].includes(user.role as Role));
}
