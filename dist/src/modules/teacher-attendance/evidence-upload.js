import multer from 'multer';
import { HttpError } from '../../common/http-error.js';
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Map([
    ['application/pdf', ['.pdf']],
    ['image/jpeg', ['.jpg', '.jpeg']],
    ['image/png', ['.png']],
]);
export const uploadEvidence = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_EVIDENCE_BYTES, files: 1, fields: 3, parts: 4, fieldSize: 2 * 1024 },
    fileFilter: (_req, file, callback) => {
        const extension = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
        if (!allowedTypes.get(file.mimetype)?.includes(extension)) {
            callback(new HttpError(400, 'INVALID_EVIDENCE_TYPE', 'Bukti harus berupa PDF, JPG, atau PNG.'));
            return;
        }
        callback(null, true);
    },
}).single('evidence');
export function evidenceData(file) {
    if (!file)
        throw new HttpError(400, 'EVIDENCE_REQUIRED', 'Bukti sakit, izin, atau tugas wajib dilampirkan.');
    const { buffer } = file;
    const valid = file.mimetype === 'application/pdf'
        ? buffer.subarray(0, 5).toString('ascii') === '%PDF-'
        : file.mimetype === 'image/jpeg'
            ? buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
            : buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!valid)
        throw new HttpError(400, 'INVALID_EVIDENCE_CONTENT', 'Isi berkas tidak sesuai dengan tipe PDF, JPG, atau PNG.');
    const extension = file.mimetype === 'application/pdf' ? 'pdf' : file.mimetype === 'image/png' ? 'png' : 'jpg';
    return {
        fileName: `bukti-absensi.${extension}`,
        mimeType: file.mimetype,
        size: file.size,
        content: buffer,
    };
}
