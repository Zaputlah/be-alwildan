-- Konversi periode semester 1/2 menjadi GANJIL/GENAP tanpa mengganti ID.
-- Seluruh relasi penempatan siswa, penugasan guru, dan assessment tetap utuh.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "AcademicPeriod" WHERE "semester" NOT IN (1, 2)) THEN
    RAISE EXCEPTION 'Konversi dibatalkan: ada semester selain 1 dan 2';
  END IF;
END $$;

CREATE TYPE "SemesterType" AS ENUM ('GANJIL', 'GENAP');

ALTER TABLE "AcademicPeriod"
  ALTER COLUMN "semester" TYPE "SemesterType"
  USING CASE "semester"
    WHEN 1 THEN 'GANJIL'::"SemesterType"
    WHEN 2 THEN 'GENAP'::"SemesterType"
  END;

COMMIT;
