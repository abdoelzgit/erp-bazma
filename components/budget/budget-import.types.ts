// Import Anggaran dari Excel - Type Definitions

export type ImportRowStatus = 
  | "new"        // Budget belum ada di sistem
  | "update"     // Budget sudah ada, nilai berbeda
  | "unchanged"  // Budget sudah ada, nilai sama
  | "duplicate"  // Duplikat dalam file
  | "invalid"    // Data tidak valid
  | "unmapped";  // Departemen/account tidak ditemukan

export type ParsedBudgetRow = {
  rowNumber: number;           // Nomor baris di Excel (1-based)
  accountCode?: string;        // Kode akun dari file export aplikasi
  departmentCode?: string;     // Kode departemen dari file export aplikasi
  accountName: string;         // Nama anggaran/account
  departmentName: string;      // Nama departemen
  month: number;               // 1-12
  year: number;                // Tahun
  amount: number;              // Nominal budget
  raw: Record<string, string | number | null>; // Data mentah dari Excel
};

export type ImportRowError = {
  rowNumber: number;
  field: string;
  message: string;
};

export type ImportPreviewRow = ParsedBudgetRow & {
  status: ImportRowStatus;
  existingAmount?: number;     // Nilai lama jika status = "update"
  newAmount: number;           // Nilai baru dari Excel
  errors: ImportRowError[];
  mappedAccountId?: string;    // ID account yang dipetakan
  mappedDeptId?: string;       // ID departemen yang dipetakan
};

export type BudgetImportPreview = {
  fileName: string;
  sheetName: string;
  totalRows: number;
  validRows: number;
  rows: ImportPreviewRow[];
  summary: {
    new: number;
    update: number;
    unchanged: number;
    duplicate: number;
    invalid: number;
    unmapped: number;
  };
};
  
export type ImportColumnMapping = {
  accountName: string;    // Nama kolom untuk account/anggaran
  department: string;     // Nama kolom untuk departemen
  month: string;          // Nama kolom untuk bulan
  year: string;           // Nama kolom untuk tahun
  amount: string;         // Nama kolom untuk nominal
};

export type ImportOptions = {
  skipUnchanged: boolean;      // Lewati baris yang tidak berubah
  skipInvalid: boolean;        // Lewati baris invalid
  createMissingAccounts: boolean; // Buat account baru jika tidak ditemukan
};

export type BudgetImportScope =
  | { type: "annual"; year: number }
  | { type: "table"; departmentId: string; departmentName: string; departmentCode: string; month: number; year: number };
