ALTER TABLE "TeacherAttendance"
  ADD COLUMN "isEarlyCheckout" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "checkInLatitude" DOUBLE PRECISION,
  ADD COLUMN "checkInLongitude" DOUBLE PRECISION,
  ADD COLUMN "checkInAccuracyMeters" DOUBLE PRECISION,
  ADD COLUMN "checkOutLatitude" DOUBLE PRECISION,
  ADD COLUMN "checkOutLongitude" DOUBLE PRECISION,
  ADD COLUMN "checkOutAccuracyMeters" DOUBLE PRECISION;

UPDATE "TeacherAttendance"
SET "isEarlyCheckout" = true
WHERE "checkOutAt" IS NOT NULL
  AND ("checkOutAt" AT TIME ZONE 'Asia/Jakarta')::time < TIME '17:00';
