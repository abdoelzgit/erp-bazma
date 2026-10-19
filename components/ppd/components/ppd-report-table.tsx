"use client";

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
      <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Accountability Report Table</h3>
            <p className="text-xs text-muted-foreground">
              Rincian item pengeluaran dan lampiran bukti transaksi.
            </p>
          </div>
        </div>
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-md bg-muted/20">
          Pilih departemen terlebih dahulu untuk menambahkan item pengajuan.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Accountability Report Table</h3>
          <p className="text-xs text-muted-foreground">
            Rincian item pengeluaran dan lampiran bukti transaksi.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5 text-xs h-8">
          <PlusIcon className="size-3.5" />
          Add row
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-md bg-muted/20">
          Tidak ada jenis pengajuan untuk departemen ini.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border/80">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="p-3 text-left font-medium w-[30%]">Jenis Pengajuan</th>
                <th className="p-3 text-left font-medium w-[30%]">Description</th>
                <th className="p-3 text-left font-medium w-[20%]">Attachment</th>
                <th className="p-3 text-right font-medium w-[15%]">Amount (Rp)</th>
                <th className="p-3 text-center font-medium w-[5%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row) => {
                const account = accounts.find((acc) => acc.id === row.accountId);
                const budget = account ? budgets[`${account.id}|${year}|${month}`] : null;
                const sisa = budget ? budget.amount - budget.realized : 0;
                return (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-2.5">
                      <Select value={row.accountId || ""} onValueChange={(v) => onUpdate(row.id, "accountId", v)}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Pilih jenis pengajuan" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => {
                            const b = budgets[`${acc.id}|${year}|${month}`];
                            return (
                              <SelectItem key={acc.id} value={acc.name}>
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
                      {row.accountName && budget && (
                        <div className="text-[10px] text-muted-foreground mt-1 px-1">
                          Sisa: {formatRupiah(sisa)}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5">
                      <Input
                        value={row.description}
                        onChange={(e) => onUpdate(row.id, "description", e.target.value)}
                        className="h-8 text-xs border-dashed"
                      />
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        <PaperclipIcon className="size-3.5 text-muted-foreground shrink-0" />
                        <Input
                          value={row.attachmentName}
                          onChange={(e) => onUpdate(row.id, "attachmentName", e.target.value)}
                          className="h-8 text-xs border-dashed"
                        />
                      </div>
                    </td>
                    <td className="p-2.5 text-right">
                      <Input
                        type="number"
                        value={row.amount || ""}
                        onChange={(e) => onUpdate(row.id, "amount", Number(e.target.value))}
                        className="h-8 text-xs text-right font-mono"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <Button variant="ghost" size="icon" onClick={() => onRemove(row.id)} className="size-7 text-destructive">
                        <TrashIcon className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Belum ada item laporan.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold">
                  <td colSpan={3} className="p-3 text-right">Total:</td>
                  <td className="p-3 text-right font-mono text-primary">{formatRupiah(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
