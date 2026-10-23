"use client";

import { useMemo, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { savePpdDraftAction, deletePpdDraftAction, submitPpdDraftAction, cancelPpdRequestAction } from "@/app/actions/ppd";
import type { Draft, PpdPageData, ReportRow } from "./ppd.types";
import { PpdSidebar } from "./components/ppd-sidebar";
import { PpdFormDetails } from "./components/ppd-form-details";
import { PpdReportTable } from "./components/ppd-report-table";
import { PpdActionBar } from "./components/ppd-action-bar";
import { ppdActionLabel, ppdStageLabel, ppdStatusLabel } from "@/lib/ppd-labels";
import { getPpdRevisionChanges, normalizePpdRevisionSnapshot, samePpdRevisionSnapshot, type PpdRevisionSnapshot } from "@/lib/ppd-revision";
import { PpdCommentsDialog } from "./ppd-comments-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const budgetKey = (accountId: string, year: number, month: number) =>
  `${accountId}|${year}|${month}`;

function getDraftReservations(draft?: Draft): Record<string, number> {
  if (
    !draft ||
    !["DRAFT", "PENDING_DEPT_HEAD", "PENDING_FINANCE", "PENDING_EXECUTIVE", "RETURNED_FOR_REVISION", "PENDING_FINANCE_PAYMENT"].includes(draft.status) ||
    draft.submissionType !== "UANG_MUKA"
  ) {
    return {};
  }

  return draft.rows.reduce<Record<string, number>>((totals, row) => {
    if (!row.accountId) return totals;
    const key = budgetKey(row.accountId, draft.year, draft.month);
    totals[key] = (totals[key] ?? 0) + (Number(row.amount) || 0);
    return totals;
  }, {});
}

export function PpdForm({ initialData }: { initialData: PpdPageData }) {
  const initialDraft = initialData.drafts[0];
  const [drafts, setDrafts] = useState(initialData.drafts);
  const [selectedDraftId, setSelectedDraftId] = useState(initialDraft?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState(initialDraft?.title ?? "");
  const [formDescription, setFormDescription] = useState(initialDraft?.description ?? "");
  const [deptId, setDeptId] = useState(initialDraft?.deptId ?? "");
  const [submissionType, setSubmissionType] = useState(initialDraft?.submissionType ?? "");
  const [paymentType, setPaymentType] = useState(initialDraft?.paymentType ?? "Transfer");
  const [bank, setBank] = useState(initialDraft?.bank ?? "");
  const [accountNo, setAccountNo] = useState(initialDraft?.accountNo ?? "");
  const [limitFund, setLimitFund] = useState(initialDraft?.limitFund ?? "");
  const [rows, setRows] = useState<ReportRow[]>(initialDraft?.rows ?? []);
  const [budgets, setBudgets] = useState(initialData.budgets);
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialDraft?.rows.find((row) => row.accountId)?.accountId ?? "",
  );

  const activeDraft = drafts.find((draft) => draft.id === selectedDraftId);
  const canEdit = activeDraft?.status === "DRAFT" || activeDraft?.status === "RETURNED_FOR_REVISION";
  const canCancelAsRequester = Boolean(activeDraft && [
    "DRAFT", "PENDING_DEPT_HEAD", "PENDING_FINANCE", "PENDING_EXECUTIVE", "RETURNED_FOR_REVISION",
  ].includes(activeDraft.status));
  const latestRevision = activeDraft?.approvalEvents.filter((event) => event.action === "REVISION_REQUESTED").at(-1);
  const year = activeDraft?.year ?? new Date().getFullYear();
  const month = activeDraft?.month ?? new Date().getMonth() + 1;
  const currentRevisionSnapshot = normalizePpdRevisionSnapshot({
    title: formTitle,
    description: formDescription,
    departmentId: deptId,
    submissionType: (submissionType || "UANG_MUKA") as PpdRevisionSnapshot["submissionType"],
    paymentType,
    bank,
    accountNo,
    limitFund: Number(limitFund.replace(/[^\d.-]/g, "")) || 0,
    year,
    month,
    rows: rows.map((row) => ({ accountId: selectedAccountId || null, title: row.title, description: row.description, attachmentName: row.attachmentName, amount: Number(row.amount) || 0 })),
  });
  const savedRevisionSnapshot = activeDraft ? normalizePpdRevisionSnapshot({
    title: activeDraft.title,
    description: activeDraft.description,
    departmentId: activeDraft.deptId,
    submissionType: (activeDraft.submissionType || "UANG_MUKA") as PpdRevisionSnapshot["submissionType"],
    paymentType: activeDraft.paymentType,
    bank: activeDraft.bank,
    accountNo: activeDraft.accountNo,
    limitFund: Number(activeDraft.limitFund),
    year: activeDraft.year,
    month: activeDraft.month,
    rows: activeDraft.rows.map((row) => ({ accountId: row.accountId, title: row.title, description: row.description, attachmentName: row.attachmentName, amount: Number(row.amount) || 0 })),
  }) : null;
  const revisionChanges = activeDraft?.status === "RETURNED_FOR_REVISION"
    ? getPpdRevisionChanges(activeDraft.revisionSnapshot ?? savedRevisionSnapshot, currentRevisionSnapshot)
    : [];
  const revisionHasChanges = revisionChanges.length > 0;
  const revisionIsDirty = Boolean(savedRevisionSnapshot && !samePpdRevisionSnapshot(savedRevisionSnapshot, currentRevisionSnapshot));

  const loadDraft = (draft?: Draft) => {
    setFormTitle(draft?.title ?? "");
    setFormDescription(draft?.description ?? "");
    setDeptId(draft?.deptId ?? "");
    setSubmissionType(draft?.submissionType ?? "");
    setPaymentType(draft?.paymentType ?? "Transfer");
    setBank(draft?.bank ?? "");
    setAccountNo(draft?.accountNo ?? "");
    setLimitFund(draft?.limitFund ?? "");
    setRows(draft?.rows ?? []);
    setSelectedAccountId(draft?.rows.find((row) => row.accountId)?.accountId ?? "");
  };

  const handleSelectDraft = (draftId: string) => {
    if (draftId === selectedDraftId) return;
    setSelectedDraftId(draftId);
    loadDraft(drafts.find((draft) => draft.id === draftId));
  };

  const filteredDrafts = useMemo(() => drafts.filter((draft) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = draft.title.toLowerCase().includes(query) || draft.description.toLowerCase().includes(query);
    const matchesStatus = categoryFilter === "All" ||
      draft.status === categoryFilter ||
      (categoryFilter === "IN_PROGRESS" && ["PENDING_DEPT_HEAD", "PENDING_FINANCE", "PENDING_EXECUTIVE", "PENDING_FINANCE_PAYMENT"].includes(draft.status)) ||
      (categoryFilter === "COMPLETED" && ["PAID", "CANCELLED", "REJECTED"].includes(draft.status));
    return matchesSearch && matchesStatus;
  }), [drafts, searchQuery, categoryFilter]);

  const filteredAccounts = useMemo(
    () => initialData.accounts.filter((account) => account.deptId === deptId),
    [initialData.accounts, deptId],
  );
  const departmentName = initialData.departments.find((department) => department.id === deptId)?.name ?? activeDraft?.departmentName ?? "";

  const setFeedback = (message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleAddRow = () => setRows((previous) => [...previous, {
    id: `new-${crypto.randomUUID()}`,
    accountId: selectedAccountId || null,
    accountName: initialData.accounts.find((account) => account.id === selectedAccountId)?.name ?? null,
    title: "",
    description: "",
    attachmentName: "",
    amount: 0,
  }]);

  const handleAccountChange = (accountId: string) => {
    const accountName = initialData.accounts.find((account) => account.id === accountId)?.name ?? null;
    setSelectedAccountId(accountId);
    setRows((previous) => previous.map((row) => ({
      ...row,
      accountId,
      accountName,
    })));
  };

  const handleUpdateRow = (id: string, field: keyof ReportRow, value: string | number | null) => {
    setRows((previous) => previous.map((row) => {
      if (row.id !== id) return row;
      if (field === "accountId") {
        const accountName = initialData.accounts.find((account) => account.id === value)?.name ?? null;
        return { ...row, accountId: typeof value === "string" ? value : null, accountName };
      }
      return { ...row, [field]: value };
    }));
  };

  const handleDeptChange = (newDepartmentId: string) => {
    setDeptId(newDepartmentId);
    const allowedAccountIds = new Set(
      initialData.accounts.filter((account) => account.deptId === newDepartmentId).map((account) => account.id),
    );
    if (!allowedAccountIds.has(selectedAccountId)) {
      setSelectedAccountId("");
      setRows((previous) => previous.map((row) => ({ ...row, accountId: null, accountName: null })));
      return;
    }
    setRows((previous) => previous.map((row) => row.accountId && !allowedAccountIds.has(row.accountId)
      ? { ...row, accountId: null, accountName: null }
      : row));
  };

  const handleRemoveRow = (id: string) => setRows((previous) => previous.filter((row) => row.id !== id));
  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0), [rows]);

  const changeBudgetReservations = (previousDraft?: Draft, nextDraft?: Draft) => {
    const previous = getDraftReservations(previousDraft);
    const next = getDraftReservations(nextDraft);
    const affectedKeys = new Set([...Object.keys(previous), ...Object.keys(next)]);

    setBudgets((current) => {
      const updated = { ...current };
      for (const key of affectedKeys) {
        const budget = updated[key];
        if (!budget) continue;
        const delta = (next[key] ?? 0) - (previous[key] ?? 0);
        updated[key] = { ...budget, reserved: Math.max(0, budget.reserved + delta) };
      }
      return updated;
    });
  };

  const getPersistedRows = () => {
    const accountName = initialData.accounts.find((account) => account.id === selectedAccountId)?.name ?? null;
    return rows.map((row) => ({
      ...row,
      id: row.id.startsWith("new-") ? crypto.randomUUID() : row.id,
      accountId: selectedAccountId || null,
      accountName,
    }));
  };

  const buildSavedDraft = (id: string, status: Draft["status"]): Draft => {
    const savedAt = new Date().toISOString();
    return {
      id,
      title: formTitle,
      description: formDescription,
      category: submissionType || "Draft",
      timeAgo: new Date(savedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
      deptId,
      departmentName: initialData.departments.find((department) => department.id === deptId)?.name ?? activeDraft?.departmentName ?? "",
      submissionType,
      paymentType,
      bank,
      accountNo,
      limitFund: String(Number(limitFund.replace(/[^\d.-]/g, "")) || 0),
      status,
      revisionReturnStage: activeDraft?.revisionReturnStage ?? null,
      revisionSnapshot: activeDraft?.revisionSnapshot ?? (status === "RETURNED_FOR_REVISION" ? savedRevisionSnapshot : null),
      approvalEvents: activeDraft?.approvalEvents ?? [],
      paymentProof: activeDraft?.paymentProof ?? null,
      year,
      month,
      updatedAt: savedAt,
      rows: getPersistedRows(),
    };
  };

  const saveDraft = async () => {
    setIsSaving(true);
    const result = await savePpdDraftAction({
      id: activeDraft?.id,
      title: formTitle,
      description: formDescription,
      departmentId: deptId,
      submissionType,
      paymentType,
      bank,
      accountNo,
      limitFund: Number(limitFund.replace(/[^\d.-]/g, "")) || 0,
      year,
      month,
      items: rows.map((row) => ({
        accountId: selectedAccountId || null,
        title: row.title,
        description: row.description,
        attachmentName: row.attachmentName,
        amount: Number(row.amount) || 0,
      })),
    });
    setIsSaving(false);
    if (result.error || !result.id) return setFeedback(result.error ?? "Gagal menyimpan draft.");

    const savedDraft = buildSavedDraft(result.id, activeDraft?.status ?? "DRAFT");
    changeBudgetReservations(activeDraft, savedDraft);
    setDrafts((previous) => [savedDraft, ...previous.filter((draft) => draft.id !== savedDraft.id)]);
    setSelectedDraftId(savedDraft.id);
    setFeedback("Draft PPD berhasil disimpan.");
  };

  const handleCreateNewDraft = async () => {
    if (initialData.departments.length === 0) {
      return setFeedback("Anda belum memiliki akses ke departemen aktif untuk membuat PPD.");
    }
    setIsSaving(true);
    const now = new Date();
    const result = await savePpdDraftAction({
      title: "", description: "", departmentId: initialData.departments[0]?.id ?? "",
      submissionType: "", paymentType: "Transfer", bank: "", accountNo: "", limitFund: 0,
      year: now.getFullYear(), month: now.getMonth() + 1, items: [],
    });
    setIsSaving(false);
    if (result.error || !result.id) return setFeedback(result.error ?? "Gagal membuat draft.");
    const newDraft = {
      id: result.id, title: "", description: "", category: "DRAFT", timeAgo: "Baru dibuat",
      deptId: initialData.departments[0]?.id ?? "", departmentName: initialData.departments[0]?.name ?? "", submissionType: "", paymentType: "Transfer",
      bank: "", accountNo: "", limitFund: "0", status: "DRAFT" as const,
      revisionReturnStage: null, revisionSnapshot: null, approvalEvents: [], paymentProof: null,
      year: now.getFullYear(), month: now.getMonth() + 1, updatedAt: now.toISOString(), rows: [],
    };
    setDrafts((previous) => [newDraft, ...previous]);
    setSelectedDraftId(newDraft.id);
    loadDraft(newDraft);
  };

  const handleCancelRequest = async () => {
    if (!activeDraft) return;
    setIsSaving(true);
    try {
      if (activeDraft.status === "DRAFT") {
        const result = await deletePpdDraftAction(activeDraft.id);
        if (result.error) return setFeedback(result.error);
        changeBudgetReservations(activeDraft, undefined);
        const remaining = drafts.filter((draft) => draft.id !== activeDraft.id);
        const nextDraft = remaining[0];
        setDrafts(remaining);
        setSelectedDraftId(nextDraft?.id ?? "");
        loadDraft(nextDraft);
        setFeedback("Draft dibatalkan dan dihapus.");
      } else {
        const result = await cancelPpdRequestAction(activeDraft.id);
        if (result.error || !result.event) return setFeedback(result.error ?? "PPD gagal dibatalkan.");
        const cancelledDraft: Draft = {
          ...activeDraft,
          status: "CANCELLED",
          revisionReturnStage: null,
          updatedAt: result.event.createdAt,
          approvalEvents: [...activeDraft.approvalEvents, {
            id: result.event.id,
            actorName: "Anda",
            stage: result.event.stage,
            action: "CANCELLED",
            fromStatus: result.event.fromStatus,
            toStatus: "CANCELLED",
            note: "Dibatalkan oleh pemohon.",
            createdAt: result.event.createdAt,
          }],
        };
        changeBudgetReservations(activeDraft, cancelledDraft);
        setDrafts((previous) => previous.map((draft) => draft.id === activeDraft.id ? cancelledDraft : draft));
        setFeedback("Permohonan PPD dibatalkan.");
      }
    } catch {
      setFeedback("PPD gagal dibatalkan. Muat ulang halaman lalu coba lagi.");
    } finally {
      setIsSaving(false);
      setCancelDialogOpen(false);
    }
  };

  const handleSubmitDraft = async () => {
    if (!activeDraft || isSaving) return;
    setIsSaving(true);
    try {
      const saved = await savePpdDraftAction({
        id: activeDraft.id, title: formTitle, description: formDescription, departmentId: deptId,
        submissionType, paymentType, bank, accountNo,
        limitFund: Number(limitFund.replace(/[^\d.-]/g, "")) || 0, year, month,
        items: rows.map((row) => ({ accountId: selectedAccountId || null, title: row.title, description: row.description, attachmentName: row.attachmentName, amount: Number(row.amount) || 0 })),
      });
      if (saved.error) return setFeedback(saved.error);
      const savedDraft = buildSavedDraft(activeDraft.id, activeDraft.status);
      changeBudgetReservations(activeDraft, savedDraft);
      setDrafts((previous) => [savedDraft, ...previous.filter((draft) => draft.id !== savedDraft.id)]);
      const result = await submitPpdDraftAction(activeDraft.id);
      if (result.error) return setFeedback(result.error);
      const submittedStatus = activeDraft.status === "RETURNED_FOR_REVISION" && activeDraft.revisionReturnStage === "FINANCE"
        ? "PENDING_FINANCE" as const
        : "PENDING_DEPT_HEAD" as const;
      const submittedDraft = {
        ...savedDraft,
        status: submittedStatus,
        revisionReturnStage: null,
        approvalEvents: [...savedDraft.approvalEvents, {
          id: `local-${crypto.randomUUID()}`,
          actorName: "Anda",
          stage: submittedStatus === "PENDING_FINANCE" ? "FINANCE" as const : "DEPT_HEAD" as const,
          action: "SUBMITTED" as const,
          fromStatus: activeDraft.status,
          toStatus: submittedStatus,
          note: null,
          createdAt: new Date().toISOString(),
        }],
      };
      setDrafts((previous) => previous.map((draft) => draft.id === activeDraft.id ? submittedDraft : draft));
      setFeedback("Permohonan dana (PPD) berhasil dikirim.");
    } catch {
      setFeedback("Pengiriman PPD gagal. Muat ulang halaman lalu coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col bg-background lg:h-svh lg:min-h-0 lg:flex-row">
      <PpdSidebar
        drafts={filteredDrafts}
        selectedDraftId={selectedDraftId}
        onSelect={handleSelectDraft}
        onCompose={handleCreateNewDraft}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        category={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-background">
        <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>PPD</span><span>/</span><span className="text-foreground font-medium">{activeDraft?.submissionType || "Permohonan baru"}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">{formTitle || "Permohonan Pencairan Dana"}</h1>
          </div>

          {feedbackMessage && <div role="status" className="flex items-center gap-2 p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-md"><CheckCircleIcon className="size-4 shrink-0" aria-hidden="true" /><span>{feedbackMessage}</span></div>}

          <div>
            <h2 className="text-lg font-semibold tracking-tight">Formulir PPD</h2>
            <p className="text-xs text-muted-foreground">Status: {activeDraft ? ppdStatusLabel(activeDraft.status) : "Belum ada permohonan"}</p>
          </div>

          {!activeDraft ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Belum ada draft PPD. Pilih <strong>Buat baru</strong> untuk membuat permohonan.
            </div>
          ) : (
            <>
              <PpdFormDetails
                title={formTitle} onTitleChange={setFormTitle}
                description={formDescription} onDescriptionChange={setFormDescription}
                deptId={deptId} onDeptIdChange={handleDeptChange} departments={initialData.departments}
                submissionType={submissionType} onSubmissionTypeChange={setSubmissionType}
                paymentType={paymentType} onPaymentTypeChange={setPaymentType}
                bank={bank} onBankChange={setBank} accountNo={accountNo} onAccountNoChange={setAccountNo}
                limitFund={limitFund} onLimitFundChange={setLimitFund}
                disabled={!canEdit}
              />
              {activeDraft.status === "RETURNED_FOR_REVISION" && latestRevision && (
                <section className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
                  <h3 className="text-sm font-semibold">Permohonan perlu diperbaiki</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Catatan dari {ppdStageLabel(latestRevision.stage)} · {new Date(latestRevision.createdAt).toLocaleString("id-ID")}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{latestRevision.note}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Setelah dikirim ulang, pemeriksaan dilanjutkan oleh {ppdStageLabel(activeDraft.revisionReturnStage ?? "DEPT_HEAD")}.
                  </p>
                </section>
              )}
              {activeDraft.status === "RETURNED_FOR_REVISION" && (
                <section className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Perubahan sejak revisi diminta</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Ringkasan membandingkan formulir dengan isi saat reviewer meminta revisi.</p>
                    </div>
                    <PpdCommentsDialog requestId={activeDraft.id} requestTitle={activeDraft.title} />
                  </div>
                  {revisionChanges.length ? <ul className="space-y-2 text-sm">
                    {revisionChanges.map((change, index) => <li key={`${change.label}-${index}`} className="rounded-md bg-background/70 p-3">
                      <p className="font-medium">{change.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Sebelum: {change.before}</p>
                      <p className="text-xs">Sesudah: {change.after}</p>
                    </li>)}
                  </ul> : <p className="text-sm text-muted-foreground">Belum ada perubahan formulir. Ubah setidaknya satu nilai sebelum menyimpan atau mengirim ulang.</p>}
                </section>
              )}
              {activeDraft.status !== "DRAFT" && activeDraft.status !== "RETURNED_FOR_REVISION" && (
                <div className="flex justify-end"><PpdCommentsDialog requestId={activeDraft.id} requestTitle={activeDraft.title} /></div>
              )}
              {submissionType === "UANG_MUKA" && (
                <PpdReportTable
                  draftId={activeDraft.id}
                  rows={rows} onAdd={handleAddRow} onUpdate={handleUpdateRow} onRemove={handleRemoveRow}
                  total={totalAmount} deptName={departmentName} accounts={filteredAccounts}
                  budgets={budgets} year={year} month={month}
                  selectedAccountId={selectedAccountId} onAccountChange={handleAccountChange}
                  readOnly={!canEdit}
                />
              )}
              {activeDraft.approvalEvents.length > 0 && (
                <section className="space-y-3 border-t pt-5">
                  <div>
                    <h3 className="text-sm font-semibold">Riwayat permohonan</h3>
                    <p className="text-xs text-muted-foreground">Catatan keputusan dan perubahan status tersimpan berurutan.</p>
                  </div>
                  <ol className="space-y-3">
                    {activeDraft.approvalEvents.map((event) => (
                      <li key={event.id} className="grid grid-cols-[1rem_1fr] gap-3 text-sm">
                        <span className="mt-1.5 size-2 rounded-full bg-primary" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="font-medium">{ppdActionLabel(event.action)} · {ppdStageLabel(event.stage)}</p>
                          <p className="text-xs text-muted-foreground">{event.actorName} · {new Date(event.createdAt).toLocaleString("id-ID")}</p>
                          {event.note && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{event.note}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              {activeDraft.paymentProof && (
                <section className="space-y-2 border-t pt-5">
                  <h3 className="text-sm font-semibold">Bukti pembayaran</h3>
                  <p className="text-xs text-muted-foreground">
                    {activeDraft.paymentProof.originalFileName} · Rp {activeDraft.paymentProof.paidAmount.toLocaleString("id-ID")} · {new Date(activeDraft.paymentProof.paidAt).toLocaleDateString("id-ID")}
                  </p>
                  <a className="text-sm text-primary underline underline-offset-4" href={activeDraft.paymentProof.fileUrl} target="_blank" rel="noreferrer">Unduh bukti</a>
                </section>
              )}
              {(canEdit || canCancelAsRequester) && <PpdActionBar
                status={ppdStatusLabel(activeDraft.status)} onCancel={() => setCancelDialogOpen(true)}
                onSave={saveDraft} onSubmit={handleSubmitDraft} isSaving={isSaving}
                cancelOnly={!canEdit}
                saveDisabled={activeDraft.status === "RETURNED_FOR_REVISION" && (!revisionHasChanges || !revisionIsDirty)}
                submitDisabled={activeDraft.status === "RETURNED_FOR_REVISION" && !revisionHasChanges}
              />}
            </>
          )}
        </div>
      </main>
      <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => !isSaving && setCancelDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{activeDraft?.status === "DRAFT" ? "Batalkan draft?" : "Batalkan permohonan PPD?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {activeDraft?.status === "DRAFT"
                ? "Draft ini akan dihapus dan tidak dapat dipulihkan."
                : "Permohonan akan ditandai dibatalkan. Pembatalan tidak tersedia setelah Kepsek menyetujui PPD."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Kembali</AlertDialogCancel>
            <AlertDialogAction disabled={isSaving} onClick={handleCancelRequest}>
              {isSaving ? "Memproses…" : "Ya, batalkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
