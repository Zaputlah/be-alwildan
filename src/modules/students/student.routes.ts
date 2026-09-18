import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { audit } from '../../common/audit.js';
import { HttpError } from '../../common/http-error.js';
import { prisma } from '../../config/prisma.js';
import { authenticate, authorize, requireCsrf } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { formatNis, nisPrefixForClass } from './nis.js';

export const studentRouter = Router();
studentRouter.use(authenticate);

const listSchema = z.object({
  search: z.string().trim().max(80).optional().default(''),
  classId: z.string().optional(),
  academicPeriodId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const studentSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  gender: z.enum(['MALE', 'FEMALE']),
  birthDate: z.iso.date().nullable().optional(),
  parentName: z.string().trim().max(120).nullable().optional(),
  parentPhone: z.string().trim().regex(/^\+?[0-9 -]{8,18}$/).nullable().optional(),
  classId: z.string().min(1),
  academicPeriodId: z.string().min(1),
});

const deactivationSchema = z.object({
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(500),
});

async function nextNis(tx: Prisma.TransactionClient, schoolUnitId: string, prefix: string) {
  const pattern = `^${prefix}[0-9]{4}$`;
  const [result] = await tx.$queryRaw<{ nextSerial: number }[]>(Prisma.sql`
    SELECT COALESCE(MAX(RIGHT("nis", 4)::integer), 0) + 1 AS "nextSerial"
    FROM "Student"
    WHERE "schoolUnitId" = ${schoolUnitId} AND "nis" ~ ${pattern}
  `);
  return formatNis(prefix, result.nextSerial);
}

studentRouter.get('/next-nis', authorize('ADMIN'), async (req, res) => {
  const parsed = z.object({ classId: z.string().min(1) }).safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Pilih kelas terlebih dahulu.');
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: parsed.data.classId, schoolUnitId: req.auth!.schoolUnitId },
    select: { name: true, gradeLevel: true },
  });
  if (!schoolClass) throw new HttpError(400, 'INVALID_CLASS', 'Kelas tidak tersedia pada unit sekolah Anda.');
  const prefix = nisPrefixForClass(schoolClass);
  const nis = await prisma.$transaction((tx) => nextNis(tx, req.auth!.schoolUnitId, prefix));
  res.json({ nis });
});

