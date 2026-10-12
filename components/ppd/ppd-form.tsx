"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  CaretRightIcon,
  TrashIcon,
  FloppyDiskIcon,
  ArrowRightIcon,
  PaperclipIcon,
  ArrowsDownUpIcon,
  CheckCircleIcon,
  FileTextIcon,
  ClockIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export type ReportRow = {
  id: string;
  description: string;
  attachmentName: string;
  amount: number;
};

export type Draft = {
  id: string;
  title: string;
  description: string;
  category: string;
  timeAgo: string;
  fundType: string;
  submissionType: string;
  paymentType: string;
  bank: string;
  accountNo: string;
  limitFund: string;
  status: "Draft" | "Not published" | "Submitted";
  rows: ReportRow[];
};

const INITIAL_DRAFTS: Draft[] = [
  {
    id: "draft-1",
    title: "October product update",
    description: "A look at what's new this month with curriculum development and technical lab setup.",
    category: "Product updates",
    timeAgo: "10 min ago",
    fundType: "Operasional",
    submissionType: "Uang Muka",
    paymentType: "Transfer",
    bank: "Bank Syariah Indonesia (BSI)",
    accountNo: "7148291048",
    limitFund: "15.000.000",
    status: "Not published",
    rows: [
      {
        id: "row-1",
        description: "Pengadaan modul ajar dan modul praktikum IoT",
        attachmentName: "invoice_modul_iot.pdf",
        amount: 4500000,
      },
      {
        id: "row-2",
        description: "Komponen mikrokontroler ESP32 & sensor kit (15 unit)",
        attachmentName: "nota_toko_komponen.pdf",
        amount: 3250000,
      },
    ],
  },
  {
    id: "draft-2",
    title: "Getting started with your workspace",
    description: "Everything you need to set up your team and student workstations.",
    category: "Guides",
    timeAgo: "45 min ago",
    fundType: "Sarana & Prasarana",
    submissionType: "Reimbursement",
    paymentType: "Transfer",
    bank: "Bank Mandiri",
    accountNo: "1320018945672",
    limitFund: "8.500.000",
    status: "Draft",
    rows: [
      {
        id: "row-3",
        description: "Kabel LAN Cat6 1 roll & RJ45 connectors",
        attachmentName: "struk_kabel.jpg",
        amount: 1450000,
      },
    ],
  },
  {
    id: "draft-3",
    title: "Meet the team",
    description: "The people behind our latest release and guest lecture session.",
    category: "Company news",
    timeAgo: "2 hours ago",
    fundType: "Kegiatan Siswa",
    submissionType: "Uang Muka",
    paymentType: "Transfer",
    bank: "Bank BCA",
    accountNo: "8820391823",
    limitFund: "5.000.000",
    status: "Draft",
    rows: [],
  },
  {
    id: "draft-4",
    title: "Five ways to organize your content",
    description: "Simple habits for a cleaner workflow and document archival.",
    category: "Guides",
    timeAgo: "3 hours ago",
    fundType: "Operasional",
    submissionType: "Reimbursement",
    paymentType: "Tunai / Kas",
    bank: "-",
    accountNo: "-",
    limitFund: "2.500.000",
    status: "Draft",
    rows: [],
  },
  {
    id: "draft-5",
    title: "Customer story: Northwind",
    description: "How one team works better together with partner companies for PKL.",
    category: "Company news",
    timeAgo: "Yesterday",
    fundType: "Kegiatan Siswa",
    submissionType: "Pembayaran Vendor",
    paymentType: "Transfer",
    bank: "Bank BNI",
    accountNo: "0912839102",
    limitFund: "12.000.000",
    status: "Draft",
    rows: [],
  },
  {
    id: "draft-6",
    title: "Release notes — September",
    description: "Improvements, fixes and small details on student evaluation system.",
    category: "Product updates",
    timeAgo: "Yesterday",
    fundType: "Operasional",
    submissionType: "Reimbursement",
    paymentType: "Transfer",
    bank: "Bank Mandiri",
    accountNo: "1320018945672",
    limitFund: "6.000.000",
    status: "Draft",
    rows: [],
  },
  {
    id: "draft-7",
    title: "Content planning checklist",
    description: "A practical checklist for your next launch and PPDB exhibition.",
    category: "Guides",
    timeAgo: "Oct 19",
    fundType: "Kegiatan Siswa",
    submissionType: "Uang Muka",
    paymentType: "Transfer",
    bank: "Bank Syariah Indonesia (BSI)",
    accountNo: "7148291048",
    limitFund: "7.500.000",
    status: "Draft",
    rows: [],
  },
  {
    id: "draft-8",
    title: "Untitled draft",
    description: "No context yet",
    category: "Uncategorized",
    timeAgo: "Oct 18",
    fundType: "",
    submissionType: "",
    paymentType: "Transfer",
    bank: "",
    accountNo: "",
    limitFund: "",
    status: "Draft",
    rows: [],
  },
];

