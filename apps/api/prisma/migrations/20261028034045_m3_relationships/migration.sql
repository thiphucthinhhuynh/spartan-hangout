-- CreateTable
CREATE TABLE "block" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateTable
CREATE TABLE "connection" (
    "user_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_pkey" PRIMARY KEY ("user_a_id","user_b_id")
);

-- CreateIndex
CREATE INDEX "block_blocked_id_idx" ON "block"("blocked_id");

-- CreateIndex
CREATE INDEX "connection_user_b_id_idx" ON "connection"("user_b_id");

-- AddForeignKey
ALTER TABLE "block" ADD CONSTRAINT "block_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block" ADD CONSTRAINT "block_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection" ADD CONSTRAINT "connection_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection" ADD CONSTRAINT "connection_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Hand-written constraints (Prisma cannot express CHECKs; see docs/data-model.md) ───

-- FR54: a student cannot block themselves
ALTER TABLE "block" ADD CONSTRAINT "block_not_self_check" CHECK (blocker_id <> blocked_id);

-- Each connected pair is stored once, smaller id first (this also rules out self-connections)
ALTER TABLE "connection" ADD CONSTRAINT "connection_pair_order_check" CHECK (user_a_id < user_b_id);
