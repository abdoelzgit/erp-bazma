import { PPDApprovalStage, PPDStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function canEditPpdRevision(userId: string, requestId: string) {
  const [actor, request] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } }),
    prisma.pPDRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        requestedById: true,
        departmentId: true,
        department: { select: { status: true } },
        approvalEvents: {
          where: { action: "REVISION_REQUESTED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { stage: true },
        },
      },
    }),
  ]);
  if (!actor || !request || request.status !== PPDStatus.RETURNED_FOR_REVISION || request.department.status !== "ACTIVE") return false;

  const requestedByStage = request.approvalEvents[0]?.stage;
  if (requestedByStage === PPDApprovalStage.DEPT_HEAD) {
    return actor.role === Role.STAFF && actor.id === request.requestedById;
  }
  if (actor.id === request.requestedById) return false;
  if (requestedByStage === PPDApprovalStage.FINANCE && actor.role === Role.DEPT_HEAD) {
    const assignment = await prisma.departmentMember.findFirst({
      where: { userId: actor.id, departmentId: request.departmentId, role: "PIC", status: "ACTIVE" },
      select: { id: true },
    });
    return Boolean(assignment);
  }
  return requestedByStage === PPDApprovalStage.EXECUTIVE && actor.role === Role.FINANCE;
}
