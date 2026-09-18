import { describe, expect, it } from 'vitest';
import { HttpError } from '../src/common/http-error.js';
import { evidenceData } from '../src/modules/teacher-attendance/evidence-upload.js';

function file(mimetype: string, buffer: Buffer) {
  return { mimetype, buffer, size: buffer.length } as Express.Multer.File;
}

describe('bukti sakit dan izin', () => {
  it('menerima PDF dan menamai berkas secara aman', () => {
    const result = evidenceData(file('application/pdf', Buffer.from('%PDF-1.7\ncontoh')));
    expect(result.fileName).toBe('bukti-absensi.pdf');
    expect(result.size).toBe(Buffer.byteLength('%PDF-1.7\ncontoh'));
  });

  it('menolak berkas kosong atau isi yang tidak sesuai tipe', () => {
    expect(() => evidenceData(undefined)).toThrow(HttpError);
    expect(() => evidenceData(file('application/pdf', Buffer.from('<script>')))).toThrow(HttpError);
    expect(() => evidenceData(file('image/png', Buffer.from('not-a-png')))).toThrow(HttpError);
  });
});
