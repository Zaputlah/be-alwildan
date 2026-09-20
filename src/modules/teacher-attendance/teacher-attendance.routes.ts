import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../common/audit.js';
import { HttpError } from '../../common/http-error.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { authenticate, authorize, requireCsrf } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { isBeforeSchoolTime, minutesFromClock, schoolMinutes } from './attendance-time.js';
import { attendanceRemarks } from './attendance-remarks.js';
import { countsAsFinalAttendance } from './attendance-approval.js';
import { evidenceData, uploadEvidence } from './evidence-upload.js';

export const teacherAttendanceRouter = Router();
teacherAttendanceRouter.use(authenticate);

function schoolDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.SCHOOL_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function isEarlyCheckout(checkOutAt: Date | null) {
  return isBeforeSchoolTime(checkOutAt, env.SCHOOL_TIMEZONE, env.EARLY_CHECKOUT_BEFORE);
}

const locationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracyMeters: z.number().finite().nonnegative().max(100_000).optional(),
});

const clockSchema = z.object({ location: locationSchema.optional() });

const listSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  teacherId: z.string().optional(),
});

teacherAttendanceRouter.get('/', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Filter absensi tidak valid.', parsed.error.flatten());
  const currentMonth = schoolDate().slice(0, 7);
  const month = parsed.data.month ?? currentMonth;
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const isCentralAdmin = req.auth!.role === 'ADMIN' && req.auth!.adminScope === 'CENTRAL';
  const teacherId = req.auth!.role === 'TEACHER' ? req.auth!.userId : parsed.data.teacherId;
  if (teacherId) {
    const teacher = await prisma.user.findFirst({ where: { id: teacherId, ...(isCentralAdmin ? {} : { schoolUnitId: req.auth!.schoolUnitId }), role: 'TEACHER' } });
    if (!teacher) throw new HttpError(400, 'INVALID_TEACHER', 'Guru tidak tersedia pada unit sekolah Anda.');
  }
  const records = await prisma.teacherAttendance.findMany({
    where: {
      ...(isCentralAdmin ? {} : { schoolUnitId: req.auth!.schoolUnitId }),
      date: { gte: start, lt: end },
      ...(teacherId ? { teacherId } : {}),
    },
    include: {
      teacher: { select: { id: true, fullName: true, email: true } },
      evidence: { select: { id: true, fileName: true, mimeType: true, size: true, uploadedAt: true } },
    },
    orderBy: [{ date: 'desc' }, { teacher: { fullName: 'asc' } }],
  });
  const counts = { PRESENT: 0, LATE: 0, SICK: 0, LEAVE: 0, DUTY: 0, ABSENT: 0 };
  for (const record of records) {
    if (countsAsFinalAttendance(record.approvalStatus)) counts[record.status] += 1;
  }
  const today = dateOnly(schoolDate());
  const todayRecord = teacherId
    ? await prisma.teacherAttendance.findUnique({
        where: { teacherId_date: { teacherId, date: today } },
        include: { evidence: { select: { id: true, fileName: true, mimeType: true, size: true, uploadedAt: true } } },
      })
    : null;
  res.json({
    records: records.map((record) => ({
      ...record,
      remarks: attendanceRemarks(record, env.SCHOOL_TIMEZONE, env.LATE_AFTER, env.EARLY_CHECKOUT_BEFORE),
    })),
    summary: {
      ...counts,
      pending: records.filter((record) => record.approvalStatus === 'PENDING_BRANCH' || record.approvalStatus === 'PENDING_CENTRAL').length,
      rejected: records.filter((record) => record.approvalStatus === 'REJECTED').length,
      earlyCheckout: records.filter((record) => record.isEarlyCheckout).length,
      total: records.length,
    },
    today: todayRecord ? {
      ...todayRecord,
      remarks: attendanceRemarks(todayRecord, env.SCHOOL_TIMEZONE, env.LATE_AFTER, env.EARLY_CHECKOUT_BEFORE),
    } : null,
    month,
    timezone: env.SCHOOL_TIMEZONE,
    lateAfter: env.LATE_AFTER,
    earlyCheckoutBefore: env.EARLY_CHECKOUT_BEFORE,
  });
});

