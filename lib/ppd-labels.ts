import type { PpdStatus } from "@/components/ppd/ppd.types";

const statusLabels: Record<PpdStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Diajukan",
  APPROVED_DEPT: "Disetujui Dept Head",
  APPROVED_FINANCE: "Disetujui Finance",
  PENDING_DEPT_HEAD: "Menunggu Dept Head",
  PENDING_FINANCE: "Menunggu Finance",
  PENDING_EXECUTIVE: "Menunggu Pimpinan",
  RETURNED_FOR_REVISION: "Perlu revisi",
  PENDING_FINANCE_PAYMENT: "Menunggu pembayaran Finance",
  PAID: "Lunas",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
};

export function ppdStatusLabel(status: PpdStatus) {
  return statusLabels[status];
}

export function ppdStageLabel(stage: string) {
  if (stage === "DEPT_HEAD") return "Dept Head";
  if (stage === "FINANCE") return "Finance";
  if (stage === "EXECUTIVE") return "Pimpinan";
  return "Pembayaran Finance";
}

export function ppdActionLabel(action: string) {
  if (action === "SUBMITTED") return "Mengirim permohonan";
  if (action === "APPROVED") return "Menyetujui permohonan";
  if (action === "REVISION_REQUESTED") return "Meminta revisi";
  if (action === "CANCELLED") return "Membatalkan permohonan";
  return "Memverifikasi pembayaran";
}
