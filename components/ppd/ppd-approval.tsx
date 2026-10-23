"use client";

import { useMemo, useState } from "react";
import { CheckCircleIcon, CircleNotchIcon, FileArrowUpIcon } from "@phosphor-icons/react";
import { decidePpdAction, submitPpdPaymentAction } from "@/app/actions/ppd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PpdApprovalQueueItem } from "./ppd.types";
import { ppdActionLabel, ppdStageLabel, ppdStatusLabel } from "@/lib/ppd-labels";
import { formatRupiah } from "@/lib/utils";
import { getPpdRevisionChanges } from "@/lib/ppd-revision";
import { PpdCommentsDialog } from "./ppd-comments-dialog";

type Props = { role: string | null; initialItems: PpdApprovalQueueItem[] };
type UploadedProof = {
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
};

export function PpdApproval({ role, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedProof, setUploadedProof] = useState<UploadedProof | null>(null);
  const [paidAmount, setPaidAmount] = useState(initialItems[0]?.limitFund ?? "");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState("");
  const [decisionDialog, setDecisionDialog] = useState<"revise" | "cancel" | null>(null);

  const selected = items.find((item) => item.id === selectedId);
  const canReview = Boolean(selected && (
    (role === "DEPT_HEAD" && selected.status === "PENDING_DEPT_HEAD") ||
    (role === "FINANCE" && selected.status === "PENDING_FINANCE") ||
    (role === "EXECUTIVE" && selected.status === "PENDING_EXECUTIVE")
  ));
  const canCancel = canReview;
  const canPay = role === "FINANCE" && selected?.status === "PENDING_FINANCE_PAYMENT";
  const total = useMemo(() => selected?.rows.reduce((sum, row) => sum + row.amount, 0) ?? 0, [selected]);
  const revisionChanges = selected?.revisionSnapshot ? getPpdRevisionChanges(selected.revisionSnapshot, {
    title: selected.title,
    description: selected.description,
    departmentId: selected.deptId,
    submissionType: selected.submissionType as "UANG_MUKA" | "PEMBAYARAN",
    paymentType: selected.paymentType,
    bank: selected.bank,
    accountNo: selected.accountNo,
    limitFund: Number(selected.formLimitFund),
    year: selected.year,
    month: selected.month,
    rows: selected.rows.map((row) => ({ accountId: row.accountId, title: row.title, description: row.description, attachmentName: row.attachmentName, amount: row.amount })),
  }) : [];

  const runDecision = async (decision: "approve" | "revise" | "cancel") => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await decidePpdAction({ id: selected.id, decision, note });
      if (result.error) return setError(result.error);
      const label = decision === "approve" ? "PPD disetujui." : decision === "revise" ? "PPD dikembalikan untuk revisi." : "PPD dibatalkan.";
      setItems((current) => current.filter((item) => item.id !== selected.id));
      const next = items.find((item) => item.id !== selected.id);
      setSelectedId(next?.id ?? "");
      setNote("");
      setDecisionDialog(null);
      setMessage(label);
    } catch {
      setError("Keputusan PPD gagal diproses. Muat ulang antrean lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const uploadPaymentProof = async () => {
    if (!selected || !file) return setError("Pilih file bukti pembayaran terlebih dahulu.");
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("requestId", selected.id);
      form.set("file", file);
      const upload = await fetch("/api/ppd/payment-proof-uploads", { method: "POST", body: form });
      const uploadResult = await upload.json();
      if (!upload.ok) throw new Error(uploadResult.error ?? "Bukti pembayaran gagal diunggah.");
      setUploadedProof({
        fileName: uploadResult.fileName,
        originalFileName: uploadResult.originalFileName,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
      });
      setMessage("Bukti berhasil diunggah. Periksa data pembayaran, lalu submit verifikasi.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Bukti pembayaran gagal diunggah.");
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = async () => {
    if (!selected || !uploadedProof) return setError("Unggah bukti pembayaran sebelum submit verifikasi.");
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await submitPpdPaymentAction({
        id: selected.id,
        ...uploadedProof,
        paidAmount: Number(paidAmount),
        paidAt,
        referenceNumber,
        note,
      });
      if (result.error) throw new Error(result.error);
      setItems((current) => current.filter((item) => item.id !== selected.id));
      const next = items.find((item) => item.id !== selected.id);
      setSelectedId(next?.id ?? "");
      setFile(null);
      setUploadedProof(null);
      setNote("");
      setMessage("Pembayaran diverifikasi. Status PPD menjadi Lunas.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pembayaran gagal diproses.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100svh-4rem)] flex-col bg-background lg:h-svh lg:min-h-0 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-r bg-muted/20 lg:h-full lg:min-h-0 lg:w-80">
        <div className="border-b p-5">
          <h1 className="text-xl font-semibold tracking-tight">Approval PPD</h1>
          <p className="mt-1 text-sm text-muted-foreground">{role === "ADMIN" ? "Pemantauan semua PPD. Approval tetap dilakukan oleh reviewer tahapnya." : "Antrean sesuai tahap dan tanggung jawab Anda."}</p>
          <Badge variant="secondary" className="mt-3">{items.length} {role === "ADMIN" ? "permohonan" : "menunggu"}</Badge>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.map((item) => (
            <article key={item.id} className={`border-b p-3 transition-colors ${selectedId === item.id ? "bg-accent/70" : "bg-background hover:bg-muted/40"}`}>
              <button
                type="button"
                onClick={() => { setSelectedId(item.id); setError(null); setMessage(null); setNote(""); setFile(null); setUploadedProof(null); setPaidAmount(String(Number(item.limitFund))); }}
                aria-pressed={selectedId === item.id}
                className="w-full p-1 text-left"
              >
              <span className="flex items-center justify-between gap-3">
                <span className="truncate text-xs font-medium text-muted-foreground">{item.no}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{formatRupiah(Number(item.limitFund))}</span>
              </span>
              <span className="mt-2 block truncate text-sm font-semibold">{item.title || "Permohonan tanpa judul"}</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">{item.requesterName} · {item.departmentName}</span>
              <Badge variant="outline" className="mt-2">{ppdStatusLabel(item.status)}</Badge>
              </button>
              <div className="mt-2 flex justify-end"><PpdCommentsDialog requestId={item.id} requestTitle={item.title} /></div>
            </article>
          ))}
          {items.length === 0 && (
            <div className="p-8 text-center">
              <CheckCircleIcon className="mx-auto size-7 text-emerald-600" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium">Antrean kosong</p>
              <p className="mt-1 text-xs text-muted-foreground">PPD yang menjadi tanggung jawab Anda akan muncul di sini.</p>
            </div>
          )}
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8">
          {message && <div role="status" className="rounded-md border border-emerald-600/30 bg-emerald-600/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">{message}</div>}
          {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          {!selected ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <h2 className="font-medium">Pilih permohonan</h2>
              <p className="mt-1 text-sm text-muted-foreground">Detail PPD akan tampil di area ini.</p>
            </div>
          ) : (
            <>
              <header className="space-y-2 border-b pb-5">
                <p className="text-xs text-muted-foreground">{selected.no} · {selected.departmentName}</p>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight">{selected.title || "Permohonan PPD"}</h2>
                  <Badge>{ppdStatusLabel(selected.status)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Diajukan oleh {selected.requesterName} · {new Date(selected.createdAt).toLocaleDateString("id-ID")}</p>
                {selected.description && <p className="max-w-2xl whitespace-pre-wrap text-sm">{selected.description}</p>}
                <div className="flex"><PpdCommentsDialog requestId={selected.id} requestTitle={selected.title} /></div>
              </header>

              {selected.revisionSnapshot && (
                <section className="space-y-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
                  <div>
                    <h3 className="text-sm font-semibold">Perubahan sejak revisi diminta</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Perbandingan isi revisi dengan versi yang dikembalikan kepada pemohon.</p>
                  </div>
                  {revisionChanges.length ? <ul className="space-y-2 text-sm">
                    {revisionChanges.map((change, index) => <li key={`${change.label}-${index}`} className="rounded-md bg-background/70 p-3">
                      <p className="font-medium">{change.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Sebelum: {change.before}</p>
                      <p className="text-xs">Sesudah: {change.after}</p>
                    </li>)}
                  </ul> : <p className="text-sm text-muted-foreground">Belum ada perubahan terdeteksi pada revisi ini.</p>}
                </section>
              )}

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Rincian anggaran</h3>
                  <span className="text-sm font-semibold tabular-nums">Total {formatRupiah(total)}</span>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[36rem] text-sm">
                    <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                      <tr><th className="px-3 py-2.5 font-medium">Account / Judul</th><th className="px-3 py-2.5 font-medium">Deskripsi</th><th className="px-3 py-2.5 text-right font-medium">Jumlah</th><th className="px-3 py-2.5 font-medium">Lampiran</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {selected.rows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-3 py-3">{row.accountName || "—"}<span className="block text-xs text-muted-foreground">{row.title}</span></td>
                          <td className="px-3 py-3 text-muted-foreground">{row.description || "—"}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatRupiah(row.amount)}</td>
                          <td className="px-3 py-3">{row.attachmentName ? <a className="text-primary underline underline-offset-4" href={row.attachmentName} target="_blank" rel="noreferrer">Lihat</a> : <span className="text-muted-foreground">—</span>}</td>
                        </tr>
                      ))}
                      {selected.rows.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Tidak ada rincian item.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <dl className="grid gap-3 rounded-lg bg-muted/30 p-4 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs text-muted-foreground">Periode</dt><dd className="mt-1 font-medium">{selected.month}/{selected.year}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Jenis pengajuan</dt><dd className="mt-1 font-medium">{selected.submissionType}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Metode pembayaran</dt><dd className="mt-1 font-medium">{selected.paymentType}</dd></div>
                </dl>
              </section>

              <section className="space-y-3 border-t pt-5">
                <h3 className="text-sm font-semibold">Riwayat keputusan</h3>
                <ol className="space-y-3">
                  {selected.approvalEvents.map((event) => (
                    <li key={event.id} className="grid grid-cols-[1rem_1fr] gap-3 text-sm">
                      <span className="mt-1.5 size-2 rounded-full bg-primary" aria-hidden="true" />
                      <div>
                        <p className="font-medium">{ppdActionLabel(event.action)} · {ppdStageLabel(event.stage)}</p>
                        <p className="text-xs text-muted-foreground">{event.actorName} · {new Date(event.createdAt).toLocaleString("id-ID")}</p>
                        {event.note && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{event.note}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {(canReview || canCancel) && (
                <section className="space-y-3 rounded-lg border p-4">
                  <div>
                    <h3 className="text-sm font-semibold">Tindakan {role === "DEPT_HEAD" ? "Dept Head" : role === "EXECUTIVE" ? "Pimpinan" : "Finance"}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Setujui untuk melanjutkan, atau buka dialog untuk membatalkan dan memberi catatan revisi.</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {canCancel && <Button variant="outline" disabled={busy} onClick={() => { setNote(""); setDecisionDialog("cancel"); }}>Batalkan</Button>}
                    {canReview && <>
                      <Button variant="outline" disabled={busy} onClick={() => { setNote(""); setDecisionDialog("revise"); }}>Minta revisi</Button>
                      <Button disabled={busy} onClick={() => void runDecision("approve")}>
                        {busy && <CircleNotchIcon className="mr-2 size-4 animate-spin" />}
                        Setujui dan lanjutkan
                      </Button>
                    </>}
                  </div>
                </section>
              )}

              {canPay && (
                <section className="space-y-4 rounded-lg border p-4">
                  <div>
                    <h3 className="text-sm font-semibold">Proses pembayaran</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Unggah satu bukti final, lalu submit verifikasi untuk mencatat realisasi dan menetapkan status Lunas.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-medium">Nominal dibayar
                      <Input type="number" min="0" step="0.01" value={paidAmount || String(Number(selected.limitFund))} onChange={(event) => setPaidAmount(event.target.value)} />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium">Tanggal pembayaran
                      <Input type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium sm:col-span-2">Nomor referensi (opsional)
                      <Input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} maxLength={120} />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium sm:col-span-2">Bukti pembayaran
                      <Input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setUploadedProof(null); setMessage(null); }} />
                      <span className="block font-normal text-muted-foreground">Maksimal 10 MB. {uploadedProof ? `${uploadedProof.originalFileName} — siap diverifikasi` : file?.name}</span>
                    </label>
                    <label className="space-y-1.5 text-xs font-medium sm:col-span-2">Catatan Finance (opsional)
                      <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={2} />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" disabled={busy || !file} onClick={() => void uploadPaymentProof()}>
                      {busy ? <CircleNotchIcon className="mr-2 size-4 animate-spin" /> : <FileArrowUpIcon className="mr-2 size-4" />}
                      Unggah bukti
                    </Button>
                    <Button disabled={busy || !uploadedProof} onClick={() => void submitPayment()}>
                      {busy ? <CircleNotchIcon className="mr-2 size-4 animate-spin" /> : <CheckCircleIcon className="mr-2 size-4" />}
                      Submit verifikasi
                    </Button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </section>
      <Dialog open={decisionDialog !== null} onOpenChange={(open) => {
        if (!busy && !open) {
          setDecisionDialog(null);
          setNote("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decisionDialog === "revise" ? "Minta revisi PPD" : "Batalkan PPD"}</DialogTitle>
            <DialogDescription>
              {decisionDialog === "revise"
                ? "Tuliskan hal yang perlu diperbaiki pemohon. PPD kembali ke reviewer satu tahap di bawah Anda."
                : "Tuliskan alasan pembatalan. Tindakan ini tidak dapat dibatalkan."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder={decisionDialog === "revise" ? "Catatan revisi (wajib)" : "Alasan pembatalan (wajib)"}
          />
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => { setDecisionDialog(null); setNote(""); }}>Kembali</Button>
            <Button disabled={busy || !note.trim()} onClick={() => decisionDialog && void runDecision(decisionDialog)}>
              {busy && <CircleNotchIcon className="mr-2 size-4 animate-spin" />}
              {decisionDialog === "revise" ? "Kirim catatan revisi" : "Batalkan PPD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
