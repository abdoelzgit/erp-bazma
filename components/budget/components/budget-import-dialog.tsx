"use client";

import { useState } from "react";
import {
  FileTextIcon,
  UploadSimpleIcon,
  CheckIcon,
  XIcon,
  WarningCircleIcon,
  SpinnerGapIcon,
  CheckCircleIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { parseBudgetExcel } from "../budget-import.parser";
import type { BudgetImportPreview, BudgetImportScope } from "../budget-import.types";
import { cn } from "@/lib/utils";
import { MONTHS } from "../budget-view.constants";

interface BudgetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (data: BudgetImportPreview) => void | Promise<void>;
  scope: BudgetImportScope;
}

export function BudgetImportDialog({
  open,
  onOpenChange,
  onImportComplete,
  scope,
}: BudgetImportDialogProps) {
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<BudgetImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await parseBudgetExcel(file);
      setPreview(result);
      setStep("preview");
    } catch (err: any) {
      setError(err.message || "Gagal memproses file Excel");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    await onImportComplete(preview);
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("upload");
      setPreview(null);
      setError(null);
    }, 300);
  };

  const importableRows = preview?.rows.filter((row) => row.status === "unmapped" || row.status === "new") ?? [];
  const outOfScopeCount = importableRows.filter((row) => {
    if (scope.type === "annual") return row.year !== scope.year;
    const departmentMatches = row.departmentCode
      ? row.departmentCode.trim().toLowerCase() === scope.departmentCode.trim().toLowerCase()
      : row.departmentName.trim().toLowerCase() === scope.departmentName.trim().toLowerCase();
    return row.year !== scope.year || row.month !== scope.month || !departmentMatches;
  }).length;
  const inScopeCount = importableRows.length - outOfScopeCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "transition-all duration-300",
        step === "upload" ? "max-w-md" : "max-w-4xl max-h-[90vh]"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="w-5 h-5 text-green-600" />
            {step === "upload" ? "Import Anggaran" : "Preview Import"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? scope.type === "annual"
                ? `Import anggaran untuk tahun ${scope.year}. File dapat berisi beberapa bulan dalam tahun tersebut.`
                : `Import ulang tabel ${scope.departmentName} untuk ${MONTHS[scope.month - 1]} ${scope.year}. Baris dari departemen atau periode lain akan dilewati.`
              : `Ditemukan ${preview?.totalRows} baris di sheet "${preview?.sheetName}".`}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-4 py-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 transition-colors",
                isLoading ? "bg-muted animate-pulse" : "hover:bg-muted/50 border-muted-foreground/25"
              )}
            >
              {isLoading ? (
                <SpinnerGapIcon className="w-10 h-10 animate-spin text-muted-foreground" />
              ) : (
                <UploadSimpleIcon className="w-10 h-10 text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="font-medium">
                  {isLoading ? "Memproses file..." : "Klik atau seret file ke sini"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Excel (.xlsx, .xls) max 10MB
                </p>
              </div>
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-3 text-sm text-destructive">
                <WarningCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                <InfoIcon className="w-4 h-4" />
                Ketentuan Kolom:
              </div>
              <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside ml-1">
                <li>Harus memiliki header (Baris 1)</li>
                <li>Kolom wajib: Nama Anggaran, Departemen, Bulan, Tahun, Nominal</li>
                <li>Nama bulan bisa teks (Januari) atau angka (1-12)</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              <SummaryCard
                label="Total"
                value={preview?.totalRows || 0}
                icon={FileTextIcon}
                color="blue"
              />
              <SummaryCard
                label="Siap Import"
                value={preview?.summary.unmapped || 0}
                icon={CheckCircleIcon}
                color="green"
              />
              <SummaryCard
                label="Duplikat"
                value={preview?.summary.duplicate || 0}
                icon={SpinnerGapIcon}
                color="yellow"
              />
              <SummaryCard
                label="Error"
                value={preview?.summary.invalid || 0}
                icon={XIcon}
                color="red"
              />
            </div>

            {/* Success message */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              <p className="font-medium">Data siap diimport</p>
              <p className="text-xs mt-1 text-green-600">
                {inScopeCount} baris sesuai cakupan import.
              </p>
            </div>
            {outOfScopeCount > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                {outOfScopeCount} baris berada di luar cakupan dan akan dilewati.
              </div>
            )}
          </div>
        )}

        <DialogFooter className={step === "upload" ? "hidden" : "flex"}>
          <Button variant="outline" onClick={() => setStep("upload")}>
            Ganti File
          </Button>
          <Button
            onClick={handleConfirmImport}
            disabled={!preview || preview.summary.invalid > 0 || inScopeCount === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Import {preview?.summary.unmapped} Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-green-50 border-green-100 text-green-700",
    yellow: "bg-yellow-50 border-yellow-100 text-yellow-700",
    red: "bg-red-50 border-red-100 text-red-700",
  };

  return (
    <div className={cn("p-4 rounded-xl border flex items-center gap-4", colors[color])}>
      <div className="p-2 rounded-lg bg-white/50">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}
