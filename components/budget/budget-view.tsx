"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  UploadSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/utils";
import { createBudgetAccountAndBudgetAction, importMonthlyBudgetsAction, removeBudgetAccountAction, updateMonthlyBudgetAction } from "@/app/actions/budget";
import type { BudgetPageData } from "@/lib/budget-data";

import * as XLSX from "xlsx";
import { MONTHS, YEARS } from "./budget-view.constants";
import { budgetKey } from "@/lib/budget-utils";
import { type DepartmentSummary, type BudgetRow } from "./budget-view.types";
import { DepartmentBudgetList } from "./components/department-budget-list";
import { BudgetPeriodFilter } from "./components/budget-period-filter";
import { AccountBudgetTable } from "./components/account-budget-table";
import { BudgetActionsMenu } from "./components/budget-actions-menu";
import { CreateBudgetDialog } from "./components/budget-dialogs";
import { BudgetImportDialog } from "./components/budget-import-dialog";
import type { BudgetImportPreview, BudgetImportScope } from "./budget-import.types";

/* ---------- Helper functions ---------- */
const pct = (n: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((n / total) * 100)) : 0;

const sumRows = (rows: BudgetRow[]) =>
  rows.reduce(
    (t, r) => ({
      amount: t.amount + r.amount,
      draf: t.draf + r.draf,
      realized: t.realized + r.realized,
      saldo: t.saldo + r.saldo,
    }),
    { amount: 0, draf: 0, realized: 0, saldo: 0 },
  );

