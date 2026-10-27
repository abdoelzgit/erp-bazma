"use client";

import { useState, type ReactNode } from "react";
import {
  CaretLeftIcon,
  CaretRightIcon,
  InfoIcon,
  PaperclipIcon,
  PlusIcon,
  UploadSimpleIcon,
  CircleNotchIcon,
  TrashIcon,
  EyeIcon,
} from "@phosphor-icons/react";


import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatRupiah } from "@/lib/utils";
import { getPpdAttachmentName } from "@/lib/ppd-attachment-name";
import type { ReportRow } from "../ppd.types";

const PAGE_SIZE = 5;
// Tinggi satu baris tabel (input h-9 + padding py-2.5 + border) agar tabel selalu setinggi 5 baris.
const ROW_HEIGHT_PX = 57;
const ROW_HEIGHT_CLASS = "h-[57px]";

const amountInputClass =
  "h-9 pl-9 text-right font-mono text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export type PpdReportTableProps = {
  draftId: string;
  rows: ReportRow[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof ReportRow, value: string | number | string[] | null) => void;
  onRemove: (id: string) => void;
  total: number;
  deptName: string;
  year: number;
  month: number;
  budgets: Record<string, { amount: number; realized: number; reserved: number }>;
  accounts: Array<{ id: string; deptId: string; code: string; name: string }>;
  selectedAccountId: string;
  onAccountChange: (accountId: string) => void;
  readOnly?: boolean;
  revisionOnly?: boolean;
  title?: string;
  description?: string;
  hideAccountSelector?: boolean;
  comparisonAmount?: number;
};

