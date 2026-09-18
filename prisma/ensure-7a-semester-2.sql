-- Lengkapi penempatan dan penugasan Semester Genap untuk kelas 7A yang sama.
-- Aman dijalankan berulang kali; tidak membuat kelas 7A kedua.
BEGIN;

INSERT INTO "TeachingAssignment" (
  "id", "teacherId", "classId", "subjectId", "academicPeriodId", "createdAt"
)
SELECT
  'test-ta-7a-s2-' || previous_assignment."id",
  previous_assignment."teacherId", school_class."id", previous_assignment."subjectId",
  next_period."id", CURRENT_TIMESTAMP
FROM "TeachingAssignment" previous_assignment
JOIN "SchoolClass" school_class ON school_class."id" = previous_assignment."classId" AND school_class."name" = '7A'
JOIN "SchoolUnit" unit ON unit."id" = school_class."schoolUnitId" AND unit."code" = 'AWS-TNG'
JOIN "AcademicPeriod" previous_period
  ON previous_period."id" = previous_assignment."academicPeriodId"
  AND previous_period."name" = school_class."academicYear" AND previous_period."semester" = 'GANJIL'
JOIN "AcademicPeriod" next_period
  ON next_period."schoolUnitId" = school_class."schoolUnitId"
  AND next_period."name" = previous_period."name" AND next_period."semester" = 'GENAP'
ON CONFLICT ("teacherId", "classId", "subjectId", "academicPeriodId") DO NOTHING;

INSERT INTO "ClassEnrollment" (
  "id", "classId", "studentId", "academicPeriodId", "createdAt"
)
SELECT
  'test-enrollment-7a-s2-' || previous_enrollment."studentId",
  school_class."id", previous_enrollment."studentId", next_period."id", CURRENT_TIMESTAMP
FROM "ClassEnrollment" previous_enrollment
JOIN "SchoolClass" school_class ON school_class."id" = previous_enrollment."classId" AND school_class."name" = '7A'
JOIN "SchoolUnit" unit ON unit."id" = school_class."schoolUnitId" AND unit."code" = 'AWS-TNG'
JOIN "AcademicPeriod" previous_period
  ON previous_period."id" = previous_enrollment."academicPeriodId"
  AND previous_period."name" = school_class."academicYear" AND previous_period."semester" = 'GANJIL'
JOIN "AcademicPeriod" next_period
  ON next_period."schoolUnitId" = school_class."schoolUnitId"
  AND next_period."name" = previous_period."name" AND next_period."semester" = 'GENAP'
ON CONFLICT ("classId", "studentId", "academicPeriodId") DO NOTHING;

COMMIT;