teacherAttendanceRouter.post('/check-in', authorize('TEACHER'), requireCsrf, validate(clockSchema), async (req, res) => {
  const now = new Date();
  const date = dateOnly(schoolDate(now));
  const status = schoolMinutes(now, env.SCHOOL_TIMEZONE) > minutesFromClock(env.LATE_AFTER) ? 'LATE' : 'PRESENT';
  const location = req.body.location as z.infer<typeof locationSchema> | undefined;
  const locationData = location ? {
    checkInLatitude: location.latitude,
    checkInLongitude: location.longitude,
    checkInAccuracyMeters: location.accuracyMeters ?? null,
  } : {};
  const existing = await prisma.teacherAttendance.findUnique({
    where: { teacherId_date: { teacherId: req.auth!.userId, date } },
  });
  if (existing?.checkInAt) throw new HttpError(409, 'ALREADY_CHECKED_IN', 'Anda sudah melakukan check-in hari ini.');
  if (existing && existing.approvalStatus !== 'REJECTED' && !['PRESENT', 'LATE'].includes(existing.status)) {
    throw new HttpError(409, 'ATTENDANCE_ALREADY_RECORDED', `Absensi hari ini sudah tercatat sebagai ${existing.status}.`);
  }
  const record = existing
    ? await prisma.$transaction(async (tx) => {
        if (existing.approvalStatus === 'REJECTED') {
          await tx.teacherAttendanceEvidence.deleteMany({ where: { attendanceId: existing.id } });
        }
        return tx.teacherAttendance.update({ where: { id: existing.id }, data: {
          checkInAt: now, status, ...locationData,
          ...(existing.approvalStatus === 'REJECTED' ? { approvalStatus: null, reviewedAt: null, reviewedById: null, reviewNotes: null, notes: null } : {}),
        } });
      })
    : await prisma.teacherAttendance.create({ data: { date, checkInAt: now, status, teacherId: req.auth!.userId, schoolUnitId: req.auth!.schoolUnitId, ...locationData } });
  await audit(req, 'CHECK_IN', 'TeacherAttendance', record.id, { status: record.status });
  res.status(existing ? 200 : 201).json(record);
});

teacherAttendanceRouter.post('/check-out', authorize('TEACHER'), requireCsrf, validate(clockSchema), async (req, res) => {
  const now = new Date();
  const date = dateOnly(schoolDate(now));
  const existing = await prisma.teacherAttendance.findUnique({
    where: { teacherId_date: { teacherId: req.auth!.userId, date } },
  });
  if (!existing?.checkInAt) throw new HttpError(409, 'NOT_CHECKED_IN', 'Lakukan check-in terlebih dahulu.');
  if (existing.checkOutAt) throw new HttpError(409, 'ALREADY_CHECKED_OUT', 'Anda sudah melakukan check-out hari ini.');
  const location = req.body.location as z.infer<typeof locationSchema> | undefined;
  const record = await prisma.teacherAttendance.update({
    where: { id: existing.id },
    data: {
      checkOutAt: now,
      isEarlyCheckout: isEarlyCheckout(now),
      ...(location ? {
        checkOutLatitude: location.latitude,
        checkOutLongitude: location.longitude,
        checkOutAccuracyMeters: location.accuracyMeters ?? null,
      } : {}),
    },
  });
  await audit(req, 'CHECK_OUT', 'TeacherAttendance', record.id, { isEarlyCheckout: record.isEarlyCheckout });
  res.json(record);
});

const teacherRequestSchema = z.object({
  date: z.iso.date(),
  status: z.enum(['SICK', 'LEAVE', 'DUTY']),
  notes: z.string().trim().min(5).max(300),
});

