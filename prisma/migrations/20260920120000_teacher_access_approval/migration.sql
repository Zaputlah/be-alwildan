CREATE TYPE "TeacherAccessStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

ALTER TABLE "User"
  ADD COLUMN "accessStatus" "TeacherAccessStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "accessRequestedById" TEXT,
  ADD COLUMN "accessReviewedById" TEXT,
  ADD COLUMN "accessReviewedAt" TIMESTAMP(3),
  ADD COLUMN "accessRejectionReason" TEXT;
