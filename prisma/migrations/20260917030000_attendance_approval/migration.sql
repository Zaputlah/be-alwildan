CREATE TYPE "AttendanceApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "TeacherAttendance"
  ADD COLUMN "approvalStatus" "AttendanceApprovalStatus",
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewNotes" TEXT;

CREATE INDEX "TeacherAttendance_schoolUnitId_approvalStatus_date_idx"
  ON "TeacherAttendance"("schoolUnitId", "approvalStatus", "date");

ALTER TABLE "TeacherAttendance"
  ADD CONSTRAINT "TeacherAttendance_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
