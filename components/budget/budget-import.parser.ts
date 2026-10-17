// Import Anggaran dari Excel - Parser & Validator

import * as XLSX from "xlsx";
import type { ParsedBudgetRow, ImportRowError, ImportPreviewRow, ImportRowStatus, BudgetImportPreview } from "./budget-import.types";

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
const parseMonth = (value: string | number): number | null => {
  const months = [
    "januari", "februari", "maret", "april", "mei", "juni",
    "juli", "agustus", "september", "oktober", "november", "desember"
  ];
  
  if (typeof value === "number") {
    if (value >= 1 && value <= 12) return Math.floor(value);
    return null;
  }
  
  const lower = value.toLowerCase().trim();
  const idx = months.indexOf(lower);
  if (idx !== -1) return idx + 1;
  
  // Coba angka 1-12
  const num = parseInt(lower, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  
  return null;
};

// Cek apakah string adalah tahun valid
const parseYear = (value: string | number): number | null => {
  if (typeof value === "number") {
    const y = Math.floor(value);
    if (y >= 1900 && y <= 2100) return y;
    return null;
  }
  
  const num = parseInt(value.toString().trim(), 10);
  if (!isNaN(num) && num >= 1900 && num <= 2100) return num;
  
  return null;
};

// Cek apakah string adalah angka valid
const parseAmount = (value: string | number): number | null => {
  if (typeof value === "number") {
    if (isFinite(value) && value >= 0) return Math.floor(value);
    return null;
  }
  
  const cleaned = value.toString().trim().replace(/[^\d.]/g, "");
  const num = parseFloat(cleaned);
  if (!isNaN(num) && num >= 0) return Math.floor(num);
  
  return null;
};

// Deteksi kolom berdasarkan header
const detectColumns = (headers: string[]): Record<string, string> => {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => ({ original: h, normalized: normalizeHeader(h) }));
  
  const accountKeywords = ["account", "anggaran", "budget", "name", "nama"];
  const deptKeywords = ["dept", "department", "departemen"];
  const monthKeywords = ["month", "bulan", "bln"];
  const yearKeywords = ["year", "tahun", "thn"];
  const amountKeywords = ["amount", "nominal", "jumlah", "nilai", "total"];
  
  normalizedHeaders.forEach(({ normalized, original }) => {
    if (accountKeywords.some(k => normalized.includes(k))) mapping.accountName = original;
    else if (deptKeywords.some(k => normalized.includes(k))) mapping.department = original;
    else if (monthKeywords.some(k => normalized.includes(k))) mapping.month = original;
    else if (yearKeywords.some(k => normalized.includes(k))) mapping.year = original;
    else if (amountKeywords.some(k => normalized.includes(k))) mapping.amount = original;
  });
  
  return mapping;
};

// Validasi baris
const validateRow = (row: Record<string, any>, mapping: Record<string, string>): ImportRowError[] => {
  const errors: ImportRowError[] = [];
  
  if (!mapping.accountName || !row[mapping.accountName]) {
    errors.push({ rowNumber: row.__rowNum__, field: mapping.accountName || "account", message: "Nama anggaran kosong" });
  }
  
  if (!mapping.department || !row[mapping.department]) {
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
        const json = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: null,
          raw: true,
        });
        
        if (json.length < 2) {
          reject(new Error("Sheet kosong atau tidak ada header"));
          return;
        }
        
        const headers = json[0] as string[];
        const rows = json.slice(1) as any[];
        
        // Deteksi mapping kolom
        const mapping = detectColumns(headers);
        
        // Cek apakah semua kolom penting terdeteksi
        const requiredCols = ["accountName", "department", "month", "year", "amount"];
        const missingCols = requiredCols.filter(col => !mapping[col]);
        
        if (missingCols.length > 0) {
          reject(new Error(`Kolom tidak terdeteksi: ${missingCols.join(", ")}. Harus ada: Nama Anggaran, Departemen, Bulan, Tahun, Nominal`));
          return;
        }
        
        // Parse dan validasi setiap baris
        const parsedRows: ImportPreviewRow[] = [];
        const seenKeys = new Map<string, number>(); // Untuk deteksi duplikat
        
        rows.forEach((rowArr, idx) => {
          const rowObj: Record<string, any> = { __rowNum__: idx + 2 }; // 1-based, baris ke-2 adalah data pertama
          headers.forEach((header, hIdx) => {
            rowObj[header] = rowArr[hIdx] ?? null;
          });
          
          // Validasi
          const errors = validateRow(rowObj, mapping);
          const status: ImportRowStatus = errors.length > 0 ? "invalid" : "unmapped";
          
          // Parse nilai
          const accountName = rowObj[mapping.accountName]?.toString().trim() ?? "";
          const departmentName = rowObj[mapping.department]?.toString().trim() ?? "";
          const month = parseMonth(rowObj[mapping.month]);
          const year = parseYear(rowObj[mapping.year]);
          const amount = parseAmount(rowObj[mapping.amount]);
          
          // Key untuk deteksi duplikat
          const rowKey = `${accountName}|${departmentName}|${year}|${month}`;
          
          // Cek duplikat
          let rowStatus: ImportRowStatus = status;
          if (rowStatus !== "invalid" && seenKeys.has(rowKey)) {
            rowStatus = "duplicate";
          } else if (rowStatus !== "invalid") {
            seenKeys.set(rowKey, idx + 2);
          }
          
          parsedRows.push({
            rowNumber: idx + 2,
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
