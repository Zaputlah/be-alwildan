import { Router, type Request } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/http-error.js';
import { prisma } from '../../config/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { averagePercentages, weightedPercentage } from './grade-summary.js';

export const studentReportRouter = Router();
studentReportRouter.use(authenticate);

const selectionSchema = z.object({
  classId: z.string().min(1),
  academicPeriodId: z.string().min(1),
});

async function reportScope(req: Request, classId: string, academicPeriodId: string) {
  const schoolUnitId = req.auth!.schoolUnitId;
  const [schoolClass, period] = await Promise.all([
    prisma.schoolClass.findFirst({ where: { id: classId, schoolUnitId }, select: { id: true, name: true, academicYear: true, homeroomTeacherId: true } }),
    prisma.academicPeriod.findFirst({ where: { id: academicPeriodId, schoolUnitId }, select: { id: true, name: true, semester: true, startDate: true, endDate: true, isActive: true } }),
  ]);
  if (!schoolClass || !period || schoolClass.academicYear !== period.name) {
    throw new HttpError(400, 'INVALID_REPORT_PERIOD', 'Kelas dan semester tidak sesuai.');
  }
  if (req.auth!.role === 'ADMIN' || schoolClass.homeroomTeacherId === req.auth!.userId) {
    return { schoolClass, period, subjectIds: null };
  }
  const assignments = await prisma.teachingAssignment.findMany({
    where: { teacherId: req.auth!.userId, classId, academicPeriodId },
    select: { subjectId: true },
  });
  if (!assignments.length) throw new HttpError(403, 'NOT_ASSIGNED', 'Anda tidak dapat melihat rekap kelas ini.');
  return { schoolClass, period, subjectIds: assignments.map((item) => item.subjectId) };
}

studentReportRouter.get('/students', async (req, res) => {
  const parsed = selectionSchema.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Pilih kelas dan semester.', parsed.error.flatten());
  const { classId, academicPeriodId } = parsed.data;
  await reportScope(req, classId, academicPeriodId);
  const students = await prisma.student.findMany({
    where: {
      schoolUnitId: req.auth!.schoolUnitId,
      ...(req.auth!.role === 'TEACHER' ? { isActive: true } : {}),
      enrollments: { some: { classId, academicPeriodId } },
    },
    select: { id: true, nis: true, fullName: true, isActive: true },
    orderBy: { fullName: 'asc' },
  });
  res.json(students);
});

studentReportRouter.get('/students/:studentId', async (req, res) => {
  const parsed = selectionSchema.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Pilih kelas dan semester.', parsed.error.flatten());
  const { classId, academicPeriodId } = parsed.data;
  const scope = await reportScope(req, classId, academicPeriodId);
  const student = await prisma.student.findFirst({
    where: {
      id: String(req.params.studentId),
      schoolUnitId: req.auth!.schoolUnitId,
      ...(req.auth!.role === 'TEACHER' ? { isActive: true } : {}),
      enrollments: { some: { classId, academicPeriodId } },
    },
    select: { id: true, nis: true, fullName: true, isActive: true },
  });
  if (!student) throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Siswa tidak ditemukan pada kelas dan semester ini.');

  const assessments = await prisma.assessment.findMany({
    where: {
      schoolClassId: classId,
      academicPeriodId,
      status: 'PUBLISHED',
      ...(scope.subjectIds ? { subjectId: { in: scope.subjectIds } } : {}),
    },
    select: {
      id: true, title: true, type: true, weight: true, maxScore: true, subjectId: true,
      subject: { select: { code: true, name: true, passingGrade: true } },
      teacher: { select: { fullName: true } },
      scores: { where: { studentId: student.id }, select: { value: true, notes: true } },
    },
    orderBy: [{ subject: { name: 'asc' } }, { createdAt: 'asc' }],
  });

  const subjects = new Map<string, {
    id: string; code: string; name: string; passingGrade: number;
    assessments: { id: string; title: string; type: string; weight: number; maxScore: number; score: number | null; percentage: number | null; notes: string | null; teacherName: string }[];
  }>();
  for (const assessment of assessments) {
    if (!subjects.has(assessment.subjectId)) {
      subjects.set(assessment.subjectId, {
        id: assessment.subjectId,
        code: assessment.subject.code,
        name: assessment.subject.name,
        passingGrade: assessment.subject.passingGrade,
        assessments: [],
      });
    }
    const score = assessment.scores[0] ?? null;
    subjects.get(assessment.subjectId)!.assessments.push({
      id: assessment.id,
      title: assessment.title,
      type: assessment.type,
      weight: assessment.weight,
      maxScore: assessment.maxScore,
      score: score?.value ?? null,
      percentage: score ? Math.round(score.value / assessment.maxScore * 1000) / 10 : null,
      notes: score?.notes ?? null,
      teacherName: assessment.teacher.fullName,
    });
  }
  const rows = Array.from(subjects.values()).map((subject) => {
    const average = weightedPercentage(subject.assessments.map((item) => ({ value: item.score, maxScore: item.maxScore, weight: item.weight })));
    return { ...subject, average, meetsKkm: average === null ? null : average >= subject.passingGrade };
  });
  res.json({
    student,
    schoolClass: { id: scope.schoolClass.id, name: scope.schoolClass.name },
    academicPeriod: scope.period,
    subjects: rows,
    overallAverage: averagePercentages(rows.map((subject) => subject.average)),
  });
});
