"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { savePpdDraftAction, deletePpdDraftAction, submitPpdDraftAction } from "@/app/actions/ppd";
import type { PpdPageData, ReportRow } from "./ppd.types";
import { PpdSidebar } from "./components/ppd-sidebar";
import { PpdFormDetails } from "./components/ppd-form-details";
import { PpdReportTable } from "./components/ppd-report-table";
import { PpdActionBar } from "./components/ppd-action-bar";

export function PpdForm({ initialData }: { initialData: PpdPageData }) {
  const [drafts, setDrafts] = useState(initialData.drafts);
  const [selectedDraftId, setSelectedDraftId] = useState(initialData.drafts[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [deptId, setDeptId] = useState("");
  const [submissionType, setSubmissionType] = useState("");
  const [paymentType, setPaymentType] = useState("Transfer");
  const [bank, setBank] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [limitFund, setLimitFund] = useState("");
  const [rows, setRows] = useState<ReportRow[]>([]);

  const activeDraft = drafts.find((draft) => draft.id === selectedDraftId);
  const year = activeDraft?.year ?? new Date().getFullYear();
  const month = activeDraft?.month ?? new Date().getMonth() + 1;

  useEffect(() => {
    if (!activeDraft) {
      setFormTitle("");
      setFormDescription("");
      setDeptId("");
      setSubmissionType("");
      setPaymentType("Transfer");
      setBank("");
      setAccountNo("");
      setLimitFund("");
      setRows([]);
      return;
    }
    setFormTitle(activeDraft.title);
    setFormDescription(activeDraft.description);
    setDeptId(activeDraft.deptId);
    setSubmissionType(activeDraft.submissionType);
    setPaymentType(activeDraft.paymentType);
    setBank(activeDraft.bank);
    setAccountNo(activeDraft.accountNo);
    setLimitFund(activeDraft.limitFund);
    setRows(activeDraft.rows);
  }, [activeDraft]);

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

  const setFeedback = (message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleAddRow = () => setRows((previous) => [...previous, {
    id: `new-${crypto.randomUUID()}`,
    accountId: null,
    accountName: null,
    description: "",
    attachmentName: "",
    amount: 0,
  }]);

  const handleUpdateRow = (id: string, field: keyof ReportRow, value: string | number | null) => {
    setRows((previous) => previous.map((row) => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleRemoveRow = (id: string) => setRows((previous) => previous.filter((row) => row.id !== id));
  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0), [rows]);

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
        accountId: row.accountId,
        description: row.description,
        attachmentName: row.attachmentName,
        amount: Number(row.amount) || 0,
      })),
    });
    setIsSaving(false);
    if (result.error || !result.id) return setFeedback(result.error ?? "Gagal menyimpan draft.");

    const savedAt = new Date().toISOString();
    const savedDraft = {
      id: result.id,
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
      status: "Draft" as const,
      year,
      month,
      updatedAt: savedAt,
      rows: rows.map((row) => ({ ...row, id: row.id.startsWith("new-") ? crypto.randomUUID() : row.id })),
    };
    setDrafts((previous) => [savedDraft, ...previous.filter((draft) => draft.id !== savedDraft.id)]);
    setSelectedDraftId(savedDraft.id);
    setFeedback("Draft PPD berhasil disimpan.");
  };

  const handleCreateNewDraft = async () => {
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
  };

  const handleDeleteDraft = async () => {
    if (!activeDraft) return;
    const result = await deletePpdDraftAction(activeDraft.id);
    if (result.error) return setFeedback(result.error);
    const remaining = drafts.filter((draft) => draft.id !== activeDraft.id);
    setDrafts(remaining);
    setSelectedDraftId(remaining[0]?.id ?? "");
    setFeedback("Draft berhasil dihapus.");
  };

  const handleSubmitDraft = async () => {
    if (!activeDraft) return;
    const saved = await savePpdDraftAction({
      id: activeDraft.id, title: formTitle, description: formDescription, departmentId: deptId,
      submissionType, paymentType, bank, accountNo,
      limitFund: Number(limitFund.replace(/[^\d.-]/g, "")) || 0, year, month,
      items: rows.map((row) => ({ accountId: row.accountId, description: row.description, attachmentName: row.attachmentName, amount: Number(row.amount) || 0 })),
    });
    if (saved.error) return setFeedback(saved.error);
    const result = await submitPpdDraftAction(activeDraft.id);
    if (result.error) return setFeedback(result.error);
    setDrafts((previous) => previous.map((draft) => draft.id === activeDraft.id
      ? { ...draft, title: formTitle, description: formDescription, deptId, submissionType, status: "Submitted" }
      : draft));
    setFeedback("Permohonan dana (PPD) berhasil dikirim.");
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-4rem)] bg-background">
      <PpdSidebar
        drafts={filteredDrafts}
        selectedDraftId={selectedDraftId}
        onSelect={setSelectedDraftId}
        onCompose={handleCreateNewDraft}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        category={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />
      <main className="flex-1 flex flex-col overflow-y-auto bg-background">
        <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>PPD</span><span>/</span><span className="text-foreground font-medium">{activeDraft?.submissionType || "Permohonan baru"}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">{formTitle || "Permohonan Pencairan Dana"}</h1>
          </div>

          {feedbackMessage && <div className="flex items-center gap-2 p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-md"><CheckCircleIcon className="size-4 shrink-0" /><span>{feedbackMessage}</span></div>}

          <div>
            <h2 className="text-lg font-semibold tracking-tight">Formulir PPD</h2>
            <p className="text-xs text-muted-foreground">Permohonan pencairan dana operasional dan kegiatan.</p>
          </div>

          {!activeDraft ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Belum ada draft PPD. Pilih <strong>New draft</strong> untuk membuat permohonan.
            </div>
          ) : (
            <>
              <PpdFormDetails
                title={formTitle} onTitleChange={setFormTitle}
                description={formDescription} onDescriptionChange={setFormDescription}
                deptId={deptId} onDeptIdChange={setDeptId} departments={initialData.departments}
                submissionType={submissionType} onSubmissionTypeChange={setSubmissionType}
                paymentType={paymentType} onPaymentTypeChange={setPaymentType}
                bank={bank} onBankChange={setBank} accountNo={accountNo} onAccountNoChange={setAccountNo}
                limitFund={limitFund} onLimitFundChange={setLimitFund}
              />
              <PpdReportTable
                rows={rows} onAdd={handleAddRow} onUpdate={handleUpdateRow} onRemove={handleRemoveRow}
                total={totalAmount} deptName={deptId} accounts={filteredAccounts}
                budgets={initialData.budgets} year={year} month={month}
              />
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
