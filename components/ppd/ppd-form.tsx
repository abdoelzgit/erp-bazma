"use client";

import { useState, useMemo } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import type { ReportRow, Draft } from "./ppd.types";
import { INITIAL_DRAFTS, DEPARTMENTS, ACCOUNTS } from "./ppd.data";

import { PpdSidebar } from "./components/ppd-sidebar";
import { PpdFormDetails } from "./components/ppd-form-details";
import { PpdReportTable } from "./components/ppd-report-table";
import { PpdActionBar } from "./components/ppd-action-bar";

export function PpdForm() {
  const [drafts, setDrafts] = useState<Draft[]>(INITIAL_DRAFTS);
  const [selectedDraftId, setSelectedDraftId] = useState<string>("draft-1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const activeDraft = useMemo(() => {
    return drafts.find((d) => d.id === selectedDraftId) || drafts[0];
  }, [drafts, selectedDraftId]);

  const [formTitle, setFormTitle] = useState(activeDraft?.title || "");
  const [formDescription, setFormDescription] = useState(activeDraft?.description || "");
  const [deptName, setDeptName] = useState(activeDraft?.deptName || "");
  const [submissionType, setSubmissionType] = useState(activeDraft?.submissionType || "");
  const [paymentType, setPaymentType] = useState(activeDraft?.paymentType || "Transfer");
  const [bank, setBank] = useState(activeDraft?.bank || "");
  const [accountNo, setAccountNo] = useState(activeDraft?.accountNo || "");
  const [limitFund, setLimitFund] = useState(activeDraft?.limitFund || "");
  const [rows, setRows] = useState<ReportRow[]>(activeDraft?.rows || []);

  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      const matchesSearch =
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "All" || d.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [drafts, searchQuery, categoryFilter]);

  const filteredAccounts = useMemo(() => {
    if (!deptName) return [];
    const dept = DEPARTMENTS.find((d) => d.name === deptName);
    if (!dept) return [];
    return ACCOUNTS.filter((acc) => acc.deptId === dept.id);
  }, [deptName]);

  const handleAddRow = () => {
    const newRow: ReportRow = {
      id: `row-${Date.now()}`,
      accountName: null,
      description: "",
      attachmentName: "",
      amount: 0,
    };
    setRows((prev) => [...prev, newRow]);
  };

  const handleUpdateRow = (id: string, field: keyof ReportRow, value: string | number | null) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [rows]);

  const handleCreateNewDraft = () => {
    const newDraft: Draft = {
      id: `draft-${Date.now()}`,
      title: "Untitled draft",
      description: "No context yet",
      category: "Uncategorized",
      timeAgo: "Just now",
      deptName: "",
      submissionType: "Uang Muka",
      paymentType: "Transfer",
      bank: "Bank Syariah Indonesia (BSI)",
      accountNo: "",
      limitFund: "",
      status: "Draft",
      rows: [],
    };
    setDrafts([newDraft, ...drafts]);
    setSelectedDraftId(newDraft.id);
  };

  const handleSaveDraft = () => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === selectedDraftId
          ? {
              ...d,
              title: formTitle,
              description: formDescription,
              deptName,
              submissionType,
              paymentType,
              bank,
              accountNo,
              limitFund,
              rows,
              timeAgo: "Just now",
            }
          : d
      )
    );
    setFeedbackMessage("Draft berhasil disimpan!");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleDeleteDraft = () => {
    if (drafts.length <= 1) {
      alert("Harus ada minimal 1 draft.");
      return;
    }
    const remaining = drafts.filter((d) => d.id !== selectedDraftId);
    setDrafts(remaining);
    setSelectedDraftId(remaining[0].id);
  };

  const handleSubmitDraft = () => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === selectedDraftId
          ? {
              ...d,
              status: "Submitted",
              timeAgo: "Submitted just now",
            }
          : d
      )
    );
    setFeedbackMessage("Permohonan dana (PPD) berhasil disubmit!");
    setTimeout(() => setFeedbackMessage(null), 4000);
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
              <span>Drafts</span>
              <span>/</span>
              <span className="text-foreground font-medium">
                {activeDraft?.category || "Fund request"}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              {formTitle || "October product update"}
            </h1>
          </div>

          {feedbackMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-md">
              <CheckCircleIcon className="size-4 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold tracking-tight">Fund request form</h2>
            <p className="text-xs text-muted-foreground">
              Formulir Permohonan Pencairan Dana (PPD) operasional & kegiatan.
            </p>
          </div>

          <PpdFormDetails
            title={formTitle}
            onTitleChange={setFormTitle}
            description={formDescription}
            onDescriptionChange={setFormDescription}
            deptId={deptName}
            onDeptIdChange={setDeptName}
            departments={DEPARTMENTS}
            submissionType={submissionType}
            onSubmissionTypeChange={setSubmissionType}
            paymentType={paymentType}
            onPaymentTypeChange={setPaymentType}
            bank={bank}
            onBankChange={setBank}
            accountNo={accountNo}
            onAccountNoChange={setAccountNo}
            limitFund={limitFund}
            onLimitFundChange={setLimitFund}
          />

          <PpdReportTable
            rows={rows}
            onAdd={handleAddRow}
            onUpdate={handleUpdateRow}
            onRemove={handleRemoveRow}
            total={totalAmount}
            deptName={deptName}
            accounts={filteredAccounts}
          />

          <PpdActionBar
            status={activeDraft?.status || "Not published"}
            onDelete={handleDeleteDraft}
            onSave={handleSaveDraft}
            onSubmit={handleSubmitDraft}
          />
        </div>
      </main>
    </div>
  );
}
