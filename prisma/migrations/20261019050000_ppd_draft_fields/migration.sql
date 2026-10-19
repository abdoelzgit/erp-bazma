ALTER TABLE "ppd_requests"
ADD COLUMN "limitFund" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "paymentType" TEXT NOT NULL DEFAULT 'Transfer',
ADD COLUMN "year" INTEGER,
ADD COLUMN "month" INTEGER;

UPDATE "ppd_requests"
SET "year" = EXTRACT(YEAR FROM "createdAt")::INTEGER,
    "month" = EXTRACT(MONTH FROM "createdAt")::INTEGER;

ALTER TABLE "ppd_requests"
ALTER COLUMN "year" SET NOT NULL,
ALTER COLUMN "month" SET NOT NULL;

CREATE INDEX "ppd_requests_requestedById_updatedAt_idx" ON "ppd_requests"("requestedById", "updatedAt");
CREATE INDEX "ppd_requests_year_month_idx" ON "ppd_requests"("year", "month");

ALTER TABLE "ppd_items" ALTER COLUMN "accountId" DROP NOT NULL;
ALTER TABLE "ppd_items" DROP CONSTRAINT "ppd_items_accountId_fkey";
ALTER TABLE "ppd_items" ADD CONSTRAINT "ppd_items_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "budget_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
