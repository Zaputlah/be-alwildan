CREATE TYPE "TeacherAttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'SICK', 'LEAVE', 'ABSENT');

CREATE TABLE "TeacherAttendance" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "checkInAt" TIMESTAMP(3),
  "checkOutAt" TIMESTAMP(3),
  "status" "TeacherAttendanceStatus" NOT NULL,
  "notes" TEXT,
  "teacherId" TEXT NOT NULL,
  "schoolUnitId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherAttendance_teacherId_date_key" ON "TeacherAttendance"("teacherId", "date");
CREATE INDEX "TeacherAttendance_schoolUnitId_date_idx" ON "TeacherAttendance"("schoolUnitId", "date");
CREATE INDEX "TeacherAttendance_teacherId_date_idx" ON "TeacherAttendance"("teacherId", "date");

ALTER TABLE "TeacherAttendance" ADD CONSTRAINT "TeacherAttendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherAttendance" ADD CONSTRAINT "TeacherAttendance_schoolUnitId_fkey" FOREIGN KEY ("schoolUnitId") REFERENCES "SchoolUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
