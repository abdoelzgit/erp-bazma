import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { PPDStatus, Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  isValidPpdAttachmentContent,
  PPD_ATTACHMENT_DIRECTORY,
  PPD_ATTACHMENT_MAX_BYTES,
  PPD_ATTACHMENT_TYPES,
  type PpdAttachmentMime,
} from "@/lib/ppd-attachments";

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Silakan masuk kembali." }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true } });
  if (!actor || actor.role !== Role.FINANCE) return NextResponse.json({ error: "Hanya Finance yang dapat mengunggah bukti." }, { status: 403 });

  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > PPD_ATTACHMENT_MAX_BYTES + 256 * 1024) {
    return NextResponse.json({ error: "Ukuran file maksimal 10 MB." }, { status: 413 });
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Data upload tidak valid." }, { status: 400 });
  }
  const requestId = formData.get("requestId");
  const file = formData.get("file");
  if (typeof requestId !== "string" || !requestId || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Pilih PPD dan file bukti pembayaran." }, { status: 400 });
  }
  if (file.size > PPD_ATTACHMENT_MAX_BYTES) return NextResponse.json({ error: "Ukuran file maksimal 10 MB." }, { status: 413 });
  const paymentRequest = await prisma.pPDRequest.findFirst({
    where: { id: requestId, status: PPDStatus.PENDING_FINANCE_PAYMENT, department: { status: "ACTIVE" } },
    select: { id: true },
  });
  if (!paymentRequest) return NextResponse.json({ error: "PPD tidak berada pada antrean pembayaran Finance." }, { status: 404 });
  if (!Object.hasOwn(PPD_ATTACHMENT_TYPES, file.type)) {
    return NextResponse.json({ error: "Format file tidak didukung." }, { status: 415 });
  }
  const mimeType = file.type as PpdAttachmentMime;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isValidPpdAttachmentContent(mimeType, bytes)) {
    return NextResponse.json({ error: "Isi file tidak sesuai dengan format yang dipilih." }, { status: 415 });
  }
  const extension = PPD_ATTACHMENT_TYPES[mimeType].extension;
  const fileName = `${randomUUID()}.${extension}`;
  try {
    const directory = join(PPD_ATTACHMENT_DIRECTORY, paymentRequest.id, "payment");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, fileName), bytes, { flag: "wx" });
  } catch {
    return NextResponse.json({ error: "Bukti pembayaran gagal disimpan." }, { status: 500 });
  }
  return NextResponse.json({ fileName, originalFileName: file.name, mimeType, fileSize: bytes.length });
}
