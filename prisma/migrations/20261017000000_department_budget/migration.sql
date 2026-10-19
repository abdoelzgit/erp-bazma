-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DepartmentMemberRole" AS ENUM ('PIC', 'MEMBER');

-- CreateEnum
CREATE TYPE "DepartmentMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "picName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_members" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "DepartmentMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "DepartmentMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_annual_budgets" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "allocatedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_annual_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_accounts" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_budgets" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "realizedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
ALTER TABLE "department_annual_budgets"
ADD CONSTRAINT "department_annual_budgets_amount_nonnegative_check" CHECK ("allocatedAmount" >= 0);

ALTER TABLE "monthly_budgets"
ADD CONSTRAINT "monthly_budgets_month_range_check" CHECK ("month" BETWEEN 1 AND 12),
ADD CONSTRAINT "monthly_budgets_amount_nonnegative_check" CHECK ("amount" >= 0),
ADD CONSTRAINT "monthly_budgets_realized_nonnegative_check" CHECK ("realizedAmount" >= 0);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "departments_status_name_idx" ON "departments"("status", "name");

-- CreateIndex
CREATE INDEX "department_members_userId_idx" ON "department_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "department_members_departmentId_email_key" ON "department_members"("departmentId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "department_members_departmentId_userId_key" ON "department_members"("departmentId", "userId");

-- CreateIndex
CREATE INDEX "department_annual_budgets_year_idx" ON "department_annual_budgets"("year");

-- CreateIndex
CREATE UNIQUE INDEX "department_annual_budgets_departmentId_year_key" ON "department_annual_budgets"("departmentId", "year");

-- CreateIndex
CREATE INDEX "budget_accounts_departmentId_name_idx" ON "budget_accounts"("departmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "budget_accounts_departmentId_code_key" ON "budget_accounts"("departmentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "budget_accounts_departmentId_name_key" ON "budget_accounts"("departmentId", "name");

-- CreateIndex
CREATE INDEX "monthly_budgets_year_month_idx" ON "monthly_budgets"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_budgets_accountId_year_month_key" ON "monthly_budgets"("accountId", "year", "month");

-- AddForeignKey
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_annual_budgets" ADD CONSTRAINT "department_annual_budgets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_accounts" ADD CONSTRAINT "budget_accounts_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "budget_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
