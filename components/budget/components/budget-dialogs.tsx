"use client";

import { XIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Department } from "../budget-view.types";
import { MONTHS } from "../budget-view.constants";

export type CreateBudgetDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (deptId: string, accountName: string, accountCode: string, amount: number) => void | Promise<void>;
  month: number;
  year: number;
  departments: Department[];
  selectedDeptId: string;
  selectedAccountName: string;
  accountCode: string;
  amount: string;
  error: string | null;
  onDeptChange: (deptId: string) => void;
  onAccountNameChange: (accountName: string) => void;
  onAccountCodeChange: (accountCode: string) => void;
  onAmountChange: (amount: string) => void;
  onErrorChange: (error: string | null) => void;
};

export function CreateBudgetDialog({
  open,
  onClose,
  onSubmit,
  month,
  year,
  departments,
  selectedDeptId,
  selectedAccountName,
  accountCode,
  amount,
  error,
  onDeptChange,
  onAccountNameChange,
  onAccountCodeChange,
  onAmountChange,
  onErrorChange,
}: CreateBudgetDialogProps) {
  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(selectedDeptId, selectedAccountName, accountCode, Number(amount));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-title"
        className="bg-card border rounded-lg max-w-md w-full p-6 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 id="create-title" className="font-semibold text-base">Tambah account dan budget</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Periode {MONTHS[month - 1]} {year}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label htmlFor="c-dept" className="font-medium text-muted-foreground">Departemen</label>
            <Select
              value={selectedDeptId}
              onValueChange={(v) => { if (v) onDeptChange(v); onAccountNameChange(""); onAccountCodeChange(""); onErrorChange(null); }}
              items={departments.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` }))}
            >
              <SelectTrigger id="c-dept" className="w-full">
                <SelectValue placeholder="Pilih departemen" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="c-account" className="font-medium text-muted-foreground">Nama account</label>
            <Input
              id="c-account"
              list="c-account-options"
              value={selectedAccountName}
              onChange={(e) => { onAccountNameChange(e.target.value); onErrorChange(null); }}
              placeholder="Masukkan nama account baru"
              autoComplete="off"
              className="h-9 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Account baru akan dibuat untuk departemen yang dipilih.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="c-account-code" className="font-medium text-muted-foreground">Kode account</label>
            <Input
              id="c-account-code"
              value={accountCode}
              onChange={(e) => { onAccountCodeChange(e.target.value.toUpperCase()); onErrorChange(null); }}
              placeholder="Contoh: 5101"
              autoComplete="off"
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="c-amount" className="font-medium text-muted-foreground">Budget (Rp)</label>
            <Input
              id="c-amount"
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => { onAmountChange(e.target.value); onErrorChange(null); }}
              className="h-9 text-xs font-mono"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-1.5">
              <WarningCircleIcon className="size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-3 border-t flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" size="sm">Buat account dan budget</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
