import { PPDApprovalStage, PPDStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function canReadPpdRequest(userId: string, requestId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) return false;
  const request = await prisma.pPDRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requestedById: true,
      departmentId: true,
      status: true,
      department: { select: { status: true } },
      approvalEvents: { select: { stage: true } },
    },
  });
  if (!request) return false;
  if (user.role === Role.ADMIN || request.requestedById === user.id) return true;
  if (request.department.status !== "ACTIVE") return false;
  const hasDepartmentHeadHistory = request.approvalEvents.some((event) => event.stage === PPDApprovalStage.DEPT_HEAD);
  const hasFinanceHistory = request.approvalEvents.some((event) => event.stage === PPDApprovalStage.FINANCE);
  const hasPaymentHistory = request.approvalEvents.some((event) => event.stage === PPDApprovalStage.PAYMENT);
  const hasExecutiveHistory = request.approvalEvents.some((event) => event.stage === PPDApprovalStage.EXECUTIVE);
  if (user.role === Role.DEPT_HEAD) {
    const assignment = await prisma.departmentMember.findFirst({
      where: { userId: user.id, departmentId: request.departmentId, role: "PIC", status: "ACTIVE" },
      select: { id: true },
    });
    return Boolean(assignment) && (
      hasDepartmentHeadHistory || request.status === PPDStatus.PENDING_DEPT_HEAD ||
      (request.status === PPDStatus.RETURNED_FOR_REVISION && hasFinanceHistory)
    );
  }
  if (user.role === Role.FINANCE) {
    return hasFinanceHistory || hasPaymentHistory || request.status === PPDStatus.PENDING_FINANCE ||
      request.status === PPDStatus.PENDING_FINANCE_PAYMENT ||
      (request.status === PPDStatus.RETURNED_FOR_REVISION && hasExecutiveHistory);
  }
  if (user.role === Role.EXECUTIVE) {
    return hasExecutiveHistory || request.status === PPDStatus.PENDING_EXECUTIVE;
  }
  return false;
}
