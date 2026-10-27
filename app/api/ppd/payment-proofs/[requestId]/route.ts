import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canReadPpdRequest } from "@/lib/ppd-read-access";
import { getCurrentUser } from "@/lib/session";
import { PPD_ATTACHMENT_DIRECTORY, PPD_ATTACHMENT_TYPES } from "@/lib/ppd-attachments";

const mimeByExtension = Object.fromEntries(
  Object.entries(PPD_ATTACHMENT_TYPES).map(([mimeType, config]) => [`.${config.extension}`, mimeType]),
) as Record<string, string>;

export async function GET(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = await getCurrentUser();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true } });
  if (!actor) return new NextResponse("Unauthorized", { status: 401 });
  const { requestId } = await params;
  const allowed = await canReadPpdRequest(actor.id, requestId);
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  const settlementProofId = new URL(request.url).searchParams.get("settlementProofId");
  const payment = settlementProofId
    ? await prisma.pPDSettlementProof.findFirst({ where: { id: settlementProofId, requestId }, include: { request: { select: { id: true, status: true } } } })
    : await prisma.pPDPaymentProof.findUnique({ where: { requestId }, include: { request: { select: { id: true, status: true } } } });
  if (!payment) return new NextResponse("Not found", { status: 404 });

  const fileName = basename(payment.storagePath);
  const expectedPath = "type" in payment
    ? `${requestId}/settlement/${payment.type === "TOP_UP" ? "top_up" : "refund"}/${fileName}`
    : `${requestId}/payment/${fileName}`;
  if (payment.storagePath !== expectedPath) return new NextResponse("Not found", { status: 404 });
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
