-- Data contoh untuk menu Rekap Nilai (unit AWS-TNG, tahun ajaran 2026/2027).
-- Jalankan setelah migration, seed, dan test-data.sql. Aman dijalankan ulang:
-- hanya menambah record ber-ID demo-report-* dan tidak menimpa nilai yang ada.
BEGIN;

-- Guru pengampu khusus IPS kelas 7B; tidak ditetapkan sebagai wali kelas.
INSERT INTO "User" (
  "id", "email", "passwordHash", "fullName", "role", "isActive",
  "schoolUnitId", "createdAt", "updatedAt"
)
SELECT
  'demo-report-teacher-ips-7b',
  'guru.ips.7b@integration.sch.id',
  'scrypt$746573742d696e746567726174696f6e$f9c75d8d7f6c996423fe51d66a51716082da84ebeb6552931b2218961dc04e43520eee76308d1c4bc6d7eab1b329f9f7e4b477c121f6ed72c01cafd88cb908dc',
  'Rina Puspita, S.Pd.', 'TEACHER'::"UserRole", true,
  unit."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "SchoolUnit" unit
WHERE unit."code" = 'AWS-TNG'
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "TeachingAssignment" (
  "id", "teacherId", "classId", "subjectId", "academicPeriodId", "createdAt"
)
SELECT
  'demo-report-ta-7b-ips-' || lower(period."semester"::text),
  teacher."id", school_class."id", subject."id", period."id", CURRENT_TIMESTAMP
FROM "SchoolUnit" unit
JOIN "User" teacher ON teacher."schoolUnitId" = unit."id"
  AND teacher."email" = 'guru.ips.7b@integration.sch.id' AND teacher."role" = 'TEACHER'
JOIN "SchoolClass" school_class ON school_class."schoolUnitId" = unit."id"
  AND school_class."name" = '7B' AND school_class."academicYear" = '2026/2027'
JOIN "AcademicPeriod" period ON period."schoolUnitId" = unit."id"
  AND period."name" = school_class."academicYear"
JOIN "Subject" subject ON subject."code" = 'IPS-07'
WHERE unit."code" = 'AWS-TNG'
  AND NOT EXISTS (
    SELECT 1 FROM "TeachingAssignment" existing
    WHERE existing."classId" = school_class."id"
      AND existing."academicPeriodId" = period."id"
      AND existing."subjectId" = subject."id"
  )
ON CONFLICT ("teacherId", "classId", "subjectId", "academicPeriodId") DO NOTHING;

-- Lengkapi 7A dengan pengampu Matematika dan PAI agar wali kelas dapat
-- melihat lintas mata pelajaran, sedangkan guru pengampu hanya pelajarannya.
WITH demo_assignment("subjectCode", "teacherEmail") AS (
  VALUES
    ('MAT-07', 'guru.matematika.test@integration.sch.id'),
    ('PAI-07', 'guru.pai.test@integration.sch.id')
)
INSERT INTO "TeachingAssignment" (
  "id", "teacherId", "classId", "subjectId", "academicPeriodId", "createdAt"
)
SELECT
  'demo-report-ta-7a-' || lower(data."subjectCode") || '-' || lower(period."semester"::text),
  teacher."id", school_class."id", subject."id", period."id", CURRENT_TIMESTAMP
FROM demo_assignment data
JOIN "SchoolUnit" unit ON unit."code" = 'AWS-TNG'
JOIN "SchoolClass" school_class
  ON school_class."schoolUnitId" = unit."id"
  AND school_class."name" = '7A' AND school_class."academicYear" = '2026/2027'
JOIN "AcademicPeriod" period
  ON period."schoolUnitId" = unit."id" AND period."name" = school_class."academicYear"
JOIN "Subject" subject ON subject."code" = data."subjectCode"
JOIN "User" teacher
  ON teacher."email" = data."teacherEmail"
  AND teacher."schoolUnitId" = unit."id" AND teacher."role" = 'TEACHER'
WHERE NOT EXISTS (
  SELECT 1 FROM "TeachingAssignment" existing
  WHERE existing."classId" = school_class."id"
    AND existing."academicPeriodId" = period."id"
    AND existing."subjectId" = subject."id"
)
ON CONFLICT ("teacherId", "classId", "subjectId", "academicPeriodId") DO NOTHING;