teacherAttendanceRouter.post('/requests', authorize('TEACHER'), requireCsrf, uploadEvidence, async (req, res) => {
  const parsed = teacherRequestSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Data sakit/izin/tugas tidak valid.', parsed.error.flatten());
  const evidence = evidenceData(req.file);
  const date = dateOnly(parsed.data.date);
  const existing = await prisma.teacherAttendance.findUnique({
    where: { teacherId_date: { teacherId: req.auth!.userId, date } },
  });
  if (existing && existing.approvalStatus !== 'REJECTED') {
    throw new HttpError(409, 'ATTENDANCE_ALREADY_RECORDED', 'Absensi tanggal tersebut sudah tercatat. Hubungi Admin untuk koreksi.');
  }
  const record = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.teacherAttendance.update({
        where: { id: existing.id },
        data: {
          status: parsed.data.status, notes: parsed.data.notes, approvalStatus: 'PENDING_BRANCH',
          reviewedAt: null, reviewedById: null, reviewNotes: null,
          branchReviewedAt: null, branchReviewedById: null, branchReviewNotes: null,
          centralReviewedAt: null, centralReviewedById: null, centralReviewNotes: null,
          evidence: { upsert: { create: evidence, update: { ...evidence, uploadedAt: new Date() } } },
        },
      });
      return tx.teacherAttendance.findUniqueOrThrow({
        where: { id: existing.id },
        include: { evidence: { select: { id: true, fileName: true, mimeType: true, size: true, uploadedAt: true } } },
      });
    }
    return tx.teacherAttendance.create({
      data: {
        date, status: parsed.data.status, notes: parsed.data.notes, approvalStatus: 'PENDING_BRANCH',
        teacherId: req.auth!.userId, schoolUnitId: req.auth!.schoolUnitId,
        evidence: { create: evidence },
      },
      include: { evidence: { select: { id: true, fileName: true, mimeType: true, size: true, uploadedAt: true } } },
    });
  });
  await audit(req, existing ? 'RESUBMIT' : 'REQUEST', 'TeacherAttendance', record.id, { status: record.status, hasEvidence: true });
  res.status(201).json(record);
});

const reviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().trim().max(300).optional(),
}).refine((value) => value.decision !== 'REJECTED' || !!value.notes, {
  message: 'Alasan penolakan wajib diisi.', path: ['notes'],
});

teacherAttendanceRouter.patch('/requests/:id/review', authorize('ADMIN'), requireCsrf, validate(reviewSchema), async (req, res) => {
  const { decision, notes } = req.body as z.infer<typeof reviewSchema>;
  const isCentralAdmin = req.auth!.adminScope === 'CENTRAL';
  const pendingStatus = isCentralAdmin ? 'PENDING_CENTRAL' : 'PENDING_BRANCH';
  const nextStatus = decision === 'REJECTED' ? 'REJECTED' : isCentralAdmin ? 'APPROVED' : 'PENDING_CENTRAL';
  const record = await prisma.teacherAttendance.findFirst({
    where: { id: String(req.params.id), ...(isCentralAdmin ? {} : { schoolUnitId: req.auth!.schoolUnitId }), approvalStatus: pendingStatus },
  });
  if (!record) throw new HttpError(404, 'REQUEST_NOT_PENDING', 'Pengajuan tidak ditemukan atau sudah diproses.');
  const updated = await prisma.teacherAttendance.updateMany({
    where: { id: record.id, ...(isCentralAdmin ? {} : { schoolUnitId: req.auth!.schoolUnitId }), approvalStatus: pendingStatus },
    data: {
      approvalStatus: nextStatus, reviewedAt: new Date(), reviewedById: req.auth!.userId,
      reviewNotes: notes || null,
      ...(isCentralAdmin
        ? { centralReviewedAt: new Date(), centralReviewedById: req.auth!.userId, centralReviewNotes: notes || null }
        : { branchReviewedAt: new Date(), branchReviewedById: req.auth!.userId, branchReviewNotes: notes || null }),
    },
  });
  if (!updated.count) throw new HttpError(409, 'REQUEST_ALREADY_REVIEWED', 'Pengajuan sudah diproses oleh Admin lain.');
  await audit(req, decision === 'APPROVED' ? 'APPROVE' : 'REJECT', 'TeacherAttendance', record.id, {
    teacherId: record.teacherId, status: record.status, notes: notes || null,
  });
  res.json(await prisma.teacherAttendance.findUniqueOrThrow({
    where: { id: record.id },
    include: { evidence: { select: { id: true, fileName: true, mimeType: true, size: true, uploadedAt: true } } },
  }));
});

