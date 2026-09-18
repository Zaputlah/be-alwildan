import 'dotenv/config';
import { PrismaClient, type AttendanceApprovalStatus, type TeacherAttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

type Example = {
  id: string;
  email: string;
  date: string;
  status: TeacherAttendanceStatus;
  approvalStatus: AttendanceApprovalStatus | null;
  notes: string;
  evidenceTitle?: string;
  reviewNotes?: string;
};

// Dokumen ini hanya untuk uji tampilan/unduhan, bukan surat dokter atau surat tugas yang sah.
function demoPdf(title: string): Buffer {
  const content = `BT /F1 18 Tf 50 750 Td (${title}) Tj 0 -32 Td /F1 12 Tf (DATA DEMO - BUKAN BERKAS RESMI) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}

const examples: Example[] = [
  {
    id: 'demo-attendance-sick-approved-20260903', email: 'guru@integration.sch.id', date: '2026-09-03',
    status: 'SICK', approvalStatus: 'APPROVED',
    notes: '[DATA DEMO] Mengajukan sakit untuk pengujian persetujuan Admin.', evidenceTitle: 'CONTOH BUKTI SAKIT',
  },
  {
    id: 'demo-attendance-leave-approved-20260904', email: 'guru.ipa.test@integration.sch.id', date: '2026-09-04',
    status: 'LEAVE', approvalStatus: 'APPROVED',
    notes: '[DATA DEMO] Izin pribadi untuk pengujian persetujuan Admin.', evidenceTitle: 'CONTOH BUKTI IZIN',
  },
  {
    id: 'demo-attendance-duty-approved-20260907', email: 'guru.matematika.test@integration.sch.id', date: '2026-09-07',
    status: 'DUTY', approvalStatus: 'APPROVED',
    notes: '[DATA DEMO] Tugas sekolah untuk pengujian persetujuan Admin.', evidenceTitle: 'CONTOH SURAT TUGAS',
  },
  {
    id: 'demo-attendance-absent-20260908', email: 'guru.pai.test@integration.sch.id', date: '2026-09-08',
    status: 'ABSENT', approvalStatus: null,
    notes: '[DATA DEMO] Contoh catatan alpa yang dicatat Admin.',
  },
  {
    id: 'demo-attendance-sick-pending-20260909', email: 'guru.pai.test@integration.sch.id', date: '2026-09-09',
    status: 'SICK', approvalStatus: 'PENDING',
    notes: '[DATA DEMO] Pengajuan sakit yang menunggu keputusan Admin.', evidenceTitle: 'CONTOH PENGAJUAN SAKIT',
  },
  {
    id: 'demo-attendance-leave-rejected-20260909', email: 'guru.matematika.test@integration.sch.id', date: '2026-09-09',
    status: 'LEAVE', approvalStatus: 'REJECTED',
    notes: '[DATA DEMO] Pengajuan izin yang ditolak Admin.', evidenceTitle: 'CONTOH PENGAJUAN IZIN',
    reviewNotes: '[DATA DEMO] Berkas belum sesuai. Silakan ajukan ulang.',
  },
];

async function main() {
  const school = await prisma.schoolUnit.findUnique({ where: { code: 'AWS-TNG' } });
  const admin = await prisma.user.findUnique({ where: { email: 'admin@integration.sch.id' } });
  if (!school || !admin || admin.schoolUnitId !== school.id || admin.role !== 'ADMIN') {
    throw new Error('Unit sekolah atau Admin demo tidak ditemukan. Jalankan seed dasar terlebih dahulu.');
  }

  let created = 0;
  let skipped = 0;
  for (const example of examples) {
    const teacher = await prisma.user.findUnique({ where: { email: example.email } });
    if (!teacher || teacher.schoolUnitId !== school.id || teacher.role !== 'TEACHER') {
      throw new Error(`Guru demo tidak tersedia: ${example.email}`);
    }
    const date = new Date(`${example.date}T00:00:00.000Z`);
    const existing = await prisma.teacherAttendance.findUnique({
      where: { teacherId_date: { teacherId: teacher.id, date } },
    });
    if (existing) { skipped += 1; continue; }

    const pdf = example.evidenceTitle ? demoPdf(example.evidenceTitle) : null;
    await prisma.teacherAttendance.create({
      data: {
        id: example.id, teacherId: teacher.id, schoolUnitId: school.id, date,
        status: example.status, approvalStatus: example.approvalStatus, notes: example.notes,
        reviewedById: example.approvalStatus === 'APPROVED' || example.approvalStatus === 'REJECTED' ? admin.id : null,
        reviewedAt: example.approvalStatus === 'APPROVED' || example.approvalStatus === 'REJECTED' ? new Date(`${example.date}T08:00:00.000Z`) : null,
        reviewNotes: example.reviewNotes ?? null,
        ...(pdf ? { evidence: { create: {
          fileName: 'dokumen-contoh-bukan-berkas-resmi.pdf', mimeType: 'application/pdf', size: pdf.length, content: pdf,
        } } } : {}),
      },
    });
    created += 1;
  }
  console.log(`Contoh absensi September 2026: ${created} ditambahkan, ${skipped} dilewati; data lama tidak diubah.`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
