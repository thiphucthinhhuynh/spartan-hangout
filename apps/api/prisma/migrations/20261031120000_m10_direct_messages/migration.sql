-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "conversation_id" UUID;

-- CreateTable
CREATE TABLE "conversation" (
    "id" UUID NOT NULL,
    "user_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "last_message_at" TIMESTAMPTZ(3),

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_message" (
    "id" UUID NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID,
    "body" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_user_b_id_idx" ON "conversation"("user_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_user_a_id_user_b_id_key" ON "conversation"("user_a_id", "user_b_id");

-- CreateIndex
CREATE INDEX "direct_message_conversation_id_seq_idx" ON "direct_message"("conversation_id", "seq");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Hand-written constraints (Prisma cannot express CHECKs; see docs/data-model.md) ───

-- FR47: each pair is stored once, smaller id first (this also rules out messaging yourself)
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_pair_order_check"
  CHECK (user_a_id < user_b_id);

-- FR47: 1–500 characters, and not only whitespace (open question Q18)
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_body_check"
  CHECK (char_length(btrim(body)) >= 1);
