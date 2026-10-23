ALTER TABLE "ppd_approval_events" ADD COLUMN IF NOT EXISTS "snapshot" JSONB;

CREATE TABLE IF NOT EXISTS "ppd_comments" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ppd_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ppd_comments_requestId_createdAt_idx" ON "ppd_comments"("requestId", "createdAt");
CREATE INDEX IF NOT EXISTS "ppd_comments_authorId_createdAt_idx" ON "ppd_comments"("authorId", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ppd_comments_requestId_fkey'
          AND conrelid = 'ppd_comments'::regclass
    ) THEN
        ALTER TABLE "ppd_comments"
        ADD CONSTRAINT "ppd_comments_requestId_fkey"
        FOREIGN KEY ("requestId") REFERENCES "ppd_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ppd_comments_authorId_fkey'
          AND conrelid = 'ppd_comments'::regclass
    ) THEN
        ALTER TABLE "ppd_comments"
        ADD CONSTRAINT "ppd_comments_authorId_fkey"
        FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
