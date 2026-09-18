-- Bersihkan label yang terlanjur tampil pada data rekap yang sudah dibuat.
-- Hanya record ber-ID demo-report-* yang disentuh; angka nilainya tetap.
BEGIN;

UPDATE "Assessment"
SET "title" = substring("title" from 13), "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" LIKE 'demo-report-%' AND "title" LIKE '[DATA DEMO] %';

UPDATE "Score"
SET "notes" = NULL, "updatedAt" = CURRENT_TIMESTAMP
WHERE "assessmentId" LIKE 'demo-report-%'
  AND "notes" = '[DATA DEMO] Nilai contoh untuk pengujian rekap.';

COMMIT;
