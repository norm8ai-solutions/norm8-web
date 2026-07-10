-- Allow commercial meetings to exist without a linked submission.
ALTER TABLE "MeetingBooking" DROP CONSTRAINT "MeetingBooking_submissionId_fkey";

ALTER TABLE "MeetingBooking" ALTER COLUMN "submissionId" DROP NOT NULL;

ALTER TABLE "MeetingBooking"
ADD CONSTRAINT "MeetingBooking_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "Submission"("id")
ON DELETE SET NULL ON UPDATE CASCADE;