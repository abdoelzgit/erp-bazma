"use client";

import { useMemo, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { savePpdDraftAction, deletePpdDraftAction, submitPpdDraftAction } from "@/app/actions/ppd";
import type { Draft, PpdPageData, ReportRow } from "./ppd.types";
import { PpdSidebar } from "./components/ppd-sidebar";
import { PpdFormDetails } from "./components/ppd-form-details";
import { PpdReportTable } from "./components/ppd-report-table";
import { PpdActionBar } from "./components/ppd-action-bar";

const budgetKey = (accountId: string, year: number, month: number) =>
  `${accountId}|${year}|${month}`;

function getDraftReservations(draft?: Draft): Record<string, number> {
  if (
    !draft ||
    (draft.status !== "Draft" && draft.status !== "Submitted") ||
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
  const year = activeDraft?.year ?? new Date().getFullYear();
  const month = activeDraft?.month ?? new Date().getMonth() + 1;

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
    const matchesStatus = categoryFilter === "All" || draft.status === categoryFilter;
    return matchesSearch && matchesStatus;
  }), [drafts, searchQuery, categoryFilter]);

  const filteredAccounts = useMemo(
    () => initialData.accounts.filter((account) => account.deptId === deptId),
    [initialData.accounts, deptId],
  );
  const departmentName = initialData.departments.find((department) => department.id === deptId)?.name ?? "";

  const setFeedback = (message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleAddRow = () => setRows((previous) => [...previous, {
    id: `new-${crypto.randomUUID()}`,
    accountId: selectedAccountId || null,
    accountName: initialData.accounts.find((account) => account.id === selectedAccountId)?.name ?? null,
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
      submissionType,
      paymentType,
      bank,
      accountNo,
      limitFund: String(Number(limitFund.replace(/[^\d.-]/g, "")) || 0),
      status,
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
        description: row.description,
        attachmentName: row.attachmentName,
        amount: Number(row.amount) || 0,
      })),
    });
    setIsSaving(false);
    if (result.error || !result.id) return setFeedback(result.error ?? "Gagal menyimpan draft.");

    const savedDraft = buildSavedDraft(result.id, "Draft");
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
      id: result.id, title: "", description: "", category: "Draft", timeAgo: "Baru dibuat",
      deptId: initialData.departments[0]?.id ?? "", submissionType: "", paymentType: "Transfer",
      bank: "", accountNo: "", limitFund: "0", status: "Draft" as const,
      year: now.getFullYear(), month: now.getMonth() + 1, updatedAt: now.toISOString(), rows: [],
    };
    setDrafts((previous) => [newDraft, ...previous]);
    setSelectedDraftId(newDraft.id);
    loadDraft(newDraft);
  };

  const handleDeleteDraft = async () => {
    if (!activeDraft) return;
    const result = await deletePpdDraftAction(activeDraft.id);
    if (result.error) return setFeedback(result.error);
    changeBudgetReservations(activeDraft, undefined);
    const remaining = drafts.filter((draft) => draft.id !== activeDraft.id);
    const nextDraft = remaining[0];
    setDrafts(remaining);
    setSelectedDraftId(nextDraft?.id ?? "");
    loadDraft(nextDraft);
    setFeedback("Draft berhasil dihapus.");
  };

  const handleSubmitDraft = async () => {
    if (!activeDraft) return;
    const saved = await savePpdDraftAction({
      id: activeDraft.id, title: formTitle, description: formDescription, departmentId: deptId,
      submissionType, paymentType, bank, accountNo,
      limitFund: Number(limitFund.replace(/[^\d.-]/g, "")) || 0, year, month,
      items: rows.map((row) => ({ accountId: selectedAccountId || null, description: row.description, attachmentName: row.attachmentName, amount: Number(row.amount) || 0 })),
    });
    if (saved.error) return setFeedback(saved.error);
    const savedDraft = buildSavedDraft(activeDraft.id, "Draft");
    changeBudgetReservations(activeDraft, savedDraft);
    setDrafts((previous) => [savedDraft, ...previous.filter((draft) => draft.id !== savedDraft.id)]);
    const result = await submitPpdDraftAction(activeDraft.id);
    if (result.error) return setFeedback(result.error);
    const submittedDraft = { ...savedDraft, status: "Submitted" as const };
    setDrafts((previous) => previous.map((draft) => draft.id === activeDraft.id ? submittedDraft : draft));
    setFeedback("Permohonan dana (PPD) berhasil dikirim.");
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
            <p className="text-xs text-muted-foreground">Permohonan pencairan dana operasional dan kegiatan.</p>
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
              />
              {submissionType === "UANG_MUKA" && (
                <PpdReportTable
                  draftId={activeDraft.id}
                  rows={rows} onAdd={handleAddRow} onUpdate={handleUpdateRow} onRemove={handleRemoveRow}
                  total={totalAmount} deptName={departmentName} accounts={filteredAccounts}
                  budgets={budgets} year={year} month={month}
                  selectedAccountId={selectedAccountId} onAccountChange={handleAccountChange}
                />
              )}
              {activeDraft.status === "Draft" && <PpdActionBar
                status={activeDraft.status} onDelete={handleDeleteDraft}
                onSave={saveDraft} onSubmit={handleSubmitDraft} isSaving={isSaving}
              />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
