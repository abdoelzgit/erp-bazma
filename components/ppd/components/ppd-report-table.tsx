"use client";

import type { ReactNode } from "react";
import { InfoIcon, PlusIcon, TrashIcon, PaperclipIcon } from "@phosphor-icons/react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
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
  selectedAccountId: string;
  onAccountChange: (accountId: string) => void;
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
  selectedAccountId,
  onAccountChange,
}: PpdReportTableProps) {
  if (!deptName) {
    return (
      <Card>
        <EmptyState>Pilih departemen terlebih dahulu untuk menambahkan item pengajuan.</EmptyState>
      </Card>
    );
  }

  const getBudget = (accountId: string) => budgets[`${accountId}|${year}|${month}`];

  const accountOptions = accounts.map((account) => ({ value: account.id, label: account.name }));
  const selectedBudget = selectedAccountId ? getBudget(selectedAccountId) : undefined;

  const renderDescription = (row: ReportRow, id: string) => (
    <Input
      placeholder="Deskripsi item"
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
    placeholder="000000"
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
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2 sm:flex-initial">
          <div className="min-w-48 flex-1 space-y-1 sm:w-56 sm:flex-none">
            <label htmlFor="ppd-report-account" className="text-xs font-medium text-muted-foreground">
              Jenis pengajuan
            </label>
            <Select
              value={selectedAccountId}
              onValueChange={(value) => value && onAccountChange(value)}
              items={accountOptions}
            >
              <SelectTrigger id="ppd-report-account" className="h-9 w-full bg-background text-xs">
                <SelectValue placeholder="Pilih jenis pengajuan" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAccountId && (
            <PopoverPrimitive.Root>
              <PopoverPrimitive.Trigger
                openOnHover
                delay={150}
                closeDelay={120}
                aria-label="Lihat detail anggaran"
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-muted-foreground">Sisa anggaran</span>
                <span className="font-mono font-medium text-foreground">
                  {selectedBudget ? formatRupiah(selectedBudget.amount - selectedBudget.realized) : "Belum diatur"}
                </span>
                <InfoIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </PopoverPrimitive.Trigger>
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
                  <PopoverPrimitive.Popup className="w-72 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg outline-none data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {accounts.find((account) => account.id === selectedAccountId)?.name ?? "Detail anggaran"}
                        </p>
                        <p className="text-xs text-muted-foreground">Periode {month}/{year}</p>
                      </div>
                      {selectedBudget ? (
                        <dl className="space-y-2 border-t pt-3 text-xs">
                          <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Total anggaran</dt>
                            <dd className="font-mono font-medium">{formatRupiah(selectedBudget.amount)}</dd>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Terpakai</dt>
                            <dd className="font-mono">{formatRupiah(selectedBudget.realized)}</dd>
                          </div>
                          <div className="flex items-center justify-between gap-4 border-t pt-2">
                            <dt className="font-medium">Sisa anggaran</dt>
                            <dd className="font-mono font-semibold text-primary">
                              {formatRupiah(selectedBudget.amount - selectedBudget.realized)}
                            </dd>
                          </div>
                        </dl>
                      ) : (
                        <p className="border-t pt-3 text-xs text-muted-foreground">
                          Anggaran belum diatur untuk periode ini.
                        </p>
                      )}
                    </div>
                  </PopoverPrimitive.Popup>
                </PopoverPrimitive.Positioner>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAdd}
            className="h-9 gap-1.5 text-xs"
          >
            <PlusIcon className="size-3.5" />
            Tambah baris
          </Button>
        </div>
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
            <table className="w-full min-w-[680px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th scope="col" className="min-w-56 p-3 text-left font-medium">Deskripsi</th>
                  <th scope="col" className="min-w-40 p-3 text-left font-medium">Lampiran</th>
                  <th scope="col" className="w-52 min-w-52 p-3 text-right font-medium">Jumlah (Rp)</th>
                  <th scope="col" className="w-12 p-3 text-center font-medium">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top transition-colors hover:bg-muted/30">
                    <td className="p-2.5">{renderDescription(row, `${row.id}-desc-d`)}</td>
                    <td className="p-2.5">{renderAttachment(row, `${row.id}-att-d`)}</td>
                    <td className="p-2.5">{renderAmount(row, `${row.id}-amt-d`)}</td>
                    <td className="p-2.5 text-center">{renderRemove(row)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold">
                  <td colSpan={2} className="p-3 text-right">Total</td>
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
