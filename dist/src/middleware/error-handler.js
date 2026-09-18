import { Prisma } from '@prisma/client';
import multer from 'multer';
import { HttpError } from '../common/http-error.js';
export const notFound = (_req, _res, next) => {
    next(new HttpError(404, 'NOT_FOUND', 'Endpoint tidak ditemukan.'));
};
export const errorHandler = (error, _req, res, _next) => {
    if (error instanceof HttpError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
        return;
    }
    if (error instanceof multer.MulterError) {
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        res.status(tooLarge ? 413 : 400).json({ error: {
                code: tooLarge ? 'EVIDENCE_TOO_LARGE' : 'INVALID_UPLOAD',
                message: tooLarge ? 'Ukuran bukti maksimal 5 MB.' : 'Unggahan bukti tidak valid.',
            } });
        return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        res.status(409).json({ error: { code: 'DUPLICATE_DATA', message: 'Data dengan identitas tersebut sudah digunakan.' } });
        return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Data tidak ditemukan.' } });
        return;
    }
    console.error(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan pada server.' } });
};
