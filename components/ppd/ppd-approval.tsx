"use client";

import { useMemo, useState } from "react";
import { CheckCircleIcon, CircleNotchIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { decidePpdAction, submitPpdPaymentAction, completePpdAccountabilityAction, submitPpdTopUpAction, submitPpdRefundProofAction, verifyPpdRefundAction } from "@/app/actions/ppd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ppdStatusLabel } from "@/lib/ppd-labels";
import { formatRupiah } from "@/lib/utils";
import { getPpdAttachmentName } from "@/lib/ppd-attachment-name";
import { getPpdRevisionChanges } from "@/lib/ppd-revision";
import { PpdCommentsDialog } from "./ppd-comments-dialog";
import { PpdRevisionEditor } from "./ppd-revision-editor";
import { PpdChangesDialog, PpdHistoryDialog } from "./ppd-audit-dialogs";

type Props = { role: string | null; initialItems: PpdApprovalQueueItem[] };
type UploadedProof = {
  requestId: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
};

const LIST_CATEGORIES = [
  { value: "ALL", label: "Semua permohonan" },
  { value: "MINE", label: "PPD milik saya" },
];
function isActiveApprovalTask(item: PpdApprovalQueueItem, role: string | null) {
  if (item.isOwnRequest) return false;
  if (role === "DEPT_HEAD") {
    return item.status === "PENDING_DEPT_HEAD" ||
      (item.status === "RETURNED_FOR_REVISION" && item.revisionRequestedByStage === "FINANCE");
  }
  if (role === "FINANCE") {
    return item.status === "PENDING_FINANCE" || item.status === "PENDING_FINANCE_PAYMENT" || item.status === "PENDING_FINANCE_SETTLEMENT" || item.status === "PENDING_APPLICANT_REFUND" || item.status === "PENDING_FINANCE_REFUND_VERIFICATION" ||
      (item.status === "RETURNED_FOR_REVISION" && item.revisionRequestedByStage === "EXECUTIVE");
  }
  if (role === "EXECUTIVE") return item.status === "PENDING_EXECUTIVE";
  return false;
}

export function PpdApproval({ role, initialItems }: Props) {
  const [items, setItems] = useState(() => [...initialItems].sort((a, b) => Number(isActiveApprovalTask(b, role)) - Number(isActiveApprovalTask(a, role))));
  const [searchQuery, setSearchQuery] = useState("");
  const [listFilter, setListFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadedProof, setUploadedProof] = useState<UploadedProof | null>(null);
  const [paidAmount, setPaidAmount] = useState(initialItems[0]?.limitFund ?? "");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState("");
  const [decisionDialog, setDecisionDialog] = useState<"revise" | "cancel" | null>(null);
  const [settlementFile, setSettlementFile] = useState<File | null>(null);
  const [uploadedSettlement, setUploadedSettlement] = useState<UploadedProof | null>(null);
  const [uploadingSettlement, setUploadingSettlement] = useState(false);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("id-ID");
    return items.filter((item) => {
      const matchesQuery = !query || [item.no, item.title, item.requesterName, item.departmentName]
        .some((value) => value.toLocaleLowerCase("id-ID").includes(query));
      const matchesFilter = listFilter === "ALL" ||
        (listFilter === "MINE" && item.isOwnRequest);
      return matchesQuery && matchesFilter;
    });
  }, [items, searchQuery, listFilter, role]);
  const selected = items.find((item) => item.id === selectedId);
  const canReview = Boolean(selected && !selected.isOwnRequest && (
    (role === "DEPT_HEAD" && selected.status === "PENDING_DEPT_HEAD") ||
    (role === "FINANCE" && selected.status === "PENDING_FINANCE") ||
    (role === "EXECUTIVE" && selected.status === "PENDING_EXECUTIVE")
  ));
  const canCancel = canReview;
  const canPay = role === "FINANCE" && selected && !selected.isOwnRequest && selected.status === "PENDING_FINANCE_PAYMENT";
  const canSettle = role === "FINANCE" && selected && !selected.isOwnRequest && selected.status === "PENDING_FINANCE_SETTLEMENT";
  const canUploadRefund = role === "FINANCE" && selected && !selected.isOwnRequest && selected.status === "PENDING_APPLICANT_REFUND";
  const canVerifyRefund = role === "FINANCE" && selected && !selected.isOwnRequest && selected.status === "PENDING_FINANCE_REFUND_VERIFICATION";
  const canEditRevision = Boolean(selected && !selected.isOwnRequest && selected.status === "RETURNED_FOR_REVISION" && (
    (role === "DEPT_HEAD" && selected.revisionRequestedByStage === "FINANCE") ||
    (role === "FINANCE" && selected.revisionRequestedByStage === "EXECUTIVE")
  ));
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
    rows: selected.rows.map((row) => ({ accountId: row.accountId, title: row.title, description: row.description, attachmentName: (row.attachmentNames?.length ? row.attachmentNames : row.attachmentName ? [row.attachmentName] : []).join("\n"), amount: row.amount })),
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
      const nextStatus = decision === "cancel"
        ? "CANCELLED" as const
        : decision === "revise"
          ? "RETURNED_FOR_REVISION" as const
          : selected.status === "PENDING_DEPT_HEAD"
            ? "PENDING_FINANCE" as const
            : selected.status === "PENDING_FINANCE"
              ? "PENDING_EXECUTIVE" as const
            : selected.submissionType === "UANG_MUKA" && selected.accountabilityReport && selected.paymentProof
              ? Math.round(selected.accountabilityReport.totalAmount * 100) < Math.round(selected.paymentProof.paidAmount * 100)
                ? "PENDING_APPLICANT_REFUND" as const
                : "PENDING_FINANCE_SETTLEMENT" as const
              : "PENDING_FINANCE_PAYMENT" as const;
      const reviewerStage = selected.status === "PENDING_DEPT_HEAD"
        ? "DEPT_HEAD" as const
        : selected.status === "PENDING_FINANCE"
          ? "FINANCE" as const
          : "EXECUTIVE" as const;
      setItems((current) => current.map((item) => item.id === selected.id ? {
        ...item,
        status: nextStatus,
        revisionReturnStage: decision === "revise" ? reviewerStage : null,
        revisionRequestedByStage: decision === "revise" ? reviewerStage : item.revisionRequestedByStage,
        revisionSnapshot: decision === "revise" ? null : item.revisionSnapshot,
        updatedAt: new Date().toISOString(),
      } : item).sort((a, b) => Number(isActiveApprovalTask(b, role)) - Number(isActiveApprovalTask(a, role))));
      setNote("");
      setDecisionDialog(null);
      setMessage(label);
    } catch {
      setError("Keputusan PPD gagal diproses. Muat ulang antrean lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const uploadPaymentProof = async (requestId: string, selectedFile: File) => {
    setBusy(true);
    setUploadingProof(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("requestId", requestId);
      form.set("file", selectedFile);
      const upload = await fetch("/api/ppd/payment-proof-uploads", { method: "POST", body: form });
      const uploadResult = await upload.json();
      if (!upload.ok) throw new Error(uploadResult.error ?? "Bukti pembayaran gagal diunggah.");
      setUploadedProof({
        requestId,
        fileName: uploadResult.fileName,
        originalFileName: uploadResult.originalFileName,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
      });
      setMessage("Bukti berhasil diunggah. Periksa data pembayaran, lalu submit verifikasi.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Bukti pembayaran gagal diunggah.");
    } finally {
      setUploadingProof(false);
      setBusy(false);
    }
  };

  const submitPayment = async () => {
    if (!selected || !uploadedProof || uploadedProof.requestId !== selected.id) {
      return setError("Pilih dan unggah bukti pembayaran sebelum submit verifikasi.");
    }
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
      const isAdvance = selected.submissionType === "UANG_MUKA";
      const nextStatus = isAdvance ? "PENDING_ACCOUNTABILITY" as const : "PAID" as const;
      setItems((current) => current.map((item) => item.id === selected.id ? {
        ...item,
        status: nextStatus,
        paymentProof: {
          id: `local-${crypto.randomUUID()}`,
          originalFileName: uploadedProof.originalFileName,
          paidAmount: Number(paidAmount),
          paidAt: new Date(paidAt).toISOString(),
          referenceNumber: referenceNumber || null,
          financeNote: note || null,
          fileUrl: `/api/ppd/payment-proofs/${encodeURIComponent(item.id)}`,
        },
        updatedAt: new Date().toISOString(),
      } : item).sort((a, b) => Number(isActiveApprovalTask(b, role)) - Number(isActiveApprovalTask(a, role))));
      setFile(null);
      setUploadedProof(null);
      setNote("");
      setMessage(isAdvance ? "Uang muka dibayarkan. Menunggu laporan pertanggungjawaban pemohon." : "Pembayaran diverifikasi. Status PPD menjadi Lunas.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pembayaran gagal diproses.");
    } finally {
      setBusy(false);
    }
  };

  const uploadSettlementProof = async (selectedFile: File) => {
    if (!selected) return;
    setBusy(true); setUploadingSettlement(true); setError(null); setMessage(null); setUploadedSettlement(null);
    try {
      const form = new FormData();
      form.set("requestId", selected.id); form.set("kind", "TOP_UP"); form.set("file", selectedFile);
      const response = await fetch("/api/ppd/settlement-proof-uploads", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Bukti transfer tambahan gagal diunggah.");
      setUploadedSettlement({ requestId: selected.id, ...result });
      setMessage("Bukti transfer tambahan berhasil diunggah.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Bukti transfer tambahan gagal diunggah."); }
    finally { setBusy(false); setUploadingSettlement(false); }
  };

  const uploadRefundProof = async (selectedFile: File) => {
    if (!selected) return;
    setBusy(true); setUploadingSettlement(true); setError(null); setMessage(null); setUploadedSettlement(null);
    try {
      const form = new FormData();
      form.set("requestId", selected.id); form.set("kind", "REFUND"); form.set("file", selectedFile);
      const response = await fetch("/api/ppd/settlement-proof-uploads", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Bukti pengembalian dana gagal diunggah.");
      setUploadedSettlement({ requestId: selected.id, ...result });
      setMessage("Bukti pengembalian dana berhasil diunggah.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Bukti pengembalian dana gagal diunggah."); }
    finally { setBusy(false); setUploadingSettlement(false); }
  };

  const completeEqualReport = async () => {
    if (!selected) return;
    setBusy(true); setError(null); setMessage(null);
    const result = await completePpdAccountabilityAction({ id: selected.id, note });
    setBusy(false);
    if (result.error) return setError(result.error);
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, status: "PAID", updatedAt: new Date().toISOString() } : item));
    setNote(""); setMessage("Laporan sesuai dengan uang muka. PPD selesai.");
  };

  const submitTopUp = async () => {
    if (!selected || !uploadedSettlement || uploadedSettlement.requestId !== selected.id) return;
    setBusy(true); setError(null); setMessage(null);
    const result = await submitPpdTopUpAction({ id: selected.id, ...uploadedSettlement, paidAt: new Date(paidAt).toISOString(), referenceNumber, note });
    setBusy(false);
    if (result.error) return setError(result.error);
    const difference = Math.max(0, (selected.accountabilityReport?.totalAmount ?? 0) - (selected.paymentProof?.paidAmount ?? 0));
    const proof = { id: result.proofId ?? `local-${crypto.randomUUID()}`, type: "TOP_UP" as const, originalFileName: uploadedSettlement.originalFileName, amount: difference, paidAt: new Date(paidAt).toISOString(), referenceNumber: referenceNumber || null, note: note || null, verifiedAt: new Date().toISOString(), fileUrl: `/api/ppd/payment-proofs/${encodeURIComponent(selected.id)}?settlementProofId=${encodeURIComponent(result.proofId ?? "")}` };
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, status: "PAID", settlementProofs: [...item.settlementProofs, proof], updatedAt: new Date().toISOString() } : item));
    setUploadedSettlement(null); setSettlementFile(null); setNote(""); setReferenceNumber("");
    setMessage("Transfer tambahan diverifikasi. PPD selesai.");
  };

  const submitRefund = async () => {
    if (!selected || !uploadedSettlement || uploadedSettlement.requestId !== selected.id) return;
    setBusy(true); setError(null); setMessage(null);
    const result = await submitPpdRefundProofAction({ id: selected.id, ...uploadedSettlement, paidAt: new Date(paidAt).toISOString(), referenceNumber, note });
    setBusy(false);
    if (result.error) return setError(result.error);
    const difference = Math.max(0, (selected.paymentProof?.paidAmount ?? 0) - (selected.accountabilityReport?.totalAmount ?? 0));
    const proof = { id: result.proofId ?? `local-${crypto.randomUUID()}`, type: "REFUND" as const, originalFileName: uploadedSettlement.originalFileName, amount: difference, paidAt: new Date(paidAt).toISOString(), referenceNumber: referenceNumber || null, note: note || null, verifiedAt: null, fileUrl: `/api/ppd/payment-proofs/${encodeURIComponent(selected.id)}?settlementProofId=${encodeURIComponent(result.proofId ?? "")}` };
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, status: "PENDING_FINANCE_REFUND_VERIFICATION", settlementProofs: [...item.settlementProofs, proof], updatedAt: new Date().toISOString() } : item).sort((a, b) => Number(isActiveApprovalTask(b, role)) - Number(isActiveApprovalTask(a, role))));
    setUploadedSettlement(null); setSettlementFile(null); setNote(""); setReferenceNumber("");
    setMessage("Bukti pengembalian dana dikirim untuk verifikasi Finance.");
  };

  const verifyRefund = async () => {
    if (!selected) return;
    setBusy(true); setError(null); setMessage(null);
    const result = await verifyPpdRefundAction({ id: selected.id, note });
    setBusy(false);
    if (result.error) return setError(result.error);
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, status: "PAID", settlementProofs: item.settlementProofs.map((proof) => proof.type === "REFUND" ? { ...proof, verifiedAt: new Date().toISOString(), note: note || proof.note } : proof), updatedAt: new Date().toISOString() } : item));
    setNote(""); setMessage("Pengembalian dana diverifikasi. PPD selesai.");
  };

  return (
    <main className="flex min-h-[calc(100svh-4rem)] flex-col bg-background lg:h-svh lg:min-h-0 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-r bg-muted/20 lg:h-full lg:min-h-0 lg:w-80">
        <div className="border-b p-5">
          <h1 className="text-xl font-semibold tracking-tight">Approval PPD</h1>
          <p className="mt-1 text-sm text-muted-foreground">{role === "ADMIN" ? "Pemantauan semua PPD. Approval tetap dilakukan oleh reviewer tahapnya." : "Antrean tahap Anda, riwayat approval, dan PPD yang Anda ajukan (baca saja)."}</p>
          <Badge variant="secondary" className="mt-3">{role === "ADMIN"
            ? `${items.length} permohonan · ${items.filter((item) => item.isOwnRequest).length} milik saya`
            : `${items.filter((item) => isActiveApprovalTask(item, role)).length} menunggu · ${items.filter((item) => item.isOwnRequest).length} milik saya · ${items.filter((item) => !item.isOwnRequest && !isActiveApprovalTask(item, role)).length} riwayat`}</Badge>
          <div className="mt-4 space-y-2">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                placeholder="Cari judul, nomor, pemohon..."
                aria-label="Cari permohonan PPD"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9 bg-background pl-8 text-xs"
              />
            </div>
            <Select value={listFilter} onValueChange={(value) => value && setListFilter(value)}>
              <SelectTrigger aria-label="Filter daftar PPD" className="h-9 w-full bg-background text-xs">
                <SelectValue placeholder="Semua permohonan" />
              </SelectTrigger>
              <SelectContent>
                {LIST_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredItems.map((item) => (
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
              {item.isOwnRequest && <Badge variant="secondary" className="ml-2 mt-2">Milik saya · baca saja</Badge>}
              {role !== "ADMIN" && !item.isOwnRequest && !isActiveApprovalTask(item, role) && <Badge variant="secondary" className="ml-2 mt-2">Riwayat · baca saja</Badge>}
              </button>
            </article>
          ))}
          {filteredItems.length === 0 && (
            <div className="p-8 text-center">
              {items.length === 0 && <CheckCircleIcon className="mx-auto size-7 text-emerald-600" aria-hidden="true" />}
              <p className="mt-3 text-sm font-medium">{items.length === 0 ? "Antrean kosong" : "Tidak ada PPD yang cocok"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{items.length === 0 ? "PPD yang menjadi tanggung jawab Anda akan muncul di sini." : "Coba ubah kata kunci atau pilihan filter."}</p>
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
                <div className="flex flex-wrap gap-2">
                  {selected.status !== "DRAFT" && <PpdCommentsDialog requestId={selected.id} requestTitle={selected.title} />}
                  <PpdHistoryDialog events={selected.approvalEvents} />
                  {selected.revisionSnapshot && !canEditRevision && <PpdChangesDialog changes={revisionChanges} />}
                </div>
              </header>

              {canEditRevision ? (
                <PpdRevisionEditor
                  draft={selected}
                  onSaved={(updatedRows, snapshot) => {
                    setItems((current) => current.map((item) => item.id === selected.id
                      ? { ...item, rows: updatedRows, revisionSnapshot: snapshot, updatedAt: new Date().toISOString() }
                      : item));
                  }}
                  onSubmitted={() => {
                    const nextStatus = selected.revisionRequestedByStage === "EXECUTIVE" ? "PENDING_EXECUTIVE" as const : "PENDING_FINANCE" as const;
                    setItems((current) => current.map((item) => item.id === selected.id ? {
                      ...item,
                      status: nextStatus,
                      revisionReturnStage: null,
                      revisionRequestedByStage: null,
                      updatedAt: new Date().toISOString(),
                    } : item).sort((a, b) => Number(isActiveApprovalTask(b, role)) - Number(isActiveApprovalTask(a, role))));
                    setMessage("Revisi berhasil dikirim kembali untuk diperiksa.");
                  }}
                />
              ) : <section className="space-y-3">
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
                          <td className="px-3 py-3">{(row.attachmentNames?.length ? row.attachmentNames : row.attachmentName ? [row.attachmentName] : []).length ? <div className="flex flex-col gap-1">{(row.attachmentNames?.length ? row.attachmentNames : [row.attachmentName]).map((url, index) => <a key={`${url}-${index}`} className="text-primary underline underline-offset-4" href={url} target="_blank" rel="noreferrer">{getPpdAttachmentName(url, `Lampiran ${index + 1}`)}</a>)}</div> : <span className="text-muted-foreground">—</span>}</td>
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
              </section>}

              {selected.paymentProof && (
                <section className="space-y-2 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">Bukti pembayaran awal</h3>
                  <p className="text-xs text-muted-foreground">{selected.paymentProof.originalFileName} · {formatRupiah(selected.paymentProof.paidAmount)} · {new Date(selected.paymentProof.paidAt).toLocaleDateString("id-ID")}</p>
                  <a href={selected.paymentProof.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Unduh bukti</a>
                </section>
              )}
              {selected.accountabilityReport && (
                <section className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">Laporan pertanggungjawaban</h3><p className="text-xs text-muted-foreground">Dikirim oleh {selected.accountabilityReport.submittedByName} · {new Date(selected.accountabilityReport.submittedAt).toLocaleString("id-ID")}</p></div><span className="text-sm font-semibold">{formatRupiah(selected.accountabilityReport.totalAmount)}</span></div>
                  <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[32rem] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">Account / Judul</th><th className="px-3 py-2">Deskripsi</th><th className="px-3 py-2 text-right">Jumlah</th><th className="px-3 py-2">Lampiran</th></tr></thead><tbody className="divide-y">{selected.accountabilityReport.rows.map((row) => <tr key={row.id}><td className="px-3 py-2">{row.accountName || "—"}<span className="block text-xs text-muted-foreground">{row.title}</span></td><td className="px-3 py-2 text-muted-foreground">{row.description || "—"}</td><td className="px-3 py-2 text-right tabular-nums">{formatRupiah(row.amount)}</td><td className="px-3 py-2">{row.attachmentNames.map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="mr-2 text-primary underline">{getPpdAttachmentName(url, `Lampiran ${index + 1}`)}</a>)}</td></tr>)}</tbody></table></div>
                  {selected.paymentProof && <p className="text-xs text-muted-foreground">Uang muka awal {formatRupiah(selected.paymentProof.paidAmount)} · Selisih {formatRupiah(Math.abs(selected.accountabilityReport.totalAmount - selected.paymentProof.paidAmount))} {selected.accountabilityReport.totalAmount > selected.paymentProof.paidAmount ? "masih perlu ditransfer" : selected.accountabilityReport.totalAmount < selected.paymentProof.paidAmount ? "perlu dikembalikan oleh Finance" : "nominal sesuai"}.</p>}
                </section>
              )}
              {selected.settlementProofs.length > 0 && <section className="space-y-2 rounded-lg border p-4"><h3 className="text-sm font-semibold">Bukti penyelesaian</h3>{selected.settlementProofs.map((proof) => <p key={proof.id} className="text-xs text-muted-foreground"><a href={proof.fileUrl} target="_blank" rel="noreferrer" className="text-primary underline">{proof.type === "REFUND" ? "Bukti pengembalian" : "Bukti transfer tambahan"}</a> · {formatRupiah(proof.amount)} · {proof.originalFileName}</p>)}</section>}

              {canSettle && selected.accountabilityReport && selected.paymentProof && (
                <section className="space-y-4 rounded-lg border p-4">
                  <div><h3 className="text-sm font-semibold">Penyelesaian uang muka</h3><p className="mt-1 text-xs text-muted-foreground">{selected.accountabilityReport.totalAmount === selected.paymentProof.paidAmount ? "Jumlah laporan sama dengan uang muka; Finance dapat langsung menyelesaikan PPD." : "Nominal pengajuan awal tidak diubah. Finance hanya mentransfer kekurangan berdasarkan laporan."}</p></div>
                  {selected.accountabilityReport.totalAmount === selected.paymentProof.paidAmount ? (
                    <div className="flex justify-end"><Button disabled={busy} onClick={() => void completeEqualReport()}>{busy && <CircleNotchIcon className="mr-2 size-4 animate-spin" />}Selesaikan PPD</Button></div>
                  ) : selected.accountabilityReport.totalAmount > selected.paymentProof.paidAmount ? (
                    <div className="space-y-3">
                      <p className="rounded-md bg-muted/40 p-3 text-sm">Kekurangan transfer: <strong>{formatRupiah(selected.accountabilityReport.totalAmount - selected.paymentProof.paidAmount)}</strong></p>
                      <label className="block space-y-1.5 text-xs font-medium">Bukti transfer tambahan<Input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" disabled={busy} onChange={(event) => { const selectedFile = event.currentTarget.files?.[0] ?? null; event.currentTarget.value = ""; setSettlementFile(selectedFile); setUploadedSettlement(null); if (selectedFile) void uploadSettlementProof(selectedFile); }} /><span className="block font-normal text-muted-foreground">{uploadingSettlement ? "Mengunggah…" : uploadedSettlement?.originalFileName ?? settlementFile?.name ?? "Maksimal 10 MB."}</span></label>
                      <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-medium">Tanggal transfer<Input type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} /></label><label className="space-y-1.5 text-xs font-medium">Nomor referensi (opsional)<Input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} maxLength={120} /></label><label className="space-y-1.5 text-xs font-medium sm:col-span-2">Catatan Finance (opsional)<Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={2} /></label></div>
                      <div className="flex justify-end"><Button disabled={busy || uploadedSettlement?.requestId !== selected.id} onClick={() => void submitTopUp()}>{busy && <CircleNotchIcon className="mr-2 size-4 animate-spin" />}Submit verifikasi transfer</Button></div>
                    </div>
                  ) : <p className="text-sm text-muted-foreground">Finance perlu mengembalikan kelebihan dana.</p>}
                </section>
              )}
              {canUploadRefund && selected.accountabilityReport && selected.paymentProof && (
                <section className="space-y-4 rounded-lg border p-4">
                  <div><h3 className="text-sm font-semibold">Pengembalian kelebihan uang muka</h3><p className="mt-1 text-xs text-muted-foreground">Finance mengembalikan {formatRupiah(selected.paymentProof.paidAmount - selected.accountabilityReport.totalAmount)} lalu mengunggah bukti transfer.</p></div>
                  <label className="block space-y-1.5 text-xs font-medium">Bukti pengembalian dana<Input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" disabled={busy} onChange={(event) => { const selectedFile = event.currentTarget.files?.[0] ?? null; event.currentTarget.value = ""; setSettlementFile(selectedFile); setUploadedSettlement(null); if (selectedFile) void uploadRefundProof(selectedFile); }} /><span className="block font-normal text-muted-foreground">{uploadingSettlement ? "Mengunggah…" : uploadedSettlement?.originalFileName ?? settlementFile?.name ?? "Maksimal 10 MB."}</span></label>
                  <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-medium">Tanggal transfer<Input type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} /></label><label className="space-y-1.5 text-xs font-medium">Nomor referensi (opsional)<Input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} maxLength={120} /></label><label className="space-y-1.5 text-xs font-medium sm:col-span-2">Catatan Finance (opsional)<Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={2} /></label></div>
                  <div className="flex justify-end"><Button disabled={busy || uploadedSettlement?.requestId !== selected.id} onClick={() => void submitRefund()}>{busy && <CircleNotchIcon className="mr-2 size-4 animate-spin" />}Kirim bukti untuk verifikasi</Button></div>
                </section>
              )}
              {canVerifyRefund && selected.settlementProofs.some((proof) => proof.type === "REFUND") && (
                <section className="space-y-3 rounded-lg border p-4"><div><h3 className="text-sm font-semibold">Verifikasi pengembalian dana</h3><p className="mt-1 text-xs text-muted-foreground">{selected.settlementProofs.find((proof) => proof.type === "REFUND")?.originalFileName} · {formatRupiah(selected.settlementProofs.find((proof) => proof.type === "REFUND")?.amount ?? 0)}</p></div><label className="space-y-1.5 text-xs font-medium">Catatan Finance (opsional)<Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={2} /></label><div className="flex justify-end"><Button disabled={busy} onClick={() => void verifyRefund()}>{busy && <CircleNotchIcon className="mr-2 size-4 animate-spin" />}Verifikasi dan selesaikan</Button></div></section>
              )}

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
                    
                    <label className="space-y-1.5 text-xs font-medium sm:col-span-2">Bukti pembayaran
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        disabled={busy}
                        onChange={(event) => {
                          const selectedFile = event.target.files?.[0] ?? null;
                          event.target.value = "";
                          setFile(selectedFile);
                          setUploadedProof(null);
                          setError(null);
                          setMessage(null);
                          if (selectedFile) void uploadPaymentProof(selected.id, selectedFile);
                        }}
                      />
                      <span className="block font-normal text-muted-foreground">Maksimal 10 MB. {uploadingProof ? "Mengunggah bukti…" : uploadedProof?.requestId === selected.id ? `${uploadedProof.originalFileName} — siap diverifikasi` : file?.name}</span>
                    </label>
                    <label className="space-y-1.5 text-xs font-medium sm:col-span-2">Catatan Finance (opsional)
                      <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={2} />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <Button disabled={busy || uploadedProof?.requestId !== selected.id} onClick={() => void submitPayment()}>
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
