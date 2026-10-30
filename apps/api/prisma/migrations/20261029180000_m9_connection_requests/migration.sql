-- CreateTable
CREATE TABLE "connection_request" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connection_request_recipient_id_idx" ON "connection_request"("recipient_id");

-- AddForeignKey
ALTER TABLE "connection_request" ADD CONSTRAINT "connection_request_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_request" ADD CONSTRAINT "connection_request_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Hand-written constraints (Prisma cannot express these; see docs/data-model.md) ───

-- FR45: no request to yourself
ALTER TABLE "connection_request" ADD CONSTRAINT "connection_request_not_self_check"
  CHECK (sender_id <> recipient_id);

-- FR45: at most one pending request per pair, in either direction
CREATE UNIQUE INDEX "connection_request_pair_key" ON "connection_request"
  (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id));
