import { describe, expect, it } from 'vitest';
import { isBeforeSchoolTime, schoolMinutes } from '../src/modules/teacher-attendance/attendance-time.js';

describe('batas waktu absensi sekolah', () => {
  it('menandai 16.50 WIB sebagai pulang terlalu cepat, tetapi 17.00 tidak', () => {
    expect(isBeforeSchoolTime(new Date('2026-09-16T09:50:00Z'), 'Asia/Jakarta', '17:00')).toBe(true);
    expect(isBeforeSchoolTime(new Date('2026-09-16T10:00:00Z'), 'Asia/Jakarta', '17:00')).toBe(false);
    expect(isBeforeSchoolTime(new Date('2026-09-16T10:05:00Z'), 'Asia/Jakarta', '17:00')).toBe(false);
  });

  it('menghitung menit check-in berdasarkan zona waktu sekolah', () => {
    expect(schoolMinutes(new Date('2026-09-16T00:25:00Z'), 'Asia/Jakarta')).toBe(7 * 60 + 25);
  });

  it('tidak menandai pulang cepat bila belum ada check-out', () => {
    expect(isBeforeSchoolTime(null, 'Asia/Jakarta', '17:00')).toBe(false);
  });
});
