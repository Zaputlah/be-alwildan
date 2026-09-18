import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../common/audit.js';
import { HttpError } from '../../common/http-error.js';
import { prisma } from '../../config/prisma.js';
import { authenticate, requireCsrf } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
export const assessmentRouter = Router();
assessmentRouter.use(authenticate);
const assessmentSchema = z.object({
    title: z.string().trim().min(3).max(120),
    type: z.enum(['ASSIGNMENT', 'QUIZ', 'MIDTERM', 'FINAL', 'PRACTICE', 'PROJECT']),
    weight: z.number().positive().max(100),
    maxScore: z.number().positive().max(1000).default(100),
    schoolClassId: z.string().min(1),
    subjectId: z.string().min(1),
    academicPeriodId: z.string().min(1),
    scheduledAt: z.iso.datetime().nullable().optional(),
});
async function canManage(userId, role, schoolUnitId, classId, subjectId, academicPeriodId) {
    const schoolClass = await prisma.schoolClass.findFirst({ where: { id: classId, schoolUnitId } });
    const period = await prisma.academicPeriod.findFirst({ where: { id: academicPeriodId, schoolUnitId } });
    if (!schoolClass || !period || schoolClass.academicYear !== period.name)
        return false;
    if (role === 'ADMIN')
        return true;
    return Boolean(await prisma.teachingAssignment.findUnique({
        where: { teacherId_classId_subjectId_academicPeriodId: { teacherId: userId, classId, subjectId, academicPeriodId } },
    }));
}
assessmentRouter.get('/', async (req, res) => {
    const teacherVisibility = req.auth.role === 'TEACHER'
        ? {
            OR: [
                { teacherId: req.auth.userId },
                { status: 'PUBLISHED', schoolClass: { homeroomTeacherId: req.auth.userId } },
            ],
        }
        : {};
    const items = await prisma.assessment.findMany({
        where: {
            schoolClass: { schoolUnitId: req.auth.schoolUnitId },
            ...teacherVisibility,
        },
        include: {
            schoolClass: { select: { id: true, name: true, gradeLevel: true } },
            subject: { select: { id: true, name: true, passingGrade: true } },
            teacher: { select: { id: true, fullName: true } },
            _count: { select: { scores: { where: { student: { isActive: true } } } } },
        },
        orderBy: { createdAt: 'desc' },
    });
    const enrollmentCounts = items.length ? await prisma.classEnrollment.groupBy({
        by: ['classId', 'academicPeriodId'],
        where: {
            classId: { in: [...new Set(items.map((item) => item.schoolClassId))] },
            academicPeriodId: { in: [...new Set(items.map((item) => item.academicPeriodId))] },
            student: { isActive: true },
        },
        _count: { _all: true },
    }) : [];
    const countByClassPeriod = new Map(enrollmentCounts.map((item) => [`${item.classId}:${item.academicPeriodId}`, item._count._all]));
    res.json(items.map((item) => ({ ...item, studentCount: countByClassPeriod.get(`${item.schoolClassId}:${item.academicPeriodId}`) ?? 0 })));
});
assessmentRouter.post('/', requireCsrf, validate(assessmentSchema), async (req, res) => {
    const data = req.body;
    if (!(await canManage(req.auth.userId, req.auth.role, req.auth.schoolUnitId, data.schoolClassId, data.subjectId, data.academicPeriodId))) {
        throw new HttpError(403, 'NOT_ASSIGNED', 'Anda tidak ditugaskan pada kelas dan mata pelajaran tersebut.');
    }
    const assessment = await prisma.assessment.create({
        data: {
            ...data,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
            teacherId: req.auth.userId,
        },
    });
    await audit(req, 'CREATE', 'Assessment', assessment.id, { title: assessment.title });
    res.status(201).json(assessment);
});
assessmentRouter.get('/:id/scores', async (req, res) => {
    const teacherVisibility = req.auth.role === 'TEACHER'
        ? {
            OR: [
                { teacherId: req.auth.userId },
                { status: 'PUBLISHED', schoolClass: { homeroomTeacherId: req.auth.userId } },
            ],
        }
        : {};
    const assessment = await prisma.assessment.findFirst({
        where: {
            id: String(req.params.id),
            schoolClass: { schoolUnitId: req.auth.schoolUnitId },
            ...teacherVisibility,
        },
        include: {
            schoolClass: true,
            subject: true,
            scores: true,
        },
    });
    if (!assessment)
        throw new HttpError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment tidak ditemukan.');
    const students = await prisma.student.findMany({
        where: { isActive: true, enrollments: { some: { classId: assessment.schoolClassId, academicPeriodId: assessment.academicPeriodId } } },
        select: { id: true, nis: true, fullName: true },
        orderBy: { fullName: 'asc' },
    });
    const scoreMap = new Map(assessment.scores.map((score) => [score.studentId, score]));
    res.json({
        assessment: { id: assessment.id, title: assessment.title, maxScore: assessment.maxScore, status: assessment.status },
        students: students.map((student) => ({ ...student, score: scoreMap.get(student.id)?.value ?? null, notes: scoreMap.get(student.id)?.notes ?? '' })),
    });
});
const scoreSchema = z.object({
    scores: z.array(z.object({
        studentId: z.string().min(1),
        value: z.number().min(0),
        notes: z.string().trim().max(300).nullable().optional(),
    })).min(1).max(100),
});
assessmentRouter.put('/:id/scores', requireCsrf, validate(scoreSchema), async (req, res) => {
    const assessment = await prisma.assessment.findFirst({
        where: { id: String(req.params.id), schoolClass: { schoolUnitId: req.auth.schoolUnitId } },
    });
    if (!assessment)
        throw new HttpError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment tidak ditemukan.');
    if (!(await canManage(req.auth.userId, req.auth.role, req.auth.schoolUnitId, assessment.schoolClassId, assessment.subjectId, assessment.academicPeriodId))) {
        throw new HttpError(403, 'NOT_ASSIGNED', 'Anda tidak dapat mengubah nilai assessment ini.');
    }
    if (assessment.status === 'PUBLISHED')
        throw new HttpError(409, 'ALREADY_PUBLISHED', 'Nilai yang sudah diterbitkan tidak dapat diubah.');
    const scores = req.body.scores;
    if (scores.some((score) => score.value > assessment.maxScore)) {
        throw new HttpError(400, 'SCORE_EXCEEDS_MAX', `Nilai tidak boleh melebihi ${assessment.maxScore}.`);
    }
    const enrolled = await prisma.classEnrollment.count({
        where: { classId: assessment.schoolClassId, academicPeriodId: assessment.academicPeriodId, studentId: { in: scores.map((score) => score.studentId) } },
    });
    if (enrolled !== new Set(scores.map((score) => score.studentId)).size) {
        throw new HttpError(400, 'INVALID_STUDENT', 'Ada siswa yang bukan anggota kelas ini.');
    }
    await prisma.$transaction(scores.map((score) => prisma.score.upsert({
        where: { assessmentId_studentId: { assessmentId: assessment.id, studentId: score.studentId } },
        create: { assessmentId: assessment.id, studentId: score.studentId, value: score.value, notes: score.notes || null },
        update: { value: score.value, notes: score.notes || null },
    })));
    await audit(req, 'UPSERT_SCORES', 'Assessment', assessment.id, { count: scores.length });
    res.json({ saved: scores.length });
});
assessmentRouter.post('/:id/publish', requireCsrf, async (req, res) => {
    const assessment = await prisma.assessment.findFirst({
        where: { id: String(req.params.id), schoolClass: { schoolUnitId: req.auth.schoolUnitId } },
        include: { _count: { select: { scores: true } } },
    });
    if (!assessment)
        throw new HttpError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment tidak ditemukan.');
    if (!(await canManage(req.auth.userId, req.auth.role, req.auth.schoolUnitId, assessment.schoolClassId, assessment.subjectId, assessment.academicPeriodId))) {
        throw new HttpError(403, 'NOT_ASSIGNED', 'Anda tidak dapat menerbitkan nilai ini.');
    }
    const enrolledCount = await prisma.classEnrollment.count({ where: { classId: assessment.schoolClassId, academicPeriodId: assessment.academicPeriodId } });
    if (assessment._count.scores < enrolledCount) {
        throw new HttpError(409, 'INCOMPLETE_SCORES', 'Semua siswa harus memiliki nilai sebelum diterbitkan.');
    }
    const updated = await prisma.assessment.update({ where: { id: assessment.id }, data: { status: 'PUBLISHED' } });
    await audit(req, 'PUBLISH', 'Assessment', assessment.id);
    res.json(updated);
});
