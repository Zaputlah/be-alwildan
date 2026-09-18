import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../common/audit.js';
import { HttpError } from '../../common/http-error.js';
import { prisma } from '../../config/prisma.js';
import { authenticate, authorize, requireCsrf } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { nisPrefixForClass } from '../students/nis.js';

export const referenceRouter = Router();
referenceRouter.use(authenticate);

referenceRouter.get('/', async (req, res) => {
  const schoolUnitId = req.auth!.schoolUnitId;
  const isTeacher = req.auth!.role === 'TEACHER';
  const teacherId = req.auth!.userId;
  const classAccess = isTeacher
    ? { OR: [{ teaching: { some: { teacherId } } }, { homeroomTeacherId: teacherId }] }
    : {};
  const subjectAccess = isTeacher ? { teaching: { some: { teacherId } } } : {};
  const [classes, subjects, periods, teachers, teachingAssignments, homeroomClasses] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolUnitId, ...classAccess },
      select: { id: true, name: true, gradeLevel: true, academicYear: true, homeroomTeacherId: true },
      orderBy: [{ academicYear: 'desc' }, { gradeLevel: 'asc' }, { name: 'asc' }],
    }),
    prisma.subject.findMany({ where: subjectAccess, orderBy: { name: 'asc' } }),
    prisma.academicPeriod.findMany({ where: { schoolUnitId }, orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }] }),
    prisma.user.findMany({
      where: { schoolUnitId, role: 'TEACHER', isActive: true },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    }),
    isTeacher
      ? prisma.teachingAssignment.findMany({
          where: { teacherId },
          select: { id: true, teacherId: true, classId: true, subjectId: true, academicPeriodId: true, teacher: { select: { fullName: true } }, class: { select: { name: true } }, subject: { select: { name: true } } },
        })
      : prisma.teachingAssignment.findMany({
          where: { class: { schoolUnitId } },
          select: { id: true, teacherId: true, classId: true, subjectId: true, academicPeriodId: true, teacher: { select: { fullName: true } }, class: { select: { name: true } }, subject: { select: { name: true } } },
        }),
    isTeacher
      ? prisma.schoolClass.findMany({ where: { schoolUnitId, homeroomTeacherId: teacherId }, select: { id: true } })
      : Promise.resolve([]),
  ]);
  res.json({
    classes,
    subjects,
    periods,
    teachers,
    teachingAssignments,
    access: {
      manageablePairs: teachingAssignments,
      homeroomClassIds: homeroomClasses.map((item) => item.id),
    },
  });
});

const classSchema = z.object({
  name: z.string().trim().min(1).max(30),
  gradeLevel: z.number().int().min(1).max(12),
  academicYear: z.string().trim().min(4).max(20),
  homeroomTeacherId: z.string().min(1).nullable().optional(),
});

async function validateClassRelations(schoolUnitId: string, academicYear?: string, homeroomTeacherId?: string | null) {
  if (academicYear) {
    const period = await prisma.academicPeriod.findFirst({ where: { name: academicYear, schoolUnitId } });
    if (!period) throw new HttpError(400, 'INVALID_YEAR', 'Tahun ajaran tidak tersedia pada unit sekolah Anda.');
  }
  if (homeroomTeacherId) {
    const teacher = await prisma.user.findFirst({ where: { id: homeroomTeacherId, schoolUnitId, role: 'TEACHER', isActive: true } });
    if (!teacher) throw new HttpError(400, 'INVALID_HOMEROOM_TEACHER', 'Wali kelas harus merupakan Guru aktif pada unit sekolah ini.');
  }
}

referenceRouter.post('/classes', authorize('ADMIN'), requireCsrf, validate(classSchema), async (req, res) => {
  await validateClassRelations(req.auth!.schoolUnitId, req.body.academicYear, req.body.homeroomTeacherId);
  nisPrefixForClass({ name: req.body.name, gradeLevel: req.body.gradeLevel });
  const schoolClass = await prisma.schoolClass.create({
    data: { ...req.body, schoolUnitId: req.auth!.schoolUnitId },
  });
  await audit(req, 'CREATE', 'SchoolClass', schoolClass.id, { name: schoolClass.name });
  res.status(201).json(schoolClass);
});

referenceRouter.patch('/classes/:id', authorize('ADMIN'), requireCsrf, validate(classSchema.partial()), async (req, res) => {
  const existing = await prisma.schoolClass.findFirst({
    where: { id: String(req.params.id), schoolUnitId: req.auth!.schoolUnitId },
  });
  if (!existing) throw new HttpError(404, 'CLASS_NOT_FOUND', 'Kelas tidak ditemukan.');
  await validateClassRelations(req.auth!.schoolUnitId, req.body.academicYear, req.body.homeroomTeacherId);
  nisPrefixForClass({ name: req.body.name ?? existing.name, gradeLevel: req.body.gradeLevel ?? existing.gradeLevel });
  const identityChanged = (req.body.academicYear && req.body.academicYear !== existing.academicYear)
    || (req.body.name && req.body.name !== existing.name)
    || (req.body.gradeLevel && req.body.gradeLevel !== existing.gradeLevel);
  if (identityChanged) {
    const usage = await prisma.schoolClass.findUnique({
      where: { id: existing.id },
      select: { _count: { select: { enrollments: true, teaching: true, assessments: true } } },
    });
    if (usage && usage._count.enrollments + usage._count.teaching + usage._count.assessments > 0) {
      throw new HttpError(409, 'CLASS_IN_USE', 'Nama, tingkat, dan tahun ajaran kelas yang sudah dipakai tidak dapat diubah.');
    }
  }
  const schoolClass = await prisma.schoolClass.update({ where: { id: existing.id }, data: req.body });
  await audit(req, 'UPDATE', 'SchoolClass', schoolClass.id, { name: schoolClass.name });
  res.json(schoolClass);
});