studentRouter.get('/inactive', authorize('ADMIN'), async (req, res) => {
  const parsedQuery = listSchema.safeParse(req.query);
  if (!parsedQuery.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Filter data siswa tidak valid.', parsedQuery.error.flatten());
  }
  const { search, page, limit } = parsedQuery.data;
  const where: Prisma.StudentWhereInput = {
    schoolUnitId: req.auth!.schoolUnitId,
    isActive: false,
    ...(search ? { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { nis: { contains: search } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        enrollments: {
          include: {
            academicPeriod: { select: { id: true, name: true, semester: true, startDate: true, endDate: true } },
            class: { select: { id: true, name: true, gradeLevel: true, academicYear: true } },
          },
          orderBy: { academicPeriod: { startDate: 'desc' } },
        },
      },
      orderBy: [{ deactivatedAt: 'desc' }, { fullName: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.student.count({ where }),
  ]);
  res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

studentRouter.get('/', async (req, res) => {
  const parsedQuery = listSchema.safeParse(req.query);
  if (!parsedQuery.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Filter data siswa tidak valid.', parsedQuery.error.flatten());
  }
  const { search, classId, academicPeriodId, page, limit } = parsedQuery.data;
  const classFilter: Prisma.SchoolClassWhereInput = {
    ...(classId ? { id: classId } : {}),
    ...(req.auth!.role === 'TEACHER'
      ? {
          OR: [
            { homeroomTeacherId: req.auth!.userId },
            { teaching: { some: { teacherId: req.auth!.userId } } },
          ],
        }
      : {}),
  };
  const enrollmentFilter: Prisma.ClassEnrollmentWhereInput = {
    ...(academicPeriodId ? { academicPeriodId } : {}),
    ...(classId ? { classId } : {}),
    ...(req.auth!.role === 'TEACHER' ? { class: classFilter } : {}),
  };
  const hasEnrollmentFilter = Boolean(classId || academicPeriodId || req.auth!.role === 'TEACHER');
  const where: Prisma.StudentWhereInput = {
    schoolUnitId: req.auth!.schoolUnitId,
    isActive: true,
    ...(search ? { OR: [{ fullName: { contains: search, mode: 'insensitive' as const } }, { nis: { contains: search } }] } : {}),
    ...(hasEnrollmentFilter ? { enrollments: { some: enrollmentFilter } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        enrollments: {
          ...(hasEnrollmentFilter ? { where: enrollmentFilter } : {}),
          include: {
            academicPeriod: { select: { id: true, name: true, semester: true, startDate: true, endDate: true } },
            class: {
              select: {
                id: true,
                name: true,
                gradeLevel: true,
                academicYear: true,
                homeroomTeacherId: true,
              },
            },
          },
          orderBy: { academicPeriod: { startDate: 'desc' } },
        },
      },
      orderBy: { fullName: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.student.count({ where }),
  ]);
  res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

studentRouter.post('/', authorize('ADMIN'), requireCsrf, validate(studentSchema), async (req, res) => {
  const data = req.body as z.infer<typeof studentSchema>;
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: data.classId, schoolUnitId: req.auth!.schoolUnitId },
  });
  if (!schoolClass) throw new HttpError(400, 'INVALID_CLASS', 'Kelas tidak tersedia pada unit sekolah Anda.');
  const period = await prisma.academicPeriod.findFirst({
    where: { id: data.academicPeriodId, schoolUnitId: req.auth!.schoolUnitId },
  });
  if (!period || period.name !== schoolClass.academicYear) {
    throw new HttpError(400, 'INVALID_PERIOD', 'Semester tidak sesuai dengan tahun ajaran kelas.');
  }
  const prefix = nisPrefixForClass(schoolClass);

  const student = await prisma.$transaction(async (tx) => {
    // Kunci unit sekolah agar dua admin tidak memperoleh NIS yang sama.
    await tx.$queryRaw(Prisma.sql`
      SELECT "id" FROM "SchoolUnit" WHERE "id" = ${req.auth!.schoolUnitId} FOR UPDATE
    `);
    const nis = await nextNis(tx, req.auth!.schoolUnitId, prefix);
    return tx.student.create({
      data: {
        nis,
        fullName: data.fullName,
        gender: data.gender,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        parentName: data.parentName || null,
        parentPhone: data.parentPhone || null,
        schoolUnitId: req.auth!.schoolUnitId,
        enrollments: { create: { classId: data.classId, academicPeriodId: period.id } },
      },
      include: { enrollments: { include: { class: true } } },
    });
  });
  await audit(req, 'CREATE', 'Student', student.id, { nis: student.nis });
  res.status(201).json(student);
});

studentRouter.patch('/:id', authorize('ADMIN'), requireCsrf, validate(studentSchema.partial()), async (req, res) => {
  const existing = await prisma.student.findFirst({ where: { id: String(req.params.id), schoolUnitId: req.auth!.schoolUnitId } });
  if (!existing) throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Siswa tidak ditemukan.');
  const { classId, academicPeriodId, birthDate, ...fields } = req.body as z.infer<typeof studentSchema>;
  if (Boolean(classId) !== Boolean(academicPeriodId)) {
    throw new HttpError(400, 'INVALID_ENROLLMENT', 'Kelas dan semester harus dipilih bersama.');
  }
  const targetClass = classId
    ? await prisma.schoolClass.findFirst({ where: { id: classId, schoolUnitId: req.auth!.schoolUnitId } })
    : null;
  if (classId && !targetClass) throw new HttpError(400, 'INVALID_CLASS', 'Kelas tidak valid.');
  const targetPeriod = academicPeriodId
    ? await prisma.academicPeriod.findFirst({ where: { id: academicPeriodId, schoolUnitId: req.auth!.schoolUnitId } })
    : null;
  if (academicPeriodId && (!targetPeriod || targetPeriod.name !== targetClass?.academicYear)) {
    throw new HttpError(400, 'INVALID_PERIOD', 'Semester tidak sesuai dengan tahun ajaran kelas.');
  }
  const student = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({
      where: { id: existing.id },
      data: { ...fields, ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}) },
    });
    if (classId && targetClass && targetPeriod) {
      // Ganti penempatan hanya pada semester yang sama; riwayat semester lain tetap disimpan.
      await tx.classEnrollment.deleteMany({
        where: { studentId: existing.id, academicPeriodId: targetPeriod.id },
      });
      await tx.classEnrollment.create({ data: { studentId: existing.id, classId, academicPeriodId: targetPeriod.id } });
    }
    return updated;
  });
  await audit(req, 'UPDATE', 'Student', student.id);
  res.json(student);
});

studentRouter.delete('/:id', authorize('ADMIN'), requireCsrf, validate(deactivationSchema), async (req, res) => {
  const existing = await prisma.student.findFirst({ where: { id: String(req.params.id), schoolUnitId: req.auth!.schoolUnitId, isActive: true } });
  if (!existing) throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Siswa tidak ditemukan.');
  const { reason } = req.body as z.infer<typeof deactivationSchema>;
  await prisma.student.update({ where: { id: existing.id }, data: { isActive: false, deactivationReason: reason, deactivatedAt: new Date() } });
  await audit(req, 'DEACTIVATE', 'Student', existing.id, { nis: existing.nis });
  res.status(204).send();
});
