"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightIcon, CircleNotchIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import { savePpdRevisionAction, submitPpdDraftAction } from "@/app/actions/ppd";
import { Button } from "@/components/ui/button";
import { PpdReportTable } from "./components/ppd-report-table";
import type { Draft, ReportRow } from "./ppd.types";
import { getPpdRevisionChanges, normalizePpdRevisionSnapshot, type PpdRevisionSnapshot } from "@/lib/ppd-revision";
import { ppdStageLabel } from "@/lib/ppd-labels";

function makeSnapshot(draft: Draft, rows: ReportRow[]): PpdRevisionSnapshot {
  return normalizePpdRevisionSnapshot({
    title: draft.title,
    description: draft.description,
    departmentId: draft.deptId,
    submissionType: draft.submissionType as PpdRevisionSnapshot["submissionType"],
    paymentType: draft.paymentType,
    bank: draft.bank,
    accountNo: draft.accountNo,
    limitFund: Number(draft.limitFund),
    year: draft.year,
    month: draft.month,
    rows: rows.map((row) => ({
      accountId: row.accountId,
      title: row.title,
      description: row.description,
      attachmentName: (row.attachmentNames?.length ? row.attachmentNames : row.attachmentName ? [row.attachmentName] : []).join("\n"),
      amount: Number(row.amount) || 0,
    })),
  });
}

function editableRows(rows: ReportRow[]) {
  return rows.map((row) => ({ id: row.id, title: row.title, amount: Number(row.amount) || 0, attachmentNames: row.attachmentNames?.length ? row.attachmentNames : row.attachmentName ? [row.attachmentName] : [] }));
}

export function PpdRevisionEditor({
  draft,
  onSaved,
  onSubmitted,
}: {
  draft: Draft;
  onSaved: (rows: ReportRow[], snapshot: PpdRevisionSnapshot) => void;
  onSubmitted: () => void;
}) {
  const [rows, setRows] = useState(draft.rows);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setRows(draft.rows), [draft.id, draft.updatedAt]);

  const baseline = draft.revisionSnapshot ?? makeSnapshot(draft, draft.rows);
  const currentSnapshot = makeSnapshot(draft, rows);
  const changes = useMemo(() => getPpdRevisionChanges(baseline, currentSnapshot), [baseline, currentSnapshot]);
  const hasUnsavedChanges = JSON.stringify(editableRows(draft.rows)) !== JSON.stringify(editableRows(rows));
  const hasRevisionChanges = changes.length > 0;

  const updateRow = (id: string, field: keyof ReportRow, value: string | number | string[] | null) => {
    if (field !== "title" && field !== "amount" && field !== "attachmentName" && field !== "attachmentNames") return;
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
    setMessage(null);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await savePpdRevisionAction({ id: draft.id, items: editableRows(rows) });
      if ("error" in result) {
        setError(result.error ?? "Revisi gagal disimpan.");
        return;
      }
      const rowsWithAccountName = result.rows.map((row) => ({
        ...row,
        accountName: draft.rows.find((existing) => existing.id === row.id)?.accountName
          ?? draft.rows.find((existing) => existing.accountName)?.accountName
          ?? null,
      }));
      setRows(rowsWithAccountName);
      onSaved(rowsWithAccountName, result.revisionSnapshot);
      setMessage("Perubahan revisi berhasil disimpan.");
    } catch {
      setError("Revisi gagal disimpan. Muat ulang halaman lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await submitPpdDraftAction(draft.id);
      if ("error" in result) {
        setError(result.error ?? "Revisi gagal dikirim.");
        return;
      }
      onSubmitted();
    } catch {
      setError("Revisi gagal dikirim. Muat ulang halaman lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div>
        <h3 className="text-sm font-semibold">Tugas revisi PPD</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Anda ditugaskan menambah atau menghapus baris, serta memperbarui judul, nominal, dan lampiran. Setelah disimpan, kirim kembali ke {ppdStageLabel(draft.revisionRequestedByStage ?? draft.revisionReturnStage ?? "DEPT_HEAD")}.
        </p>
      </div>

      <PpdReportTable
        draftId={draft.id}
        rows={rows}
        onAdd={() => {
          setRows((current) => [...current, {
            id: `new-${crypto.randomUUID()}`,
            accountId: current.find((row) => row.accountId)?.accountId ?? null,
            accountName: current.find((row) => row.accountId)?.accountName ?? null,
            title: "",
            description: "",
            attachmentName: "",
            attachmentNames: [],
            amount: 0,
          }]);
          setMessage(null);
        }}
        onUpdate={updateRow}
        onRemove={(id) => {
          setRows((current) => current.filter((row) => row.id !== id));
          setMessage(null);
        }}
        total={rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)}
        deptName={draft.departmentName ?? ""}
        year={draft.year}
        month={draft.month}
        budgets={{}}
        accounts={[]}
        selectedAccountId=""
        onAccountChange={() => undefined}
        revisionOnly
      />

      {changes.length > 0 ? (
        <ul className="space-y-2 text-sm" aria-label="Perubahan revisi">
          {changes.map((change, index) => (
            <li key={`${change.label}-${index}`} className="rounded-md bg-background/70 p-3">
              <p className="font-medium">{change.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">Sebelum: {change.before}</p>
              <p className="text-xs">Sesudah: {change.after}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada perubahan baris, judul, nominal, atau lampiran.</p>
      )}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy || !hasUnsavedChanges || !hasRevisionChanges} onClick={() => void save()}>
          {busy ? <CircleNotchIcon className="mr-2 size-4 animate-spin" /> : <FloppyDiskIcon className="mr-2 size-4" />}
          Simpan revisi
        </Button>
        <Button type="button" disabled={busy || hasUnsavedChanges || !hasRevisionChanges} onClick={() => void submit()}>
          {busy && <CircleNotchIcon className="mr-2 size-4 animate-spin" />}
          Kirim kembali <ArrowRightIcon className="ml-2 size-4" />
        </Button>
      </div>
    </section>
  );
}
