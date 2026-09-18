CREATE TYPE "StudentBehaviorRating" AS ENUM ('EXCELLENT', 'GOOD', 'NEEDS_ATTENTION');

CREATE TABLE "StudentBehavior" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "rating" "StudentBehaviorRating" NOT NULL,
  "notes" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "academicPeriodId" TEXT NOT NULL,
  "schoolUnitId" TEXT NOT NULL,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentBehavior_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentBehavior_studentId_date_recordedById_key" ON "StudentBehavior"("studentId", "date", "recordedById");
CREATE INDEX "StudentBehavior_schoolUnitId_classId_academicPeriodId_date_idx" ON "StudentBehavior"("schoolUnitId", "classId", "academicPeriodId", "date");
ALTER TABLE "StudentBehavior" ADD CONSTRAINT "StudentBehavior_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentBehavior" ADD CONSTRAINT "StudentBehavior_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentBehavior" ADD CONSTRAINT "StudentBehavior_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentBehavior" ADD CONSTRAINT "StudentBehavior_schoolUnitId_fkey" FOREIGN KEY ("schoolUnitId") REFERENCES "SchoolUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentBehavior" ADD CONSTRAINT "StudentBehavior_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
