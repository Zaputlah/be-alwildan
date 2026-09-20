-- Cabang operasional Al-Wildan dari halaman kontak resmi.
-- Aman dijalankan ulang: code bersifat unik dan tidak mengubah data cabang yang sudah ada.
INSERT INTO "SchoolUnit" ("id", "code", "name", "address", "isActive", "createdAt", "updatedAt") VALUES
('aw-branch-01-gadingserpong', 'AWS-01-GADING-SERPONG', 'Al-Wildan 1 Gading Serpong', 'Gading Serpong, Tangerang Selatan, Banten', true, NOW(), NOW()),
('aw-branch-04-jaksel', 'AWS-04-JAKSEL', 'Al-Wildan 4 Jakarta Selatan', 'Jakarta Selatan, DKI Jakarta', true, NOW(), NOW()),
('aw-branch-05-jakpus', 'AWS-05-JAKPUS', 'Al-Wildan 5 Jakarta Pusat', 'Jakarta Pusat, DKI Jakarta', true, NOW(), NOW()),
('aw-branch-10-jaktim', 'AWS-10-JAKTIM', 'Al-Wildan 10 Jakarta Timur', 'Jakarta Timur, DKI Jakarta', true, NOW(), NOW()),
('aw-branch-11-pejompongan', 'AWS-11-PEJOMPONGAN', 'Al-Wildan 11 Jakarta Pusat Pejompongan', 'Pejompongan, Jakarta Pusat, DKI Jakarta', true, NOW(), NOW()),
('aw-branch-19-jakbar', 'AWS-19-JAKBAR', 'Al-Wildan 19 Jakarta Barat', 'Jakarta Barat, DKI Jakarta', true, NOW(), NOW()),
('aw-branch-02-bekasi', 'AWS-02-BEKASI', 'Al-Wildan 2 Bekasi', 'Bekasi, Jawa Barat', true, NOW(), NOW()),
('aw-branch-03-bsd', 'AWS-03-BSD', 'Al-Wildan 3 BSD', 'BSD City, Tangerang Selatan, Banten', true, NOW(), NOW()),
('aw-branch-07-serang', 'AWS-07-SERANG', 'Al-Wildan 7 Serang', 'Serang, Banten', true, NOW(), NOW()),
('aw-branch-08-bogor', 'AWS-08-BOGOR', 'Al-Wildan 8 Kemang Bogor', 'Kemang, Bogor, Jawa Barat', true, NOW(), NOW()),
('aw-branch-12-bekasi', 'AWS-12-BEKASI', 'Al-Wildan 12 Bekasi', 'Bekasi, Jawa Barat', true, NOW(), NOW()),
('aw-branch-13-bekasi', 'AWS-13-BEKASI', 'Al-Wildan 13 Bekasi', 'Bekasi, Jawa Barat', true, NOW(), NOW()),
('aw-branch-14-bogor', 'AWS-14-BOGOR', 'Al-Wildan 14 Bumi Mutiara Bogor', 'Bumi Mutiara, Bogor, Jawa Barat', true, NOW(), NOW()),
('aw-branch-15-bekasi', 'AWS-15-BEKASI', 'Al-Wildan 15 Bekasi', 'Bekasi, Jawa Barat', true, NOW(), NOW()),
('aw-branch-16-ciledug', 'AWS-16-CILEDUG', 'Al-Wildan 16 Ciledug', 'Ciledug, Tangerang, Banten', true, NOW(), NOW()),
('aw-branch-28-cikupa', 'AWS-28-CIKUPA', 'Al-Wildan 28 Citra Raya Cikupa', 'Citra Raya Cikupa, Tangerang, Banten', true, NOW(), NOW()),
('aw-branch-29-depok', 'AWS-29-DEPOK', 'Al-Wildan 29 Depok', 'Depok, Jawa Barat', true, NOW(), NOW()),
('aw-branch-30-bekasi', 'AWS-30-BEKASI', 'Al-Wildan 30 Bekasi', 'Bekasi, Jawa Barat', true, NOW(), NOW()),
('aw-branch-31-cibinong', 'AWS-31-CIBINONG', 'Al-Wildan 31 Cibinong', 'Cibinong, Bogor, Jawa Barat', true, NOW(), NOW()),
('aw-branch-23-semarang', 'AWS-23-SEMARANG', 'Al-Wildan 23 Semarang', 'Semarang, Jawa Tengah', true, NOW(), NOW()),
('aw-branch-24-yogyakarta', 'AWS-24-YOGYAKARTA', 'Al-Wildan 24 Yogyakarta', 'Yogyakarta, DI Yogyakarta', true, NOW(), NOW()),
('aw-branch-20-mataram', 'AWS-20-MATARAM', 'Al-Wildan 20 Mataram', 'Mataram, Nusa Tenggara Barat', true, NOW(), NOW()),
('aw-branch-21-aceh', 'AWS-21-ACEH', 'Al-Wildan 21 Aceh', 'Aceh', true, NOW(), NOW()),
('aw-branch-22-makassar', 'AWS-22-MAKASSAR', 'Al-Wildan 22 Makassar', 'Makassar, Sulawesi Selatan', true, NOW(), NOW()),
('aw-branch-27-acehbesar', 'AWS-27-ACEHBESAR', 'Al-Wildan 27 Aceh Besar', 'Aceh Besar, Aceh', true, NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "address" = EXCLUDED."address", "isActive" = true, "updatedAt" = NOW();
