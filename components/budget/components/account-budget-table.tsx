"use client";

import { useState } from "react";
import Link from "next/link";
import { PencilSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { BudgetRow } from "../budget-view.types";
import { formatRupiah } from "@/lib/utils";

export type AccountBudgetTableProps = {
  rows: BudgetRow[];
  onEdit: (accountId: string, currentValue: number | null) => void;
  onSave: (accountId: string, value: number) => string | null;
  onCancel: () => void;
};

export function AccountBudgetTable({
  rows,
  onEdit,
  onSave,
  onCancel,
}: AccountBudgetTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startEdit = (r: BudgetRow) => {
    setEditingId(r.account.id);
    setEditValue(r.hasBudget ? String(r.amount) : "");
    setError(null);
    onEdit(r.account.id, r.hasBudget ? r.amount : null);
  };

  const saveEdit = (r: BudgetRow) => {
    const value = Number(editValue);
    const err = onSave(r.account.id, value);
    if (err) {
      setError(err);
    } else {
      setEditingId(null);
      setError(null);
    }
  };

  const resetInteraction = () => {
    setEditingId(null);
    setError(null);
    onCancel();
  };

  return (
    <div className="overflow-x-auto rounded-md border border-border/80">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/40 text-muted-foreground">
            <th className="p-3 text-left font-medium">Account ID</th>
            <th className="p-3 text-left font-medium">Name</th>
            <th className="p-3 text-right font-medium">Budget</th>
            <th className="p-3 text-right font-medium">Realisasi</th>
            <th className="p-3 text-right font-medium">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r) => {
            const isEditing = editingId === r.account.id;
            return (
              <>
                <tr
                  key={r.account.id}
                  className={isEditing ? "bg-primary/5" : "hover:bg-muted/30 transition-colors"}
                >
                  <td className="p-3 font-mono text-[11px]">{r.account.code}</td>
                  <td className="p-3 font-semibold text-foreground">{r.account.name}</td>

                  <td className="p-3 text-right font-mono">
                    {isEditing ? (
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <Input
                          autoFocus
                          type="number"
                          min={0}
                          step={500000}
                          value={editValue}
                          onChange={(e) => { setEditValue(e.target.value); setError(null); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(r);
                            if (e.key === "Escape") resetInteraction();
                          }}
                          aria-label={`Budget ${r.account.name}`}
                          className="h-8 w-32 text-right font-mono text-xs"
                        />
                        <Button size="sm" className="h-8 text-xs px-2.5" onClick={() => saveEdit(r)}>
                          Simpan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs px-2.5"
                          onClick={resetInteraction}
                        >
                          Batal
                        </Button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-end gap-2">
                        {r.hasBudget ? (
                          formatRupiah(r.amount)
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-normal text-amber-600 border-amber-500/40">
                            Belum diatur
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => startEdit(r)}
                          aria-label={`${r.hasBudget ? "Ubah" : "Atur"} budget ${r.account.name}`}
                        >
                          {r.hasBudget ? <PencilSimpleIcon className="size-3" /> : "Atur"}
                        </Button>
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-right font-mono">{formatRupiah(r.realized)}</td>

                  <td
                    className={`p-3 text-right font-mono font-semibold ${
                      r.saldo < 0 ? "text-destructive" : "text-emerald-600"
                    }`}
                  >
                    {r.hasBudget ? formatRupiah(r.saldo) : "–"}
                    {r.draf > 0 && (
                      <div className="text-[10px] font-normal text-amber-600">
                        setelah {formatRupiah(r.draf)} ditahan
                      </div>
                    )}
                  </td>
                </tr>

                {isEditing && (
                  <tr key={`${r.account.id}-hint`} className="bg-primary/5">
                    <td colSpan={5} className="px-3 pb-3 pt-0 text-[11px] text-muted-foreground">
                      Batas minimal {formatRupiah(r.draf + r.realized)} (dana ditahan + realisasi).
                      {error && (
                        <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                          <WarningCircleIcon className="size-3.5" />
                          {error}
                        </span>
                      )}
                    </td>
                  </tr>
                )}
              </>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="p-8 text-center text-muted-foreground">
                Tidak ada account yang sesuai pencarian.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
