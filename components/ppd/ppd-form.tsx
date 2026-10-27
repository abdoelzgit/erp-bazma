"use client";

import { useMemo, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { savePpdDraftAction, deletePpdDraftAction, submitPpdDraftAction, cancelPpdRequestAction, submitPpdAccountabilityAction } from "@/app/actions/ppd";
import type { Draft, PpdPageData, ReportRow } from "./ppd.types";
import { PpdSidebar } from "./components/ppd-sidebar";
import { PpdFormDetails } from "./components/ppd-form-details";
import { PpdReportTable } from "./components/ppd-report-table";
import { PpdActionBar } from "./components/ppd-action-bar";
import { ppdStageLabel, ppdStatusLabel } from "@/lib/ppd-labels";
import { getPpdRevisionChanges, normalizePpdRevisionSnapshot, samePpdRevisionSnapshot, type PpdRevisionSnapshot } from "@/lib/ppd-revision";
import { getPpdAttachmentName } from "@/lib/ppd-attachment-name";
import { PpdCommentsDialog } from "./ppd-comments-dialog";
import { PpdRevisionEditor } from "./ppd-revision-editor";
import { PpdChangesDialog, PpdHistoryDialog } from "./ppd-audit-dialogs";
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
    !["DRAFT", "PENDING_DEPT_HEAD", "PENDING_FINANCE", "PENDING_EXECUTIVE", "RETURNED_FOR_REVISION", "PENDING_FINANCE_PAYMENT", "PENDING_ACCOUNTABILITY", "PENDING_FINANCE_SETTLEMENT", "PENDING_APPLICANT_REFUND", "PENDING_FINANCE_REFUND_VERIFICATION"].includes(draft.status) ||
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
  const [accountabilityRows, setAccountabilityRows] = useState<ReportRow[]>(initialDraft?.accountabilityReport?.rows ?? []);
  const [accountabilityAccountId, setAccountabilityAccountId] = useState(initialDraft?.accountabilityReport?.rows.find((row) => row.accountId)?.accountId ?? initialDraft?.rows.find((row) => row.accountId)?.accountId ?? "");
  const [budgets, setBudgets] = useState(initialData.budgets);
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialDraft?.rows.find((row) => row.accountId)?.accountId ?? "",
  );
  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0), [rows]);
  const amountToRequest = submissionType === "UANG_MUKA"
    ? totalAmount
    : Number(limitFund.replace(/[^\d.-]/g, "")) || 0;

  const activeDraft = drafts.find((draft) => draft.id === selectedDraftId);
  const isAssignedRevision = activeDraft?.status === "RETURNED_FOR_REVISION" && activeDraft.revisionRequestedByStage === "DEPT_HEAD";
  const canEdit = activeDraft?.status === "DRAFT" || isAssignedRevision;
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
    limitFund: amountToRequest,
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
    limitFund: activeDraft.submissionType === "UANG_MUKA"
      ? activeDraft.rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
      : Number(activeDraft.limitFund),
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
    setAccountabilityRows(draft?.accountabilityReport?.rows ?? []);
    setAccountabilityAccountId(draft?.accountabilityReport?.rows.find((row) => row.accountId)?.accountId ?? draft?.rows.find((row) => row.accountId)?.accountId ?? "");
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
      (categoryFilter === "IN_PROGRESS" && ["PENDING_DEPT_HEAD", "PENDING_FINANCE", "PENDING_EXECUTIVE", "PENDING_FINANCE_PAYMENT", "PENDING_ACCOUNTABILITY", "PENDING_FINANCE_SETTLEMENT", "PENDING_APPLICANT_REFUND", "PENDING_FINANCE_REFUND_VERIFICATION"].includes(draft.status)) ||
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
    attachmentNames: [],
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

  const handleUpdateRow = (id: string, field: keyof ReportRow, value: string | number | string[] | null) => {
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
  const handleAddAccountabilityRow = () => setAccountabilityRows((previous) => [...previous, {
    id: `new-${crypto.randomUUID()}`,
    accountId: accountabilityAccountId || null,
    accountName: initialData.accounts.find((account) => account.id === accountabilityAccountId)?.name ?? null,
    title: "", description: "", attachmentName: "", attachmentNames: [], amount: 0,
  }]);
  const handleUpdateAccountabilityRow = (id: string, field: keyof ReportRow, value: string | number | string[] | null) => {
    setAccountabilityRows((previous) => previous.map((row) => {
      if (row.id !== id) return row;
      if (field === "accountId") {
        const accountName = initialData.accounts.find((account) => account.id === value)?.name ?? null;
        return { ...row, accountId: typeof value === "string" ? value : null, accountName };
      }
      return { ...row, [field]: value };
    }));
  };
  const handleAccountabilityAccountChange = (accountId: string) => {
    const accountName = initialData.accounts.find((account) => account.id === accountId)?.name ?? null;
    setAccountabilityAccountId(accountId);
    setAccountabilityRows((previous) => previous.map((row) => ({ ...row, accountId, accountName })));
  };
  const submitAccountability = async () => {
    if (!activeDraft || isSaving) return;
    setIsSaving(true);
    const result = await submitPpdAccountabilityAction({
      id: activeDraft.id,
      items: accountabilityRows.map((row) => ({ accountId: row.accountId, title: row.title, description: row.description, attachmentNames: row.attachmentNames?.length ? row.attachmentNames : row.attachmentName ? [row.attachmentName] : [], amount: Number(row.amount) || 0 })),
    });
    setIsSaving(false);
    if (result.error) return setFeedback(result.error);
    const report = { submittedAt: new Date().toISOString(), submittedByName: "Anda", totalAmount: accountabilityRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0), rows: accountabilityRows };
    const nextStatus = "PENDING_DEPT_HEAD" as const;
    setDrafts((previous) => previous.map((draft) => draft.id === activeDraft.id ? { ...draft, accountabilityReport: report, status: nextStatus, updatedAt: report.submittedAt } : draft));
    setFeedback("Laporan pertanggungjawaban dikirim untuk approval ulang Dept Head, Finance, dan Pimpinan.");
  };
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
      limitFund: String(amountToRequest),
      status,
      revisionReturnStage: activeDraft?.revisionReturnStage ?? null,
      revisionRequestedByStage: activeDraft?.revisionRequestedByStage ?? null,
      revisionSnapshot: activeDraft?.revisionSnapshot ?? (status === "RETURNED_FOR_REVISION" ? savedRevisionSnapshot : null),
      approvalEvents: activeDraft?.approvalEvents ?? [],
      paymentProof: activeDraft?.paymentProof ?? null,
      accountabilityReport: activeDraft?.accountabilityReport ?? null,
      settlementProofs: activeDraft?.settlementProofs ?? [],
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
      limitFund: amountToRequest,
      year,
      month,
      items: rows.map((row) => ({
        accountId: selectedAccountId || null,
        title: row.title,
        description: row.description,
        attachmentName: row.attachmentName,
        attachmentNames: row.attachmentNames?.length ? row.attachmentNames : row.attachmentName ? [row.attachmentName] : [],
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
      revisionReturnStage: null, revisionRequestedByStage: null, revisionSnapshot: null, approvalEvents: [], paymentProof: null, accountabilityReport: null, settlementProofs: [],
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
        limitFund: amountToRequest, year, month,
        items: rows.map((row) => ({ accountId: selectedAccountId || null, title: row.title, description: row.description, attachmentName: row.attachmentName, attachmentNames: row.attachmentNames?.length ? row.attachmentNames : row.attachmentName ? [row.attachmentName] : [], amount: Number(row.amount) || 0 })),
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

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Formulir PPD</h2>
              <p className="text-xs text-muted-foreground">Status: {activeDraft ? ppdStatusLabel(activeDraft.status) : "Belum ada permohonan"}</p>
            </div>
            {activeDraft && <PpdHistoryDialog events={activeDraft.approvalEvents} />}
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
                limitFund={String(amountToRequest)} onLimitFundChange={setLimitFund}
                disabled={activeDraft.status !== "DRAFT"}
              />
              {activeDraft.status === "RETURNED_FOR_REVISION" && latestRevision && (
                <section className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <p className="text-sm font-medium">Permohonan perlu diperbaiki</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Diminta oleh {ppdStageLabel(latestRevision.stage)}. Buka riwayat untuk membaca catatan; pemeriksaan dilanjutkan oleh {ppdStageLabel(activeDraft.revisionRequestedByStage ?? activeDraft.revisionReturnStage ?? "DEPT_HEAD")} setelah dikirim ulang.
                  </p>
                </section>
              )}
              {activeDraft.status === "RETURNED_FOR_REVISION" && !isAssignedRevision && (
                <div className="flex flex-wrap gap-2">
                  <PpdCommentsDialog requestId={activeDraft.id} requestTitle={activeDraft.title} />
                  <PpdChangesDialog changes={revisionChanges} />
                </div>
              )}
              {activeDraft.status !== "DRAFT" && activeDraft.status !== "RETURNED_FOR_REVISION" && (
                <div className="flex justify-end"><PpdCommentsDialog requestId={activeDraft.id} requestTitle={activeDraft.title} /></div>
              )}
              {submissionType === "UANG_MUKA" && !isAssignedRevision && (
                <PpdReportTable
                  draftId={activeDraft.id}
                  title="Rincian pengajuan awal"
                  description="Rincian yang menjadi dasar persetujuan dan pencairan uang muka."
                  rows={rows} onAdd={handleAddRow} onUpdate={handleUpdateRow} onRemove={handleRemoveRow}
                  total={totalAmount} deptName={departmentName} accounts={filteredAccounts}
                  budgets={budgets} year={year} month={month}
                  selectedAccountId={selectedAccountId} onAccountChange={handleAccountChange}
                  readOnly={!canEdit}
                  revisionOnly={Boolean(isAssignedRevision)}
                />
              )}
              {submissionType === "UANG_MUKA" && activeDraft.status === "PENDING_ACCOUNTABILITY" && (
                <section className="space-y-3 rounded-lg border border-primary/20 bg-primary/[0.02] p-4">
                  <div>
                    <h3 className="text-sm font-semibold">Laporan pertanggungjawaban</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Catat realisasi penggunaan uang muka. Finance akan membandingkan totalnya dengan bukti pembayaran awal.</p>
                  </div>
                  <PpdReportTable
                    draftId={activeDraft.id}
                    title="Laporan pertanggungjawaban"
                    description="Catat penggunaan aktual dan lampirkan bukti transaksi."
                    hideAccountSelector
                    comparisonAmount={activeDraft.paymentProof?.paidAmount ?? Number(activeDraft.limitFund)}
                    rows={accountabilityRows}
                    onAdd={handleAddAccountabilityRow}
                    onUpdate={handleUpdateAccountabilityRow}
                    onRemove={(id) => setAccountabilityRows((previous) => previous.filter((row) => row.id !== id))}
                    total={accountabilityRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)}
                    deptName={departmentName}
                    accounts={filteredAccounts}
                    budgets={budgets}
                    year={year}
                    month={month}
                    selectedAccountId={accountabilityAccountId}
                    onAccountChange={handleAccountabilityAccountChange}
                  />
                  <div className="flex justify-end">
                    <button type="button" disabled={isSaving || accountabilityRows.length === 0 || accountabilityRows.some((row) => !row.accountId || !row.title.trim() || Number(row.amount) <= 0)} onClick={() => void submitAccountability()} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:pointer-events-none disabled:opacity-50">
                      {isSaving ? "Mengirim…" : "Kirim laporan"}
                    </button>
                  </div>
                </section>
              )}
              {activeDraft.accountabilityReport && (
                <section className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><h3 className="text-sm font-semibold">Laporan pertanggungjawaban</h3><p className="text-xs text-muted-foreground">Dikirim {new Date(activeDraft.accountabilityReport.submittedAt).toLocaleString("id-ID")}</p></div>
                    <p className="text-sm font-semibold">Total {activeDraft.accountabilityReport.totalAmount.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[32rem] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">Account / Judul</th><th className="px-3 py-2">Deskripsi</th><th className="px-3 py-2 text-right">Jumlah</th></tr></thead><tbody className="divide-y">{activeDraft.accountabilityReport.rows.map((row) => <tr key={row.id}><td className="px-3 py-2">{row.accountName || "—"}<span className="block text-xs text-muted-foreground">{row.title}</span>{row.attachmentNames.map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="mr-2 text-xs text-primary underline">{getPpdAttachmentName(url, `Lampiran ${index + 1}`)}</a>)}</td><td className="px-3 py-2 text-muted-foreground">{row.description || "—"}</td><td className="px-3 py-2 text-right tabular-nums">{row.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}</td></tr>)}</tbody></table></div>
                </section>
              )}
              
              {activeDraft.settlementProofs.length > 0 && (
                <section className="space-y-2 rounded-lg border p-4"><h3 className="text-sm font-semibold">Bukti penyelesaian</h3>{activeDraft.settlementProofs.map((proof) => <p key={proof.id} className="text-xs text-muted-foreground"><a href={proof.fileUrl} target="_blank" rel="noreferrer" className="text-primary underline">{proof.type === "REFUND" ? "Bukti pengembalian" : "Bukti transfer tambahan"}</a> · Rp {proof.amount.toLocaleString("id-ID")} · {proof.originalFileName}</p>)}</section>
              )}
              {isAssignedRevision && (
                <PpdRevisionEditor
                  draft={activeDraft}
                  onSaved={(updatedRows, snapshot) => {
                    const updatedDraft = { ...activeDraft, rows: updatedRows, revisionSnapshot: snapshot, updatedAt: new Date().toISOString() };
                    changeBudgetReservations(activeDraft, updatedDraft);
                    setRows(updatedRows);
                    setDrafts((current) => current.map((draft) => draft.id === activeDraft.id ? updatedDraft : draft));
                  }}
                  onSubmitted={() => {
                    const returnedTo = activeDraft.revisionRequestedByStage === "EXECUTIVE"
                      ? "PENDING_EXECUTIVE" as const
                      : activeDraft.revisionRequestedByStage === "FINANCE"
                        ? "PENDING_FINANCE" as const
                        : "PENDING_DEPT_HEAD" as const;
                    setDrafts((current) => current.map((draft) => draft.id === activeDraft.id ? {
                      ...draft,
                      status: returnedTo,
                      revisionReturnStage: null,
                      updatedAt: new Date().toISOString(),
                    } : draft));
                    setFeedback("Revisi berhasil dikirim kembali untuk diperiksa.");
                  }}
                />
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
                cancelOnly={!canEdit || Boolean(isAssignedRevision)}
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
