import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canReadPpdRequest } from "@/lib/ppd-read-access";
import { getCurrentUser } from "@/lib/session";
import { PPD_ATTACHMENT_DIRECTORY, PPD_ATTACHMENT_TYPES } from "@/lib/ppd-attachments";

const mimeByExtension = Object.fromEntries(
  Object.entries(PPD_ATTACHMENT_TYPES).map(([mimeType, config]) => [`.${config.extension}`, mimeType]),
) as Record<string, string>;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ draftId: string; fileName: string }> },
) {
  const session = await getCurrentUser();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true } });
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { draftId, fileName } = await params;
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.test(fileName)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const draft = await prisma.pPDRequest.findUnique({ where: { id: draftId }, select: { id: true } });
  if (!draft || !(await canReadPpdRequest(user.id, draft.id))) return new NextResponse("Not found", { status: 404 });

  const extension = extname(fileName).toLowerCase();
  const contentType = mimeByExtension[extension];
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  try {
    const bytes = await readFile(join(PPD_ATTACHMENT_DIRECTORY, draft.id, fileName));
    const inline = PPD_ATTACHMENT_TYPES[contentType as keyof typeof PPD_ATTACHMENT_TYPES].inline;
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="attachment${extension}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
