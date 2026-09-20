import { Router } from 'express';
import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { hashToken, randomToken, verifyPassword } from '../../common/crypto.js';
import { HttpError } from '../../common/http-error.js';
import { publicUser } from '../../common/audit.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { authenticate, requireCsrf, SESSION_COOKIE } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

// Vercel's TypeScript resolver can expose express-rate-limit's ESM namespace
// type for the default import; at runtime it is still the callable factory.
const rateLimitFactory = rateLimit as unknown as (options: Record<string, unknown>) => RequestHandler;

export const authRouter = Router();

const loginLimiter = rateLimitFactory({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Terlalu banyak percobaan masuk. Coba lagi nanti.' } },
});

const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

authRouter.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { email: req.body.email },
    include: { schoolUnit: true },
  });
  const valid = user ? await verifyPassword(req.body.password, user.passwordHash) : false;
  if (!user || !valid || !user.isActive || (user.role === 'TEACHER' && user.accessStatus !== 'APPROVED')) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah.');
  }

  const sessionToken = randomToken();
  const csrfToken = randomToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      tokenHash: hashToken(sessionToken),
      csrfHash: hashToken(csrfToken),
      expiresAt,
      userId: user.id,
    },
  });

  res.cookie(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
  res.json({ user: publicUser(user), csrfToken });
});

authRouter.get('/me', authenticate, async (req, res) => {
  const csrfToken = randomToken();
  await prisma.session.update({
    where: { id: req.auth!.sessionId },
    data: { csrfHash: hashToken(csrfToken) },
  });
  res.json({
    user: {
      id: req.auth!.userId,
      email: req.auth!.email,
      fullName: req.auth!.fullName,
      role: req.auth!.role,
      adminScope: req.auth!.adminScope,
      schoolUnit: { id: req.auth!.schoolUnitId, name: req.auth!.schoolUnitName },
    },
    csrfToken,
  });
});

authRouter.post('/logout', authenticate, requireCsrf, async (req, res) => {
  await prisma.session.delete({ where: { id: req.auth!.sessionId } });
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.status(204).send();
});