export function BudgetView({ initialData, canManage }: { initialData: BudgetPageData; canManage: boolean }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDeptId, setSelectedDeptId] = useState(
    initialData.departments[0]?.id ?? "",
  );
  const [deptSearch, setDeptSearch] = useState("");
  const [accSearch, setAccSearch] = useState("");
  const departments = initialData.departments;
  const [accounts, setAccounts] = useState(initialData.accounts);
  const activeAccounts = useMemo(() => accounts.filter((account) => account.isActive), [accounts]);
  const drafLogs = initialData.drafLogs;
  const [budgets, setBudgets] = useState(initialData.budgets);

  const [feedback, setFeedback] = useState<string | null>(null);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [cDept, setCDept] = useState<string>("");
  const [cAccount, setCAccount] = useState<string>("");
  const [cAccountCode, setCAccountCode] = useState<string>("");
  const [cAmount, setCAmount] = useState<string>("");
  const [cError, setCError] = useState<string | null>(null);

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importScope, setImportScope] = useState<BudgetImportScope>({ type: "annual", year: new Date().getFullYear() });

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const resetInteraction = () => {
    setAccSearch("");
  };

  const openAnnualImport = () => {
    setImportScope({ type: "annual", year });
    setImportOpen(true);
  };

  const openTableImport = () => {
    const department = departments.find((d) => d.id === selectedDeptId) ?? departments[0];
    if (!department) return showFeedback("Tambahkan departemen sebelum mengimpor budget.");
    setImportScope({
      type: "table",
      departmentId: selectedDeptId,
      departmentName: department.name,
      departmentCode: department.code,
      month,
      year,
    });
    setImportOpen(true);
  };

  const handleImportComplete = async (preview: BudgetImportPreview) => {
    const inScopeRows = preview.rows.filter((row) => {
      if (importScope.type === "annual") return row.year === importScope.year;
      const rowDepartmentCode = String(row.departmentCode ?? "").trim();
      const rowDepartment = String(row.departmentName).trim().toLowerCase();
      const departmentMatches = rowDepartmentCode
        ? rowDepartmentCode.toLowerCase() === importScope.departmentCode.trim().toLowerCase()
        : rowDepartment === importScope.departmentName.trim().toLowerCase();
      return row.year === importScope.year && row.month === importScope.month && departmentMatches;
    });
    const validRows = inScopeRows.filter((row) => row.status === "unmapped" || row.status === "new");
    const mappedRows = validRows.flatMap((row) => {
      const departmentByCode = row.departmentCode ? departments.find((item) => item.code.trim().toLowerCase() === String(row.departmentCode).trim().toLowerCase()) : undefined;
      const department = departmentByCode
        ?? departments.find((item) => item.name.trim().toLowerCase() === String(row.departmentName).trim().toLowerCase());
      const accountByCode = row.accountCode
        ? activeAccounts.find((item) => item.code.trim().toLowerCase() === String(row.accountCode).trim().toLowerCase() && (!department || item.deptId === department.id))
        : undefined;
      if (row.accountCode && !accountByCode) return [];
      if (accountByCode && department && accountByCode.deptId !== department.id) return [];
      const account = accountByCode ?? activeAccounts.find((item) => item.deptId === department?.id && item.name.trim().toLowerCase() === String(row.accountName).trim().toLowerCase());
      return account ? [{ accountId: account.id, year: row.year, month: row.month, amount: row.amount }] : [];
    });
    const unmatched = validRows.length - mappedRows.length;
    if (mappedRows.length === 0) {
      showFeedback("Tidak ada baris import yang cocok dengan departemen dan account terdaftar.");
      return;
    }

    const scope = importScope.type === "annual"
      ? importScope
      : { type: "table" as const, departmentId: importScope.departmentId, year: importScope.year, month: importScope.month };
    const result = await importMonthlyBudgetsAction({ scope, rows: mappedRows });
    if (result.error) {
      showFeedback(result.error);
      return;
    }

    let added = 0;
    let updated = 0;
    for (const row of mappedRows) {
      if (budgets[budgetKey(row.accountId, row.year, row.month)]) updated++;
      else added++;
    }
    setBudgets((previous) => {
      const next = { ...previous };
      for (const row of mappedRows) {
        const rowKey = budgetKey(row.accountId, row.year, row.month);
        next[rowKey] = { amount: row.amount, realized: previous[rowKey]?.realized ?? 0 };
      }
      return next;
    });

    const firstRow = validRows[0];
    if (firstRow && (firstRow.year !== year || firstRow.month !== month)) {
      setYear(firstRow.year);
      setMonth(firstRow.month);
    }

    const excluded = preview.rows.length - inScopeRows.length;
    showFeedback(`Import ${added} baru, ${updated} diperbarui${excluded > 0 ? `, ${excluded} di luar cakupan dilewati` : ""}${unmatched > 0 ? `, ${unmatched} account tidak cocok dilewati` : ""}.`);
  };

  const handleExportBudget = () => {
    const dept = departments.find((d) => d.id === selectedDeptId) ?? departments[0];
    if (!dept) return showFeedback("Tidak ada departemen untuk diekspor.");
    const data: Record<string, string | number>[] = [];

    activeAccounts.filter((acc) => acc.deptId === selectedDeptId).forEach((acc) => {
      const entry = budgets[budgetKey(acc.id, year, month)];
      if (entry) {
        data.push({
          "Kode Departemen": dept.code,
          "Departemen": dept.name,
          "Nama Anggaran": acc.name,
          "Kode Akun": acc.code,
          "Bulan": MONTHS[month - 1],
          "Tahun": year,
          "Nominal": entry.amount,
        });
      }
    });

    if (data.length === 0) {
      showFeedback("Tidak ada data untuk diekspor pada periode ini.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budget");
    
    ws["!cols"] = [
      { wch: 15 },
      { wch: 35 },
      { wch: 12 },
      { wch: 12 },
      { wch: 8 },
      { wch: 15 },
    ];

    XLSX.writeFile(wb, `Budget_${dept.name}_${MONTHS[month - 1]}_${year}.xlsx`);
    showFeedback(`Export berhasil: ${data.length} data diekspor.`);
  };

  /* ---------- Data derived ---------- */
  const allRows: BudgetRow[] = useMemo(
    () =>
      activeAccounts.map((account) => {
        const entry = budgets[budgetKey(account.id, year, month)];
        const draf = drafLogs.filter(
          (l) => l.accountId === account.id && l.year === year && l.month === month,
        ).reduce((s, l) => s + l.amount, 0);
        const amount = entry?.amount ?? 0;
        const realized = entry?.realized ?? 0;
        return {
          account,
          hasBudget: Boolean(entry),
          amount,
          draf,
          realized,
          saldo: amount - realized - draf,
        };
      }),
    [activeAccounts, budgets, year, month],
  );

  const deptSummaries: DepartmentSummary[] = useMemo(
    () =>
      departments.map((dept) => {
        const rows = allRows.filter((r) => r.account.deptId === dept.id);
        return {
          dept,
          accountCount: rows.length,
          missing: rows.filter((r) => !r.hasBudget).length,
          total: sumRows(rows).amount,
        };
      }),
    [allRows],
  );

  const filteredDepts = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    return deptSummaries.filter(
      ({ dept }) =>
        !q ||
        dept.name.toLowerCase().includes(q) ||
        dept.code.toLowerCase().includes(q),
    );
  }, [deptSummaries, deptSearch]);

  const grandTotal = useMemo(
    () => deptSummaries.reduce((s, d) => s + d.total, 0),
    [deptSummaries],
  );
  const missingAll = deptSummaries.reduce((s, d) => s + d.missing, 0);

  const activeDept = departments.find((d) => d.id === selectedDeptId) ?? departments[0] ?? {
    id: "", name: "Belum ada departemen", code: "-",
  };
  const activeRows = useMemo(
    () => allRows.filter((r) => r.account.deptId === activeDept.id),
    [allRows, activeDept.id],
  );
  const totals = useMemo(() => sumRows(activeRows), [activeRows]);
  const activeMissing = activeRows.filter((r) => !r.hasBudget).length;

  const visibleRows = useMemo(() => {
    const q = accSearch.trim().toLowerCase();
    return activeRows.filter(
      (r) =>
        !q ||
        r.account.name.toLowerCase().includes(q) ||
        r.account.code.toLowerCase().includes(q),
    );
  }, [activeRows, accSearch]);

  const logs = useMemo(() => {
    const ids = new Set(activeRows.map((r) => r.account.id));
    return drafLogs.filter(
      (l) => ids.has(l.accountId) && l.year === year && l.month === month,
    );
  }, [activeRows, year, month]);

  const usedPct = pct(totals.realized + totals.draf, totals.amount);
  const lastDay = new Date(year, month, 0).getDate();

  /* ---------- Actions: edit ---------- */
  const handleEditStart = (accountId: string, currentValue: number | null) => {
    // placeholder - could store current value if needed
  };

  const handleSaveEdit = async (accountId: string, value: number): Promise<string | null> => {
    const row = allRows.find((r) => r.account.id === accountId);
    if (!row) return "Account tidak ditemukan";

    const floor = row.draf + row.realized;
    if (value < floor) {
      return `Budget tidak boleh di bawah dana ditahan + realisasi (${formatRupiah(floor)}).`;
    }

    const result = await updateMonthlyBudgetAction({ accountId, year, month, amount: value });
    if (result.error) return result.error;

    const k = budgetKey(accountId, year, month);
    setBudgets((prev) => ({
      ...prev,
      [k]: { amount: value, realized: prev[k]?.realized ?? 0 },
    }));

    showFeedback(`Budget ${row.account.name} disimpan: ${formatRupiah(value)}.`);
    return null;
  };

  const handleRemoveAccount = async (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId);
    if (!account) return;
    if (!confirm(`Hapus atau nonaktifkan akun ${account.code} · ${account.name}? Akun yang sudah memiliki riwayat akan dinonaktifkan agar data lama tetap tersimpan.`)) return;

    const result = await removeBudgetAccountAction(accountId);
    if (result.error) {
      showFeedback(result.error);
      return;
    }

    if (result.mode === "deactivated") {
      setAccounts((previous) => previous.map((item) => item.id === accountId ? { ...item, isActive: false } : item));
      showFeedback(`Akun ${account.name} dinonaktifkan. Riwayat anggaran tetap tersimpan.`);
    } else {
      setAccounts((previous) => previous.filter((item) => item.id !== accountId));
      showFeedback(`Akun ${account.name} dihapus.`);
    }
  };

  /* ---------- Actions: copy previous month ---------- */
  const handleCopyPrevMonth = () => {
    const py = month === 1 ? year - 1 : year;
    const pm = month === 1 ? 12 : month - 1;
    const toCopy = activeRows.filter(
      (r) => !r.hasBudget && budgets[budgetKey(r.account.id, py, pm)],
    );
    if (toCopy.length === 0) {
      showFeedback("Tidak ada account yang perlu disalin untuk periode ini.");
      return;
    }
    setBudgets((prev) => {
      const next = { ...prev };
      toCopy.forEach((r) => {
        next[budgetKey(r.account.id, year, month)] = {
          amount: prev[budgetKey(r.account.id, py, pm)].amount,
          realized: 0,
        };
      });
      return next;
    });
    showFeedback(
      `${toCopy.length} account ${activeDept.name} disalin dari ${MONTHS[pm - 1]} ${py}.`,
    );
  };

  /* ---------- Actions: create budget ---------- */
  const openCreate = () => {
    if (!activeDept.id) {
      showFeedback("Tambahkan departemen sebelum membuat account budget.");
      return;
    }
    setCDept(activeDept.id);
    setCAccount("");
    setCAccountCode("");
    setCAmount("");
    setCError(null);
    setCreateOpen(true);
  };

  const saveCreate = async (deptId: string, accountName: string, accountCode: string, amount: number) => {
    const result = await createBudgetAccountAndBudgetAction({
      departmentId: deptId,
      name: accountName,
      code: accountCode,
      year,
      month,
      amount,
    });
    if (result.error) return setCError(result.error);
    if (!result.data) return setCError("Account gagal dibuat.");

    setBudgets((prev) => ({
      ...prev,
      [budgetKey(result.data.id, year, month)]: { amount, realized: 0 },
    }));
    setAccounts((previous) => [...previous, {
      id: result.data!.id,
      deptId: result.data!.departmentId,
      code: result.data!.code,
      name: result.data!.name,
      isActive: result.data!.isActive,
    }]);
    setSelectedDeptId(deptId);
    setCreateOpen(false);
    showFeedback(`Account ${result.data.name} dan budget ${MONTHS[month - 1]} ${year} berhasil dibuat.`);
  };

  const addDisabled = !activeDept.id;

  /* ---------- Render ---------- */
  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col bg-background lg:h-svh lg:min-h-0 lg:flex-row">
      {/* ============================================================== */}
      {/* PANEL KIRI: daftar departemen + periode                        */}
      {/* ============================================================== */}
      <aside className="flex w-full shrink-0 flex-col border-r bg-muted/20 lg:h-full lg:min-h-0 lg:w-88">
        <div className="shrink-0 space-y-3.5 border-b p-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Anggaran</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelola anggaran tiap akun per bulan.
            </p>
          </div>

          {canManage && <Button
            onClick={openAnnualImport}
            variant="outline"
            className="w-full justify-center gap-1.5 text-xs font-semibold h-9 border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <UploadSimpleIcon className="size-3.5" />
            Import anggaran 1 tahun
          </Button>}

          <BudgetPeriodFilter
            month={month}
            year={year}
            deptSearch={deptSearch}
            onMonthChange={(m) => { setMonth(m); resetInteraction(); }}
            onYearChange={(y) => { setYear(y); resetInteraction(); }}
            onDeptSearchChange={setDeptSearch}
            totalDepartments={departments.length}
            missingCount={missingAll}
          />
        </div>

        <DepartmentBudgetList
          summaries={filteredDepts}
          selectedDeptId={selectedDeptId}
          onSelect={(deptId) => { setSelectedDeptId(deptId); resetInteraction(); }}
        />

        <div className="shrink-0 border-t bg-muted/10 p-3.5 text-xs text-muted-foreground space-y-0.5">
          <div>Periode {MONTHS[month - 1]} {year}</div>
          <div className="font-bold text-foreground">
            Total anggaran semua departemen: {formatRupiah(grandTotal)}
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* PANEL KANAN: detail budget departemen terpilih                 */}
      {/* ============================================================== */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-background">
        <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
          {/* Judul */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Keuangan</span>
              <span>/</span>
              <span>Budget</span>
              <span>/</span>
              <span className="text-foreground font-medium">{activeDept.name}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                  {activeDept.name}
                </h1>
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {MONTHS[month - 1]} {year}
                </Badge>
              </div>

              
            </div>

            <p className="text-xs text-muted-foreground">
              {activeDept.code} · {activeRows.length} account · Account dibuat di halaman Departemen
            </p>
          </div>

          {feedback && (
            <div className="flex items-center gap-2 p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-md">
              <CheckCircleIcon className="size-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {activeMissing > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
              <WarningCircleIcon weight="bold" className="size-4 shrink-0" />
              {activeMissing} account belum punya budget bulan ini, sehingga belum bisa dipakai untuk pengajuan.
            </div>
          )}

          {/* CARD 1: Ringkasan budget */}
          <div className="rounded-lg border bg-card p-5 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-sm">Ringkasan anggaran</h2>
                <p className="text-xs text-muted-foreground">
                  Jumlah seluruh akun {activeDept.name} bulan ini
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                {MONTHS[month - 1]} {year}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/40 border">
                <div className="text-xs text-muted-foreground">Total anggaran</div>
                <div className="text-xl lg:text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">
                  {formatRupiah(totals.amount)}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/40 border">
                <div className="text-xs text-muted-foreground">Total realisasi</div>
                <div className="text-xl lg:text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">
                  {formatRupiah(totals.realized)}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/40 border">
                <div className="text-xs text-muted-foreground">Sisa</div>
                <div
                  className={`text-xl lg:text-2xl font-bold tracking-tight mt-1 font-mono ${
                    totals.saldo < 0 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {formatRupiah(totals.saldo)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Pemakaian {usedPct}% dari total anggaran</span>
                <span>
                  1 – {lastDay} {MONTHS[month - 1]} {year}
                </span>
              </div>
              <div className="flex w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-500"
                  style={{ width: `${pct(totals.realized, totals.amount)}%` }}
                />
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${pct(totals.draf, totals.amount)}%` }}
                />
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground border-t pt-3">
              Sisa sudah dikurangi dana yang sedang ditahan oleh pengajuan berjalan (
              {formatRupiah(totals.draf)}). Realisasi hanya bertambah saat pengajuan dibayar.
            </div>
          </div>

          {/* CARD 2: Budget per account */}
          <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-sm">Anggaran per akun</h2>
                <p className="text-xs text-muted-foreground">
                  Anggaran diatur per akun dan per bulan
                </p>
              </div>
              <BudgetActionsMenu
                onExport={handleExportBudget}
                onImport={openTableImport}
                onCreate={openCreate}
                createDisabled={addDisabled}
                canManage={canManage}
              />
            </div>

            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau kode akun..."
                value={accSearch}
                onChange={(e) => setAccSearch(e.target.value)}
                aria-label="Cari akun anggaran"
                className="h-8 text-xs bg-background pl-8"
              />
            </div>

            <AccountBudgetTable
              rows={visibleRows}
              canEdit={canManage}
              onEdit={handleEditStart}
              onSave={handleSaveEdit}
              onCancel={resetInteraction}
              onRemove={handleRemoveAccount}
            />

            <p className="text-[11px] text-muted-foreground">
              Pengajuan (PPD) hanya bisa memakai akun yang sudah memiliki anggaran pada bulan pengajuan.
            </p>
          </div>

          {/* CARD 3: Draf log */}
          <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-sm">Dana tertahan</h2>
                <p className="text-xs text-muted-foreground">
                  Rincian dana yang ditahan oleh pengajuan {activeDept.name} bulan ini
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                {logs.length} catatan
              </Badge>
            </div>

            <div className="overflow-x-auto rounded-md border border-border/80">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    <th className="p-3 text-left font-medium">Waktu</th>
                    <th className="p-3 text-left font-medium">Account</th>
                    <th className="p-3 text-left font-medium">Keterangan</th>
                    <th className="p-3 text-left font-medium">No. PPD</th>
                    <th className="p-3 text-right font-medium">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {logs.map((l) => {
                    const acc = accounts.find((a) => a.id === l.accountId);
                    return (
                      <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 whitespace-nowrap text-muted-foreground">{l.createdAt}</td>
                        <td className="p-3">
                          <div className="font-medium text-foreground">{acc?.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{acc?.code}</div>
                        </td>
                        <td className="p-3">{l.description}</td>
                        <td className="p-3 font-mono text-[10px]">{l.ppdNo}</td>
                        <td
                          className={`p-3 text-right font-mono ${
                            l.amount < 0 ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {l.amount < 0 ? "−" : "+"}
                          {formatRupiah(Math.abs(l.amount))}
                        </td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Belum ada dana ditahan pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Dibuat otomatis oleh modul PPD (kirim, tolak, bayar); tidak diisi manual.
            </p>
          </div>
        </div>
      </main>

      {/* DIALOG: Tambah budget */}
      <CreateBudgetDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={saveCreate}
        month={month}
        year={year}
        departments={departments}
        selectedDeptId={cDept}
        selectedAccountName={cAccount}
        accountCode={cAccountCode}
        amount={cAmount}
        error={cError}
        onDeptChange={setCDept}
        onAccountNameChange={setCAccount}
        onAccountCodeChange={setCAccountCode}
        onAmountChange={setCAmount}
        onErrorChange={setCError}
      />

      {/* DIALOG: Import dari Excel */}
      <BudgetImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={handleImportComplete}
        scope={importScope}
      />
    </div>
  );
}