function ReportCard({ children, title, description }: { children: ReactNode; title?: string; description?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title ?? "Tabel laporan pertanggungjawaban"}</CardTitle>
        <CardDescription className="text-xs">{description ?? "Rincian item pengeluaran dan lampiran bukti transaksi."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function PpdReportTable({
  draftId,
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
  readOnly = false,
  revisionOnly = false,
  title,
  description,
  hideAccountSelector = false,
  comparisonAmount,
}: PpdReportTableProps) {
  const [page, setPage] = useState(0);
  const [uploadingRows, setUploadingRows] = useState<string[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<Record<string, string>>({});

  if (!deptName) {
    return (
      <ReportCard title={title} description={description}>
        <EmptyState>Pilih departemen terlebih dahulu untuk menambahkan item pengajuan.</EmptyState>
      </ReportCard>
    );
  }

  const accountOptions = accounts.map((account) => ({ value: account.id, label: account.name }));
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const selectedBudget = selectedAccountId
    ? budgets[`${selectedAccountId}|${year}|${month}`]
    : undefined;
  const reserved = selectedBudget?.reserved ?? 0;
  const remaining = selectedBudget
    ? selectedBudget.amount - selectedBudget.realized - reserved
    : undefined;
  const comparisonDifference = comparisonAmount === undefined ? undefined : comparisonAmount - total;

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const startIndex = currentPage * PAGE_SIZE;
  const pageRows = rows.slice(startIndex, startIndex + PAGE_SIZE);
  const firstRow = rows.length === 0 ? 0 : startIndex + 1;
  const lastRow = Math.min(startIndex + PAGE_SIZE, rows.length);

  const renderTitle = (row: ReportRow, id: string, index: number) => (
    <Input
      id={id}
      aria-label={`Judul item ${index}`}
      placeholder="Judul laporan"
      value={row.title}
      onChange={(e) => onUpdate(row.id, "title", e.target.value)}
      disabled={readOnly}
      className="h-9 text-xs"
    />
  );

  const renderDescription = (row: ReportRow, id: string, index: number) => (
    <Input
      id={id}
      aria-label={`Deskripsi item ${index}`}
      placeholder="Deskripsi item"
      value={row.description}
      onChange={(e) => onUpdate(row.id, "description", e.target.value)}
      disabled={readOnly}
      className="h-9 text-xs"
    />
  );

  const renderAttachment = (row: ReportRow, id: string, index: number) => {
    const fileInputId = `${id}-file`;
    const attachments = row.attachmentNames?.length ? row.attachmentNames : row.attachmentName ? [row.attachmentName] : [];
    const isUploading = uploadingRows.includes(row.id);
    const removeAttachment = (attachmentIndex: number) => {
      const nextAttachments = attachments.filter((_, currentIndex) => currentIndex !== attachmentIndex);
      onUpdate(row.id, "attachmentName", nextAttachments[0] ?? "");
      onUpdate(row.id, "attachmentNames", nextAttachments);
    };
    const renderAttachmentItem = (url: string, attachmentIndex: number) => {
      const isPreviewable = /\.(jpe?g|png|webp|pdf)(?:[?#]|$)/i.test(url);
      const originalName = getPpdAttachmentName(url, `Lampiran ${attachmentIndex + 1}`);
      return (
        <li key={`${url}-${attachmentIndex}`} className="flex min-w-0 items-center justify-between gap-3 rounded-md border bg-background px-2 py-1.5">
          {isPreviewable ? (
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Buka pratinjau ${originalName} di tab baru untuk item ${index}`} title={originalName}>
              <EyeIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{originalName}</span>
            </a>
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-xs text-primary underline-offset-4 hover:underline" title={originalName}>
              {originalName}
            </a>
          )}
          {!readOnly && <Button type="button" variant="ghost" size="icon-xs" className="size-6 shrink-0 text-muted-foreground hover:text-destructive" disabled={isUploading} onClick={() => removeAttachment(attachmentIndex)} aria-label={`Hapus lampiran ${attachmentIndex + 1} dari item ${index}`}><TrashIcon className="size-3.5" /></Button>}
        </li>
      );
    };

    return (
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <Input
            id={fileInputId}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            aria-label={`Pilih lampiran untuk item ${index}`}
            className="sr-only"
            disabled={isUploading || readOnly}
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
              if (!files.length) return;

              setAttachmentErrors((previous) => ({ ...previous, [row.id]: "" }));
              setUploadingRows((previous) => [...previous, row.id]);
              void (async () => {
                const uploadedUrls: string[] = [];
                try {
                  for (const file of files) {
                    const formData = new FormData();
                    formData.set("draftId", draftId);
                    formData.set("file", file);
                    const response = await fetch("/api/ppd/attachments", { method: "POST", body: formData });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error ?? `Lampiran ${file.name} gagal diunggah.`);
                    uploadedUrls.push(result.url);
                    const nextAttachments = [...attachments, ...uploadedUrls];
                    onUpdate(row.id, "attachmentName", nextAttachments[0] ?? "");
                    onUpdate(row.id, "attachmentNames", nextAttachments);
                  }
                } catch (error: unknown) {
                  setAttachmentErrors((previous) => ({
                    ...previous,
                    [row.id]: error instanceof Error ? error.message : "Lampiran gagal diunggah.",
                  }));
                } finally {
                  setUploadingRows((previous) => previous.filter((rowId) => rowId !== row.id));
                }
              })();
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-8 shrink-0 gap-1.5 px-2 xl:w-8 xl:px-0"
            disabled={isUploading || readOnly}
            onClick={() => document.getElementById(fileInputId)?.click()}
            aria-label={`Tambah lampiran untuk item ${index}`}
          >
            {isUploading ? (
              <CircleNotchIcon className="size-3.5 animate-spin" />
            ) : (
              <UploadSimpleIcon className="size-3.5" />
            )}
            <span className="xl:sr-only">{isUploading ? "Mengunggah" : "Tambah lampiran"}</span>
          </Button>
          {attachments.length ? (
            <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
              {renderAttachmentItem(attachments[0], 0)}
              {attachments.length > 1 && (
                <li>
                  <Popover>
                    <PopoverTrigger aria-label={`Lihat ${attachments.length - 1} lampiran lainnya untuk item ${index}`} className="inline-flex h-7 items-center rounded-md border bg-background px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      +{attachments.length - 1} lainnya
                    </PopoverTrigger>
                    <PopoverContent align="start" className="max-h-72 overflow-y-auto p-3">
                      <h4 className="mb-2 text-xs font-semibold">Lampiran lainnya</h4>
                      <ul className="space-y-1.5">
                        {attachments.slice(1).map((url, attachmentIndex) => renderAttachmentItem(url, attachmentIndex + 1))}
                      </ul>
                    </PopoverContent>
                  </Popover>
                </li>
              )}
            </ul>
          ) : (
            <span className="min-w-0 truncate text-[11px] text-muted-foreground">Pilih satu atau beberapa file (maks. 10 MB per file)</span>
          )}
        </div>
        {attachmentErrors[row.id] && (
          <p role="alert" className="text-[11px] text-destructive">{attachmentErrors[row.id]}</p>
        )}
      </div>
    );
  };

  const renderAmount = (row: ReportRow, id: string, index: number) => (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
        Rp
      </span>
      <Input
        id={id}
        aria-label={`Jumlah item ${index}`}
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="0"
        value={row.amount || ""}
        onChange={(e) => onUpdate(row.id, "amount", Number(e.target.value))}
      disabled={readOnly}
        className={amountInputClass}
      />
    </div>
  );

  const renderRemove = (row: ReportRow, index: number) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => onRemove(row.id)}
        disabled={readOnly}
      className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      aria-label={`Hapus item ${index}`}
    >
      <TrashIcon className="size-4" />
    </Button>
  );

  return (
    <ReportCard title={title} description={description}>
      {revisionOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Anda dapat menambah dan menghapus baris, serta mengubah judul, nominal, dan lampiran. Account dan deskripsi tetap.</p>
          <Button type="button" size="sm" onClick={() => { setPage(Math.floor(rows.length / PAGE_SIZE)); onAdd(); }} disabled={readOnly || rows.length >= 200} className="h-9 gap-1.5 text-xs">
            <PlusIcon className="size-3.5" />
            Tambah baris
          </Button>
        </div>
      ) : <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
          {!hideAccountSelector && <div className="w-full min-w-48 space-y-1.5 sm:w-60 sm:flex-none">
            <Label htmlFor="ppd-report-account" className="text-xs text-muted-foreground">
              Jenis pengajuan
            </Label>
            <Select
              value={selectedAccountId}
              disabled={readOnly || revisionOnly}
              onValueChange={(value) => {
                if (!value) return;
                setPage(0);
                onAccountChange(value);
              }}
              items={accountOptions}
            >
              <SelectTrigger id="ppd-report-account" className="h-9 w-full text-xs">
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
          </div>}

          {(comparisonAmount !== undefined || selectedAccountId) && (
            <Popover>
              <PopoverTrigger
                openOnHover
                delay={150}
                closeDelay={120}
                aria-label={comparisonAmount !== undefined ? "Lihat perbandingan uang muka dan realisasi" : "Lihat detail anggaran"}
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-xs shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-muted-foreground">{comparisonAmount !== undefined ? "Selisih pengajuan" : "Sisa anggaran"}</span>
                <span
                  className={cn(
                    "font-mono font-medium",
                    comparisonDifference !== undefined
                      ? comparisonDifference < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                      : remaining !== undefined && remaining < 0 && "text-destructive",
                  )}
                >
                  {comparisonDifference !== undefined
                    ? `${comparisonDifference > 0 ? "+" : comparisonDifference < 0 ? "-" : ""}${formatRupiah(Math.abs(comparisonDifference))}`
                    : remaining !== undefined ? formatRupiah(remaining) : "Belum diatur"}
                </span>
                <InfoIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </PopoverTrigger>
              <PopoverContent align="start" sideOffset={8} className="w-72 space-y-3 p-4">
                {comparisonAmount !== undefined ? (
                  <>
                    <div>
                      <p className="text-sm font-semibold">Perbandingan uang muka</p>
                      <p className="text-xs text-muted-foreground">Pengajuan awal dibandingkan dengan total laporan realisasi.</p>
                    </div>
                    <dl className="space-y-2 border-t pt-3 text-xs">
                      <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Jumlah pengajuan awal</dt><dd className="font-mono">{formatRupiah(comparisonAmount)}</dd></div>
                      <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Realisasi</dt><dd className="font-mono">{formatRupiah(total)}</dd></div>
                      <div className="flex items-center justify-between gap-4 border-t pt-2"><dt className="font-medium">{comparisonDifference! > 0 ? "Surplus" : comparisonDifference! < 0 ? "Kekurangan" : "Selisih"}</dt><dd className={cn("font-mono font-semibold", comparisonDifference! < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>{comparisonDifference! > 0 ? "+" : comparisonDifference! < 0 ? "-" : ""}{formatRupiah(Math.abs(comparisonDifference!))}</dd></div>
                    </dl>
                  </>
                ) : <>
                <div>
                  <p className="text-sm font-semibold">{selectedAccount?.name ?? "Detail anggaran"}</p>
                  <p className="text-xs text-muted-foreground">Periode {month}/{year}</p>
                </div>
                {selectedBudget ? (
                  <dl className="space-y-2 border-t pt-3 text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Total anggaran</dt>
                      <dd className="font-mono font-medium">{formatRupiah(selectedBudget.amount)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Realisasi</dt>
                      <dd className="font-mono">{formatRupiah(selectedBudget.realized)}</dd>
                    </div>
                          <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">PPD aktif (draft/terkirim)</dt>
                            <dd className="font-mono">{formatRupiah(reserved)}</dd>
                          </div>
                    <div className="flex items-center justify-between gap-4 border-t pt-2">
                            <dt className="font-medium">Sisa tersedia</dt>
                      <dd
                        className={cn(
                          "font-mono font-semibold",
                          remaining !== undefined && remaining < 0 ? "text-destructive" : "text-primary",
                        )}
                      >
                        {formatRupiah(remaining ?? 0)}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="border-t pt-3 text-xs text-muted-foreground">
                    Anggaran belum diatur untuk periode ini.
                  </p>
                )}
                </>}
              </PopoverContent>
            </Popover>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => {
            setPage(Math.floor(rows.length / PAGE_SIZE));
            onAdd();
          }}
          disabled={accounts.length === 0 || readOnly}
          className="h-9 gap-1.5 text-xs"
        >
          <PlusIcon className="size-3.5" />
          Tambah baris
        </Button>
      </div>
      </>}

      {accounts.length === 0 && !revisionOnly && !hideAccountSelector ? (
        <EmptyState>Tidak ada jenis pengajuan untuk departemen ini.</EmptyState>
      ) : (
        <>
          {/* Mobile: kartu per baris */}
          <ul className="min-w-0 space-y-3 xl:hidden">
            {rows.length === 0 && (
              <li>
                <EmptyState>Belum ada item laporan. Klik “Tambah baris” untuk memulai.</EmptyState>
              </li>
            )}
            {pageRows.map((row, i) => {
              const index = startIndex + i + 1;
              return (
                <li key={row.id} className="space-y-3 rounded-lg border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Item {index}</span>
                    {renderRemove(row, index)}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`${row.id}-title`} className="text-xs text-muted-foreground">
                      Judul
                    </Label>
                    {renderTitle(row, `${row.id}-title`, index)}
                  </div>

                  {!revisionOnly && <div className="space-y-1.5">
                    <Label htmlFor={`${row.id}-desc`} className="text-xs text-muted-foreground">
                      Deskripsi
                    </Label>
                    {renderDescription(row, `${row.id}-desc`, index)}
                  </div>}

                  <div className="space-y-1.5">
                    <Label htmlFor={`${row.id}-att`} className="text-xs text-muted-foreground">
                      Lampiran
                    </Label>
                    {renderAttachment(row, `${row.id}-att`, index)}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`${row.id}-amt`} className="text-xs text-muted-foreground">
                      Jumlah
                    </Label>
                    {renderAmount(row, `${row.id}-amt`, index)}
                  </div>
                </li>
              );
            })}

            <li className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-3 text-sm font-semibold">
              <span>Total</span>
              <span className="font-mono text-primary">{formatRupiah(total)}</span>
            </li>
          </ul>

          {/* Desktop: tabel */}
          <div className="hidden min-w-0 max-w-full rounded-md border xl:block">
            <Table
              containerClassName="overflow-x-clip"
              className="w-full min-w-[720px] table-fixed text-xs"
            >
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Judul</TableHead>
                  {!revisionOnly && <TableHead>Deskripsi</TableHead>}
                  <TableHead>Lampiran</TableHead>
                  <TableHead className="w-48 text-right">Jumlah</TableHead>
                  <TableHead className="w-12 text-center">
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row, i) => {
                  const index = startIndex + i + 1;
                  return (
                    <TableRow key={row.id} className={cn("align-top", ROW_HEIGHT_CLASS)}>

                      <TableCell className="py-2.5">
                        {renderTitle(row, `${row.id}-title-d`, index)}
                      </TableCell>
                      {!revisionOnly && <TableCell className="py-2.5">
                        {renderDescription(row, `${row.id}-desc-d`, index)}
                      </TableCell>}
                      <TableCell className="overflow-hidden py-2.5">
                        {renderAttachment(row, `${row.id}-att-d`, index)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        {renderAmount(row, `${row.id}-amt-d`, index)}
                      </TableCell>
                      <TableCell className="py-2.5 text-center">{renderRemove(row, index)}</TableCell>
                    </TableRow>
                  );
                })}

                {rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={revisionOnly ? 4 : 5}
                      style={{ height: PAGE_SIZE * ROW_HEIGHT_PX }}
                      className="p-0 text-center text-sm text-muted-foreground"
                    >
                      Belum ada item laporan. Klik “Tambah baris” untuk memulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  Array.from({ length: PAGE_SIZE - pageRows.length }, (_, i) => (
                    <TableRow
                      key={`filler-${i}`}
                      aria-hidden="true"
                      className={cn("hover:bg-transparent", ROW_HEIGHT_CLASS)}
                    >
                      <TableCell colSpan={revisionOnly ? 4 : 5} className="p-0" />
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={revisionOnly ? 2 : 3} className="py-3 text-right font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono font-semibold text-primary">
                    {formatRupiah(total)}
                  </TableCell>
                  <TableCell className="w-12" />
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Paginasi */}
          <nav
            aria-label="Navigasi halaman laporan"
            className="flex items-center justify-between gap-3"
          >
            <p aria-live="polite" className="text-xs text-muted-foreground">
              Baris {firstRow}–{lastRow} dari {rows.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0}
                aria-label="Halaman sebelumnya"
              >
                <CaretLeftIcon />
              </Button>
              <span className="min-w-24 text-center text-xs text-muted-foreground">
                Halaman {currentPage + 1} dari {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount - 1}
                aria-label="Halaman berikutnya"
              >
                <CaretRightIcon />
              </Button>
            </div>
          </nav>
        </>
      )}
    </ReportCard>
  );
}
