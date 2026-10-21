"use client";

import type { ReactNode } from "react";
import { PlusIcon, TrashIcon, PaperclipIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/lib/utils";
import type { ReportRow } from "../ppd.types";

export type PpdReportTableProps = {
  rows: ReportRow[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof ReportRow, value: string | number | null) => void;
  onRemove: (id: string) => void;
  total: number;
  deptName: string;
  year: number;
  month: number;
  budgets: Record<string, { amount: number; realized: number }>;
  accounts: Array<{ id: string; deptId: string; code: string; name: string }>;
};

function Card({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Tabel laporan pertanggungjawaban</h3>
          <p className="text-xs text-muted-foreground">
            Rincian item pengeluaran dan lampiran bukti transaksi.
          </p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function PpdReportTable({
  rows,
  onAdd,
  onUpdate,
  onRemove,
  total,
  deptName,
  year,
  month,
  budgets,
  accounts,
}: PpdReportTableProps) {
  if (!deptName) {
    return (
      <Card>
        <EmptyState>Pilih departemen terlebih dahulu untuk menambahkan item pengajuan.</EmptyState>
      </Card>
    );
  }

  const getBudget = (accountId: string) => budgets[`${accountId}|${year}|${month}`];

  const accountOptions = accounts.map((acc) => ({ value: acc.id, label: acc.name }));

  const renderAccountSelect = (row: ReportRow, id: string) => {
    const budget = row.accountId ? getBudget(row.accountId) : undefined;
    return (
      <div className="min-w-0 space-y-1">
        <Select
          value={row.accountId || ""}
          onValueChange={(v) => v && onUpdate(row.id, "accountId", v)}
          items={accountOptions}
        >
          <SelectTrigger id={id} className="h-9 w-full bg-background text-xs">
            <SelectValue placeholder="Pilih jenis pengajuan" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((acc) => {
              const b = getBudget(acc.id);
              return (
                <SelectItem key={acc.id} value={acc.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{acc.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {b ? `Sisa: ${formatRupiah(b.amount - b.realized)}` : "Belum diatur"}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {budget && (
          <p className="px-1 text-[10px] text-muted-foreground">
            Sisa: {formatRupiah(budget.amount - budget.realized)}
          </p>
        )}
      </div>
    );
  };

  const renderDescription = (row: ReportRow, id: string) => (
    <Input
      id={id}
      value={row.description}
      onChange={(e) => onUpdate(row.id, "description", e.target.value)}
      className="h-9 text-xs"
    />
  );

  const renderAttachment = (row: ReportRow, id: string) => (
    <div className="flex items-center gap-1.5">
      <PaperclipIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <Input
        id={id}
        value={row.attachmentName}
        onChange={(e) => onUpdate(row.id, "attachmentName", e.target.value)}
        className="h-9 text-xs"
      />
    </div>
  );

  const renderAmount = (row: ReportRow, id: string) => (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      value={row.amount || ""}
      onChange={(e) => onUpdate(row.id, "amount", Number(e.target.value))}
      className="h-9 text-right font-mono text-xs"
    />
  );

  const renderRemove = (row: ReportRow) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => onRemove(row.id)}
      className="size-8 text-destructive hover:text-destructive"
      aria-label="Hapus baris"
    >
      <TrashIcon className="size-4" />
    </Button>
  );

  return (
    <Card
      action={
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAdd}
          className="h-8 gap-1.5 text-xs"
        >
          <PlusIcon className="size-3.5" />
          Tambah baris
        </Button>
      }
    >
      {accounts.length === 0 ? (
        <EmptyState>Tidak ada jenis pengajuan untuk departemen ini.</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>Belum ada item laporan. Klik “Tambah baris” untuk memulai.</EmptyState>
      ) : (
        <>
          {/* Mobile: kartu per baris */}
          <ul className="space-y-3 md:hidden">
            {rows.map((row, i) => (
              <li key={row.id} className="space-y-3 rounded-md border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                  {renderRemove(row)}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${row.id}-acc`} className="text-xs font-medium text-muted-foreground">
                    Jenis pengajuan
                  </label>
                  {renderAccountSelect(row, `${row.id}-acc`)}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${row.id}-desc`} className="text-xs font-medium text-muted-foreground">
                    Deskripsi
                  </label>
                  {renderDescription(row, `${row.id}-desc`)}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${row.id}-att`} className="text-xs font-medium text-muted-foreground">
                    Lampiran
                  </label>
                  {renderAttachment(row, `${row.id}-att`)}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${row.id}-amt`} className="text-xs font-medium text-muted-foreground">
                    Jumlah (Rp)
                  </label>
                  {renderAmount(row, `${row.id}-amt`)}
                </div>
              </li>
            ))}

            <li className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-3 text-sm font-semibold">
              <span>Total</span>
              <span className="font-mono text-primary">{formatRupiah(total)}</span>
            </li>
          </ul>

          {/* Desktop: tabel */}
          <div className="hidden overflow-x-auto rounded-md border border-border/80 md:block">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th scope="col" className="w-[30%] p-3 text-left font-medium">Jenis pengajuan</th>
                  <th scope="col" className="w-[28%] p-3 text-left font-medium">Deskripsi</th>
                  <th scope="col" className="w-[20%] p-3 text-left font-medium">Lampiran</th>
                  <th scope="col" className="w-[17%] p-3 text-right font-medium">Jumlah (Rp)</th>
                  <th scope="col" className="w-12 p-3 text-center font-medium">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top transition-colors hover:bg-muted/30">
                    <td className="p-2.5">{renderAccountSelect(row, `${row.id}-acc-d`)}</td>
                    <td className="p-2.5">{renderDescription(row, `${row.id}-desc-d`)}</td>
                    <td className="p-2.5">{renderAttachment(row, `${row.id}-att-d`)}</td>
                    <td className="p-2.5">{renderAmount(row, `${row.id}-amt-d`)}</td>
                    <td className="p-2.5 text-center">{renderRemove(row)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold">
                  <td colSpan={3} className="p-3 text-right">Total</td>
                  <td className="p-3 text-right font-mono text-primary">{formatRupiah(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}