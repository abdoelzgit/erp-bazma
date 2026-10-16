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
  { id: "a-4", deptId: "d-2", code: "JP-OPS-01", name: "Listrik, Air & Utilitas Kampus" },
  { id: "a-5", deptId: "d-2", code: "JP-OPS-02", name: "ATK & Perlengkapan Kantor" },
  { id: "a-6", deptId: "d-2", code: "JP-OPS-03", name: "Perawatan Gedung & Fasilitas" },
  { id: "a-7", deptId: "d-1", code: "JP-MKT-01", name: "Iklan Digital & Media Sosial" },
  { id: "a-8", deptId: "d-1", code: "JP-MKT-02", name: "Cetak Brosur & Banner PPDB" },
  { id: "a-9", deptId: "d-4", code: "JP-FIN-01", name: "Jasa Konsultasi Audit & Pajak" },
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
