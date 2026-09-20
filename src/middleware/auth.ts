import type { RequestHandler } from 'express';
import type { UserRole } from '@prisma/client';
import { hashToken } from '../common/crypto.js';
import { HttpError } from '../common/http-error.js';
import { prisma } from '../config/prisma.js';

export const SESSION_COOKIE = 'integration_session';

export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return next(new HttpError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.'));

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { schoolUnit: true } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    return next(new HttpError(401, 'SESSION_EXPIRED', 'Sesi sudah berakhir. Silakan masuk kembali.'));
  }

  req.auth = {
    userId: session.user.id,
    fullName: session.user.fullName,
    email: session.user.email,
    role: session.user.role,
    adminScope: session.user.adminScope,
    schoolUnitId: session.user.schoolUnitId,
    schoolUnitName: session.user.schoolUnit.name,
    sessionId: session.id,
    csrfHash: session.csrfHash,
  };
  void prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  next();
};

export const authorize = (...roles: UserRole[]): RequestHandler => (req, _res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) {
    return next(new HttpError(403, 'FORBIDDEN', 'Anda tidak memiliki izin untuk operasi ini.'));
  }
  next();
};

export const requireCsrf: RequestHandler = (req, _res, next) => {
  const token = req.header('x-csrf-token');
  if (!req.auth || !token || hashToken(token) !== req.auth.csrfHash) {
    return next(new HttpError(403, 'INVALID_CSRF', 'Token keamanan tidak valid. Muat ulang halaman.'));
  }
  next();
};
