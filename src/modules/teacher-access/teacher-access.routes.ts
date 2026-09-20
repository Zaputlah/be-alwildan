import { Router } from 'express';
import { z } from 'zod';
import { hashPassword } from '../../common/crypto.js';
import { audit } from '../../common/audit.js';
import { HttpError } from '../../common/http-error.js';
import { prisma } from '../../config/prisma.js';
import { authenticate, authorize, requireCsrf } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

export const teacherAccessRouter = Router();
teacherAccessRouter.use(authenticate, authorize('ADMIN'));

const teacherSelect = { id: true, email: true, fullName: true, isActive: true, accessStatus: true, accessRequestedById: true, accessReviewedAt: true, accessRejectionReason: true, createdAt: true, schoolUnit: { select: { id: true, name: true } } } as const;

teacherAccessRouter.get('/', async (req, res) => {
  const isCentral = req.auth!.adminScope === 'CENTRAL';
  const teachers = await prisma.user.findMany({ where: { role: 'TEACHER', ...(isCentral ? {} : { schoolUnitId: req.auth!.schoolUnitId }) }, select: teacherSelect, orderBy: { createdAt: 'desc' } });
  res.json(teachers);
});

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(128),
});

function emailSlug(name: string) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').replace(/\.{2,}/g, '.');
}

teacherAccessRouter.post('/', authorize('ADMIN'), requireCsrf, validate(createSchema), async (req, res) => {
  if (req.auth!.adminScope === 'CENTRAL') throw new HttpError(403, 'BRANCH_ONLY', 'Pengajuan akun dibuat oleh Admin Cabang.');
  const data = req.body as z.infer<typeof createSchema>;
  const base = emailSlug(data.fullName) || 'guru';
  let email = `${base}@integration.sch.id`;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { email }, select: { id: true } })) email = `${base}${++suffix}@integration.sch.id`;
  const user = await prisma.user.create({ data: { email, fullName: data.fullName, passwordHash: await hashPassword(data.password), role: 'TEACHER', schoolUnitId: req.auth!.schoolUnitId, isActive: false, accessStatus: 'PENDING', accessRequestedById: req.auth!.userId }, select: teacherSelect });
  await audit(req, 'REQUEST_TEACHER_ACCESS', 'User', user.id, { email: user.email });
  res.status(201).json(user);
});

const decisionSchema = z.object({ decision: z.enum(['APPROVED', 'REJECTED']), reason: z.string().trim().max(500).optional() }).refine((value) => value.decision !== 'REJECTED' || !!value.reason, { message: 'Alasan penolakan wajib diisi.', path: ['reason'] });

teacherAccessRouter.patch('/:id/decision', authorize('ADMIN'), requireCsrf, validate(decisionSchema), async (req, res) => {
  if (req.auth!.adminScope !== 'CENTRAL') throw new HttpError(403, 'CENTRAL_ONLY', 'Persetujuan akun hanya dapat dilakukan Admin Pusat.');
  const data = req.body as z.infer<typeof decisionSchema>;
  const existing = await prisma.user.findFirst({ where: { id: String(req.params.id), role: 'TEACHER', accessStatus: 'PENDING' } });
  if (!existing) throw new HttpError(404, 'REQUEST_NOT_FOUND', 'Pengajuan akun tidak ditemukan atau sudah diproses.');
  const user = await prisma.user.update({ where: { id: existing.id }, data: { accessStatus: data.decision, isActive: data.decision === 'APPROVED', accessReviewedById: req.auth!.userId, accessReviewedAt: new Date(), accessRejectionReason: data.decision === 'REJECTED' ? data.reason : null }, select: teacherSelect });
  await audit(req, data.decision === 'APPROVED' ? 'APPROVE_TEACHER_ACCESS' : 'REJECT_TEACHER_ACCESS', 'User', user.id, { reason: data.reason || null });
  res.json(user);
});
