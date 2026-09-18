-- Contoh jadwal untuk penugasan guru yang sudah ada.
-- Aman dijalankan berulang kali; baris dilewati bila penugasan tidak tersedia.
WITH schedule_data("id", "email", "className", "subjectCode", "weekday", "startMinute", "endMinute", "room") AS (
  VALUES
    ('schedule-ipa-7b-mon', 'guru.ipa.test@integration.sch.id', '7B', 'IPA', 1, 480, 540, 'Lab IPA'),
    ('schedule-ipa-7c-tue', 'guru.ipa.test@integration.sch.id', '7C', 'IPA', 2, 540, 600, 'Lab IPA'),
    ('schedule-ipa-7b-thu', 'guru.ipa.test@integration.sch.id', '7B', 'IPA', 4, 480, 540, 'Lab IPA'),
    ('schedule-ipa-7c-thu', 'guru.ipa.test@integration.sch.id', '7C', 'IPA', 4, 600, 660, 'Lab IPA'),
    ('schedule-ipa-8a-fri', 'guru.ipa.test@integration.sch.id', '8A', 'IPA', 5, 540, 600, 'Lab IPA'),
    ('schedule-mat-7b-mon', 'guru.matematika.test@integration.sch.id', '7B', 'MAT', 1, 540, 600, NULL),
    ('schedule-mat-7b-thu', 'guru.matematika.test@integration.sch.id', '7B', 'MAT', 4, 540, 600, NULL),
    ('schedule-mat-7c-thu', 'guru.matematika.test@integration.sch.id', '7C', 'MAT', 4, 480, 540, NULL),
    ('schedule-pai-7b-thu', 'guru.pai.test@integration.sch.id', '7B', 'PAI', 4, 660, 720, NULL),
    ('schedule-pai-8a-fri', 'guru.pai.test@integration.sch.id', '8A', 'PAI', 5, 480, 540, NULL)
)
INSERT INTO "TeacherScheduleSlot" (
  "id", "teachingAssignmentId", "weekday", "startMinute", "endMinute", "room", "createdAt", "updatedAt"
)
SELECT data."id", assignment."id", data."weekday", data."startMinute", data."endMinute", data."room", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM schedule_data data
JOIN "User" teacher ON teacher."email" = data."email"
JOIN "TeachingAssignment" assignment ON assignment."teacherId" = teacher."id"
JOIN "SchoolClass" class ON class."id" = assignment."classId" AND class."name" = data."className"
JOIN "Subject" subject ON subject."id" = assignment."subjectId" AND subject."code" = data."subjectCode"
JOIN "AcademicPeriod" period ON period."id" = assignment."academicPeriodId" AND period."semester" = 'GANJIL' AND period."name" = '2026/2027'
ON CONFLICT DO NOTHING;
