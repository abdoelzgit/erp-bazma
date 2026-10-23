import { PPDStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function canReadPpdRequest(userId: string, requestId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) return false;
  const request = await prisma.pPDRequest.findUnique({
    where: { id: requestId },
    select: { id: true, requestedById: true, departmentId: true, status: true, department: { select: { status: true } } },
  });
  if (!request) return false;
  if (user.role === Role.ADMIN || user.role === Role.FINANCE || request.requestedById === user.id) return true;
  if (request.department.status !== "ACTIVE") return false;
  if (user.role === Role.DEPT_HEAD) {
    const assignment = await prisma.departmentMember.findFirst({
      where: { userId: user.id, departmentId: request.departmentId, role: "PIC", status: "ACTIVE" },
      select: { id: true },
    });
    return Boolean(assignment);
  }
  if (user.role === Role.EXECUTIVE) {
    const executiveVisibleStatuses: PPDStatus[] = [PPDStatus.PENDING_EXECUTIVE, PPDStatus.PENDING_FINANCE_PAYMENT, PPDStatus.PAID];
    return executiveVisibleStatuses.includes(request.status);
  }
  return false;
}
