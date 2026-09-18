import { describe, expect, it } from 'vitest';
import { HttpError } from '../src/common/http-error.js';
import { formatNis, nisPrefixForClass } from '../src/modules/students/nis.js';

describe('NIS per kelas', () => {
  it.each([
    ['7A', 7, '71'],
    ['7B', 7, '72'],
    ['7C', 7, '73'],
    ['7D', 7, '74'],
    ['8A', 8, '81'],
    ['10B', 10, '102'],
  ])('memetakan kelas %s ke awalan %s', (name, gradeLevel, prefix) => {
    expect(nisPrefixForClass({ name, gradeLevel })).toBe(prefix);
  });

  it('menghasilkan empat digit nomor urut', () => {
    expect(formatNis('71', 1)).toBe('710001');
    expect(formatNis('72', 42)).toBe('720042');
    expect(formatNis('81', 9999)).toBe('819999');
  });

  it('menolak format kelas yang tidak cocok dan nomor urut yang penuh', () => {
    expect(() => nisPrefixForClass({ name: '7A', gradeLevel: 8 })).toThrow(HttpError);
    expect(() => nisPrefixForClass({ name: '7J', gradeLevel: 7 })).toThrow(HttpError);
    expect(() => formatNis('71', 10000)).toThrow(HttpError);
  });
});
