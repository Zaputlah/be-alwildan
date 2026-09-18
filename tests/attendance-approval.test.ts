import { describe, expect, it } from 'vitest';
import { countsAsFinalAttendance } from '../src/modules/teacher-attendance/attendance-approval.js';

describe('rekap persetujuan absensi', () => {
  it('tidak menghitung pengajuan yang menunggu atau ditolak', () => {
    expect(countsAsFinalAttendance('PENDING')).toBe(false);
    expect(countsAsFinalAttendance('REJECTED')).toBe(false);
  });

  it('menghitung pengajuan disetujui dan catatan langsung Admin', () => {
    expect(countsAsFinalAttendance('APPROVED')).toBe(true);
    expect(countsAsFinalAttendance(null)).toBe(true);
  });
});
