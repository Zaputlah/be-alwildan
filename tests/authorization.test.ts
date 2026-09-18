import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { hashToken } from '../src/common/crypto.js';
import { HttpError } from '../src/common/http-error.js';
import { authorize, requireCsrf } from '../src/middleware/auth.js';

const response = {} as Response;
const teacherAuth = {
  userId: 'teacher-1', fullName: 'Guru', email: 'guru@example.test', role: 'TEACHER' as const,
  schoolUnitId: 'school-1', schoolUnitName: 'Unit Sekolah', sessionId: 'session-1', csrfHash: '',
};

describe('authorization middleware', () => {
  it('rejects a teacher from an admin-only operation', () => {
    const next = vi.fn() as unknown as NextFunction;
    authorize('ADMIN')({ auth: teacherAuth } as Request, response, next);
    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as HttpError;
    expect(error.status).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('accepts a matching CSRF token', () => {
    const token = 'valid-csrf-token';
    const next = vi.fn() as unknown as NextFunction;
    const req = { auth: { ...teacherAuth, csrfHash: hashToken(token) }, header: () => token } as unknown as Request;
    requireCsrf(req, response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects an invalid CSRF token', () => {
    const next = vi.fn() as unknown as NextFunction;
    const req = { auth: { ...teacherAuth, csrfHash: hashToken('expected') }, header: () => 'wrong' } as unknown as Request;
    requireCsrf(req, response, next);
    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as HttpError;
    expect(error.code).toBe('INVALID_CSRF');
  });
});
