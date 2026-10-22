// Minimal type definitions for PPD
export type ReportRow = {
  id: string;
  accountId: string | null;
  accountName: string | null;
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
  deptId: string;
  submissionType: string;
  paymentType: string;
  bank: string;
  accountNo: string;
  limitFund: string;
  status: "Draft" | "Submitted" | "Not published";
  year: number;
  month: number;
  updatedAt: string;
  rows: ReportRow[];
};

export type PpdPageData = {
  drafts: Draft[];
  departments: Array<{ id: string; name: string }>;
  accounts: Array<{ id: string; deptId: string; code: string; name: string }>;
  budgets: Record<string, { amount: number; realized: number; reserved: number }>;
};
