import type { PpdStatus } from "@/components/ppd/ppd.types";

const statusLabels: Record<PpdStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Dept Head",
  APPROVED_DEPT: "Finance",
  APPROVED_FINANCE: "Pimpinan",
  PENDING_DEPT_HEAD: "Dept Head",
  PENDING_FINANCE: "Finance",
  PENDING_EXECUTIVE: "Pimpinan",
  RETURNED_FOR_REVISION: "Perlu revisi",
  PENDING_FINANCE_PAYMENT: "Proses Pembayaran",
  PENDING_ACCOUNTABILITY: "Menunggu Laporan Realisasi",
  PENDING_FINANCE_SETTLEMENT: "Penyelesaian Finance",
  PENDING_APPLICANT_REFUND: "Menunggu Finance Mengembalikan Dana",
  PENDING_FINANCE_REFUND_VERIFICATION: "Verifikasi Pengembalian",
  PAID: "Selesai",
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
  if (stage === "PAYMENT") return "Pembayaran Finance";
  return "Laporan Pertanggungjawaban";
}

export function ppdActionLabel(action: string) {
  if (action === "SUBMITTED") return "Mengirim permohonan";
  if (action === "APPROVED") return "Menyetujui permohonan";
  if (action === "REVISION_REQUESTED") return "Meminta revisi";
  if (action === "CANCELLED") return "Membatalkan permohonan";
  if (action === "ACCOUNTABILITY_SUBMITTED") return "Mengirim laporan realisasi";
  if (action === "REFUND_SUBMITTED") return "Mengirim bukti pengembalian dana";
  if (action === "REFUND_VERIFIED") return "Memverifikasi pengembalian dana";
  return "Memverifikasi pembayaran";
}