teacherAttendanceRouter.get('/records/:id/evidence', async (req, res) => {
  const isCentralAdmin = req.auth!.role === 'ADMIN' && req.auth!.adminScope === 'CENTRAL';
  const record = await prisma.teacherAttendance.findFirst({
    where: {
      id: String(req.params.id),
      ...(isCentralAdmin ? {} : { schoolUnitId: req.auth!.schoolUnitId }),
      ...(req.auth!.role === 'TEACHER' ? { teacherId: req.auth!.userId } : {}),
    },
    include: { evidence: true },
  });
  if (!record?.evidence) throw new HttpError(404, 'EVIDENCE_NOT_FOUND', 'Bukti absensi tidak ditemukan.');
  res.setHeader('Content-Type', record.evidence.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${record.evidence.fileName}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(Buffer.from(record.evidence.content));
});

const manualRecordSchema = z.object({
  teacherId: z.string().min(1),
  date: z.iso.date(),
  status: z.enum(['PRESENT', 'LATE', 'SICK', 'LEAVE', 'DUTY', 'ABSENT']),
  checkInAt: z.iso.datetime().nullable().optional(),
  checkOutAt: z.iso.datetime().nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
});

teacherAttendanceRouter.put('/records', authorize('ADMIN'), requireCsrf, uploadEvidence, async (req, res) => {
  let input: unknown;
  try { input = JSON.parse(String(req.body.data ?? '')); }
  catch { throw new HttpError(400, 'VALIDATION_ERROR', 'Data absensi tidak valid.'); }
  const parsed = manualRecordSchema.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Data absensi tidak valid.', parsed.error.flatten());
  const values = parsed.data;
  const teacher = await prisma.user.findFirst({
    where: { id: values.teacherId, schoolUnitId: req.auth!.schoolUnitId, role: 'TEACHER', isActive: true },
  });
  if (!teacher) throw new HttpError(400, 'INVALID_TEACHER', 'Guru tidak tersedia pada unit sekolah Anda.');
  const date = dateOnly(values.date);
  const existing = await prisma.teacherAttendance.findUnique({
    where: { teacherId_date: { teacherId: teacher.id, date } },
    include: { evidence: { select: { id: true } } },
  });
  const needsEvidence = values.status === 'SICK' || values.status === 'LEAVE' || values.status === 'DUTY';
  if (req.file && !needsEvidence) {
    throw new HttpError(400, 'INVALID_EVIDENCE_STATUS', 'Bukti hanya dapat dilampirkan untuk status Sakit, Izin, atau Tugas.');
  }
  if (needsEvidence && !req.file && (!existing?.evidence || existing.status !== values.status)) {
    throw new HttpError(400, 'EVIDENCE_REQUIRED', 'Bukti sesuai status sakit, izin, atau tugas wajib dilampirkan.');
  }
  const evidence = req.file ? evidenceData(req.file) : null;
  const checkOutAt = !needsEvidence && values.checkOutAt ? new Date(values.checkOutAt) : null;
  const data = {
    status: values.status,
    approvalStatus: null,
    reviewedAt: null,
    reviewedById: null,
    reviewNotes: null,
    checkInAt: !needsEvidence && values.checkInAt ? new Date(values.checkInAt) : null,
    checkOutAt,
    isEarlyCheckout: isEarlyCheckout(checkOutAt),
    notes: values.notes || null,
  };
  const record = await prisma.$transaction(async (tx) => {
    const saved = await tx.teacherAttendance.upsert({
      where: { teacherId_date: { teacherId: teacher.id, date } },
      update: data,
      create: { ...data, date, teacherId: teacher.id, schoolUnitId: req.auth!.schoolUnitId },
    });
    if (evidence) {
      await tx.teacherAttendanceEvidence.upsert({
        where: { attendanceId: saved.id },
        update: { ...evidence, uploadedAt: new Date() },
        create: { ...evidence, attendanceId: saved.id },
      });
    } else if (!needsEvidence) {
      await tx.teacherAttendanceEvidence.deleteMany({ where: { attendanceId: saved.id } });
    }
    return tx.teacherAttendance.findUniqueOrThrow({
      where: { id: saved.id },
      include: { evidence: { select: { id: true, fileName: true, mimeType: true, size: true, uploadedAt: true } } },
    });
  });
  await audit(req, 'UPSERT', 'TeacherAttendance', record.id, { teacherId: teacher.id, date: values.date, status: record.status, hasEvidence: !!record.evidence });
  res.json(record);
});

teacherAttendanceRouter.delete('/records/:id', authorize('ADMIN'), requireCsrf, async (req, res) => {
  const record = await prisma.teacherAttendance.findFirst({ where: { id: String(req.params.id), schoolUnitId: req.auth!.schoolUnitId } });
  if (!record) throw new HttpError(404, 'ATTENDANCE_NOT_FOUND', 'Data absensi tidak ditemukan.');
  await prisma.teacherAttendance.delete({ where: { id: record.id } });
  await audit(req, 'DELETE', 'TeacherAttendance', record.id, { teacherId: record.teacherId });
  res.status(204).send();
});
