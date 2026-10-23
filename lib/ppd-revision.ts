export type PpdRevisionSnapshot = {
  title: string;
  description: string;
  departmentId: string;
  submissionType: "UANG_MUKA" | "PEMBAYARAN";
  paymentType: string;
  bank: string;
  accountNo: string;
  limitFund: number;
  year: number;
  month: number;
  rows: Array<{
    accountId: string | null;
    title: string;
    description: string;
    attachmentName: string;
    amount: number;
  }>;
};

export type PpdRevisionChange = {
  label: string;
  before: string;
  after: string;
};

export function normalizePpdRevisionSnapshot(snapshot: PpdRevisionSnapshot): PpdRevisionSnapshot {
  const rows = snapshot.rows.map((row) => ({
    accountId: row.accountId || null,
    title: row.title.trim(),
    description: row.description.trim(),
    attachmentName: row.attachmentName.trim(),
    amount: Math.round((Number(row.amount) || 0) * 100) / 100,
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  return {
    title: snapshot.title.trim(),
    description: snapshot.description.trim(),
    departmentId: snapshot.departmentId,
    submissionType: snapshot.submissionType,
    paymentType: snapshot.paymentType.trim(),
    bank: snapshot.bank.trim(),
    accountNo: snapshot.accountNo.trim(),
    limitFund: Math.round((Number(snapshot.limitFund) || 0) * 100) / 100,
    year: snapshot.year,
    month: snapshot.month,
    rows,
  };
}

export function samePpdRevisionSnapshot(a: PpdRevisionSnapshot, b: PpdRevisionSnapshot) {
  return JSON.stringify(normalizePpdRevisionSnapshot(a)) === JSON.stringify(normalizePpdRevisionSnapshot(b));
}

export function getPpdRevisionChanges(
  before: PpdRevisionSnapshot | null | undefined,
  after: PpdRevisionSnapshot,
): PpdRevisionChange[] {
  if (!before) return [];
  const oldValue = normalizePpdRevisionSnapshot(before);
  const newValue = normalizePpdRevisionSnapshot(after);
  const changes: PpdRevisionChange[] = [];
  const scalarFields: Array<[keyof Omit<PpdRevisionSnapshot, "rows">, string]> = [
    ["title", "Judul"],
    ["description", "Deskripsi"],
    ["departmentId", "Departemen"],
    ["submissionType", "Jenis pengajuan"],
    ["paymentType", "Metode pembayaran"],
    ["bank", "Bank"],
    ["accountNo", "Nomor rekening"],
    ["limitFund", "Limit dana"],
    ["year", "Tahun anggaran"],
    ["month", "Bulan anggaran"],
  ];

  for (const [key, label] of scalarFields) {
    if (oldValue[key] === newValue[key]) continue;
    const format = (value: string | number) => value === "" ? "(kosong)" : String(value);
    changes.push({ label, before: format(oldValue[key]), after: format(newValue[key]) });
  }

  const rowCount = Math.max(oldValue.rows.length, newValue.rows.length);
  for (let index = 0; index < rowCount; index += 1) {
    const oldRow = oldValue.rows[index];
    const newRow = newValue.rows[index];
    if (JSON.stringify(oldRow) === JSON.stringify(newRow)) continue;
    const formatRow = (row: PpdRevisionSnapshot["rows"][number] | undefined) => {
      if (!row) return "(dihapus)";
      const label = row.title || row.accountId || `Item ${index + 1}`;
      return `${label} · ${row.description || "tanpa deskripsi"} · Rp ${row.amount.toLocaleString("id-ID")}`;
    };
    changes.push({ label: `Rincian item ${index + 1}`, before: formatRow(oldRow), after: formatRow(newRow) });
  }
  return changes;
}
