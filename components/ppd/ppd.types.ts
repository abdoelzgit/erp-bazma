// Minimal type definitions for PPD
import type { PpdRevisionSnapshot } from "@/lib/ppd-revision";

export type ReportRow = {
  id: string;
  accountId: string | null;
  accountName: string | null;
  title: string;
  description: string;
  attachmentName: string;
  amount: number;
};

export type PpdStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED_DEPT"
  | "APPROVED_FINANCE"
  | "PENDING_DEPT_HEAD"
  | "PENDING_FINANCE"
  | "PENDING_EXECUTIVE"
  | "RETURNED_FOR_REVISION"
  | "PENDING_FINANCE_PAYMENT"
  | "PAID"
  | "REJECTED"
  | "CANCELLED";

export type PpdApprovalEventView = {
  id: string;
  actorName: string;
  stage: "DEPT_HEAD" | "FINANCE" | "EXECUTIVE" | "PAYMENT";
  action: "SUBMITTED" | "APPROVED" | "REVISION_REQUESTED" | "CANCELLED" | "PAYMENT_VERIFIED";
  fromStatus: PpdStatus | null;
  toStatus: PpdStatus;
  note: string | null;
  createdAt: string;
};

export type PpdPaymentProofView = {
  originalFileName: string;
  paidAmount: number;
  paidAt: string;
  referenceNumber: string | null;
  financeNote: string | null;
  fileUrl: string;
};

export type PpdCommentView = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type Draft = {
  id: string;
  title: string;
  description: string;
  category: string;
  timeAgo: string;
  deptId: string;
  departmentName?: string;
  submissionType: string;
  paymentType: string;
  bank: string;
  accountNo: string;
  limitFund: string;
  status: PpdStatus;
  revisionReturnStage: "DEPT_HEAD" | "FINANCE" | null;
  revisionSnapshot: PpdRevisionSnapshot | null;
  approvalEvents: PpdApprovalEventView[];
  paymentProof: PpdPaymentProofView | null;
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

export type PpdApprovalQueueItem = Omit<Draft, "departmentName"> & {
  no: string;
  formLimitFund: string;
  requesterName: string;
  departmentName: string;
  createdAt: string;
};