export function PpdForm() {
  const [drafts, setDrafts] = useState<Draft[]>(INITIAL_DRAFTS);
  const [selectedDraftId, setSelectedDraftId] = useState<string>("draft-1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Active Draft
  const activeDraft = useMemo(() => {
    return drafts.find((d) => d.id === selectedDraftId) || drafts[0];
  }, [drafts, selectedDraftId]);

  // Form State
  const [formTitle, setFormTitle] = useState(activeDraft?.title || "");
  const [formDescription, setFormDescription] = useState(activeDraft?.description || "");
  const [fundType, setFundType] = useState(activeDraft?.fundType || "");
  const [submissionType, setSubmissionType] = useState(activeDraft?.submissionType || "");
  const [paymentType, setPaymentType] = useState(activeDraft?.paymentType || "Transfer");
  const [bank, setBank] = useState(activeDraft?.bank || "");
  const [accountNo, setAccountNo] = useState(activeDraft?.accountNo || "");
  const [limitFund, setLimitFund] = useState(activeDraft?.limitFund || "");
  const [rows, setRows] = useState<ReportRow[]>(activeDraft?.rows || []);

  // Sync Form when activeDraft changes
  React.useEffect(() => {
    if (activeDraft) {
      setFormTitle(activeDraft.title);
      setFormDescription(activeDraft.description);
      setFundType(activeDraft.fundType);
      setSubmissionType(activeDraft.submissionType);
      setPaymentType(activeDraft.paymentType);
      setBank(activeDraft.bank);
      setAccountNo(activeDraft.accountNo);
      setLimitFund(activeDraft.limitFund);
      setRows(activeDraft.rows || []);
      setFeedbackMessage(null);
    }
  }, [selectedDraftId]);

  // Filtered drafts
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

  // Add Row to Table
  const handleAddRow = () => {
    const newRow: ReportRow = {
      id: `row-${Date.now()}`,
      description: "",
      attachmentName: "",
      amount: 0,
    };
    setRows((prev) => [...prev, newRow]);
  };

  // Update Row
  const handleUpdateRow = (id: string, field: keyof ReportRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Remove Row
  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Calculate Total
  const totalAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [rows]);

  // Create New Draft
  const handleCreateNewDraft = () => {
    const newDraft: Draft = {
      id: `draft-${Date.now()}`,
      title: "Untitled draft",
      description: "No context yet",
      category: "Uncategorized",
      timeAgo: "Just now",
      fundType: "Operasional",
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

  // Save Draft
  const handleSaveDraft = () => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === selectedDraftId
          ? {
              ...d,
              title: formTitle,
              description: formDescription,
              fundType,
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

  // Delete Draft
  const handleDeleteDraft = () => {
    if (drafts.length <= 1) {
      alert("Harus ada minimal 1 draft.");
      return;
    }
    const remaining = drafts.filter((d) => d.id !== selectedDraftId);
    setDrafts(remaining);
    setSelectedDraftId(remaining[0].id);
  };

  // Submit Draft
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
      {/* ============================================================== */}
      {/* LEFT PANEL: Drafts Sidebar                                    */}
      {/* ============================================================== */}
      <aside className="w-full lg:w-80 border-r bg-muted/20 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Drafts</h2>
              <Badge variant="secondary" className="rounded-md font-mono text-xs">
                {drafts.length}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateNewDraft}
              className="h-8 gap-1 text-xs font-medium"
            >
              <PlusIcon className="size-3.5" />
              New draft
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs bg-background"
            />
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter kategori draft"
              className="bg-transparent border rounded px-2 py-1 text-xs text-foreground cursor-pointer focus:outline-none"
            >
              <option value="All">All drafts</option>
              <option value="Product updates">Product updates</option>
              <option value="Guides">Guides</option>
              <option value="Company news">Company news</option>
              <option value="Uncategorized">Uncategorized</option>
            </select>

            <button
              type="button"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <span>Last edited</span>
              <ArrowsDownUpIcon className="size-3" />
            </button>
          </div>

          <div className="text-[11px] text-muted-foreground">
            {filteredDrafts.length} drafts - sorted by most recent
          </div>
        </div>

        {/* Scrollable Drafts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {filteredDrafts.map((draft) => {
            const isSelected = draft.id === selectedDraftId;
            return (
              <div
                key={draft.id}
                onClick={() => setSelectedDraftId(draft.id)}
                className={`p-3.5 transition-colors cursor-pointer relative group ${
                  isSelected
                    ? "bg-accent/80 border-l-4 border-l-primary text-accent-foreground"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-1">
                    {draft.title || "Untitled draft"}
                  </h3>
                  {isSelected && (
                    <CaretRightIcon className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {draft.description || "No context yet"}
                </p>

                <div className="flex items-center justify-between mt-2.5 text-[11px] text-muted-foreground">
                  <span className="font-medium bg-muted/60 px-1.5 py-0.5 rounded text-[10px]">
                    {draft.category}
                  </span>
                  <span>{draft.timeAgo}</span>
                </div>
              </div>
            );
          })}

          {filteredDrafts.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Tidak ada draft yang cocok dengan pencarian.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t text-center text-xs text-muted-foreground bg-muted/10">
          Showing all {drafts.length} drafts
        </div>
      </aside>

      {/* ============================================================== */}
      {/* RIGHT PANEL: Form Details (Fund Request Form / PPD)            */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-background">
        <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
          {/* Breadcrumbs & Header */}
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

          {/* Section Heading */}
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Fund request form</h2>
            <p className="text-xs text-muted-foreground">
              Formulir Permohonan Pencairan Dana (PPD) operasional & kegiatan.
            </p>
          </div>

          {/* ================= TOP GRID (2 Cards) ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Form detail submission */}
            <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
              <h3 className="font-semibold text-sm">Form detail submission</h3>

              <div className="space-y-1.5">
                <label htmlFor="submission-title" className="text-xs font-medium text-muted-foreground">Title</label>
                <Input
                  id="submission-title"
                  placeholder="Enter request title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="submission-description" className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea
                  id="submission-description"
                  placeholder="Add a short description of the request"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="submission-fund-type" className="text-xs font-medium text-muted-foreground">Fund Type</label>
                <select
                  id="submission-fund-type"
                  value={fundType}
                  onChange={(e) => setFundType(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">Select fund type</option>
                  <option value="Operasional">Operasional Sekolah</option>
                  <option value="Kegiatan Siswa">Kegiatan Siswa / Pembelajaran</option>
                  <option value="Sarana & Prasarana">Sarana & Prasarana</option>
                  <option value="Darurat">Darurat / Mendesak</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="submission-type" className="text-xs font-medium text-muted-foreground">Submission Type</label>
                <select
                  id="submission-type"
                  value={submissionType}
                  onChange={(e) => setSubmissionType(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">Select submission type</option>
                  <option value="Uang Muka">Uang Muka (Advance)</option>
                  <option value="Reimbursement">Reimbursement (Penggantian)</option>
                  <option value="Pembayaran Vendor">Pembayaran Langsung Vendor</option>
                </select>
              </div>
            </div>

            {/* Card 2: Form payment method */}
            <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
              <h3 className="font-semibold text-sm">Form payment method</h3>

              <div className="space-y-1.5">
                <label htmlFor="payment-type" className="text-xs font-medium text-muted-foreground">Type</label>
                <select
                  id="payment-type"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="Transfer">Transfer Bank</option>
                  <option value="Tunai / Kas">Tunai / Kas Sekolah</option>
                  <option value="Giro">Cek / Bilyet Giro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="payment-bank" className="text-xs font-medium text-muted-foreground">Bank</label>
                <select
                  id="payment-bank"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">Select Bank</option>
                  <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                  <option value="Bank Mandiri">Bank Mandiri</option>
                  <option value="Bank BCA">Bank Central Asia (BCA)</option>
                  <option value="Bank BRI">Bank Rakyat Indonesia (BRI)</option>
                  <option value="Bank BNI">Bank Negara Indonesia (BNI)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="account-number" className="text-xs font-medium text-muted-foreground">Account No</label>
                <Input
                  id="account-number"
                  placeholder="Enter account number"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="limit-fund" className="text-xs font-medium text-muted-foreground">Total limit fund</label>
                <Input
                  id="limit-fund"
                  placeholder="Limit Fund (contoh: 15.000.000)"
                  value={limitFund}
                  onChange={(e) => setLimitFund(e.target.value)}
                  className="text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* ================= TABLE: Accountability Report Table ================= */}
          <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Accountability Report Table</h3>
                <p className="text-xs text-muted-foreground">
                  Rincian item pengeluaran dan lampiran bukti transaksi.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="gap-1.5 text-xs h-8"
              >
                <PlusIcon className="size-3.5" />
                Add row
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border border-border/80">
              <table className="w-full caption-bottom text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    <th className="p-3 text-left font-medium w-[45%]">Description</th>
                    <th className="p-3 text-left font-medium w-[25%]">Attachment</th>
                    <th className="p-3 text-right font-medium w-[20%]">Amount (Rp)</th>
                    <th className="p-3 text-center font-medium w-[10%]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-2.5">
                        <Input
                          placeholder="Deskripsi pengeluaran..."
                          value={row.description}
                          onChange={(e) =>
                            handleUpdateRow(row.id, "description", e.target.value)
                          }
                          className="h-8 text-xs border-dashed"
                        />
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <PaperclipIcon className="size-3.5 text-muted-foreground shrink-0" />
                          <Input
                            placeholder="nama_file.pdf"
                            value={row.attachmentName}
                            onChange={(e) =>
                              handleUpdateRow(row.id, "attachmentName", e.target.value)
                            }
                            className="h-8 text-xs border-dashed"
                          />
                        </div>
                      </td>
                      <td className="p-2.5 text-right">
                        <Input
                          type="number"
                          placeholder="0"
                          value={row.amount || ""}
                          onChange={(e) =>
                            handleUpdateRow(row.id, "amount", Number(e.target.value))
                          }
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRow(row.id)}
                          className="size-7 text-destructive hover:bg-destructive/10"
                        >
                          <TrashIcon className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        Belum ada item laporan. Klik tombol <strong>&quot;+ Add row&quot;</strong> untuk menambahkan rincian.
                      </td>
                    </tr>
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t bg-muted/30 font-semibold">
                      <td colSpan={2} className="p-3 text-right">
                        Total Rincian:
                      </td>
                      <td className="p-3 text-right font-mono text-primary font-bold">
                        Rp {totalAmount.toLocaleString("id-ID")}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* ================= BOTTOM ACTION BAR ================= */}
          <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 bg-background/95 backdrop-blur py-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteDraft}
              className="gap-2 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 w-full sm:w-auto"
            >
              <TrashIcon className="size-4" />
              Delete draft
            </Button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                {activeDraft?.status || "Not published"}
              </span>

              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                className="gap-1.5 text-xs"
              >
                <FloppyDiskIcon className="size-3.5" />
                Save draft
              </Button>

              <Button
                type="button"
                onClick={handleSubmitDraft}
                className="gap-1.5 text-xs font-semibold"
              >
                <span>Submit Draft</span>
                <ArrowRightIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
