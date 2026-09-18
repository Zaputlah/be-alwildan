import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../common/audit.js';
import { HttpError } from '../../common/http-error.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { authenticate, authorize, requireCsrf } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { dateInTimezone } from '../teacher-schedule/schedule-time.js';

export const studentAttendanceRouter = Router();
studentAttendanceRouter.use(authenticate);

const selectionSchema = z.object({
  classId: z.string().min(1),
  academicPeriodId: z.string().min(1),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
});

const saveSchema = z.object({
  classId: z.string().min(1),
  academicPeriodId: z.string().min(1),
  date: z.iso.date(),
  records: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(['PRESENT', 'LATE', 'SICK', 'LEAVE', 'ABSENT']),
    notes: z.string().trim().max(300).nullable().optional(),
  })).min(1).max(100),
});

const markLateSchema = z.object({
  classId: z.string().min(1),
  academicPeriodId: z.string().min(1),
  date: z.iso.date(),
});

async function attendanceScope(classId: string, academicPeriodId: string, schoolUnitId: string, teacherId?: string) {
  const [schoolClass, period] = await Promise.all([
    prisma.schoolClass.findFirst({ where: { id: classId, schoolUnitId }, select: { id: true, name: true, academicYear: true, homeroomTeacherId: true } }),
    prisma.academicPeriod.findFirst({ where: { id: academicPeriodId, schoolUnitId }, select: { id: true, name: true, semester: true, startDate: true, endDate: true } }),
  ]);
  if (!schoolClass || !period || schoolClass.academicYear !== period.name) {
    throw new HttpError(400, 'INVALID_CLASS_PERIOD', 'Kelas dan semester tidak sesuai pada unit sekolah ini.');
  }
  if (teacherId && schoolClass.homeroomTeacherId !== teacherId) {
    const assigned = await prisma.teachingAssignment.count({ where: { teacherId, classId, academicPeriodId } });
    if (!assigned) throw new HttpError(403, 'NOT_ASSIGNED', 'Anda tidak dapat melihat absensi kelas ini.');
  }
  return { schoolClass, period, isHomeroom: Boolean(teacherId && schoolClass.homeroomTeacherId === teacherId) };
}

