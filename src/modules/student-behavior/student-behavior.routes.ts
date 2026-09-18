import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../common/audit.js';
import { HttpError } from '../../common/http-error.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { authenticate, requireCsrf } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { dateInTimezone } from '../teacher-schedule/schedule-time.js';

export const studentBehaviorRouter = Router();
studentBehaviorRouter.use(authenticate);

const selectionSchema = z.object({
  classId: z.string().min(1),
  academicPeriodId: z.string().min(1),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
});

const saveSchema = z.object({
  classId: z.string().min(1),
  academicPeriodId: z.string().min(1),
  studentId: z.string().min(1),
  date: z.iso.date(),
  rating: z.enum(['EXCELLENT', 'GOOD', 'NEEDS_ATTENTION']),
  notes: z.string().trim().min(5).max(500),
});

async function behaviorScope(classId: string, academicPeriodId: string, schoolUnitId: string, teacherId?: string) {
  const [schoolClass, period] = await Promise.all([
    prisma.schoolClass.findFirst({ where: { id: classId, schoolUnitId }, select: { id: true, name: true, academicYear: true, homeroomTeacherId: true } }),
    prisma.academicPeriod.findFirst({ where: { id: academicPeriodId, schoolUnitId }, select: { id: true, name: true, semester: true, startDate: true, endDate: true } }),
  ]);
  if (!schoolClass || !period || schoolClass.academicYear !== period.name) {
    throw new HttpError(400, 'INVALID_CLASS_PERIOD', 'Kelas dan semester tidak sesuai pada unit sekolah ini.');
  }
  const isHomeroom = Boolean(teacherId && schoolClass.homeroomTeacherId === teacherId);
  if (teacherId && !isHomeroom) {
    const assigned = await prisma.teachingAssignment.count({ where: { teacherId, classId, academicPeriodId } });
    if (!assigned) throw new HttpError(403, 'NOT_ASSIGNED', 'Anda tidak dapat mengakses catatan perilaku kelas ini.');
  }
  return { schoolClass, period, isHomeroom };
}

studentBehaviorRouter.get('/', async (req, res) => {
  const parsed = selectionSchema.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Filter perilaku siswa tidak valid.', parsed.error.flatten());
  const { classId, academicPeriodId } = parsed.data;
  const month = parsed.data.month ?? dateInTimezone(new Date(), env.SCHOOL_TIMEZONE).slice(0, 7);
  const teacherId = req.auth!.role === 'TEACHER' ? req.auth!.userId : undefined;
  const scope = await behaviorScope(classId, academicPeriodId, req.auth!.schoolUnitId, teacherId);
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const [year, monthNumber] = month.split('-').map(Number);
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const [students, records] = await Promise.all([
    prisma.student.findMany({
      where: { schoolUnitId: req.auth!.schoolUnitId, isActive: true, enrollments: { some: { classId, academicPeriodId } } },
      select: { id: true, nis: true, fullName: true }, orderBy: { fullName: 'asc' },
    }),
    prisma.studentBehavior.findMany({
      where: {
        schoolUnitId: req.auth!.schoolUnitId, classId, academicPeriodId, date: { gte: start, lt: end },
        student: { isActive: true },
        ...(teacherId && !scope.isHomeroom ? { recordedById: teacherId } : {}),
      },
      select: { id: true, studentId: true, date: true, rating: true, notes: true, recordedById: true, recordedBy: { select: { fullName: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);
  res.json({ schoolClass: scope.schoolClass, period: scope.period, isHomeroom: scope.isHomeroom, todayDate: dateInTimezone(new Date(), env.SCHOOL_TIMEZONE), month, students, records });
});

studentBehaviorRouter.put('/records', requireCsrf, validate(saveSchema), async (req, res) => {
  const data = req.body as z.infer<typeof saveSchema>;
  const teacherId = req.auth!.role === 'TEACHER' ? req.auth!.userId : undefined;
  const scope = await behaviorScope(data.classId, data.academicPeriodId, req.auth!.schoolUnitId, teacherId);
  if (data.date < scope.period.startDate.toISOString().slice(0, 10) || data.date > scope.period.endDate.toISOString().slice(0, 10)) {
    throw new HttpError(400, 'DATE_OUTSIDE_PERIOD', 'Tanggal catatan berada di luar semester yang dipilih.');
  }
  const student = await prisma.student.findFirst({
    where: { id: data.studentId, schoolUnitId: req.auth!.schoolUnitId, isActive: true, enrollments: { some: { classId: data.classId, academicPeriodId: data.academicPeriodId } } },
    select: { id: true },
  });
  if (!student) throw new HttpError(400, 'INVALID_STUDENT', 'Siswa bukan anggota aktif kelas dan semester ini.');
  const date = new Date(`${data.date}T00:00:00.000Z`);
  const existing = await prisma.studentBehavior.findUnique({
    where: { studentId_date_recordedById: { studentId: data.studentId, date, recordedById: req.auth!.userId } },
    select: { classId: true, academicPeriodId: true },
  });
  if (existing && (existing.classId !== data.classId || existing.academicPeriodId !== data.academicPeriodId)) {
    throw new HttpError(409, 'BEHAVIOR_CONFLICT', 'Siswa sudah memiliki catatan Anda pada kelas atau semester lain di tanggal ini.');
  }
  const record = await prisma.studentBehavior.upsert({
    where: { studentId_date_recordedById: { studentId: data.studentId, date, recordedById: req.auth!.userId } },
    create: { studentId: data.studentId, date, rating: data.rating, notes: data.notes, classId: data.classId, academicPeriodId: data.academicPeriodId, schoolUnitId: req.auth!.schoolUnitId, recordedById: req.auth!.userId },
    update: { rating: data.rating, notes: data.notes },
    select: { id: true },
  });
  await audit(req, 'UPSERT_STUDENT_BEHAVIOR', 'StudentBehavior', record.id, { classId: data.classId, academicPeriodId: data.academicPeriodId, studentId: data.studentId, date: data.date });
  res.json({ saved: true });
});
