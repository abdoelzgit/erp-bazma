import { join } from "node:path";

export const PPD_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const PPD_ATTACHMENT_TYPES = {
  "image/jpeg": { extension: "jpg", inline: true },
  "image/png": { extension: "png", inline: true },
  "image/webp": { extension: "webp", inline: true },
  "application/pdf": { extension: "pdf", inline: false },
  "application/msword": { extension: "doc", inline: false },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extension: "docx",
    inline: false,
  },
  "application/vnd.ms-excel": { extension: "xls", inline: false },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    extension: "xlsx",
    inline: false,
  },
  "application/vnd.ms-powerpoint": { extension: "ppt", inline: false },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    extension: "pptx",
    inline: false,
  },
} as const;

export type PpdAttachmentMime = keyof typeof PPD_ATTACHMENT_TYPES;

export const PPD_ATTACHMENT_DIRECTORY =
  process.env.PPD_UPLOAD_DIR || join(process.cwd(), ".data", "ppd-attachments");

export function isValidPpdAttachmentContent(mimeType: PpdAttachmentMime, bytes: Buffer) {
  switch (mimeType) {
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case "image/webp":
      return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    case "application/pdf":
      return bytes.toString("ascii", 0, 5) === "%PDF-";
    case "application/msword":
    case "application/vnd.ms-excel":
      return bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    default:
      // DOCX, XLSX, PPTX are ZIP containers.
      return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  }
}
