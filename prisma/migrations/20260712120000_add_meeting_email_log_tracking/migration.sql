-- Add explicit delivery tracking and optional MeetingBooking relation to EmailLog.
ALTER TABLE "EmailLog"
ADD COLUMN "meetingBookingId" TEXT,
ADD COLUMN "provider" TEXT,
ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "failedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "EmailLog_meetingBookingId_idx" ON "EmailLog"("meetingBookingId");

ALTER TABLE "EmailLog"
ADD CONSTRAINT "EmailLog_meetingBookingId_fkey"
FOREIGN KEY ("meetingBookingId") REFERENCES "MeetingBooking"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
