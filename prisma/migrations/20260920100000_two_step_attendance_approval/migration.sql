CREATE TYPE "AdminScope" AS ENUM ('BRANCH', 'CENTRAL');

ALTER TABLE "User"
  ADD COLUMN "adminScope" "AdminScope" NOT NULL DEFAULT 'BRANCH';

CREATE TYPE "AttendanceApprovalStatus_new" AS ENUM ('PENDING_BRANCH', 'PENDING_CENTRAL', 'APPROVED', 'REJECTED');

ALTER TABLE "TeacherAttendance"
  ALTER COLUMN "approvalStatus" TYPE "AttendanceApprovalStatus_new"
  USING CASE
    WHEN "approvalStatus"::text = 'PENDING' THEN 'PENDING_BRANCH'::"AttendanceApprovalStatus_new"
    WHEN "approvalStatus"::text = 'APPROVED' THEN 'APPROVED'::"AttendanceApprovalStatus_new"
    WHEN "approvalStatus"::text = 'REJECTED' THEN 'REJECTED'::"AttendanceApprovalStatus_new"
    ELSE NULL
  END;

DROP TYPE "AttendanceApprovalStatus";
ALTER TYPE "AttendanceApprovalStatus_new" RENAME TO "AttendanceApprovalStatus";

ALTER TABLE "TeacherAttendance"
  ADD COLUMN "branchReviewedAt" TIMESTAMP(3),
  ADD COLUMN "branchReviewedById" TEXT,
  ADD COLUMN "branchReviewNotes" TEXT,
  ADD COLUMN "centralReviewedAt" TIMESTAMP(3),
  ADD COLUMN "centralReviewedById" TEXT,
  ADD COLUMN "centralReviewNotes" TEXT;
