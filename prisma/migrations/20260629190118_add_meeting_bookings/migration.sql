-- CreateEnum
CREATE TYPE "MeetingBookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "MeetingBooking" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "status" "MeetingBookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedDate" TEXT NOT NULL,
    "requestedTime" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "googleEventId" TEXT,
    "googleEventHtmlLink" TEXT,
    "calendarId" TEXT,
    "attendeeEmail" TEXT NOT NULL,
    "attendeeName" TEXT NOT NULL,
    "attendeeCompany" TEXT NOT NULL,
    "meetingGoal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingBooking_submissionId_key" ON "MeetingBooking"("submissionId");

-- CreateIndex
CREATE INDEX "MeetingBooking_leadId_idx" ON "MeetingBooking"("leadId");

-- CreateIndex
CREATE INDEX "MeetingBooking_status_idx" ON "MeetingBooking"("status");

-- CreateIndex
CREATE INDEX "MeetingBooking_startsAt_idx" ON "MeetingBooking"("startsAt");

-- CreateIndex
CREATE INDEX "MeetingBooking_createdAt_idx" ON "MeetingBooking"("createdAt");

-- AddForeignKey
ALTER TABLE "MeetingBooking" ADD CONSTRAINT "MeetingBooking_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingBooking" ADD CONSTRAINT "MeetingBooking_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
