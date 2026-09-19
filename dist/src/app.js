import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { assessmentRouter } from './modules/assessments/assessment.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { referenceRouter } from './modules/reference/reference.routes.js';
import { studentRouter } from './modules/students/student.routes.js';
import { teacherAttendanceRouter } from './modules/teacher-attendance/teacher-attendance.routes.js';
import { studentReportRouter } from './modules/reports/student-report.routes.js';
import { teacherScheduleRouter } from './modules/teacher-schedule/teacher-schedule.routes.js';
import { studentAttendanceRouter } from './modules/student-attendance/student-attendance.routes.js';
import { studentBehaviorRouter } from './modules/student-behavior/student-behavior.routes.js';
// Keep the middleware call compatible with Vercel's Node/TypeScript module resolver.
// Helmet ships both CJS and ESM declarations, and some Vercel builders infer the
// default import as a module namespace even though it is the callable factory.
const helmetFactory = helmet;
export function createApp() {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use(helmetFactory({ crossOriginResourcePolicy: { policy: 'same-site' } }));
    app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
    app.use(express.json({ limit: '200kb' }));
    app.use(cookieParser());
    app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', service: 'integration-system-api' }));
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/reference-data', referenceRouter);
    app.use('/api/v1/students', studentRouter);
    app.use('/api/v1/assessments', assessmentRouter);
    app.use('/api/v1/teacher-attendance', teacherAttendanceRouter);
    app.use('/api/v1/reports/student-scores', studentReportRouter);
    app.use('/api/v1/dashboard', dashboardRouter);
    app.use('/api/v1/teacher-schedule', teacherScheduleRouter);
    app.use('/api/v1/student-attendance', studentAttendanceRouter);
    app.use('/api/v1/student-behavior', studentBehaviorRouter);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}
