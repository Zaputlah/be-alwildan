ALTER TABLE "Student"
  ADD COLUMN "deactivationReason" TEXT,
  ADD COLUMN "deactivatedAt" TIMESTAMP(3);

CREATE INDEX "Student_schoolUnitId_isActive_idx"
  ON "Student"("schoolUnitId", "isActive");
