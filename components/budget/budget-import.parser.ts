// Import Anggaran dari Excel - Parser & Validator

import * as XLSX from "xlsx";
import type { ParsedBudgetRow, ImportRowError, ImportPreviewRow, ImportRowStatus, BudgetImportPreview } from "./budget-import.types";

type RawCell = string | number | null;

const toRawCell = (value: unknown): RawCell => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

// Normalisasi nama kolom ke bentuk standar
const normalizeHeader = (str: string): string => {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, " ")
    .replace(/\s+/g, " ");
};

// Cek apakah string adalah nama bulan valid
const parseMonth = (value: RawCell): number | null => {
  const months = [
    "januari", "februari", "maret", "april", "mei", "juni",
    "juli", "agustus", "september", "oktober", "november", "desember"
  ];
  
  if (typeof value === "number") {
    if (value >= 1 && value <= 12) return Math.floor(value);
    return null;
  }
  
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase().trim();
  const idx = months.indexOf(lower);
  if (idx !== -1) return idx + 1;
  
  // Coba angka 1-12
  const num = parseInt(lower, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  
  return null;
};

// Cek apakah string adalah tahun valid
const parseYear = (value: RawCell): number | null => {
  if (typeof value === "number") {
    const y = Math.floor(value);
    if (y >= 1900 && y <= 2100) return y;
    return null;
  }
  
  if (typeof value !== "string") return null;
  const num = parseInt(value.trim(), 10);
  if (!isNaN(num) && num >= 1900 && num <= 2100) return num;
  
  return null;
};

// Cek apakah string adalah angka valid
const parseAmount = (value: RawCell): number | null => {
  if (typeof value === "number") {
    if (isFinite(value) && value >= 0) return Math.floor(value);
    return null;
  }
  
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[^\d.]/g, "");
  const num = parseFloat(cleaned);
  if (!isNaN(num) && num >= 0) return Math.floor(num);
  
  return null;
};

// Deteksi kolom berdasarkan header
const detectColumns = (headers: string[]): Record<string, string> => {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => ({ original: h, normalized: normalizeHeader(h) }));

  const accountCodeKeywords = ["account code", "kode account", "kode akun"];
  const deptCodeKeywords = ["department code", "kode department", "kode departemen", "kode dept"];
  const accountKeywords = ["account", "anggaran", "budget", "name", "nama"];
  const deptKeywords = ["dept", "department", "departemen"];
  const monthKeywords = ["month", "bulan", "bln"];
  const yearKeywords = ["year", "tahun", "thn"];
  const amountKeywords = ["amount", "nominal", "jumlah", "nilai", "total"];
  
  normalizedHeaders.forEach(({ normalized, original }) => {
    if (accountCodeKeywords.some(k => normalized === k)) mapping.accountCode = original;
    else if (deptCodeKeywords.some(k => normalized === k)) mapping.departmentCode = original;
    else if (deptKeywords.some(k => normalized.includes(k))) mapping.department = original;
    else if (accountKeywords.some(k => normalized.includes(k))) mapping.accountName = original;
    else if (monthKeywords.some(k => normalized.includes(k))) mapping.month = original;
    else if (yearKeywords.some(k => normalized.includes(k))) mapping.year = original;
    else if (amountKeywords.some(k => normalized.includes(k))) mapping.amount = original;
  });
  
  return mapping;
};

// Validasi baris
const validateRow = (row: Record<string, RawCell> & { __rowNum__: number }, mapping: Record<string, string>): ImportRowError[] => {
  const errors: ImportRowError[] = [];
  
  if ((!mapping.accountName || !row[mapping.accountName]) && (!mapping.accountCode || !row[mapping.accountCode])) {
    errors.push({ rowNumber: row.__rowNum__, field: mapping.accountName || "account", message: "Nama anggaran kosong" });
  }
  
  if ((!mapping.department || !row[mapping.department]) && (!mapping.departmentCode || !row[mapping.departmentCode])) {
    errors.push({ rowNumber: row.__rowNum__, field: mapping.department || "department", message: "Nama departemen kosong" });
  }
  
  if (!mapping.month || row[mapping.month] === undefined) {
    errors.push({ rowNumber: row.__rowNum__, field: mapping.month || "month", message: "Bulan tidak ditemukan" });
  } else if (parseMonth(row[mapping.month]) === null) {
    errors.push({ rowNumber: row.__rowNum__, field: mapping.month || "month", message: "Bulan tidak valid (harus 1-12 atau nama bulan)" });
  }
  
  if (!mapping.year || row[mapping.year] === undefined) {
    errors.push({ rowNumber: row.__rowNum__, field: mapping.year || "year", message: "Tahun tidak ditemukan" });
  } else if (parseYear(row[mapping.year]) === null) {
    errors.push({ rowNumber: row.__rowNum__, field: mapping.year || "year", message: "Tahun tidak valid (harus 1900-2100)" });
  }
  
  if (!mapping.amount || row[mapping.amount] === undefined) {
    errors.push({ rowNumber: row.__rowNum__, field: mapping.amount || "amount", message: "Nominal tidak ditemukan" });
  } else if (parseAmount(row[mapping.amount]) === null) {
    errors.push({ rowNumber: row.__rowNum__, field: mapping.amount || "amount", message: "Nominal tidak valid (harus angka positif)" });
  }
  
  return errors;
};

