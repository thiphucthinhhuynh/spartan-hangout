-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('STUDY', 'SPORTS', 'FOOD', 'SOCIAL', 'GAMING');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" VARCHAR(50) NOT NULL,
    "interests" "ActivityType"[],
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "failed_login_count" SMALLINT NOT NULL DEFAULT 0,
    "first_failed_login_at" TIMESTAMPTZ(3),
    "locked_until" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_slot" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "start_minute" SMALLINT NOT NULL,
    "end_minute" SMALLINT NOT NULL,

    CONSTRAINT "availability_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_token" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "availability_slot_user_id_day_of_week_idx" ON "availability_slot"("user_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_token_token_hash_key" ON "email_verification_token"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_token_user_id_idx" ON "email_verification_token"("user_id");

-- AddForeignKey
ALTER TABLE "availability_slot" ADD CONSTRAINT "availability_slot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_token" ADD CONSTRAINT "email_verification_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Hand-written constraints (Prisma cannot express CHECKs; see docs/data-model.md) ───

-- FR01: SJSU addresses only, stored lowercased
ALTER TABLE "user" ADD CONSTRAINT "user_email_sjsu_check"
  CHECK (email = lower(email) AND email LIKE '%_@sjsu.edu');

-- FR02: at least one interest (NULL would slip past cardinality(), so reject it explicitly)
ALTER TABLE "user" ADD CONSTRAINT "user_interests_check"
  CHECK (interests IS NOT NULL AND cardinality(interests) >= 1);

-- FR02: a slot is a day of the week plus a start and an end time later than the start
ALTER TABLE "availability_slot" ADD CONSTRAINT "availability_slot_day_check"
  CHECK (day_of_week BETWEEN 0 AND 6);
ALTER TABLE "availability_slot" ADD CONSTRAINT "availability_slot_minutes_check"
  CHECK (start_minute BETWEEN 0 AND 1439 AND end_minute BETWEEN 0 AND 1439 AND end_minute > start_minute);
