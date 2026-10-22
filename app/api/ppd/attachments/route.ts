import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canUserCreatePpdInDepartment } from "@/lib/ppd-access";
import { getCurrentUser } from "@/lib/session";
import {
  isValidPpdAttachmentContent,
  PPD_ATTACHMENT_DIRECTORY,
  PPD_ATTACHMENT_MAX_BYTES,
  PPD_ATTACHMENT_TYPES,
  type PpdAttachmentMime,
} from "@/lib/ppd-attachments";

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk mengunggah lampiran." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Sesi pengguna tidak valid." }, { status: 401 });

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

  const draftId = formData.get("draftId");
  const file = formData.get("file");
  if (typeof draftId !== "string" || !draftId || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Pilih file dan pastikan draft masih tersedia." }, { status: 400 });
  }
  if (file.size > PPD_ATTACHMENT_MAX_BYTES) {
    return NextResponse.json({ error: "Ukuran file maksimal 10 MB." }, { status: 413 });
  }

  const draft = await prisma.pPDRequest.findFirst({
    where: { id: draftId, requestedById: user.id, status: "DRAFT" },
    select: { id: true, departmentId: true },
  });
  if (!draft || !(await canUserCreatePpdInDepartment(user.id, draft.departmentId))) {
    return NextResponse.json({ error: "Draft tidak ditemukan atau Anda tidak memiliki akses." }, { status: 404 });
  }

  if (!Object.hasOwn(PPD_ATTACHMENT_TYPES, file.type)) {
    return NextResponse.json({ error: "Format file harus berupa JPG, PNG, WebP, PDF, Word, Excel, atau PowerPoint." }, { status: 415 });
  }

  const mimeType = file.type as PpdAttachmentMime;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isValidPpdAttachmentContent(mimeType, bytes)) {
    return NextResponse.json({ error: "Isi file tidak sesuai dengan format yang dipilih." }, { status: 415 });
  }

  const extension = PPD_ATTACHMENT_TYPES[mimeType].extension;
  const fileName = `${randomUUID()}.${extension}`;
  const directory = join(PPD_ATTACHMENT_DIRECTORY, draft.id);

  try {
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, fileName), bytes, { flag: "wx" });
  } catch {
    return NextResponse.json({ error: "Lampiran gagal disimpan. Coba lagi." }, { status: 500 });
  }

  return NextResponse.json({
    url: `/api/ppd/attachments/${encodeURIComponent(draft.id)}/${fileName}`,
    name: file.name,
  });
}
