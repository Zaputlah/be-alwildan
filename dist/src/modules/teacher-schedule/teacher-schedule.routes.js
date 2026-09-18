import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../common/audit.js';
import { HttpError } from '../../common/http-error.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { authenticate, authorize, requireCsrf } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { dateInTimezone, weekdayInTimezone } from './schedule-time.js';
export const teacherScheduleRouter = Router();
teacherScheduleRouter.use(authenticate);
const slotSchema = z.object({
    teachingAssignmentId: z.string().min(1),
    weekday: z.number().int().min(1).max(7),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
    room: z.string().trim().max(100).nullable().optional(),
}).refine((item) => item.startMinute < item.endMinute, { message: 'Jam selesai harus setelah jam mulai.', path: ['endMinute'] });
const scheduleInclude = {
    teachingAssignment: {
        select: {
            teacherId: true,
            academicPeriodId: true,
            teacher: { select: { fullName: true } },
            class: { select: { id: true, name: true } },
            subject: { select: { name: true } },
        },
    },
};
teacherScheduleRouter.get('/', async (req, res) => {
    const schoolUnitId = req.auth.schoolUnitId;
    const periods = await prisma.academicPeriod.findMany({ where: { schoolUnitId }, orderBy: { startDate: 'desc' } });
    const now = new Date();
    const requestedPeriodId = typeof req.query.periodId === 'string' ? req.query.periodId : undefined;
    const period = requestedPeriodId
        ? periods.find((item) => item.id === requestedPeriodId)
        : periods.find((item) => item.startDate <= now && now <= item.endDate) ?? periods.find((item) => item.isActive);
    if (requestedPeriodId && !period)
        throw new HttpError(404, 'PERIOD_NOT_FOUND', 'Semester tidak ditemukan pada unit sekolah ini.');
    const weekday = weekdayInTimezone(now, env.SCHOOL_TIMEZONE);
    const slots = period ? await prisma.teacherScheduleSlot.findMany({
        where: {
            teachingAssignment: {
                academicPeriodId: period.id,
                class: { schoolUnitId },
                ...(req.auth.role === 'TEACHER' ? { teacherId: req.auth.userId } : {}),
            },
        },
        include: scheduleInclude,
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    }) : [];
    res.json({ period: period ?? null, periods, timezone: env.SCHOOL_TIMEZONE, todayDate: dateInTimezone(now, env.SCHOOL_TIMEZONE), todayWeekday: weekday, slots });
});
async function ensureSlotAllowed(input, schoolUnitId, excludeId) {
    const assignment = await prisma.teachingAssignment.findFirst({
        where: { id: input.teachingAssignmentId, class: { schoolUnitId }, academicPeriod: { schoolUnitId } },
        select: { teacherId: true, classId: true, academicPeriodId: true },
    });
    if (!assignment)
        throw new HttpError(400, 'INVALID_ASSIGNMENT', 'Penugasan guru tidak ditemukan pada unit sekolah ini.');
    const conflicting = await prisma.teacherScheduleSlot.findFirst({
        where: {
            id: excludeId ? { not: excludeId } : undefined,
            weekday: input.weekday,
            startMinute: { lt: input.endMinute },
            endMinute: { gt: input.startMinute },
            teachingAssignment: {
                academicPeriodId: assignment.academicPeriodId,
                OR: [{ teacherId: assignment.teacherId }, { classId: assignment.classId }],
            },
        },
    });
    if (conflicting)
        throw new HttpError(409, 'SCHEDULE_CONFLICT', 'Jadwal bentrok dengan jam mengajar guru atau kelas tersebut.');
}
teacherScheduleRouter.post('/', authorize('ADMIN'), requireCsrf, validate(slotSchema), async (req, res) => {
    await ensureSlotAllowed(req.body, req.auth.schoolUnitId);
    const slot = await prisma.teacherScheduleSlot.create({ data: req.body, include: scheduleInclude });
    await audit(req, 'CREATE', 'TeacherScheduleSlot', slot.id);
    res.status(201).json(slot);
});
teacherScheduleRouter.put('/:id', authorize('ADMIN'), requireCsrf, validate(slotSchema), async (req, res) => {
    const id = String(req.params.id);
    const existing = await prisma.teacherScheduleSlot.findFirst({ where: { id, teachingAssignment: { class: { schoolUnitId: req.auth.schoolUnitId } } } });
    if (!existing)
        throw new HttpError(404, 'SCHEDULE_NOT_FOUND', 'Jadwal tidak ditemukan.');
    await ensureSlotAllowed(req.body, req.auth.schoolUnitId, id);
    const slot = await prisma.teacherScheduleSlot.update({ where: { id }, data: req.body, include: scheduleInclude });
    await audit(req, 'UPDATE', 'TeacherScheduleSlot', id);
    res.json(slot);
});
teacherScheduleRouter.delete('/:id', authorize('ADMIN'), requireCsrf, async (req, res) => {
    const id = String(req.params.id);
    const existing = await prisma.teacherScheduleSlot.findFirst({ where: { id, teachingAssignment: { class: { schoolUnitId: req.auth.schoolUnitId } } } });
    if (!existing)
        throw new HttpError(404, 'SCHEDULE_NOT_FOUND', 'Jadwal tidak ditemukan.');
    await prisma.teacherScheduleSlot.delete({ where: { id } });
    await audit(req, 'DELETE', 'TeacherScheduleSlot', id);
    res.status(204).send();
});
