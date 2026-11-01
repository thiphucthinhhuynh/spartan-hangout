-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('HARASSMENT', 'SPAM', 'INAPPROPRIATE_CONTENT', 'SAFETY_CONCERN', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED');

-- CreateTable
CREATE TABLE "report" (
    "id" UUID NOT NULL,
    "reporter_id" UUID,
    "target_user_id" UUID,
    "target_activity_id" UUID,
    "reason" "ReportReason" NOT NULL,
    "description" VARCHAR(500),
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_status_created_at_idx" ON "report"("status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_target_activity_id_fkey" FOREIGN KEY ("target_activity_id") REFERENCES "activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Hand-written constraints (Prisma cannot express these; see docs/data-model.md) ───

-- FR51: one Pending report per reporter and target; a new one is allowed after review
CREATE UNIQUE INDEX "report_pending_user_key" ON "report" (reporter_id, target_user_id)
  WHERE status = 'PENDING' AND target_user_id IS NOT NULL;
CREATE UNIQUE INDEX "report_pending_activity_key" ON "report" (reporter_id, target_activity_id)
  WHERE status = 'PENDING' AND target_activity_id IS NOT NULL;
