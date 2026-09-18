-- Koreksi NIS data contoh lama pada unit AWS-TNG. ID siswa tetap, sehingga relasi
-- kelas, nilai, dan data lain yang merujuk ke ID siswa tidak berubah.
WITH mapping("oldNis", "newNis") AS (
  VALUES
    ('260701', '710001'), ('260702', '710002'), ('260703', '710003'),
    ('260704', '710004'), ('260705', '710005'), ('260706', '710006'),
    ('270701', '720001'), ('270702', '720002'), ('270703', '720003'),
    ('270704', '720004'),
    ('270705', '730001'), ('270706', '730002'), ('270707', '730003'),
    ('270708', '730004'),
    ('280701', '810001'), ('280702', '810002'), ('280703', '810003'),
    ('280704', '810004')
)
UPDATE "Student" AS student
SET "nis" = mapping."newNis", "updatedAt" = CURRENT_TIMESTAMP
FROM mapping, "SchoolUnit" AS unit
WHERE unit."code" = 'AWS-TNG'
  AND student."schoolUnitId" = unit."id"
  AND student."nis" = mapping."oldNis";
