-- Contoh absensi siswa pada semester Ganjil 2026/2027.
-- Hanya menambah baris yang belum ada, tanpa mengubah absensi lain.
WITH attendance_days("date", "dayNumber") AS (
  VALUES (DATE '2026-09-15', 1), (DATE '2026-09-16', 2), (DATE '2026-09-17', 3), (DATE '2026-09-18', 4)
), roster AS (
  SELECT enrollment."studentId", enrollment."classId", enrollment."academicPeriodId",
    school_class."schoolUnitId", row_number() OVER (PARTITION BY enrollment."classId" ORDER BY student."nis") AS "studentNumber"
  FROM "ClassEnrollment" enrollment
  JOIN "Student" student ON student."id" = enrollment."studentId" AND student."isActive" = true
  JOIN "SchoolClass" school_class ON school_class."id" = enrollment."classId" AND school_class."academicYear" = '2026/2027'
  JOIN "SchoolUnit" unit ON unit."id" = school_class."schoolUnitId" AND unit."code" = 'AWS-TNG'
  JOIN "AcademicPeriod" period ON period."id" = enrollment."academicPeriodId"
    AND period."name" = '2026/2027' AND period."semester" = 'GANJIL'
)
INSERT INTO "StudentAttendance" (
  "id", "date", "status", "notes", "studentId", "classId", "academicPeriodId", "schoolUnitId", "recordedById", "createdAt", "updatedAt"
)
SELECT
  'attendance-siswa-' || to_char(day."date", 'YYYYMMDD') || '-' || roster."studentId",
  day."date",
  CASE
    WHEN day."dayNumber" = 2 AND roster."studentNumber" = 2 THEN 'LATE'::"StudentAttendanceStatus"
    WHEN day."dayNumber" = 3 AND roster."studentNumber" = 3 THEN 'SICK'::"StudentAttendanceStatus"
    WHEN day."dayNumber" = 4 AND roster."studentNumber" = 4 THEN 'LEAVE'::"StudentAttendanceStatus"
    ELSE 'PRESENT'::"StudentAttendanceStatus"
  END,
  CASE
    WHEN day."dayNumber" = 2 AND roster."studentNumber" = 2 THEN 'Datang setelah jam masuk'
    WHEN day."dayNumber" = 3 AND roster."studentNumber" = 3 THEN 'Sakit'
    WHEN day."dayNumber" = 4 AND roster."studentNumber" = 4 THEN 'Izin'
    ELSE NULL
  END,
  roster."studentId", roster."classId", roster."academicPeriodId", roster."schoolUnitId", admin."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM roster
CROSS JOIN attendance_days day
JOIN "User" admin ON admin."schoolUnitId" = roster."schoolUnitId" AND admin."email" = 'admin@integration.sch.id'
ON CONFLICT ("studentId", "date") DO NOTHING;
