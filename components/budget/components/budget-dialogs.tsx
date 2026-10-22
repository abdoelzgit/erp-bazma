"use client";

import { XIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(selectedDeptId, selectedAccountName, accountCode, Number(amount));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] overflow-y-auto overscroll-contain rounded-lg bg-card p-6 shadow-xl"
      >
        <DialogHeader className="flex-row items-center justify-between border-b pb-3">
          <div className="min-w-0">
            <DialogTitle className="font-sans text-base font-semibold normal-case tracking-normal">
              Tambah account dan budget
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              Periode {MONTHS[month - 1]} {year}
            </DialogDescription>
          </div>
          <DialogClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Tutup dialog tambah anggaran"
              />
            }
          >
            <XIcon aria-hidden="true" />
          </DialogClose>
        </DialogHeader>

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
            <div role="alert" className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-1.5">
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
      </DialogContent>
    </Dialog>
  );
}
