CREATE TYPE "TeacherCaseLevel" AS ENUM ('WARNING', 'SP1', 'SP2', 'SP3');
CREATE TYPE "TeacherCaseStatus" AS ENUM ('OPEN', 'RESOLVED', 'TERMINATED');

CREATE TABLE "TeacherCase" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "schoolUnitId" TEXT NOT NULL,
  "level" "TeacherCaseLevel" NOT NULL,
  "status" "TeacherCaseStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "decision" TEXT,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeacherCase_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TeacherCase_schoolUnitId_fkey" FOREIGN KEY ("schoolUnitId") REFERENCES "SchoolUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TeacherCase_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "TeacherCase_schoolUnitId_createdAt_idx" ON "TeacherCase"("schoolUnitId", "createdAt");
CREATE INDEX "TeacherCase_teacherId_createdAt_idx" ON "TeacherCase"("teacherId", "createdAt");
