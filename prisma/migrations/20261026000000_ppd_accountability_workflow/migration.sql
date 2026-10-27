ALTER TYPE "PPDStatus" ADD VALUE 'PENDING_ACCOUNTABILITY';
ALTER TYPE "PPDStatus" ADD VALUE 'PENDING_FINANCE_SETTLEMENT';
ALTER TYPE "PPDStatus" ADD VALUE 'PENDING_APPLICANT_REFUND';
ALTER TYPE "PPDStatus" ADD VALUE 'PENDING_FINANCE_REFUND_VERIFICATION';

ALTER TYPE "PPDApprovalAction" ADD VALUE 'ACCOUNTABILITY_SUBMITTED';
ALTER TYPE "PPDApprovalAction" ADD VALUE 'REFUND_SUBMITTED';
ALTER TYPE "PPDApprovalAction" ADD VALUE 'REFUND_VERIFIED';

CREATE TYPE "PPDSettlementProofType" AS ENUM ('TOP_UP', 'REFUND');

CREATE TABLE "ppd_accountability_reports" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ppd_accountability_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ppd_accountability_items" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "accountId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL(18,2) NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    CONSTRAINT "ppd_accountability_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ppd_settlement_proofs" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" "PPDSettlementProofType" NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "verifiedById" TEXT,
    "originalFileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    CONSTRAINT "ppd_settlement_proofs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ppd_accountability_reports_requestId_key" ON "ppd_accountability_reports"("requestId");
CREATE INDEX "ppd_accountability_reports_submittedById_submittedAt_idx" ON "ppd_accountability_reports"("submittedById", "submittedAt");
CREATE INDEX "ppd_accountability_items_reportId_idx" ON "ppd_accountability_items"("reportId");
CREATE UNIQUE INDEX "ppd_settlement_proofs_requestId_type_key" ON "ppd_settlement_proofs"("requestId", "type");
CREATE INDEX "ppd_settlement_proofs_uploadedById_createdAt_idx" ON "ppd_settlement_proofs"("uploadedById", "createdAt");

ALTER TABLE "ppd_accountability_reports"
ADD CONSTRAINT "ppd_accountability_reports_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "ppd_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ppd_accountability_reports"
ADD CONSTRAINT "ppd_accountability_reports_submittedById_fkey"
FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ppd_accountability_items"
ADD CONSTRAINT "ppd_accountability_items_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "ppd_accountability_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ppd_accountability_items"
ADD CONSTRAINT "ppd_accountability_items_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "budget_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ppd_settlement_proofs"
ADD CONSTRAINT "ppd_settlement_proofs_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "ppd_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ppd_settlement_proofs"
ADD CONSTRAINT "ppd_settlement_proofs_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ppd_settlement_proofs"
ADD CONSTRAINT "ppd_settlement_proofs_verifiedById_fkey"
FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
