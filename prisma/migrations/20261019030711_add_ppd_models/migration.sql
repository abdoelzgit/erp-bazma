-- CreateEnum
CREATE TYPE "PPDType" AS ENUM ('UANG_MUKA', 'REIMBURSEMENT', 'PEMBAYARAN_VENDOR');

-- CreateEnum
CREATE TYPE "PPDStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED_DEPT', 'APPROVED_FINANCE', 'PAID', 'REJECTED');

-- CreateTable
CREATE TABLE "ppd_requests" (
    "id" TEXT NOT NULL,
    "no" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "PPDType" NOT NULL,
    "status" "PPDStatus" NOT NULL DEFAULT 'DRAFT',
    "departmentId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "bankName" TEXT,
    "accountNo" TEXT,
    "accountName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ppd_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ppd_items" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ppd_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ppd_requests_no_key" ON "ppd_requests"("no");

-- AddForeignKey
ALTER TABLE "ppd_requests" ADD CONSTRAINT "ppd_requests_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppd_requests" ADD CONSTRAINT "ppd_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppd_items" ADD CONSTRAINT "ppd_items_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ppd_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppd_items" ADD CONSTRAINT "ppd_items_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "budget_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
