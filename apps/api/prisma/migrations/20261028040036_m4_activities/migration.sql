-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('OPEN', 'FULL', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ACTIVITY_CHANGED', 'ACTIVITY_CANCELLED', 'ACTIVITY_UPDATE', 'REMOVED_FROM_ACTIVITY', 'PARTICIPANT_JOINED', 'PARTICIPANT_LEFT', 'CONNECTION_REQUEST', 'CONNECTION_ACCEPTED', 'DIRECT_MESSAGE');

-- CreateTable
CREATE TABLE "activity" (
    "id" UUID NOT NULL,
    "organizer_id" UUID,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "type" "ActivityType" NOT NULL,
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "end_at" TIMESTAMPTZ(3) NOT NULL,
    "location" VARCHAR(100) NOT NULL,
    "participant_limit" SMALLINT NOT NULL,
    "participant_count" SMALLINT NOT NULL DEFAULT 1,
    "status" "ActivityStatus" NOT NULL DEFAULT 'OPEN',
    "cancellation_reason" VARCHAR(200),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participation" (
    "activity_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_organizer" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participation_pkey" PRIMARY KEY ("activity_id","user_id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "activity_id" UUID,
    "activity_title" VARCHAR(100),
    "actor_id" UUID,
    "body" VARCHAR(500),
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_status_start_at_idx" ON "activity"("status", "start_at");

-- CreateIndex
CREATE INDEX "activity_organizer_id_start_at_idx" ON "activity"("organizer_id", "start_at");

-- CreateIndex
CREATE INDEX "participation_user_id_idx" ON "participation"("user_id");

-- CreateIndex
CREATE INDEX "notification_recipient_id_created_at_idx" ON "notification"("recipient_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Hand-written constraints (Prisma cannot express CHECKs; see docs/data-model.md) ───

-- FR26: limit is a whole number from 2 to 100, including the organizer
ALTER TABLE "activity" ADD CONSTRAINT "activity_limit_check"
  CHECK (participant_limit BETWEEN 2 AND 100);

-- ADR-0010: the count can never exceed the limit, even under concurrent joins
ALTER TABLE "activity" ADD CONSTRAINT "activity_count_check"
  CHECK (participant_count >= 0 AND participant_count <= participant_limit);

-- FR27: the end time is later than the start time
ALTER TABLE "activity" ADD CONSTRAINT "activity_times_check"
  CHECK (end_at > start_at);
