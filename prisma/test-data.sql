-- Data testing Integration System (PostgreSQL)
-- Aman dijalankan berulang kali: INSERT menggunakan ON CONFLICT.
-- Script ini tidak menghapus data yang sudah ada.
--
-- Akun guru testing menggunakan kata sandi yang sama:
-- Integration123!

BEGIN;

-- 1. Unit sekolah (menggunakan unit aplikasi yang sudah ada bila ditemukan).
INSERT INTO "SchoolUnit" (
  "id", "code", "name", "address", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'test-school-aws-tng', 'AWS-TNG', 'Al-Wildan Islamic School Tangerang',
  'Tangerang', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO NOTHING;

-- 2. Tahun ajaran 2026/2027 semester Ganjil dan Genap.
INSERT INTO "AcademicPeriod" (
  "id", "name", "semester", "startDate", "endDate", "isActive",
  "schoolUnitId", "createdAt", "updatedAt"
)
SELECT
  'test-period-2026-s1', '2026/2027', 'GANJIL',
  TIMESTAMP '2026-07-13 00:00:00', TIMESTAMP '2026-12-18 23:59:59', true,
  unit."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "SchoolUnit" unit
WHERE unit."code" = 'AWS-TNG'
ON CONFLICT ("schoolUnitId", "name", "semester") DO NOTHING;

INSERT INTO "AcademicPeriod" (
  "id", "name", "semester", "startDate", "endDate", "isActive",
  "schoolUnitId", "createdAt", "updatedAt"
)
SELECT
  'test-period-2026-s2', '2026/2027', 'GENAP',
  TIMESTAMP '2027-01-04 00:00:00', TIMESTAMP '2027-06-18 23:59:59', false,
  unit."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "SchoolUnit" unit
WHERE unit."code" = 'AWS-TNG'
ON CONFLICT ("schoolUnitId", "name", "semester") DO NOTHING;

-- 3. Guru testing. Hash di bawah adalah scrypt untuk Integration123!.
WITH teacher_data("id", "email", "fullName") AS (
  VALUES
    ('test-teacher-ipa',  'guru.ipa.test@integration.sch.id',        'Siti Rahmawati, S.Pd.'),
    ('test-teacher-math', 'guru.matematika.test@integration.sch.id', 'Budi Santoso, S.Pd.'),
    ('test-teacher-pai',  'guru.pai.test@integration.sch.id',        'Nur Aisyah, S.Pd.I.')
)
INSERT INTO "User" (
  "id", "email", "passwordHash", "fullName", "role", "isActive",
  "schoolUnitId", "createdAt", "updatedAt"
)
SELECT
  teacher."id",
  teacher."email",
  'scrypt$746573742d696e746567726174696f6e$f9c75d8d7f6c996423fe51d66a51716082da84ebeb6552931b2218961dc04e43520eee76308d1c4bc6d7eab1b329f9f7e4b477c121f6ed72c01cafd88cb908dc',
  teacher."fullName",
  'TEACHER'::"UserRole",
  true,
  unit."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM teacher_data teacher
CROSS JOIN "SchoolUnit" unit
WHERE unit."code" = 'AWS-TNG'
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "fullName" = EXCLUDED."fullName",
  "role" = EXCLUDED."role",
  "isActive" = true,
  "schoolUnitId" = EXCLUDED."schoolUnitId",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 4. Satu kelas per tahun ajaran; semester disimpan pada penempatan/penugasan.
WITH class_data("id", "name", "gradeLevel", "homeroomEmail") AS (
  VALUES
    ('test-class-7a', '7A', 7, 'guru@integration.sch.id'),
    ('test-class-7b-s1', '7B', 7, 'guru.ipa.test@integration.sch.id'),
    ('test-class-7c-s1', '7C', 7, 'guru.matematika.test@integration.sch.id'),
    ('test-class-8a-s1', '8A', 8, 'guru.pai.test@integration.sch.id')
)
INSERT INTO "SchoolClass" (
  "id", "name", "gradeLevel", "schoolUnitId", "academicYear",
  "homeroomTeacherId", "createdAt", "updatedAt"
)
SELECT
  data."id", data."name", data."gradeLevel", unit."id", '2026/2027',
  teacher."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM class_data data
JOIN "SchoolUnit" unit ON unit."code" = 'AWS-TNG'
JOIN "User" teacher ON teacher."email" = data."homeroomEmail"
ON CONFLICT ("schoolUnitId", "academicYear", "name") DO UPDATE SET
  "gradeLevel" = EXCLUDED."gradeLevel",
  "homeroomTeacherId" = EXCLUDED."homeroomTeacherId",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 5. Mata pelajaran pendukung penugasan guru.
INSERT INTO "Subject" (
  "id", "code", "name", "passingGrade", "createdAt", "updatedAt"
)
VALUES
  ('test-subject-ipa',  'IPA', 'Ilmu Pengetahuan Alam', 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('test-subject-math', 'MAT', 'Matematika',             75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('test-subject-pai',  'PAI', 'Pendidikan Agama Islam', 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "passingGrade" = EXCLUDED."passingGrade",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 6. Penugasan: setiap guru hanya mengelola mata pelajarannya.
WITH assignment_data("id", "teacherEmail", "className", "semester", "subjectCode") AS (
  VALUES
    ('test-ta-ipa-7b-s1',  'guru.ipa.test@integration.sch.id',        '7B', 'GANJIL', 'IPA'),
    ('test-ta-ipa-7c-s1',  'guru.ipa.test@integration.sch.id',        '7C', 'GANJIL', 'IPA'),
    ('test-ta-ipa-8a-s1',  'guru.ipa.test@integration.sch.id',        '8A', 'GANJIL', 'IPA'),
    ('test-ta-mat-7b-s1',  'guru.matematika.test@integration.sch.id', '7B', 'GANJIL', 'MAT'),
    ('test-ta-mat-7c-s1',  'guru.matematika.test@integration.sch.id', '7C', 'GANJIL', 'MAT'),
    ('test-ta-mat-8a-s1',  'guru.matematika.test@integration.sch.id', '8A', 'GANJIL', 'MAT'),
    ('test-ta-pai-7b-s1',  'guru.pai.test@integration.sch.id',        '7B', 'GANJIL', 'PAI'),
    ('test-ta-pai-7c-s1',  'guru.pai.test@integration.sch.id',        '7C', 'GANJIL', 'PAI'),
    ('test-ta-pai-8a-s1',  'guru.pai.test@integration.sch.id',        '8A', 'GANJIL', 'PAI'),
    ('test-ta-ipa-7b-s2',  'guru.ipa.test@integration.sch.id',        '7B', 'GENAP', 'IPA'),
    ('test-ta-ipa-7c-s2',  'guru.ipa.test@integration.sch.id',        '7C', 'GENAP', 'IPA'),
    ('test-ta-ipa-8a-s2',  'guru.ipa.test@integration.sch.id',        '8A', 'GENAP', 'IPA'),
    ('test-ta-mat-7b-s2',  'guru.matematika.test@integration.sch.id', '7B', 'GENAP', 'MAT'),
    ('test-ta-mat-7c-s2',  'guru.matematika.test@integration.sch.id', '7C', 'GENAP', 'MAT'),
    ('test-ta-mat-8a-s2',  'guru.matematika.test@integration.sch.id', '8A', 'GENAP', 'MAT'),
    ('test-ta-pai-7b-s2',  'guru.pai.test@integration.sch.id',        '7B', 'GENAP', 'PAI'),
    ('test-ta-pai-7c-s2',  'guru.pai.test@integration.sch.id',        '7C', 'GENAP', 'PAI'),
    ('test-ta-pai-8a-s2',  'guru.pai.test@integration.sch.id',        '8A', 'GENAP', 'PAI')
)
INSERT INTO "TeachingAssignment" (
  "id", "teacherId", "classId", "subjectId", "academicPeriodId", "createdAt"
)
SELECT
  data."id", teacher."id", class."id", subject."id", period."id", CURRENT_TIMESTAMP
FROM assignment_data data
JOIN "User" teacher ON teacher."email" = data."teacherEmail"
JOIN "SchoolUnit" unit ON unit."id" = teacher."schoolUnitId" AND unit."code" = 'AWS-TNG'
JOIN "AcademicPeriod" period
  ON period."schoolUnitId" = unit."id"
  AND period."name" = '2026/2027'
  AND period."semester" = data."semester"::"SemesterType"
JOIN "SchoolClass" class
  ON class."schoolUnitId" = unit."id"
  AND class."academicYear" = period."name"
  AND class."name" = data."className"
JOIN "Subject" subject ON subject."code" = data."subjectCode"
ON CONFLICT ("teacherId", "classId", "subjectId", "academicPeriodId") DO NOTHING;

-- 7. Dua belas siswa testing.
WITH student_data(
  "id", "nis", "fullName", "gender", "birthDate", "parentName", "parentPhone"
) AS (
  VALUES
    ('test-student-270701', '720001', 'Aditya Pratama',  'MALE',   DATE '2013-01-15', 'Hendra Pratama',  '081211110001'),
    ('test-student-270702', '720002', 'Aulia Zahra',     'FEMALE', DATE '2013-02-20', 'Dewi Lestari',    '081211110002'),
    ('test-student-270703', '720003', 'Bintang Ramadhan','MALE',   DATE '2013-03-12', 'Agus Ramadhan',   '081211110003'),
    ('test-student-270704', '720004', 'Citra Lestari',   'FEMALE', DATE '2013-04-08', 'Rina Kurnia',     '081211110004'),
    ('test-student-270705', '730001', 'Daffa Maulana',   'MALE',   DATE '2013-05-19', 'Rahmat Maulana',  '081211110005'),
    ('test-student-270706', '730002', 'Farah Nabila',    'FEMALE', DATE '2013-06-24', 'Siti Aminah',     '081211110006'),
    ('test-student-270707', '730003', 'Ghazi Alfarizi',  'MALE',   DATE '2013-07-11', 'Fajar Alfarizi',  '081211110007'),
    ('test-student-270708', '730004', 'Hana Safitri',    'FEMALE', DATE '2013-08-17', 'Maya Safitri',    '081211110008'),
    ('test-student-280701', '810001', 'Ibrahim Khalil',  'MALE',   DATE '2012-01-09', 'Yusuf Khalil',    '081211110009'),
    ('test-student-280702', '810002', 'Jasmine Azzahra', 'FEMALE', DATE '2012-02-14', 'Nurul Hikmah',    '081211110010'),
    ('test-student-280703', '810003', 'Kenzie Akbar',    'MALE',   DATE '2012-03-27', 'Rizal Akbar',     '081211110011'),
    ('test-student-280704', '810004', 'Laila Nuraini',   'FEMALE', DATE '2012-04-21', 'Fitri Handayani', '081211110012')
)
INSERT INTO "Student" (
  "id", "nis", "fullName", "gender", "birthDate", "parentName",
  "parentPhone", "isActive", "schoolUnitId", "createdAt", "updatedAt"
)
SELECT
  student."id", student."nis", student."fullName", student."gender"::"Gender",
  student."birthDate", student."parentName", student."parentPhone", true,
  unit."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM student_data student
CROSS JOIN "SchoolUnit" unit
WHERE unit."code" = 'AWS-TNG'
ON CONFLICT ("schoolUnitId", "nis") DO UPDATE SET
  "fullName" = EXCLUDED."fullName",
  "gender" = EXCLUDED."gender",
  "birthDate" = EXCLUDED."birthDate",
  "parentName" = EXCLUDED."parentName",
  "parentPhone" = EXCLUDED."parentPhone",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

-- 8. Penempatan siswa pada semester Ganjil dan Genap untuk menguji filter riwayat.
WITH enrollment_data("nis", "className", "semester") AS (
  VALUES
    ('720001', '7B', 'GANJIL'), ('720002', '7B', 'GANJIL'), ('720003', '7B', 'GANJIL'), ('720004', '7B', 'GANJIL'),
    ('730001', '7C', 'GANJIL'), ('730002', '7C', 'GANJIL'), ('730003', '7C', 'GANJIL'), ('730004', '7C', 'GANJIL'),
    ('810001', '8A', 'GANJIL'), ('810002', '8A', 'GANJIL'), ('810003', '8A', 'GANJIL'), ('810004', '8A', 'GANJIL'),
    ('720001', '7B', 'GENAP'), ('720002', '7B', 'GENAP'), ('720003', '7B', 'GENAP'), ('720004', '7B', 'GENAP'),
    ('730001', '7C', 'GENAP'), ('730002', '7C', 'GENAP'), ('730003', '7C', 'GENAP'), ('730004', '7C', 'GENAP'),
    ('810001', '8A', 'GENAP'), ('810002', '8A', 'GENAP'), ('810003', '8A', 'GENAP'), ('810004', '8A', 'GENAP')
)
INSERT INTO "ClassEnrollment" ("id", "classId", "studentId", "academicPeriodId", "createdAt")
SELECT
  'test-enrollment-' || data."nis" || '-s' || CASE data."semester" WHEN 'GANJIL' THEN '1' ELSE '2' END,
  class."id",
  student."id",
  period."id",
  CURRENT_TIMESTAMP
FROM enrollment_data data
JOIN "SchoolUnit" unit ON unit."code" = 'AWS-TNG'
JOIN "AcademicPeriod" period
  ON period."schoolUnitId" = unit."id"
  AND period."name" = '2026/2027'
  AND period."semester" = data."semester"::"SemesterType"
JOIN "SchoolClass" class
  ON class."schoolUnitId" = unit."id"
  AND class."academicYear" = period."name"
  AND class."name" = data."className"
JOIN "Student" student
  ON student."schoolUnitId" = unit."id"
  AND student."nis" = data."nis"
ON CONFLICT ("classId", "studentId", "academicPeriodId") DO NOTHING;

-- 9. Penempatan dan penugasan 7A Semester Genap memakai kelas 7A yang sama.
INSERT INTO "TeachingAssignment" (
  "id", "teacherId", "classId", "subjectId", "academicPeriodId", "createdAt"
)
SELECT
  'test-ta-7a-s2-' || old_assignment."id",
  old_assignment."teacherId", previous."id", old_assignment."subjectId", next_period."id", CURRENT_TIMESTAMP
FROM "TeachingAssignment" old_assignment
JOIN "SchoolClass" previous ON previous."id" = old_assignment."classId" AND previous."name" = '7A'
JOIN "SchoolUnit" unit ON unit."id" = previous."schoolUnitId" AND unit."code" = 'AWS-TNG'
JOIN "AcademicPeriod" previous_period
  ON previous_period."id" = old_assignment."academicPeriodId"
  AND previous_period."name" = '2026/2027' AND previous_period."semester" = 'GANJIL'
JOIN "AcademicPeriod" next_period
  ON next_period."schoolUnitId" = previous."schoolUnitId"
  AND next_period."name" = previous_period."name" AND next_period."semester" = 'GENAP'
ON CONFLICT ("teacherId", "classId", "subjectId", "academicPeriodId") DO NOTHING;

INSERT INTO "ClassEnrollment" ("id", "classId", "studentId", "academicPeriodId", "createdAt")
SELECT
  'test-enrollment-7a-s2-' || old_enrollment."studentId",
  previous."id", old_enrollment."studentId", next_period."id", CURRENT_TIMESTAMP
FROM "ClassEnrollment" old_enrollment
JOIN "SchoolClass" previous ON previous."id" = old_enrollment."classId" AND previous."name" = '7A'
JOIN "SchoolUnit" unit ON unit."id" = previous."schoolUnitId" AND unit."code" = 'AWS-TNG'
JOIN "AcademicPeriod" previous_period
  ON previous_period."id" = old_enrollment."academicPeriodId"
  AND previous_period."name" = '2026/2027' AND previous_period."semester" = 'GANJIL'
JOIN "AcademicPeriod" next_period
  ON next_period."schoolUnitId" = previous."schoolUnitId"
  AND next_period."name" = previous_period."name" AND next_period."semester" = 'GENAP'
ON CONFLICT ("classId", "studentId", "academicPeriodId") DO NOTHING;

COMMIT;

-- Ringkasan hasil untuk pengecekan setelah script dijalankan.
SELECT
  period."name" AS "tahunAjaran",
  period."semester",
  class."name" AS "kelas",
  teacher."fullName" AS "waliKelas",
  COUNT(enrollment."studentId") AS "jumlahSiswa"
FROM "SchoolClass" class
JOIN "SchoolUnit" unit ON unit."id" = class."schoolUnitId" AND unit."code" = 'AWS-TNG'
JOIN "AcademicPeriod" period ON period."schoolUnitId" = class."schoolUnitId" AND period."name" = class."academicYear"
LEFT JOIN "User" teacher ON teacher."id" = class."homeroomTeacherId"
LEFT JOIN "ClassEnrollment" enrollment ON enrollment."classId" = class."id" AND enrollment."academicPeriodId" = period."id"
WHERE period."name" = '2026/2027'
GROUP BY period."name", period."semester", class."name", teacher."fullName"
ORDER BY period."semester", class."name";
