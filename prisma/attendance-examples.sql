-- Contoh absensi guru September 2026. Jalankan setelah migration lokasi/pulang cepat.
-- Aman dijalankan berulang kali; catatan yang sudah ada tidak ditimpa.
-- Waktu check-in/out di bawah disimpan UTC dan tampil sebagai WIB di aplikasi.
-- Lokasi sengaja NULL karena ini data contoh, bukan hasil GPS perangkat.
BEGIN;

WITH examples("id", "email", "date", "status", "checkInAt", "checkOutAt", "isEarlyCheckout", "notes") AS (
  VALUES
    (
      'example-attendance-fauzan-20260910', 'guru@integration.sch.id', DATE '2026-09-10',
      'PRESENT', TIMESTAMP '2026-09-09 23:55:00', TIMESTAMP '2026-09-10 10:00:00',
      false, 'Data contoh untuk pengujian'
    ),
    (
      'example-attendance-fauzan-20260911', 'guru@integration.sch.id', DATE '2026-09-11',
      'PRESENT', TIMESTAMP '2026-09-11 00:05:00', TIMESTAMP '2026-09-11 09:50:00',
      true, 'Data contoh untuk pengujian'
    ),
    (
      'example-attendance-fauzan-20260914', 'guru@integration.sch.id', DATE '2026-09-14',
      'LATE', TIMESTAMP '2026-09-14 00:30:00', TIMESTAMP '2026-09-14 10:10:00',
      false, 'Data contoh untuk pengujian'
    ),
    (
      'example-attendance-siti-20260916', 'guru.ipa.test@integration.sch.id', DATE '2026-09-16',
      'LATE', TIMESTAMP '2026-09-16 00:25:00', TIMESTAMP '2026-09-16 09:50:00',
      true, 'Data contoh untuk pengujian'
    ),
    (
      'example-attendance-budi-20260916', 'guru.matematika.test@integration.sch.id', DATE '2026-09-16',
      'PRESENT', TIMESTAMP '2026-09-16 00:00:00', TIMESTAMP '2026-09-16 10:05:00',
      false, 'Data contoh untuk pengujian'
    )
)
INSERT INTO "TeacherAttendance" (
  "id", "teacherId", "schoolUnitId", "date", "status", "checkInAt", "checkOutAt",
  "isEarlyCheckout", "notes", "createdAt", "updatedAt"
)
SELECT
  example."id", teacher."id", teacher."schoolUnitId", example."date",
  example."status"::"TeacherAttendanceStatus", example."checkInAt", example."checkOutAt",
  example."isEarlyCheckout", example."notes", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM examples example
JOIN "User" teacher ON teacher."email" = example."email" AND teacher."role" = 'TEACHER'
JOIN "SchoolUnit" unit ON unit."id" = teacher."schoolUnitId" AND unit."code" = 'AWS-TNG'
ON CONFLICT ("teacherId", "date") DO NOTHING;

COMMIT;
