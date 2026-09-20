-- Referensi cabang sesuai daftar pada materi AL-WILDAN ISLAMIC SCHOOL.
-- Cabang IN-PROGRESS disimpan sebagai tidak aktif.
UPDATE "SchoolUnit" SET "code" = 'AWS-25-ACEHBESAR', "name" = 'Al-Wildan Islamic School 25 Aceh Besar', "address" = 'Aceh Besar, Aceh', "updatedAt" = NOW() WHERE "code" = 'AWS-27-ACEHBESAR';

INSERT INTO "SchoolUnit" ("id", "code", "name", "address", "isActive", "createdAt", "updatedAt") VALUES
('photo-01-gading-serpong', 'AWS-01-GADING-SERPONG', 'Al-Wildan Islamic School 1 Gading Serpong', 'Gading Serpong, Tangerang Selatan, Banten', true, NOW(), NOW()),
('photo-02-bekasi', 'AWS-02-BEKASI', 'Al-Wildan Islamic School 2 Bekasi', 'Bekasi, Jawa Barat', true, NOW(), NOW()),
('photo-03-bsd', 'AWS-03-BSD', 'Al-Wildan Islamic School 3 BSD City', 'BSD City, Tangerang Selatan, Banten', true, NOW(), NOW()),
('photo-04-jaksel', 'AWS-04-JAKSEL', 'Al-Wildan Islamic School 4 Jakarta Selatan', 'Jakarta Selatan, DKI Jakarta', true, NOW(), NOW()),
('photo-05-jakpus', 'AWS-05-JAKPUS', 'Al-Wildan Islamic School 5 Jakarta Pusat', 'Jakarta Pusat, DKI Jakarta', true, NOW(), NOW()),
('photo-06-depok', 'AWS-06-DEPOK', 'Al-Wildan Islamic School 6 Depok', 'Depok, Jawa Barat', false, NOW(), NOW()),
('photo-07-serang', 'AWS-07-SERANG', 'Al-Wildan Islamic School 7 Serang', 'Serang, Banten', true, NOW(), NOW()),
('photo-08-kemang-bogor', 'AWS-08-KEMANG-BOGOR', 'Al-Wildan Islamic School 8 Kemang-Bogor', 'Kemang, Bogor, Jawa Barat', true, NOW(), NOW()),
('photo-09-dompu', 'AWS-09-DOMPU', 'Al-Wildan Islamic School 9 Dompu-NTB', 'Dompu, Nusa Tenggara Barat', true, NOW(), NOW()),
('photo-10-jaktim', 'AWS-10-JAKTIM', 'Al-Wildan Islamic School 10 Jakarta Timur', 'Jakarta Timur, DKI Jakarta', true, NOW(), NOW()),
('photo-11-pejompongan', 'AWS-11-PEJOMPONGAN', 'Al-Wildan Islamic School 11 Pejompongan-Jakpus', 'Pejompongan, Jakarta Pusat, DKI Jakarta', true, NOW(), NOW()),
('photo-12-jatibening', 'AWS-12-JATIBENING', 'Al-Wildan Islamic School 12 Jatibening-Bekasi', 'Jatibening, Bekasi, Jawa Barat', true, NOW(), NOW()),
('photo-13-mangunjaya', 'AWS-13-MANGUNJAYA', 'Al-Wildan Islamic School 13 Mangunjaya-Bekasi', 'Mangunjaya, Bekasi, Jawa Barat', true, NOW(), NOW()),
('photo-14-bumi-mutiara', 'AWS-14-BUMI-MUTIARA', 'Al-Wildan Islamic School 14 Bumi Mutiara, Bogor', 'Bumi Mutiara, Bogor, Jawa Barat', true, NOW(), NOW()),
('photo-15-tambun', 'AWS-15-TAMBUN', 'Al-Wildan Islamic School 15 Tambun-Bekasi', 'Tambun, Bekasi, Jawa Barat', true, NOW(), NOW()),
('photo-16-ciledug', 'AWS-16-CILEDUG', 'Al-Wildan Islamic School 16 Ciledug-Kab. Tangerang', 'Ciledug, Tangerang, Banten', true, NOW(), NOW()),
('photo-17-serang', 'AWS-17-SERANG', 'Al-Wildan Islamic School 17 Serang', 'Serang, Banten', false, NOW(), NOW()),
('photo-18-bsd', 'AWS-18-BSD', 'Al-Wildan Islamic School 18 BSD City', 'BSD City, Tangerang Selatan, Banten', true, NOW(), NOW()),
('photo-19-pengumben', 'AWS-19-PENGUMBEN', 'Al-Wildan Islamic School 19 Pengumben-Jakbar', 'Pengumben, Jakarta Barat, DKI Jakarta', true, NOW(), NOW()),
('photo-20-mataram', 'AWS-20-MATARAM', 'Al-Wildan Islamic School 20 Mataram-NTB', 'Mataram, Nusa Tenggara Barat', true, NOW(), NOW()),
('photo-21-banda-aceh', 'AWS-21-BANDA-ACEH', 'Al-Wildan Islamic School 21 Banda Aceh', 'Banda Aceh, Aceh', true, NOW(), NOW()),
('photo-22-makassar', 'AWS-22-MAKASSAR', 'Al-Wildan Islamic School 22 Makassar', 'Makassar, Sulawesi Selatan', true, NOW(), NOW()),
('photo-23-semarang', 'AWS-23-SEMARANG', 'Al-Wildan Islamic School 23 Semarang', 'Semarang, Jawa Tengah', true, NOW(), NOW()),
('photo-24-yogyakarta', 'AWS-24-YOGYAKARTA', 'Al-Wildan Islamic School 24 Yogyakarta', 'Yogyakarta, DI Yogyakarta', true, NOW(), NOW()),
('photo-26-malang', 'AWS-26-MALANG', 'Al-Wildan Islamic School 26 Malang', 'Malang, Jawa Timur', false, NOW(), NOW()),
('photo-27-citra-raya', 'AWS-27-CITRA-RAYA', 'Al-Wildan Islamic School 27 Citra Raya', 'Citra Raya, Tangerang, Banten', true, NOW(), NOW()),
('photo-28-grand-wisata', 'AWS-28-GRAND-WISATA', 'Al-Wildan Islamic School 28 Bekasi Grand Wisata', 'Grand Wisata, Bekasi, Jawa Barat', true, NOW(), NOW()),
('photo-29-depok', 'AWS-29-DEPOK', 'Al-Wildan Islamic School 29 Depok', 'Depok, Jawa Barat', true, NOW(), NOW()),
('photo-30-bekasi', 'AWS-30-BEKASI', 'Al-Wildan Islamic School 30 Bekasi', 'Bekasi, Jawa Barat', true, NOW(), NOW()),
('photo-31-cibinong', 'AWS-31-CIBINONG', 'Al-Wildan Islamic School 31 Cibinong', 'Cibinong, Bogor, Jawa Barat', true, NOW(), NOW()),
('photo-32-ciracas', 'AWS-32-CIRACAS', 'Al-Wildan Islamic School 32 Ciracas', 'Ciracas, Jakarta Timur, DKI Jakarta', true, NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "address" = EXCLUDED."address", "isActive" = EXCLUDED."isActive", "updatedAt" = NOW();
