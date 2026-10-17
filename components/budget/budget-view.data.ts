import type { Department, Account, BudgetEntry, DrafLogItem } from "./budget-view.types";

export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const YEARS = [2025, 2026, 2027];

export const DEPARTMENTS: Department[] = [
  { id: "d-1", name: "Pemasaran", code: "DPT-MKT" },
  { id: "d-2", name: "Operasional", code: "DPT-OPS" },
  { id: "d-3", name: "Teknologi", code: "DPT-IT" },
  { id: "d-4", name: "Keuangan", code: "DPT-FIN" },
];

export const ACCOUNTS: Account[] = [
  { id: "a-1", deptId: "d-3", code: "JP-IT-01", name: "Bandwidth Internet & Server Hosting" },
  { id: "a-2", deptId: "d-3", code: "JP-IT-02", name: "Pemeliharaan Komputer Lab" },
  { id: "a-3", deptId: "d-3", code: "JP-IT-03", name: "Kabel Jaringan & Sparepart" },
  // Operasional (dari Excel import)
  { id: "a-4", deptId: "d-2", code: "JP-OPS-01", name: "Internet" },
  { id: "a-5", deptId: "d-2", code: "JP-OPS-02", name: "Servis Mobil" },
  { id: "a-6", deptId: "d-2", code: "JP-OPS-03", name: "Servis Motor (2motor)" },
  { id: "a-7", deptId: "d-2", code: "JP-OPS-04", name: "Jasa Konsultan" },
  { id: "a-8", deptId: "d-2", code: "JP-OPS-05", name: "Konsumsi Tamu" },
  { id: "a-9", deptId: "d-2", code: "JP-OPS-06", name: "Pengadaan Materai" },
  { id: "a-10", deptId: "d-2", code: "JP-OPS-07", name: "Sumbangan Suka & Dukacita Tendik" },
  { id: "a-11", deptId: "d-2", code: "JP-OPS-08", name: "Pembuatan Cinderamata Sekolah untuk Tamu" },
  { id: "a-12", deptId: "d-2", code: "JP-OPS-09", name: "Estimasi Gaji Tendik tahun 2026" },
  { id: "a-13", deptId: "d-2", code: "JP-OPS-10", name: "BPJS TK" },
  { id: "a-14", deptId: "d-2", code: "JP-OPS-11", name: "Wisma Guru SMK TI Bazma" },
  { id: "a-15", deptId: "d-2", code: "JP-OPS-12", name: "Makan Siang Guru" },
  { id: "a-16", deptId: "d-2", code: "JP-OPS-13", name: "Konsumsi Guru Mukim" },
  { id: "a-17", deptId: "d-2", code: "JP-OPS-14", name: "Seragam Tendik" },
  { id: "a-18", deptId: "d-2", code: "JP-OPS-15", name: "ATK, Cetak, dan Penggandaan" },
  { id: "a-19", deptId: "d-2", code: "JP-OPS-16", name: "Penambahan Printer Sekolah" },
  { id: "a-20", deptId: "d-2", code: "JP-OPS-17", name: "Transportasi Rapat Kerja Kunjungan Dinas" },
  { id: "a-21", deptId: "d-2", code: "JP-OPS-18", name: "BBM, Parkir, Etoll (kendaraan Operasional)" },
  { id: "a-22", deptId: "d-2", code: "JP-OPS-19", name: "Iuran Keanggotaan MKKS" },
  { id: "a-23", deptId: "d-2", code: "JP-OPS-20", name: "Seragam siswa baru TA 2026/2027" },
  { id: "a-24", deptId: "d-2", code: "JP-OPS-21", name: "Bantuan untuk Guru" },
  { id: "a-25", deptId: "d-2", code: "JP-OPS-22", name: "Raker SMK TI Bazma" },
  { id: "a-26", deptId: "d-2", code: "JP-OPS-23", name: "BPJS Kesehatan (new)" },
  { id: "a-27", deptId: "d-2", code: "JP-OPS-24", name: "Zoom meeting (1 akun) (new)" },
  // Pemasaran
  { id: "a-28", deptId: "d-1", code: "JP-MKT-01", name: "Iklan Digital & Media Sosial" },
  { id: "a-29", deptId: "d-1", code: "JP-MKT-02", name: "Cetak Brosur & Banner PPDB" },
  // Keuangan
  { id: "a-30", deptId: "d-4", code: "JP-FIN-01", name: "Jasa Konsultasi Audit & Pajak" },
];

const key = (accountId: string, year: number, month: number) =>
  `${accountId}|${year}|${month}`;

export const INITIAL_BUDGETS: Record<string, BudgetEntry> = {
  [key("a-1", 2026, 10)]: { amount: 12_000_000, realized: 4_500_000 },
  [key("a-2", 2026, 10)]: { amount: 10_000_000, realized: 3_000_000 },
  [key("a-3", 2026, 10)]: { amount: 8_000_000, realized: 2_000_000 },
  [key("a-4", 2026, 10)]: { amount: 18_000_000, realized: 7_500_000 },
  [key("a-5", 2026, 10)]: { amount: 8_000_000, realized: 2_500_000 },
  [key("a-7", 2026, 10)]: { amount: 10_000_000, realized: 4_200_000 },
  [key("a-9", 2026, 10)]: { amount: 7_000_000, realized: 2_000_000 },
  // Bulan lalu
  [key("a-1", 2026, 9)]: { amount: 12_000_000, realized: 11_000_000 },
  [key("a-6", 2026, 9)]: { amount: 10_000_000, realized: 2_000_000 },
  [key("a-8", 2026, 9)]: { amount: 10_000_000, realized: 3_000_000 },
};

export const DRAF_LOGS: DrafLogItem[] = [
  { id: "l-1", accountId: "a-3", year: 2026, month: 10, createdAt: "12 Okt 2026 10.05", description: "Dana ditahan: Pembelian kabel Cat6 dan RJ45", ppdNo: "PPD/2026/10/0002", amount: 1_500_000 },
  { id: "l-2", accountId: "a-2", year: 2026, month: 10, createdAt: "10 Okt 2026 08.45", description: "Dana ditahan: Servis PC lab", ppdNo: "PPD/2026/10/0003", amount: 1_000_000 },
  { id: "l-3", accountId: "a-2", year: 2026, month: 10, createdAt: "11 Okt 2026 16.20", description: "Dilepas: pengajuan ditolak", ppdNo: "PPD/2026/10/0003", amount: -1_000_000 },
  { id: "l-4", accountId: "a-7", year: 2026, month: 10, createdAt: "13 Okt 2026 09.30", description: "Dana ditahan: Iklan Instagram November", ppdNo: "PPD/2026/10/0004", amount: 2_500_000 },
];

export const budgetKey = key;