// Parse workbook
export function parseBudgetExcel(file: File): Promise<BudgetImportPreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        // Ambil sheet pertama
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Parse ke JSON
        const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: null,
          raw: true,
        });
        
        if (json.length < 2) {
          reject(new Error("Sheet kosong atau tidak ada header"));
          return;
        }
        
        const headers = (json[0] ?? []).map((header) => String(header ?? ""));
        const rows = json.slice(1);
        
        // Deteksi mapping kolom
        const mapping = detectColumns(headers);
        
        // Cek apakah semua kolom penting terdeteksi
        const missingCols = [
          ...(!mapping.accountName && !mapping.accountCode ? ["Nama Anggaran atau Kode Akun"] : []),
          ...(!mapping.department && !mapping.departmentCode ? ["Departemen atau Kode Departemen"] : []),
          ...(["month", "year", "amount"].filter(col => !mapping[col])),
        ];
        
        if (missingCols.length > 0) {
          reject(new Error(`Kolom tidak terdeteksi: ${missingCols.join(", ")}. Harus ada identitas anggaran, departemen, bulan, tahun, dan nominal.`));
          return;
        }
        
        // Parse dan validasi setiap baris
        const parsedRows: ImportPreviewRow[] = [];
        const seenKeys = new Map<string, number>(); // Untuk deteksi duplikat
        
        rows.forEach((rowArr, idx) => {
          const rowObj: Record<string, RawCell> & { __rowNum__: number } = { __rowNum__: idx + 2 }; // 1-based, baris ke-2 adalah data pertama
          headers.forEach((header, hIdx) => {
            rowObj[header] = toRawCell(rowArr[hIdx]);
          });
          
          // Validasi
          const errors = validateRow(rowObj, mapping);
          const status: ImportRowStatus = errors.length > 0 ? "invalid" : "unmapped";
          
          // Parse nilai
          const accountName = String(rowObj[mapping.accountName] ?? "").trim();
          const departmentName = String(rowObj[mapping.department] ?? "").trim();
          const accountCode = mapping.accountCode ? String(rowObj[mapping.accountCode] ?? "").trim() : undefined;
          const departmentCode = mapping.departmentCode ? String(rowObj[mapping.departmentCode] ?? "").trim() : undefined;
          const month = parseMonth(rowObj[mapping.month]);
          const year = parseYear(rowObj[mapping.year]);
          const amount = parseAmount(rowObj[mapping.amount]);
          
          // Key untuk deteksi duplikat
          const rowKey = `${accountCode || accountName}|${departmentCode || departmentName}|${year}|${month}`;
          
          // Cek duplikat
          let rowStatus: ImportRowStatus = status;
          if (rowStatus !== "invalid" && seenKeys.has(rowKey)) {
            rowStatus = "duplicate";
          } else if (rowStatus !== "invalid") {
            seenKeys.set(rowKey, idx + 2);
          }
          
          parsedRows.push({
            rowNumber: idx + 2,
            accountCode,
            departmentCode,
            accountName,
            departmentName,
            month: month ?? 0,
            year: year ?? 0,
            amount: amount ?? 0,
            status: rowStatus,
            errors: errors,
            mappedAccountId: undefined,
            mappedDeptId: undefined,
            raw: rowObj,
            newAmount: amount ?? 0,
          });
        });
        
        // Summary
        const summary = {
          new: parsedRows.filter(r => r.status === "unmapped").length,
          update: 0, // Belum ada data existing
          unchanged: 0,
          duplicate: parsedRows.filter(r => r.status === "duplicate").length,
          invalid: parsedRows.filter(r => r.status === "invalid").length,
          unmapped: parsedRows.filter(r => r.status === "unmapped").length,
        };
        
        resolve({
          fileName: file.name,
          sheetName,
          totalRows: parsedRows.length,
          validRows: parsedRows.filter(r => r.status === "unmapped" || r.status === "duplicate").length,
          rows: parsedRows,
          summary,
        });
        
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsArrayBuffer(file);
  });
}

// Format nominal ke Rupiah
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
