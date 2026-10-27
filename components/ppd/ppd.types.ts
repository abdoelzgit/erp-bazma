// Minimal type definitions for PPD
import type { PpdRevisionSnapshot } from "@/lib/ppd-revision";

export type ReportRow = {
  id: string;
  accountId: string | null;
  accountName: string | null;
  title: string;
  description: string;
  attachmentName: string;
  attachmentNames: string[];
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
  | "PENDING_ACCOUNTABILITY"
  | "PENDING_FINANCE_SETTLEMENT"
  | "PENDING_APPLICANT_REFUND"
  | "PENDING_FINANCE_REFUND_VERIFICATION"
  | "PAID"
  | "REJECTED"
  | "CANCELLED";

export type PpdApprovalEventView = {
  id: string;
  actorName: string;
  stage: "DEPT_HEAD" | "FINANCE" | "EXECUTIVE" | "PAYMENT";
  action: "SUBMITTED" | "APPROVED" | "REVISION_REQUESTED" | "CANCELLED" | "PAYMENT_VERIFIED" | "ACCOUNTABILITY_SUBMITTED" | "REFUND_SUBMITTED" | "REFUND_VERIFIED";
  fromStatus: PpdStatus | null;
  toStatus: PpdStatus;
  note: string | null;
  createdAt: string;
};

export type PpdPaymentProofView = {
  id: string;
  originalFileName: string;
  paidAmount: number;
  paidAt: string;
  referenceNumber: string | null;
  financeNote: string | null;
  fileUrl: string;
};

export type PpdAccountabilityReportView = {
  submittedAt: string;
  submittedByName: string;
  totalAmount: number;
  rows: ReportRow[];
};

export type PpdSettlementProofView = {
  id: string;
  type: "TOP_UP" | "REFUND";
  originalFileName: string;
  amount: number;
  paidAt: string;
  referenceNumber: string | null;
  note: string | null;
  verifiedAt: string | null;
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
  revisionReturnStage: "DEPT_HEAD" | "FINANCE" | "EXECUTIVE" | null;
  revisionRequestedByStage: "DEPT_HEAD" | "FINANCE" | "EXECUTIVE" | null;
  revisionSnapshot: PpdRevisionSnapshot | null;
  approvalEvents: PpdApprovalEventView[];
  paymentProof: PpdPaymentProofView | null;
  accountabilityReport: PpdAccountabilityReportView | null;
  settlementProofs: PpdSettlementProofView[];
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
  isOwnRequest: boolean;
  no: string;
  formLimitFund: string;
  requesterName: string;
  departmentName: string;
  createdAt: string;
};
