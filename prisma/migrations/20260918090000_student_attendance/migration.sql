CREATE TYPE "StudentAttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'SICK', 'LEAVE', 'ABSENT');

CREATE TABLE "StudentAttendance" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "status" "StudentAttendanceStatus" NOT NULL,
  "notes" TEXT,
  "studentId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "academicPeriodId" TEXT NOT NULL,
  "schoolUnitId" TEXT NOT NULL,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentAttendance_studentId_date_key" ON "StudentAttendance"("studentId", "date");
CREATE INDEX "StudentAttendance_schoolUnitId_classId_academicPeriodId_date_idx" ON "StudentAttendance"("schoolUnitId", "classId", "academicPeriodId", "date");
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_schoolUnitId_fkey" FOREIGN KEY ("schoolUnitId") REFERENCES "SchoolUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
