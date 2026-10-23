UPDATE "ppd_requests" SET "status" = 'PENDING_DEPT_HEAD' WHERE "status" = 'SUBMITTED';
UPDATE "ppd_requests" SET "status" = 'PENDING_FINANCE' WHERE "status" = 'APPROVED_DEPT';
UPDATE "ppd_requests" SET "status" = 'PENDING_EXECUTIVE' WHERE "status" = 'APPROVED_FINANCE';
UPDATE "ppd_requests" SET "limitFund" = "totalAmount" WHERE "limitFund" = 0 AND "totalAmount" > 0;
UPDATE "ppd_requests" SET "totalAmount" = "limitFund" WHERE "type" = 'PEMBAYARAN' AND "totalAmount" = 0 AND "limitFund" > 0;
