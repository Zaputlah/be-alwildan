import { describe, expect, it } from 'vitest';
import { attendanceRemarks } from '../src/modules/teacher-attendance/attendance-remarks.js';

const timeZone = 'Asia/Jakarta';
const lateAfter = '07:15';
const earlyCheckoutBefore = '17:00';

describe('keterangan absensi detail', () => {
  it('menjelaskan masuk tepat waktu dan pulang 10 menit terlalu cepat', () => {
    expect(attendanceRemarks({
      status: 'PRESENT',
      checkInAt: new Date('2026-09-11T00:05:00Z'),
      checkOutAt: new Date('2026-09-11T09:50:00Z'),
      notes: null,
    }, timeZone, lateAfter, earlyCheckoutBefore)).toEqual([
      'Masuk tepat waktu (07:05; batas 07:15).',
      'Pulang terlalu cepat 10 menit (16:50; jadwal 17:00).',
    ]);
  });

  it('menjelaskan keterlambatan, pulang sesuai jadwal, dan catatan', () => {
    expect(attendanceRemarks({
      status: 'LATE',
      checkInAt: new Date('2026-09-14T00:30:00Z'),
      checkOutAt: new Date('2026-09-14T10:10:00Z'),
      notes: 'Data contoh',
    }, timeZone, lateAfter, earlyCheckoutBefore)).toEqual([
      'Terlambat 15 menit (masuk 07:30; batas 07:15).',
      'Pulang sesuai jadwal (17:10; mulai 17:00).',
      'Catatan: Data contoh',
    ]);
  });

  it('menjelaskan check-out yang belum dilakukan', () => {
    expect(attendanceRemarks({
      status: 'PRESENT',
      checkInAt: new Date('2026-09-15T00:00:00Z'),
      checkOutAt: null,
      notes: null,
    }, timeZone, lateAfter, earlyCheckoutBefore)[1]).toBe('Belum check-out.');
  });

  it('menjelaskan tugas sekolah/dinas tanpa check-in', () => {
    expect(attendanceRemarks({
      status: 'DUTY',
      checkInAt: null,
      checkOutAt: null,
      notes: 'Mengikuti pelatihan',
    }, timeZone, lateAfter, earlyCheckoutBefore)).toEqual([
      'Tidak check-in karena tugas sekolah/dinas.',
      'Catatan: Mengikuti pelatihan',
    ]);
  });

  it('menandai sakit yang belum disetujui sebagai pengajuan', () => {
    expect(attendanceRemarks({
      status: 'SICK', approvalStatus: 'PENDING',
      checkInAt: null, checkOutAt: null, notes: 'Menunggu surat dokter',
    }, timeZone, lateAfter, earlyCheckoutBefore)).toEqual([
      'Pengajuan menunggu persetujuan Admin.',
      'Tidak check-in karena sakit.',
      'Catatan: Menunggu surat dokter',
    ]);
  });
});
