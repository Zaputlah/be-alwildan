CREATE TABLE "TeacherAttendanceEvidence" (
  "id" TEXT NOT NULL,
  "attendanceId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "content" BYTEA NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherAttendanceEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherAttendanceEvidence_attendanceId_key"
  ON "TeacherAttendanceEvidence"("attendanceId");

ALTER TABLE "TeacherAttendanceEvidence"
  ADD CONSTRAINT "TeacherAttendanceEvidence_attendanceId_fkey"
  FOREIGN KEY ("attendanceId") REFERENCES "TeacherAttendance"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
