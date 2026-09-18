import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { weekdayInTimezone } from '../teacher-schedule/schedule-time.js';
export const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.get('/', async (req, res) => {
    const unitScope = { schoolUnitId: req.auth.schoolUnitId };
    const isTeacher = req.auth.role === 'TEACHER';
    const periods = await prisma.academicPeriod.findMany({ where: unitScope, orderBy: [{ startDate: 'desc' }] });
    const now = new Date();
    const currentPeriod = periods.find((period) => period.startDate <= now && now <= period.endDate)
        ?? periods.find((period) => period.isActive)
        ?? null;
    const todayWeekday = weekdayInTimezone(now, env.SCHOOL_TIMEZONE);
    const [assignments, homeroomClasses, todaySchedule] = isTeacher
        ? await Promise.all([
            prisma.teachingAssignment.findMany({
                where: {
                    teacherId: req.auth.userId,
                    class: unitScope,
                    ...(currentPeriod ? { academicPeriodId: currentPeriod.id } : {}),
                },
                select: { classId: true, class: { select: { name: true } }, subject: { select: { name: true } } },
            }),
            prisma.schoolClass.findMany({
                where: {
                    ...unitScope,
                    homeroomTeacherId: req.auth.userId,
                    ...(currentPeriod ? { academicYear: currentPeriod.name } : {}),
                },
                select: { id: true, name: true },
            }),
            currentPeriod ? prisma.teacherScheduleSlot.findMany({
                where: { weekday: todayWeekday, teachingAssignment: { teacherId: req.auth.userId, academicPeriodId: currentPeriod.id, class: unitScope } },
                select: { id: true, startMinute: true, endMinute: true, room: true, teachingAssignment: { select: { class: { select: { name: true } }, subject: { select: { name: true } } } } },
                orderBy: { startMinute: 'asc' },
            }) : Promise.resolve([]),
        ])
        : [[], [], []];
    const accessibleClassIds = [...new Set([...assignments.map((item) => item.classId), ...homeroomClasses.map((item) => item.id)])];
    const assessmentScope = {
        schoolClass: unitScope,
        ...(isTeacher ? { teacherId: req.auth.userId } : {}),
        ...(isTeacher && currentPeriod ? { academicPeriodId: currentPeriod.id } : {}),
    };
    const [studentCount, classCount, assessments, scores] = await Promise.all([
        prisma.student.count({ where: {
                ...unitScope,
                isActive: true,
                ...(isTeacher ? { enrollments: { some: {
                            classId: { in: accessibleClassIds },
                            ...(currentPeriod ? { academicPeriodId: currentPeriod.id } : {}),
                        } } } : {}),
            } }),
        isTeacher ? Promise.resolve(accessibleClassIds.length) : prisma.schoolClass.count({ where: unitScope }),
        prisma.assessment.findMany({ where: assessmentScope, select: { id: true, status: true } }),
        prisma.score.findMany({
            where: { assessment: assessmentScope },
            select: { value: true, assessment: { select: { maxScore: true, subject: { select: { passingGrade: true } } } } },
        }),
    ]);
    const subjects = new Map();
    for (const assignment of assignments) {
        const classes = subjects.get(assignment.subject.name) ?? new Set();
        classes.add(assignment.class.name);
        subjects.set(assignment.subject.name, classes);
    }
    const percentages = scores.map((score) => (score.value / score.assessment.maxScore) * 100);
    const average = percentages.length ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length : 0;
    const passed = scores.filter((score) => (score.value / score.assessment.maxScore) * 100 >= score.assessment.subject.passingGrade).length;
    const ranges = [
        { label: '0–59', min: 0, max: 59.999 },
        { label: '60–74', min: 60, max: 74.999 },
        { label: '75–84', min: 75, max: 84.999 },
        { label: '85–100', min: 85, max: 100.001 },
    ];
    res.json({
        currentPeriod,
        timezone: env.SCHOOL_TIMEZONE,
        teacherOverview: isTeacher ? {
            subjects: [...subjects].map(([name, classes]) => ({ name, classes: [...classes].sort() })).sort((a, b) => a.name.localeCompare(b.name, 'id')),
            homeroomClasses: homeroomClasses.map((item) => item.name).sort(),
            teachingClassCount: new Set(assignments.map((item) => item.classId)).size,
            todayWeekday,
            todaySchedule,
        } : null,
        summary: {
            students: studentCount,
            classes: classCount,
            assessments: assessments.length,
            published: assessments.filter((item) => item.status === 'PUBLISHED').length,
            average: Number(average.toFixed(1)),
            completionRate: assessments.length ? Number((assessments.filter((item) => item.status === 'PUBLISHED').length / assessments.length * 100).toFixed(1)) : 0,
            passRate: scores.length ? Number((passed / scores.length * 100).toFixed(1)) : 0,
        },
        distribution: ranges.map((range) => ({
            label: range.label,
            count: percentages.filter((value) => value >= range.min && value <= range.max).length,
        })),
    });
});
