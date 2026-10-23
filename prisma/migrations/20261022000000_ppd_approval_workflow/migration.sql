ALTER TYPE "PPDStatus" ADD VALUE 'PENDING_DEPT_HEAD';
ALTER TYPE "PPDStatus" ADD VALUE 'PENDING_FINANCE';
ALTER TYPE "PPDStatus" ADD VALUE 'PENDING_EXECUTIVE';
ALTER TYPE "PPDStatus" ADD VALUE 'RETURNED_FOR_REVISION';
ALTER TYPE "PPDStatus" ADD VALUE 'PENDING_FINANCE_PAYMENT';
ALTER TYPE "PPDStatus" ADD VALUE 'CANCELLED';

CREATE TYPE "PPDApprovalStage" AS ENUM ('DEPT_HEAD', 'FINANCE', 'EXECUTIVE', 'PAYMENT');
CREATE TYPE "PPDApprovalAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REVISION_REQUESTED', 'CANCELLED', 'PAYMENT_VERIFIED');

ALTER TABLE "ppd_requests" ADD COLUMN "revisionReturnStage" "PPDApprovalStage";
ALTER TABLE "ppd_items" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
UPDATE "ppd_items" SET "title" = "description";

CREATE TABLE "ppd_approval_events" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "stage" "PPDApprovalStage" NOT NULL,
    "action" "PPDApprovalAction" NOT NULL,
    "fromStatus" "PPDStatus",
    "toStatus" "PPDStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ppd_approval_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ppd_payment_proofs" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "paidAmount" DECIMAL(18,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT,
    "financeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ppd_payment_proofs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ppd_payment_proofs_requestId_key" ON "ppd_payment_proofs"("requestId");
CREATE INDEX "ppd_approval_events_requestId_createdAt_idx" ON "ppd_approval_events"("requestId", "createdAt");
CREATE INDEX "ppd_approval_events_actorId_createdAt_idx" ON "ppd_approval_events"("actorId", "createdAt");
CREATE INDEX "ppd_payment_proofs_uploadedById_createdAt_idx" ON "ppd_payment_proofs"("uploadedById", "createdAt");
CREATE INDEX "ppd_requests_status_departmentId_updatedAt_idx" ON "ppd_requests"("status", "departmentId", "updatedAt");

ALTER TABLE "ppd_approval_events"
ADD CONSTRAINT "ppd_approval_events_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "ppd_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ppd_approval_events"
ADD CONSTRAINT "ppd_approval_events_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ppd_payment_proofs"
ADD CONSTRAINT "ppd_payment_proofs_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "ppd_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ppd_payment_proofs"
ADD CONSTRAINT "ppd_payment_proofs_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
