import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../common/audit.js';
import { HttpError } from '../../common/http-error.js';
import { prisma } from '../../config/prisma.js';
import { authenticate, authorize, requireCsrf } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

export const teacherCaseRouter = Router();
teacherCaseRouter.use(authenticate, authorize('ADMIN'));

teacherCaseRouter.get('/', async (req, res) => {
  const central = req.auth!.adminScope === 'CENTRAL';
  const items = await prisma.teacherCase.findMany({
    where: central ? {} : { schoolUnitId: req.auth!.schoolUnitId },
    include: { teacher: { select: { id: true, fullName: true, email: true } }, schoolUnit: { select: { name: true } }, recordedBy: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
});

const createSchema = z.object({
  teacherId: z.string().min(1),
  level: z.enum(['WARNING', 'SP1', 'SP2', 'SP3']),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(1000),
});

teacherCaseRouter.post('/', authorize('ADMIN'), requireCsrf, validate(createSchema), async (req, res) => {
  if (req.auth!.adminScope === 'CENTRAL') throw new HttpError(403, 'BRANCH_ONLY', 'Kasus awal dicatat oleh Admin Cabang.');
  const data = req.body as z.infer<typeof createSchema>;
  const teacher = await prisma.user.findFirst({ where: { id: data.teacherId, schoolUnitId: req.auth!.schoolUnitId, role: 'TEACHER', isActive: true } });
  if (!teacher) throw new HttpError(400, 'INVALID_TEACHER', 'Guru tidak tersedia di cabang ini.');
  if (data.level === 'SP3') throw new HttpError(403, 'CENTRAL_ONLY', 'SP3 hanya dapat diputuskan Admin Pusat.');
  const item = await prisma.teacherCase.create({ data: { ...data, teacherId: teacher.id, schoolUnitId: req.auth!.schoolUnitId, recordedById: req.auth!.userId } });
  await audit(req, 'CREATE', 'TeacherCase', item.id, { level: item.level, teacherId: teacher.id });
  res.status(201).json(item);
});

const actionSchema = z.object({
  level: z.enum(['WARNING', 'SP1', 'SP2', 'SP3']),
  status: z.enum(['OPEN', 'RESOLVED', 'TERMINATED']).optional(),
  decision: z.string().trim().max(500).optional(),
});

teacherCaseRouter.patch('/:id/action', authorize('ADMIN'), requireCsrf, validate(actionSchema), async (req, res) => {
  const central = req.auth!.adminScope === 'CENTRAL';
  const data = req.body as z.infer<typeof actionSchema>;
  if (data.level === 'SP3' && !central) throw new HttpError(403, 'CENTRAL_ONLY', 'SP3 hanya dapat diputuskan Admin Pusat.');
  if (data.status === 'TERMINATED' && !central) throw new HttpError(403, 'CENTRAL_ONLY', 'Penonaktifan guru hanya dapat diputuskan Admin Pusat.');
  const existing = await prisma.teacherCase.findFirst({ where: { id: String(req.params.id), ...(central ? {} : { schoolUnitId: req.auth!.schoolUnitId }) } });
  if (!existing) throw new HttpError(404, 'CASE_NOT_FOUND', 'Kasus guru tidak ditemukan.');
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.teacherCase.update({ where: { id: existing.id }, data: { level: data.level, status: data.status ?? existing.status, decision: data.decision ?? existing.decision } });
    if (data.status === 'TERMINATED') await tx.user.update({ where: { id: existing.teacherId }, data: { isActive: false } });
    return item;
  });
  await audit(req, 'UPDATE', 'TeacherCase', updated.id, { level: updated.level, status: updated.status });
  res.json(updated);
});