-- Satu tugas untuk setiap penugasan guru di kelas demo pada kedua semester.
INSERT INTO "Assessment" (
  "id", "title", "type", "weight", "maxScore", "status", "scheduledAt",
  "schoolClassId", "subjectId", "teacherId", "academicPeriodId", "createdAt", "updatedAt"
)
SELECT
  'demo-report-task-' || assignment."id",
  'Tugas ' || subject."name",
  'ASSIGNMENT'::"AssessmentType", 40, 100, 'PUBLISHED'::"AssessmentStatus",
  period."startDate" + INTERVAL '21 days',
  school_class."id", subject."id", assignment."teacherId", period."id",
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "TeachingAssignment" assignment
JOIN "SchoolClass" school_class ON school_class."id" = assignment."classId"
JOIN "SchoolUnit" unit ON unit."id" = school_class."schoolUnitId" AND unit."code" = 'AWS-TNG'
JOIN "AcademicPeriod" period
  ON period."id" = assignment."academicPeriodId"
  AND period."name" = school_class."academicYear" AND period."name" = '2026/2027'
JOIN "Subject" subject ON subject."id" = assignment."subjectId"
WHERE school_class."name" IN ('7A', '7B', '7C', '8A')
ON CONFLICT ("id") DO NOTHING;

-- Tambahan kuis untuk 7A agar perhitungan bobot pada rekap terlihat.
INSERT INTO "Assessment" (
  "id", "title", "type", "weight", "maxScore", "status", "scheduledAt",
  "schoolClassId", "subjectId", "teacherId", "academicPeriodId", "createdAt", "updatedAt"
)
SELECT
  'demo-report-quiz-' || assignment."id",
  'Kuis ' || subject."name",
  'QUIZ'::"AssessmentType", 30, 100, 'PUBLISHED'::"AssessmentStatus",
  period."startDate" + INTERVAL '35 days',
  school_class."id", subject."id", assignment."teacherId", period."id",
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "TeachingAssignment" assignment
JOIN "SchoolClass" school_class ON school_class."id" = assignment."classId" AND school_class."name" = '7A'
JOIN "SchoolUnit" unit ON unit."id" = school_class."schoolUnitId" AND unit."code" = 'AWS-TNG'
JOIN "AcademicPeriod" period
  ON period."id" = assignment."academicPeriodId"
  AND period."name" = school_class."academicYear" AND period."name" = '2026/2027'
JOIN "Subject" subject ON subject."id" = assignment."subjectId"
ON CONFLICT ("id") DO NOTHING;

-- Isi nilai seluruh siswa yang terdaftar pada kelas dan semester assessment.
-- Nilai 65–95 diturunkan secara deterministik dari NIS/kode pelajaran.
INSERT INTO "Score" (
  "id", "value", "notes", "assessmentId", "studentId", "createdAt", "updatedAt"
)
SELECT
  'demo-report-score-' || assessment."id" || '-' || student."id",
  65 + ((ascii(right(student."nis", 1)) * 7 + length(subject."code") * 3
    + CASE WHEN period."semester" = 'GENAP' THEN 5 ELSE 0 END
    + CASE WHEN assessment."type" = 'QUIZ' THEN 3 ELSE 0 END) % 31),
  NULL,
  assessment."id", student."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Assessment" assessment
JOIN "SchoolClass" school_class ON school_class."id" = assessment."schoolClassId"
JOIN "SchoolUnit" unit ON unit."id" = school_class."schoolUnitId" AND unit."code" = 'AWS-TNG'
JOIN "AcademicPeriod" period ON period."id" = assessment."academicPeriodId"
JOIN "Subject" subject ON subject."id" = assessment."subjectId"
JOIN "ClassEnrollment" enrollment
  ON enrollment."classId" = school_class."id"
  AND enrollment."academicPeriodId" = period."id"
JOIN "Student" student ON student."id" = enrollment."studentId"
WHERE assessment."id" LIKE 'demo-report-task-%'
   OR assessment."id" LIKE 'demo-report-quiz-%'
ON CONFLICT ("assessmentId", "studentId") DO NOTHING;

COMMIT;

SELECT
  period."semester", school_class."name" AS "kelas",
  COUNT(DISTINCT assessment."id") AS "assessmentDemo",
  COUNT(score."id") AS "nilaiDemo"
FROM "Assessment" assessment
JOIN "SchoolClass" school_class ON school_class."id" = assessment."schoolClassId"
JOIN "SchoolUnit" unit ON unit."id" = school_class."schoolUnitId" AND unit."code" = 'AWS-TNG'
JOIN "AcademicPeriod" period ON period."id" = assessment."academicPeriodId"
LEFT JOIN "Score" score ON score."assessmentId" = assessment."id"
WHERE assessment."id" LIKE 'demo-report-task-%'
   OR assessment."id" LIKE 'demo-report-quiz-%'
GROUP BY period."semester", school_class."name"
ORDER BY period."semester", school_class."name";
