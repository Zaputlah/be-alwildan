-- Nonaktifkan entri cabang lama yang sudah digantikan nomor/kode pada referensi foto.
UPDATE "SchoolUnit"
SET "isActive" = false, "updatedAt" = NOW()
WHERE "code" IN (
  'AWS-08-BOGOR', 'AWS-12-BEKASI', 'AWS-13-BEKASI', 'AWS-14-BOGOR',
  'AWS-15-BEKASI', 'AWS-19-JAKBAR', 'AWS-21-ACEH', 'AWS-28-CIKUPA'
);
