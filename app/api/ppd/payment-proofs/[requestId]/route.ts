import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { NextResponse } from "next/server";
import { PPDStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PPD_ATTACHMENT_DIRECTORY, PPD_ATTACHMENT_TYPES } from "@/lib/ppd-attachments";

const mimeByExtension = Object.fromEntries(
  Object.entries(PPD_ATTACHMENT_TYPES).map(([mimeType, config]) => [`.${config.extension}`, mimeType]),
) as Record<string, string>;

export async function GET(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = await getCurrentUser();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true } });
  if (!actor) return new NextResponse("Unauthorized", { status: 401 });
  const { requestId } = await params;
  const payment = await prisma.pPDPaymentProof.findUnique({
    where: { requestId },
    include: { request: { select: { id: true, requestedById: true, departmentId: true, status: true } } },
  });
  if (!payment || payment.request.status !== PPDStatus.PAID) return new NextResponse("Not found", { status: 404 });

  let allowed = actor.role === Role.ADMIN || actor.role === Role.FINANCE || payment.request.requestedById === actor.id;
  if (!allowed && actor.role === Role.DEPT_HEAD) {
    const assignment = await prisma.departmentMember.findFirst({
      where: { userId: actor.id, departmentId: payment.request.departmentId, role: "PIC", status: "ACTIVE" },
      select: { id: true },
    });
    allowed = Boolean(assignment);
  }
  if (!allowed && actor.role === Role.EXECUTIVE) {
    const approval = await prisma.pPDApprovalEvent.findFirst({
      where: { requestId, stage: "EXECUTIVE", action: "APPROVED" },
      select: { id: true },
    });
    allowed = Boolean(approval);
  }
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  const fileName = basename(payment.storagePath);
  if (payment.storagePath !== `${requestId}/payment/${fileName}`) return new NextResponse("Not found", { status: 404 });
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.test(fileName)) return new NextResponse("Not found", { status: 404 });
  const extension = `.${fileName.split(".").pop()?.toLowerCase()}`;
  const expectedMime = mimeByExtension[extension];
  if (!expectedMime || expectedMime !== payment.mimeType) return new NextResponse("Not found", { status: 404 });
  try {
    const bytes = await readFile(join(PPD_ATTACHMENT_DIRECTORY, payment.storagePath));
    return new Response(bytes, {
      headers: {
        "Content-Type": payment.mimeType,
        "Content-Disposition": `attachment; filename="payment-proof${extension}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
