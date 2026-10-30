-- CreateEnum
CREATE TYPE "ActivityMessageKind" AS ENUM ('MESSAGE', 'UPDATE');

-- CreateTable
CREATE TABLE "activity_message" (
    "id" UUID NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "activity_id" UUID NOT NULL,
    "sender_id" UUID,
    "kind" "ActivityMessageKind" NOT NULL DEFAULT 'MESSAGE',
    "body" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_message_activity_id_seq_idx" ON "activity_message"("activity_id", "seq");

-- AddForeignKey
ALTER TABLE "activity_message" ADD CONSTRAINT "activity_message_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_message" ADD CONSTRAINT "activity_message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Hand-written constraints (Prisma cannot express CHECKs; see docs/data-model.md) ───

-- FR36, FR38: 1–500 characters, and not only whitespace (open question Q18)
ALTER TABLE "activity_message" ADD CONSTRAINT "activity_message_body_check"
  CHECK (char_length(btrim(body)) >= 1);
