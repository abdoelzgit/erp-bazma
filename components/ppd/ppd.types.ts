// Minimal type definitions for PPD
export type ReportRow = {
  id: string;
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
  deptName: string;
  submissionType: string;
  paymentType: string;
  bank: string;
  accountNo: string;
  limitFund: string;
  status: "Draft" | "Submitted" | "Not published";
  rows: ReportRow[];
};
