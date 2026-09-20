import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { HttpError } from '../../common/http-error.js';
import { audit } from '../../common/audit.js';
import { authenticate, authorize, requireCsrf } from '../../middleware/auth.js';
import { z } from 'zod';
import { hashPassword } from '../../common/crypto.js';
import { validate } from '../../middleware/validate.js';

export const adminAccountRouter = Router();
adminAccountRouter.use(authenticate, authorize('ADMIN'));

adminAccountRouter.get('/', async (req, res) => {
  if (req.auth!.adminScope !== 'CENTRAL') throw new HttpError(403, 'CENTRAL_ONLY', 'Daftar Admin Cabang hanya dapat dilihat Admin Pusat.');
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', adminScope: 'BRANCH' },
    select: { id: true, fullName: true, email: true, isActive: true, createdAt: true, schoolUnit: { select: { id: true, code: true, name: true, address: true } } },
    orderBy: [{ schoolUnit: { name: 'asc' } }, { fullName: 'asc' }],
  });
  res.json(admins);
});

adminAccountRouter.get('/units', async (req, res) => {
  if (req.auth!.adminScope !== 'CENTRAL') throw new HttpError(403, 'CENTRAL_ONLY', 'Daftar cabang hanya dapat dilihat Admin Pusat.');
  const units = await prisma.schoolUnit.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } });
  res.json(units);
});

const createSchema = z.object({ fullName: z.string().trim().min(2).max(120), schoolUnitId: z.string().min(1), password: z.string().min(8).max(128) });
function slug(value: string) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, ''); }

adminAccountRouter.post('/', requireCsrf, validate(createSchema), async (req, res) => {
  if (req.auth!.adminScope !== 'CENTRAL') throw new HttpError(403, 'CENTRAL_ONLY', 'Admin Cabang hanya dapat dibuat Admin Pusat.');
  const data = req.body as z.infer<typeof createSchema>;
  const unit = await prisma.schoolUnit.findFirst({ where: { id: data.schoolUnitId, isActive: true } });
  if (!unit) throw new HttpError(400, 'INVALID_UNIT', 'Cabang tidak ditemukan.');
  const base = `admin.${slug(unit.code || unit.name) || 'cabang'}`;
  let email = `${base}@integration.sch.id`; let suffix = 1;
  while (await prisma.user.findUnique({ where: { email }, select: { id: true } })) email = `${base}${++suffix}@integration.sch.id`;
  const user = await prisma.user.create({ data: { fullName: data.fullName, email, passwordHash: await hashPassword(data.password), role: 'ADMIN', adminScope: 'BRANCH', schoolUnitId: unit.id, isActive: true }, select: { id: true, fullName: true, email: true, isActive: true, createdAt: true, schoolUnit: { select: { id: true, code: true, name: true, address: true } } } });
  await audit(req, 'CREATE_BRANCH_ADMIN', 'User', user.id, { schoolUnitId: unit.id, email });
  res.status(201).json(user);
});
