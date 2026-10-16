"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  CopyIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/utils";

import { DEPARTMENTS, ACCOUNTS, INITIAL_BUDGETS, DRAF_LOGS, MONTHS, YEARS, budgetKey } from "./budget-view.data";
import { type DepartmentSummary, type BudgetRow } from "./budget-view.types";
import { DepartmentBudgetList } from "./components/department-budget-list";
import { BudgetPeriodFilter } from "./components/budget-period-filter";
import { AccountBudgetTable } from "./components/account-budget-table";
import { CreateBudgetDialog } from "./components/budget-dialogs";

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

export function BudgetView() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(10);
  const [selectedDeptId, setSelectedDeptId] = useState("d-3");
  const [deptSearch, setDeptSearch] = useState("");
  const [accSearch, setAccSearch] = useState("");
  const [budgets, setBudgets] = useState<Record<string, { amount: number; realized: number }>>(INITIAL_BUDGETS);

  const [feedback, setFeedback] = useState<string | null>(null);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [cDept, setCDept] = useState<string>("");
  const [cAccount, setCAccount] = useState<string>("");
  const [cAmount, setCAmount] = useState<string>("");
  const [cError, setCError] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const resetInteraction = () => {
    setAccSearch("");
  };

  /* ---------- Data derived ---------- */
  const allRows: BudgetRow[] = useMemo(
    () =>
      ACCOUNTS.map((account) => {
        const entry = budgets[budgetKey(account.id, year, month)];
        const draf = DRAF_LOGS.filter(
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
    [budgets, year, month],
  );

  const deptSummaries: DepartmentSummary[] = useMemo(
    () =>
      DEPARTMENTS.map((dept) => {
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

  const activeDept =
    DEPARTMENTS.find((d) => d.id === selectedDeptId) ?? DEPARTMENTS[0];
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
    return DRAF_LOGS.filter(
      (l) => ids.has(l.accountId) && l.year === year && l.month === month,
    );
  }, [activeRows, year, month]);

  const usedPct = pct(totals.realized + totals.draf, totals.amount);
  const lastDay = new Date(year, month, 0).getDate();

  /* ---------- Actions: edit ---------- */
  const handleEditStart = (accountId: string, currentValue: number | null) => {
    // placeholder - could store current value if needed
  };

  const handleSaveEdit = (accountId: string, value: number): string | null => {
    const row = allRows.find((r) => r.account.id === accountId);
    if (!row) return "Account tidak ditemukan";

    const floor = row.draf + row.realized;
    if (value < floor) {
      return `Budget tidak boleh di bawah dana ditahan + realisasi (${formatRupiah(floor)}).`;
    }

    const k = budgetKey(accountId, year, month);
    setBudgets((prev) => ({
      ...prev,
      [k]: { amount: value, realized: prev[k]?.realized ?? 0 },
    }));

    showFeedback(`Budget ${row.account.name} disimpan: ${formatRupiah(value)}.`);
    return null;
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
  const deptsWithMissing = useMemo(
    () =>
      DEPARTMENTS.filter((d) =>
        allRows.some((r) => r.account.deptId === d.id && !r.hasBudget),
      ),
    [allRows],
  );

  const createChoices = useMemo(
    () => allRows.filter((r) => r.account.deptId === cDept && !r.hasBudget),
    [allRows, cDept],
  );

  const openCreate = () => {
    const preferred = deptsWithMissing.some((d) => d.id === activeDept.id)
      ? activeDept.id
      : deptsWithMissing[0]?.id ?? "";
    setCDept(preferred);
    setCAccount("");
    setCAmount("");
    setCError(null);
    setCreateOpen(true);
  };

  const saveCreate = (deptId: string, accountId: string, amount: number) => {
    const row = allRows.find((r) => r.account.id === accountId);
    if (!row) return setCError("Pilih account terlebih dahulu.");
    if (row.hasBudget)
      return setCError("Account ini sudah punya budget bulan ini. Gunakan tombol ubah.");

    setBudgets((prev) => ({
      ...prev,
      [budgetKey(accountId, year, month)]: { amount, realized: 0 },
    }));
    setSelectedDeptId(row.account.deptId);
    setCreateOpen(false);
    showFeedback(
      `Budget ${row.account.name} (${MONTHS[month - 1]} ${year}) dibuat: ${formatRupiah(amount)}.`,
    );
  };

  const addDisabled = deptsWithMissing.length === 0;

  /* ---------- Render ---------- */
  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-4rem)] bg-background">
      {/* ============================================================== */}
      {/* PANEL KIRI: daftar departemen + periode                        */}
      {/* ============================================================== */}
      <aside className="w-full lg:w-88 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-5 border-b space-y-3.5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Budget</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelola budget tiap account per bulan.
            </p>
          </div>

          <Button
            onClick={openCreate}
            disabled={addDisabled}
            title={addDisabled ? "Semua account sudah punya budget bulan ini" : undefined}
            variant="outline"
            className="w-full justify-center gap-1.5 text-xs font-semibold h-9"
          >
            <PlusIcon className="size-3.5" />
            Tambah budget
          </Button>

          <BudgetPeriodFilter
            month={month}
            year={year}
            deptSearch={deptSearch}
            onMonthChange={(m) => { setMonth(m); resetInteraction(); }}
            onYearChange={(y) => { setYear(y); resetInteraction(); }}
            onDeptSearchChange={setDeptSearch}
            totalDepartments={DEPARTMENTS.length}
            missingCount={missingAll}
          />
        </div>

        <DepartmentBudgetList
          summaries={filteredDepts}
          selectedDeptId={selectedDeptId}
          onSelect={(deptId) => { setSelectedDeptId(deptId); resetInteraction(); }}
        />

        <div className="p-3.5 border-t text-xs text-muted-foreground bg-muted/10 space-y-0.5">
          <div>Periode {MONTHS[month - 1]} {year}</div>
          <div className="font-bold text-foreground">
            Total budget semua departemen: {formatRupiah(grandTotal)}
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* PANEL KANAN: detail budget departemen terpilih                 */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-background">
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

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPrevMonth}
                className="gap-1.5 text-xs h-8"
              >
                <CopyIcon className="size-3.5" />
                Salin dari bulan lalu
              </Button>
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
                <h2 className="font-semibold text-sm">Ringkasan budget</h2>
                <p className="text-xs text-muted-foreground">
                  Jumlah dari seluruh account {activeDept.name} bulan ini
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                {MONTHS[month - 1]} {year}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/40 border">
                <div className="text-xs text-muted-foreground">Total budget</div>
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
                <span>Pemakaian {usedPct}% dari total budget</span>
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
              Sisa sudah dikurangi dana yang sedang ditahan pengajuan berjalan (
              {formatRupiah(totals.draf)}). Realisasi hanya bertambah saat pengajuan dibayar.
            </div>
          </div>

          {/* CARD 2: Budget per account */}
          <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-sm">Budget per account</h2>
                <p className="text-xs text-muted-foreground">
                  Budget diatur per account dan per bulan
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCreate}
                  disabled={addDisabled}
                  className="gap-1.5 text-xs h-7 font-medium"
                >
                  <PlusIcon className="size-3.5" />
                  Tambah budget
                </Button>
              </div>
            </div>

            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau kode account..."
                value={accSearch}
                onChange={(e) => setAccSearch(e.target.value)}
                aria-label="Cari account"
                className="h-8 text-xs bg-background pl-8"
              />
            </div>

            <AccountBudgetTable
              rows={visibleRows}
              onEdit={handleEditStart}
              onSave={handleSaveEdit}
              onCancel={resetInteraction}
            />

            <p className="text-[11px] text-muted-foreground">
              Pengajuan (PPD) hanya bisa memakai account yang sudah punya budget pada bulan pengajuan.
            </p>
          </div>

          {/* CARD 3: Draf log */}
          <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-sm">Draf log</h2>
                <p className="text-xs text-muted-foreground">
                  Riwayat dana ditahan oleh pengajuan {activeDept.name} bulan ini
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
                    const acc = ACCOUNTS.find((a) => a.id === l.accountId);
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
        departmentsWithMissing={deptsWithMissing}
        accountsWithoutBudget={createChoices}
        selectedDeptId={cDept}
        selectedAccountId={cAccount}
        amount={cAmount}
        error={cError}
        onDeptChange={setCDept}
        onAccountChange={setCAccount}
        onAmountChange={setCAmount}
        onErrorChange={setCError}
      />
    </div>
  );
}
