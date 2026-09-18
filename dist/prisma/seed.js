import { AssessmentType, Gender, PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/common/crypto.js';
const prisma = new PrismaClient();
async function main() {
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.score.deleteMany();
    await prisma.assessment.deleteMany();
    await prisma.teachingAssignment.deleteMany();
    await prisma.classEnrollment.deleteMany();
    await prisma.student.deleteMany();
    await prisma.schoolClass.deleteMany();
    await prisma.academicPeriod.deleteMany();
    await prisma.user.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.schoolUnit.deleteMany();
    const schoolUnit = await prisma.schoolUnit.create({
        data: { code: 'AWS-TNG', name: 'Al-Wildan Islamic School Tangerang', address: 'Tangerang' },
    });
    const passwordHash = await hashPassword('Integration123!');
    const [admin, teacher] = await Promise.all([
        prisma.user.create({
            data: { email: 'admin@integration.sch.id', fullName: 'Administrator Sekolah', role: UserRole.ADMIN, passwordHash, schoolUnitId: schoolUnit.id },
        }),
        prisma.user.create({
            data: { email: 'guru@integration.sch.id', fullName: 'Ahmad Fauzan, S.Pd.', role: UserRole.TEACHER, passwordHash, schoolUnitId: schoolUnit.id },
        }),
    ]);
    const period = await prisma.academicPeriod.create({
        data: {
            name: '2026/2027', semester: 1, startDate: new Date('2026-07-13'), endDate: new Date('2026-12-18'),
            isActive: true, schoolUnitId: schoolUnit.id,
        },
    });
    const schoolClass = await prisma.schoolClass.create({
        data: { name: '7A', gradeLevel: 7, schoolUnitId: schoolUnit.id, academicPeriodId: period.id, homeroomTeacherId: teacher.id },
    });
    const [math, science, islamic] = await Promise.all([
        prisma.subject.create({ data: { code: 'MAT-07', name: 'Matematika', passingGrade: 75 } }),
        prisma.subject.create({ data: { code: 'IPA-07', name: 'Ilmu Pengetahuan Alam', passingGrade: 75 } }),
        prisma.subject.create({ data: { code: 'PAI-07', name: 'Pendidikan Agama Islam', passingGrade: 78 } }),
    ]);
    await prisma.teachingAssignment.createMany({
        data: [math, science, islamic].map((subject) => ({ teacherId: teacher.id, classId: schoolClass.id, subjectId: subject.id })),
    });
    const studentData = [
        ['260701', 'Abdullah Rizki', Gender.MALE],
        ['260702', 'Aisyah Rahmah', Gender.FEMALE],
        ['260703', 'Fahri Ramadhan', Gender.MALE],
        ['260704', 'Khadijah Az-Zahra', Gender.FEMALE],
        ['260705', 'Muhammad Zaid', Gender.MALE],
        ['260706', 'Nabila Shafira', Gender.FEMALE],
    ];
    const students = [];
    for (const [nis, fullName, gender] of studentData) {
        students.push(await prisma.student.create({
            data: {
                nis, fullName, gender, schoolUnitId: schoolUnit.id,
                parentName: `Wali ${fullName}`, parentPhone: '081234567890',
                enrollments: { create: { classId: schoolClass.id } },
            },
        }));
    }
    const quiz = await prisma.assessment.create({
        data: {
            title: 'Kuis Aljabar Dasar', type: AssessmentType.QUIZ, weight: 20, maxScore: 100,
            status: 'PUBLISHED', schoolClassId: schoolClass.id, subjectId: math.id,
            teacherId: teacher.id, academicPeriodId: period.id, scheduledAt: new Date('2026-09-10'),
        },
    });
    await prisma.score.createMany({
        data: students.map((student, index) => ({ assessmentId: quiz.id, studentId: student.id, value: [88, 92, 74, 85, 68, 95][index] })),
    });
    await prisma.assessment.create({
        data: {
            title: 'Praktikum Pengukuran', type: AssessmentType.PRACTICE, weight: 25, maxScore: 100,
            status: 'DRAFT', schoolClassId: schoolClass.id, subjectId: science.id,
            teacherId: teacher.id, academicPeriodId: period.id, scheduledAt: new Date('2026-09-18'),
        },
    });
    console.log('Seed selesai.');
    console.log('Admin  : admin@integration.sch.id / Integration123!');
    console.log('Teacher: guru@integration.sch.id / Integration123!');
    void admin;
}
main()
    .catch((error) => { console.error(error); process.exit(1); })
    .finally(async () => prisma.$disconnect());