referenceRouter.delete('/classes/:id', authorize('ADMIN'), requireCsrf, async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.schoolClass.findFirst({
    where: { id, schoolUnitId: req.auth!.schoolUnitId },
    include: { _count: { select: { enrollments: true, teaching: true, assessments: true } } },
  });
  if (!existing) throw new HttpError(404, 'CLASS_NOT_FOUND', 'Kelas tidak ditemukan.');
  const usage = existing._count.enrollments + existing._count.teaching + existing._count.assessments;
  if (usage > 0) throw new HttpError(409, 'CLASS_IN_USE', 'Kelas masih memiliki siswa, penugasan, atau assessment sehingga tidak dapat dihapus.');
  await prisma.schoolClass.delete({ where: { id } });
  await audit(req, 'DELETE', 'SchoolClass', id, { name: existing.name });
  res.status(204).send();
});

const subjectSchema = z.object({
  code: z.string().trim().min(2).max(20).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(100),
  passingGrade: z.number().min(0).max(100),
});

referenceRouter.post('/subjects', authorize('ADMIN'), requireCsrf, validate(subjectSchema), async (req, res) => {
  const subject = await prisma.subject.create({ data: req.body });
  await audit(req, 'CREATE', 'Subject', subject.id, { code: subject.code, name: subject.name });
  res.status(201).json(subject);
});

referenceRouter.patch('/subjects/:id', authorize('ADMIN'), requireCsrf, validate(subjectSchema.partial()), async (req, res) => {
  const existing = await prisma.subject.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) throw new HttpError(404, 'SUBJECT_NOT_FOUND', 'Mata pelajaran tidak ditemukan.');
  const subject = await prisma.subject.update({ where: { id: existing.id }, data: req.body });
  await audit(req, 'UPDATE', 'Subject', subject.id, { code: subject.code, name: subject.name });
  res.json(subject);
});

referenceRouter.delete('/subjects/:id', authorize('ADMIN'), requireCsrf, async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.subject.findUnique({
    where: { id }, include: { _count: { select: { teaching: true, assessments: true } } },
  });
  if (!existing) throw new HttpError(404, 'SUBJECT_NOT_FOUND', 'Mata pelajaran tidak ditemukan.');
  if (existing._count.teaching + existing._count.assessments > 0) {
    throw new HttpError(409, 'SUBJECT_IN_USE', 'Mata pelajaran masih digunakan oleh penugasan atau assessment sehingga tidak dapat dihapus.');
  }
  await prisma.subject.delete({ where: { id } });
  await audit(req, 'DELETE', 'Subject', id, { code: existing.code, name: existing.name });
  res.status(204).send();
});

const assignmentSchema = z.object({
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  academicPeriodId: z.string().min(1),
});

referenceRouter.post('/teaching-assignments', authorize('ADMIN'), requireCsrf, validate(assignmentSchema), async (req, res) => {
  const [teacher, schoolClass, subject, period] = await Promise.all([
    prisma.user.findFirst({ where: { id: req.body.teacherId, schoolUnitId: req.auth!.schoolUnitId, role: 'TEACHER', isActive: true } }),
    prisma.schoolClass.findFirst({ where: { id: req.body.classId, schoolUnitId: req.auth!.schoolUnitId } }),
    prisma.subject.findUnique({ where: { id: req.body.subjectId } }),
    prisma.academicPeriod.findFirst({ where: { id: req.body.academicPeriodId, schoolUnitId: req.auth!.schoolUnitId } }),
  ]);
  if (!teacher || !schoolClass || !subject || !period || period.name !== schoolClass.academicYear) {
    throw new HttpError(400, 'INVALID_ASSIGNMENT', 'Guru, kelas, pelajaran, atau semester tidak valid.');
  }
  const assignment = await prisma.teachingAssignment.create({ data: req.body });
  await audit(req, 'CREATE', 'TeachingAssignment', assignment.id, { teacherId: teacher.id, classId: schoolClass.id, subjectId: subject.id });
  res.status(201).json(assignment);
});

referenceRouter.delete('/teaching-assignments/:id', authorize('ADMIN'), requireCsrf, async (req, res) => {
  const id = String(req.params.id);
  const assignment = await prisma.teachingAssignment.findFirst({ where: { id, class: { schoolUnitId: req.auth!.schoolUnitId } } });
  if (!assignment) throw new HttpError(404, 'ASSIGNMENT_NOT_FOUND', 'Penugasan guru tidak ditemukan.');
  const activeAssessment = await prisma.assessment.count({
    where: { teacherId: assignment.teacherId, schoolClassId: assignment.classId, subjectId: assignment.subjectId, academicPeriodId: assignment.academicPeriodId, status: 'DRAFT' },
  });
  if (activeAssessment > 0) throw new HttpError(409, 'ASSIGNMENT_HAS_DRAFT', 'Selesaikan atau hapus assessment draft sebelum mencabut penugasan.');
  await prisma.teachingAssignment.delete({ where: { id } });
  await audit(req, 'DELETE', 'TeachingAssignment', id);
  res.status(204).send();
});
