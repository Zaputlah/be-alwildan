BEGIN;

ALTER TABLE "SchoolClass" ADD COLUMN "academicYear" TEXT;
UPDATE "SchoolClass" AS school_class
SET "academicYear" = period."name"
FROM "AcademicPeriod" AS period
WHERE school_class."academicPeriodId" = period."id";
ALTER TABLE "SchoolClass" ALTER COLUMN "academicYear" SET NOT NULL;

ALTER TABLE "ClassEnrollment" ADD COLUMN "academicPeriodId" TEXT;
UPDATE "ClassEnrollment" AS enrollment
SET "academicPeriodId" = school_class."academicPeriodId"
FROM "SchoolClass" AS school_class
WHERE enrollment."classId" = school_class."id";
ALTER TABLE "ClassEnrollment" ALTER COLUMN "academicPeriodId" SET NOT NULL;

ALTER TABLE "TeachingAssignment" ADD COLUMN "academicPeriodId" TEXT;
UPDATE "TeachingAssignment" AS assignment
SET "academicPeriodId" = school_class."academicPeriodId"
FROM "SchoolClass" AS school_class
WHERE assignment."classId" = school_class."id";
ALTER TABLE "TeachingAssignment" ALTER COLUMN "academicPeriodId" SET NOT NULL;

CREATE TEMP TABLE "ClassMerge" ON COMMIT DROP AS
SELECT school_class."id" AS "oldId",
       FIRST_VALUE(school_class."id") OVER (
         PARTITION BY school_class."schoolUnitId", period."name", school_class."name"
         ORDER BY period."startDate", school_class."createdAt", school_class."id"
       ) AS "newId"
FROM "SchoolClass" AS school_class
JOIN "AcademicPeriod" AS period ON period."id" = school_class."academicPeriodId";

DROP INDEX "ClassEnrollment_classId_studentId_key";
DROP INDEX "TeachingAssignment_teacherId_classId_subjectId_key";

UPDATE "ClassEnrollment" AS enrollment
SET "classId" = merge."newId"
FROM "ClassMerge" AS merge
WHERE enrollment."classId" = merge."oldId" AND merge."oldId" <> merge."newId";

UPDATE "TeachingAssignment" AS assignment
SET "classId" = merge."newId"
FROM "ClassMerge" AS merge
WHERE assignment."classId" = merge."oldId" AND merge."oldId" <> merge."newId";

UPDATE "Assessment" AS assessment
SET "schoolClassId" = merge."newId"
FROM "ClassMerge" AS merge
WHERE assessment."schoolClassId" = merge."oldId" AND merge."oldId" <> merge."newId";

DELETE FROM "SchoolClass" AS school_class
USING "ClassMerge" AS merge
WHERE school_class."id" = merge."oldId" AND merge."oldId" <> merge."newId";

ALTER TABLE "SchoolClass" DROP CONSTRAINT "SchoolClass_academicPeriodId_fkey";
ALTER TABLE "SchoolClass" DROP COLUMN "academicPeriodId";

CREATE UNIQUE INDEX "SchoolClass_schoolUnitId_academicYear_name_key"
  ON "SchoolClass"("schoolUnitId", "academicYear", "name");
CREATE UNIQUE INDEX "ClassEnrollment_classId_studentId_academicPeriodId_key"
  ON "ClassEnrollment"("classId", "studentId", "academicPeriodId");
CREATE UNIQUE INDEX "TeachingAssignment_teacherId_classId_subjectId_academicPeriodId_key"
  ON "TeachingAssignment"("teacherId", "classId", "subjectId", "academicPeriodId");

ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_academicPeriodId_fkey"
  FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_academicPeriodId_fkey"
  FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
