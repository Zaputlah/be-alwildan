import { HttpError } from '../../common/http-error.js';
// Satu digit untuk paralel A-I: 7A -> 71, 7B -> 72, 8A -> 81.
export function nisPrefixForClass(schoolClass) {
    const match = /^([1-9]|1[0-2])([A-I])$/.exec(schoolClass.name.trim().toUpperCase());
    if (!match || Number(match[1]) !== schoolClass.gradeLevel) {
        throw new HttpError(400, 'INVALID_CLASS_FOR_NIS', 'Nama kelas harus mengikuti format tingkat dan paralel A-I, misalnya 7A atau 8B.');
    }
    return `${schoolClass.gradeLevel}${match[2].charCodeAt(0) - 64}`;
}
export function formatNis(prefix, serial) {
    if (!Number.isInteger(serial) || serial < 1 || serial > 9999) {
        throw new HttpError(409, 'NIS_LIMIT_REACHED', `Nomor urut NIS untuk kode kelas ${prefix} sudah penuh.`);
    }
    return `${prefix}${String(serial).padStart(4, '0')}`;
}
