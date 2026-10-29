-- CreateTable
CREATE TABLE "activity_removal" (
    "activity_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reason" VARCHAR(200),
    "removed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_removal_pkey" PRIMARY KEY ("activity_id","user_id")
);

-- CreateIndex
CREATE INDEX "activity_removal_user_id_idx" ON "activity_removal"("user_id");

-- AddForeignKey
ALTER TABLE "activity_removal" ADD CONSTRAINT "activity_removal_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_removal" ADD CONSTRAINT "activity_removal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