studentAttendanceRouter.get('/', async (req, res) => {
  const parsed = selectionSchema.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Filter absensi siswa tidak valid.', parsed.error.flatten());
  const { classId, academicPeriodId } = parsed.data;
  const month = parsed.data.month ?? dateInTimezone(new Date(), env.SCHOOL_TIMEZONE).slice(0, 7);
  const scope = await attendanceScope(classId, academicPeriodId, req.auth!.schoolUnitId, req.auth!.role === 'TEACHER' ? req.auth!.userId : undefined);
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const [year, monthNumber] = month.split('-').map(Number);
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const [students, records] = await Promise.all([
    prisma.student.findMany({
      where: { schoolUnitId: req.auth!.schoolUnitId, isActive: true, enrollments: { some: { classId, academicPeriodId } } },
      select: { id: true, nis: true, fullName: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.studentAttendance.findMany({
      where: { schoolUnitId: req.auth!.schoolUnitId, classId, academicPeriodId, date: { gte: start, lt: end }, student: { isActive: true } },
      select: { id: true, studentId: true, date: true, status: true, lateArrivalAt: true, notes: true },
      orderBy: [{ date: 'desc' }, { student: { fullName: 'asc' } }],
    }),
  ]);
  res.json({ schoolClass: scope.schoolClass, period: scope.period, isHomeroom: scope.isHomeroom, canEdit: true, todayDate: dateInTimezone(new Date(), env.SCHOOL_TIMEZONE), timezone: env.SCHOOL_TIMEZONE, month, students, records });
});

studentAttendanceRouter.put('/records', authorize('ADMIN', 'TEACHER'), requireCsrf, validate(saveSchema), async (req, res) => {
  const data = req.body as z.infer<typeof saveSchema>;
  const scope = await attendanceScope(data.classId, data.academicPeriodId, req.auth!.schoolUnitId, req.auth!.role === 'TEACHER' ? req.auth!.userId : undefined);
  const date = new Date(`${data.date}T00:00:00.000Z`);
  if (data.date < scope.period.startDate.toISOString().slice(0, 10) || data.date > scope.period.endDate.toISOString().slice(0, 10)) {
    throw new HttpError(400, 'DATE_OUTSIDE_PERIOD', 'Tanggal absensi berada di luar semester yang dipilih.');
  }
  const studentIds = data.records.map((item) => item.studentId);
  if (new Set(studentIds).size !== studentIds.length) throw new HttpError(400, 'DUPLICATE_STUDENT', 'Siswa tidak boleh dicatat dua kali pada tanggal yang sama.');
  const enrolled = await prisma.student.count({
    where: { id: { in: studentIds }, schoolUnitId: req.auth!.schoolUnitId, isActive: true, enrollments: { some: { classId: data.classId, academicPeriodId: data.academicPeriodId } } },
  });
  if (enrolled !== studentIds.length) throw new HttpError(400, 'INVALID_STUDENT', 'Ada siswa yang bukan anggota aktif kelas dan semester ini.');
  const existing = await prisma.studentAttendance.findMany({ where: { studentId: { in: studentIds }, date }, select: { studentId: true, classId: true, academicPeriodId: true, status: true, lateArrivalAt: true } });
  if (existing.some((item) => item.classId !== data.classId || item.academicPeriodId !== data.academicPeriodId)) {
    throw new HttpError(409, 'ATTENDANCE_CONFLICT', 'Ada siswa yang sudah memiliki absensi pada kelas atau semester lain di tanggal ini.');
  }
  if (req.auth!.role === 'TEACHER' && existing.length) {
    throw new HttpError(409, 'ATTENDANCE_LOCKED', 'Absensi siswa yang sudah disimpan terkunci. Gunakan Catat terlambat untuk siswa Alpa yang datang hari ini, atau minta koreksi Admin.');
  }
  if (req.auth!.role === 'TEACHER') {
    const now = new Date();
    const isToday = data.date === dateInTimezone(now, env.SCHOOL_TIMEZONE);
    await prisma.studentAttendance.createMany({
      data: data.records.map((item) => ({
        studentId: item.studentId, date, status: item.status, notes: item.notes || null,
        lateArrivalAt: item.status === 'LATE' && isToday ? now : null,
        classId: data.classId, academicPeriodId: data.academicPeriodId,
        schoolUnitId: req.auth!.schoolUnitId, recordedById: req.auth!.userId,
      })),
    });
  } else {
    const existingByStudent = new Map(existing.map((item) => [item.studentId, item]));
    await prisma.$transaction(data.records.map((item) => prisma.studentAttendance.upsert({
      where: { studentId_date: { studentId: item.studentId, date } },
      create: {
        studentId: item.studentId, date, status: item.status, notes: item.notes || null,
        classId: data.classId, academicPeriodId: data.academicPeriodId,
        schoolUnitId: req.auth!.schoolUnitId, recordedById: req.auth!.userId,
      },
      update: {
        status: item.status, notes: item.notes || null, recordedById: req.auth!.userId,
        lateArrivalAt: item.status === 'LATE' ? existingByStudent.get(item.studentId)?.lateArrivalAt ?? null : null,
      },
    })));
  }
  await audit(req, req.auth!.role === 'TEACHER' ? 'CREATE_STUDENT_ATTENDANCE' : 'UPSERT_STUDENT_ATTENDANCE', 'StudentAttendance', undefined, { classId: data.classId, academicPeriodId: data.academicPeriodId, date: data.date, count: data.records.length });
  res.json({ saved: data.records.length });
});

studentAttendanceRouter.patch('/records/:studentId/late', authorize('TEACHER'), requireCsrf, validate(markLateSchema), async (req, res) => {
  const data = req.body as z.infer<typeof markLateSchema>;
  await attendanceScope(data.classId, data.academicPeriodId, req.auth!.schoolUnitId, req.auth!.userId);
  const now = new Date();
  if (data.date !== dateInTimezone(now, env.SCHOOL_TIMEZONE)) {
    throw new HttpError(409, 'LATE_ONLY_TODAY', 'Siswa Alpa hanya dapat ditandai datang terlambat pada hari yang sama. Hubungi Admin untuk koreksi tanggal lain.');
  }
  const date = new Date(`${data.date}T00:00:00.000Z`);
  const studentId = String(req.params.studentId);
  const existing = await prisma.studentAttendance.findFirst({
    where: { studentId, date, classId: data.classId, academicPeriodId: data.academicPeriodId, schoolUnitId: req.auth!.schoolUnitId },
    select: { id: true, status: true, notes: true },
  });
  if (!existing) throw new HttpError(404, 'ATTENDANCE_NOT_FOUND', 'Absensi siswa belum dicatat pada tanggal ini.');
  if (existing.status !== 'ABSENT') throw new HttpError(409, 'ATTENDANCE_LOCKED', 'Hanya siswa berstatus Alpa yang dapat ditandai datang terlambat.');
  const updated = await prisma.studentAttendance.updateMany({
    where: { id: existing.id, status: 'ABSENT' },
    data: { status: 'LATE', lateArrivalAt: now, notes: null, recordedById: req.auth!.userId },
  });
  if (!updated.count) throw new HttpError(409, 'ATTENDANCE_LOCKED', 'Absensi sudah berubah. Muat ulang halaman sebelum mencoba lagi.');
  await audit(req, 'MARK_STUDENT_LATE', 'StudentAttendance', existing.id, { studentId, classId: data.classId, academicPeriodId: data.academicPeriodId, date: data.date, previousStatus: existing.status, previousNotes: existing.notes, lateArrivalAt: now.toISOString() });
  res.json({ updated: true, lateArrivalAt: now.toISOString() });
});
