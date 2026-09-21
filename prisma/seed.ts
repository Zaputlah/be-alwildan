import "dotenv/config";
import { AdminScope, PrismaClient, SemesterType, UserRole } from "@prisma/client";
import { hashPassword } from "../src/common/crypto.js";

const prisma = new PrismaClient();

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function sickDemoPdf() {
  const body = 'BT /F1 16 Tf 72 720 Td (SURAT KETERANGAN SAKIT - TEMPLATE DEMO) Tj /F1 11 Tf 0 -36 Td (Nama guru: ____________________) Tj 0 -24 Td (Tanggal: _____________________) Tj 0 -36 Td (Dokumen pengujian aplikasi - bukan surat resmi.) Tj ET';
  return Buffer.from(`%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n5 0 obj << /Length ${Buffer.byteLength(body, 'ascii')} >> stream\n${body}\nendstream endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n`, 'ascii');
}

async function main() {
  console.log("Mulai seed data lengkap...");

  const schoolUnit = await prisma.schoolUnit.upsert({
    where: { code: "AWS-TNG" },
    update: {
      name: "Al-Wildan Islamic School Tangerang",
      address: "Tangerang",
      isActive: true,
    },
    create: {
      code: "AWS-TNG",
      name: "Al-Wildan Islamic School Tangerang",
      address: "Tangerang",
      isActive: true,
    },
  });

  const passwordHash = await hashPassword("Integration123!");

  const users = [
    {
      email: "admin@integration.sch.id",
      fullName: "Administrator Sekolah",
      role: UserRole.ADMIN,
    },
    {
      email: "admin.pusat@integration.sch.id",
      fullName: "Administrator Pusat",
      role: UserRole.ADMIN,
      adminScope: AdminScope.CENTRAL,
    },
    {
      email: "guru@integration.sch.id",
      fullName: "Ahmad Fauzan, S.Pd.",
      role: UserRole.TEACHER,
    },
    {
      email: "guru.ipa.test@integration.sch.id",
      fullName: "Siti Rahmawati, S.Pd.",
      role: UserRole.TEACHER,
    },
    {
      email: "guru.matematika.test@integration.sch.id",
      fullName: "Budi Santoso, S.Pd.",
      role: UserRole.TEACHER,
    },
    {
      email: "guru.pai.test@integration.sch.id",
      fullName: "Nur Aisyah, S.Pd.I.",
      role: UserRole.TEACHER,
    },
    {
      email: "guru.ips.7b@integration.sch.id",
      fullName: "Rina Puspita, S.Pd.",
      role: UserRole.TEACHER,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        role: user.role,
        adminScope: user.adminScope ?? AdminScope.BRANCH,
        isActive: true,
        schoolUnitId: schoolUnit.id,
      },
      create: {
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        adminScope: user.adminScope ?? AdminScope.BRANCH,
        isActive: true,
        schoolUnitId: schoolUnit.id,
      },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@integration.sch.id" },
  });
  const mainTeacher = await prisma.user.findUniqueOrThrow({
    where: { email: "guru@integration.sch.id" },
  });
  const ipaTeacher = await prisma.user.findUniqueOrThrow({
    where: { email: "guru.ipa.test@integration.sch.id" },
  });
  const mathTeacher = await prisma.user.findUniqueOrThrow({
    where: { email: "guru.matematika.test@integration.sch.id" },
  });
  const paiTeacher = await prisma.user.findUniqueOrThrow({
    where: { email: "guru.pai.test@integration.sch.id" },
  });
  const ipsTeacher = await prisma.user.findUniqueOrThrow({
    where: { email: "guru.ips.7b@integration.sch.id" },
  });

  await prisma.session.upsert({
    where: { tokenHash: "seed-expired-session-token" },
    update: {
      csrfHash: "seed-expired-session-csrf",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      userId: admin.id,
      lastUsedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    create: {
      tokenHash: "seed-expired-session-token",
      csrfHash: "seed-expired-session-csrf",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      userId: admin.id,
      lastUsedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  const ganjil = await prisma.academicPeriod.upsert({
    where: {
      schoolUnitId_name_semester: {
        schoolUnitId: schoolUnit.id,
        name: "2026/2027",
        semester: SemesterType.GANJIL,
      },
    },
    update: {
      startDate: date("2026-07-13"),
      endDate: date("2026-12-18"),
      isActive: true,
    },
    create: {
      name: "2026/2027",
      semester: SemesterType.GANJIL,
      startDate: date("2026-07-13"),
      endDate: date("2026-12-18"),
      isActive: true,
      schoolUnitId: schoolUnit.id,
    },
  });

  const genap = await prisma.academicPeriod.upsert({
    where: {
      schoolUnitId_name_semester: {
        schoolUnitId: schoolUnit.id,
        name: "2026/2027",
        semester: SemesterType.GENAP,
      },
    },
    update: {
      startDate: date("2027-01-04"),
      endDate: date("2027-06-18"),
      isActive: false,
    },
    create: {
      name: "2026/2027",
      semester: SemesterType.GENAP,
      startDate: date("2027-01-04"),
      endDate: date("2027-06-18"),
      isActive: false,
      schoolUnitId: schoolUnit.id,
    },
  });

  const classSeeds = [
    {
      id: "seed-class-7a",
      name: "7A",
      gradeLevel: 7,
      homeroomTeacherId: mainTeacher.id,
    },
    {
      id: "seed-class-7b",
      name: "7B",
      gradeLevel: 7,
      homeroomTeacherId: ipaTeacher.id,
    },
    {
      id: "seed-class-7c",
      name: "7C",
      gradeLevel: 7,
      homeroomTeacherId: mathTeacher.id,
    },
    {
      id: "seed-class-8a",
      name: "8A",
      gradeLevel: 8,
      homeroomTeacherId: paiTeacher.id,
    },
  ];

  for (const item of classSeeds) {
    const existing = await prisma.schoolClass.findFirst({
      where: {
        schoolUnitId: schoolUnit.id,
        academicYear: "2026/2027",
        name: item.name,
      },
    });
    if (existing) {
      await prisma.schoolClass.update({
        where: { id: existing.id },
        data: {
          gradeLevel: item.gradeLevel,
          homeroomTeacherId: item.homeroomTeacherId,
        },
      });
    } else {
      await prisma.schoolClass.create({
        data: {
          id: item.id,
          name: item.name,
          gradeLevel: item.gradeLevel,
          academicYear: "2026/2027",
          schoolUnitId: schoolUnit.id,
          homeroomTeacherId: item.homeroomTeacherId,
        },
      });
    }
  }

  const classes = await prisma.schoolClass.findMany({
    where: {
      schoolUnitId: schoolUnit.id,
      academicYear: "2026/2027",
      name: { in: ["7A", "7B", "7C", "8A"] },
    },
  });
  const classByName = new Map(classes.map((c) => [c.name, c]));

  const subjectSeeds = [
    {
      id: "seed-subject-mat",
      code: "MAT",
      name: "Matematika",
      passingGrade: 75,
    },
    {
      id: "seed-subject-ipa",
      code: "IPA",
      name: "Ilmu Pengetahuan Alam",
      passingGrade: 75,
    },
    {
      id: "seed-subject-pai",
      code: "PAI",
      name: "Pendidikan Agama Islam",
      passingGrade: 75,
    },
    {
      id: "seed-subject-bin",
      code: "BIN",
      name: "Bahasa Indonesia",
      passingGrade: 75,
    },
    {
      id: "seed-subject-ips",
      code: "IPS",
      name: "Ilmu Pengetahuan Sosial",
      passingGrade: 75,
    },
  ];

  for (const subject of subjectSeeds) {
    await prisma.subject.upsert({
      where: { code: subject.code },
      update: { name: subject.name, passingGrade: subject.passingGrade },
      create: subject,
    });
  }

  const subjects = await prisma.subject.findMany({
    where: { code: { in: subjectSeeds.map((s) => s.code) } },
  });
  const subjectByCode = new Map(subjects.map((s) => [s.code, s]));

  const studentSeeds = [
    [
      "seed-student-01",
      "720001",
      "Aditya Pratama",
      "MALE",
      "2013-01-15",
      "Hendra Pratama",
      "081211110001",
    ],
    [
      "seed-student-02",
      "720002",
      "Aulia Zahra",
      "FEMALE",
      "2013-02-20",
      "Dewi Lestari",
      "081211110002",
    ],
    [
      "seed-student-03",
      "720003",
      "Bintang Ramadhan",
      "MALE",
      "2013-03-12",
      "Agus Ramadhan",
      "081211110003",
    ],
    [
      "seed-student-04",
      "720004",
      "Citra Lestari",
      "FEMALE",
      "2013-04-08",
      "Rina Kurnia",
      "081211110004",
    ],
    [
      "seed-student-05",
      "730001",
      "Daffa Maulana",
      "MALE",
      "2013-05-19",
      "Rahmat Maulana",
      "081211110005",
    ],
    [
      "seed-student-06",
      "730002",
      "Farah Nabila",
      "FEMALE",
      "2013-06-24",
      "Siti Aminah",
      "081211110006",
    ],
    [
      "seed-student-07",
      "730003",
      "Ghazi Alfarizi",
      "MALE",
      "2013-07-11",
      "Fajar Alfarizi",
      "081211110007",
    ],
    [
      "seed-student-08",
      "730004",
      "Hana Safitri",
      "FEMALE",
      "2013-08-17",
      "Maya Safitri",
      "081211110008",
    ],
    [
      "seed-student-09",
      "810001",
      "Ibrahim Khalil",
      "MALE",
      "2012-01-09",
      "Yusuf Khalil",
      "081211110009",
    ],
    [
      "seed-student-10",
      "810002",
      "Jasmine Azzahra",
      "FEMALE",
      "2012-02-14",
      "Nurul Hikmah",
      "081211110010",
    ],
    [
      "seed-student-11",
      "810003",
      "Khalid Akbar",
      "MALE",
      "2012-03-21",
      "Abdul Akbar",
      "081211110011",
    ],
    [
      "seed-student-12",
      "810004",
      "Laila Rahma",
      "FEMALE",
      "2012-04-30",
      "Fitri Rahma",
      "081211110012",
    ],
  ] as const;

  for (const s of studentSeeds) {
    const [id, nis, fullName, gender, birthDate, parentName, parentPhone] = s;
    const existing = await prisma.student.findFirst({
      where: { schoolUnitId: schoolUnit.id, nis },
    });
    if (existing) {
      await prisma.student.update({
        where: { id: existing.id },
        data: {
          fullName,
          gender: gender as any,
          birthDate: date(birthDate),
          parentName,
          parentPhone,
          isActive: true,
        },
      });
    } else {
      await prisma.student.create({
        data: {
          id,
          nis,
          fullName,
          gender: gender as any,
          birthDate: date(birthDate),
          parentName,
          parentPhone,
          isActive: true,
          schoolUnitId: schoolUnit.id,
        },
      });
    }
  }

  const students = await prisma.student.findMany({
    where: {
      schoolUnitId: schoolUnit.id,
      nis: { in: studentSeeds.map((s) => s[1]) },
    },
    orderBy: { nis: "asc" },
  });
  const studentByNis = new Map(students.map((s) => [s.nis, s]));

  const enrollmentPlan: Array<[string, string]> = [
    ["720001", "7A"],
    ["720002", "7A"],
    ["720003", "7A"],
    ["720004", "7B"],
    ["730001", "7B"],
    ["730002", "7C"],
    ["730003", "7C"],
    ["730004", "7C"],
    ["810001", "8A"],
    ["810002", "8A"],
    ["810003", "8A"],
    ["810004", "8A"],
  ];

  for (const period of [ganjil, genap]) {
    for (const [nis, className] of enrollmentPlan) {
      const student = studentByNis.get(nis)!;
      const schoolClass = classByName.get(className)!;
      const existing = await prisma.classEnrollment.findFirst({
        where: {
          classId: schoolClass.id,
          studentId: student.id,
          academicPeriodId: period.id,
        },
      });
      if (!existing) {
        await prisma.classEnrollment.create({
          data: {
            classId: schoolClass.id,
            studentId: student.id,
            academicPeriodId: period.id,
          },
        });
      }
    }
  }

  const assignmentPlan = [
    [mainTeacher.id, "7A", "MAT"],
    [ipaTeacher.id, "7A", "IPA"],
    [ipaTeacher.id, "7B", "IPA"],
    [mathTeacher.id, "7B", "MAT"],
    [mathTeacher.id, "7C", "MAT"],
    [paiTeacher.id, "7B", "PAI"],
    [paiTeacher.id, "7C", "PAI"],
    [paiTeacher.id, "8A", "PAI"],
    [ipaTeacher.id, "8A", "IPA"],
    [ipsTeacher.id, "7A", "IPS"],
    [ipsTeacher.id, "7B", "IPS"],
    [ipsTeacher.id, "7C", "IPS"],
    [ipsTeacher.id, "8A", "IPS"],
  ] as const;

  for (const period of [ganjil, genap]) {
    for (const [teacherId, className, subjectCode] of assignmentPlan) {
      const schoolClass = classByName.get(className)!;
      const subject = subjectByCode.get(subjectCode)!;
      const existing = await prisma.teachingAssignment.findFirst({
        where: {
          teacherId,
          classId: schoolClass.id,
          subjectId: subject.id,
          academicPeriodId: period.id,
        },
      });
      if (!existing) {
        await prisma.teachingAssignment.create({
          data: {
            teacherId,
            classId: schoolClass.id,
            subjectId: subject.id,
            academicPeriodId: period.id,
          },
        });
      }
    }
  }

  const ganjilAssignments = await prisma.teachingAssignment.findMany({
    where: { academicPeriodId: ganjil.id },
    include: { class: true, subject: true, teacher: true },
  });

  const schedulePlan = [
    ["guru.ipa.test@integration.sch.id", "7B", "IPA", 1, 480, 540, "Lab IPA"],
    ["guru.ipa.test@integration.sch.id", "7C", "IPA", 2, 540, 600, "Lab IPA"],
    [
      "guru.matematika.test@integration.sch.id",
      "7B",
      "MAT",
      1,
      540,
      600,
      "Ruang 7B",
    ],
    [
      "guru.matematika.test@integration.sch.id",
      "7C",
      "MAT",
      4,
      480,
      540,
      "Ruang 7C",
    ],
    ["guru.pai.test@integration.sch.id", "8A", "PAI", 5, 480, 540, "Ruang 8A"],
    ["guru.ips.7b@integration.sch.id", "7A", "IPS", 1, 660, 720, "Ruang 7A"],
    ["guru.ips.7b@integration.sch.id", "7B", "IPS", 2, 480, 540, "Ruang 7B"],
    ["guru.ips.7b@integration.sch.id", "7C", "IPS", 3, 660, 720, "Ruang 7C"],
    ["guru.ips.7b@integration.sch.id", "8A", "IPS", 5, 600, 660, "Ruang 8A"],
  ] as const;

  for (const [
    email,
    className,
    subjectCode,
    weekday,
    startMinute,
    endMinute,
    room,
  ] of schedulePlan) {
    const assignment = ganjilAssignments.find(
      (a) =>
        a.teacher.email === email &&
        a.class.name === className &&
        a.subject.code === subjectCode,
    );
    if (!assignment) continue;

    const existing = await prisma.teacherScheduleSlot.findFirst({
      where: { teachingAssignmentId: assignment.id, weekday, startMinute },
    });
    if (!existing) {
      await prisma.teacherScheduleSlot.create({
        data: {
          teachingAssignmentId: assignment.id,
          weekday,
          startMinute,
          endMinute,
          room,
        },
      });
    }
  }

  const assessments = [
    {
      id: "seed-assessment-mat-assignment",
      title: "Tugas 1 Matematika",
      type: "ASSIGNMENT",
      weight: 20,
      maxScore: 100,
      status: "PUBLISHED",
      scheduledAt: new Date("2026-08-05T01:00:00.000Z"),
      className: "7A",
      subjectCode: "MAT",
      teacherId: mainTeacher.id,
    },
    {
      id: "seed-assessment-mat-quiz",
      title: "Kuis 1 Matematika",
      type: "QUIZ",
      weight: 15,
      maxScore: 100,
      status: "PUBLISHED",
      scheduledAt: new Date("2026-08-20T01:00:00.000Z"),
      className: "7A",
      subjectCode: "MAT",
      teacherId: mainTeacher.id,
    },
    {
      id: "seed-assessment-ipa-practice",
      title: "Praktik IPA",
      type: "PRACTICE",
      weight: 25,
      maxScore: 100,
      status: "PUBLISHED",
      scheduledAt: new Date("2026-08-25T02:00:00.000Z"),
      className: "7A",
      subjectCode: "IPA",
      teacherId: ipaTeacher.id,
    },
    {
      id: "seed-assessment-ipa-midterm",
      title: "UTS IPA Kelas 7B",
      type: "MIDTERM",
      weight: 30,
      maxScore: 100,
      status: "PUBLISHED",
      scheduledAt: new Date("2026-09-30T02:00:00.000Z"),
      className: "7B",
      subjectCode: "IPA",
      teacherId: ipaTeacher.id,
    },
  ];

  for (const item of assessments) {
    await prisma.assessment.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        type: item.type as any,
        weight: item.weight,
        maxScore: item.maxScore,
        status: item.status as any,
        scheduledAt: item.scheduledAt,
      },
      create: {
        id: item.id,
        title: item.title,
        type: item.type as any,
        weight: item.weight,
        maxScore: item.maxScore,
        status: item.status as any,
        scheduledAt: item.scheduledAt,
        schoolClassId: classByName.get(item.className)!.id,
        subjectId: subjectByCode.get(item.subjectCode)!.id,
        teacherId: item.teacherId,
        academicPeriodId: ganjil.id,
      },
    });
  }

  const scorePlan = [
    ["seed-assessment-mat-assignment", "720001", 88],
    ["seed-assessment-mat-assignment", "720002", 92],
    ["seed-assessment-mat-assignment", "720003", 78],
    ["seed-assessment-mat-quiz", "720001", 85],
    ["seed-assessment-mat-quiz", "720002", 90],
    ["seed-assessment-mat-quiz", "720003", 80],
    ["seed-assessment-ipa-practice", "720001", 91],
    ["seed-assessment-ipa-practice", "720002", 87],
    ["seed-assessment-ipa-practice", "720003", 83],
    ["seed-assessment-ipa-midterm", "720004", 76],
    ["seed-assessment-ipa-midterm", "730001", 89],
  ] as const;

  for (const [assessmentId, nis, value] of scorePlan) {
    const student = studentByNis.get(nis)!;
    const existing = await prisma.score.findFirst({
      where: { assessmentId, studentId: student.id },
    });
    if (existing) {
      await prisma.score.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      await prisma.score.create({
        data: {
          value,
          assessmentId,
          studentId: student.id,
          notes: value >= 85 ? "Baik" : null,
        },
      });
    }
  }

  const attendanceDates = [
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
    "2026-09-18",
  ];

  for (const [index, [nis, className]] of enrollmentPlan.entries()) {
    const student = studentByNis.get(nis)!;
    const schoolClass = classByName.get(className)!;

    for (const [dayIndex, day] of attendanceDates.entries()) {
      let status = "PRESENT";
      let notes: string | null = null;
      let lateArrivalAt: Date | null = null;

      if (dayIndex === 1 && index === 1) {
        status = "LATE";
        notes = "Datang setelah jam masuk";
        lateArrivalAt = new Date(`${day}T01:15:00.000Z`);
      } else if (dayIndex === 2 && index === 2) {
        status = "SICK";
        notes = "Sakit";
      } else if (dayIndex === 3 && index === 3) {
        status = "LEAVE";
        notes = "Izin";
      }

      const attendanceDate = date(day);
      const existing = await prisma.studentAttendance.findFirst({
        where: { studentId: student.id, date: attendanceDate },
      });

      if (!existing) {
        await prisma.studentAttendance.create({
          data: {
            date: attendanceDate,
            status: status as any,
            lateArrivalAt,
            notes,
            studentId: student.id,
            classId: schoolClass.id,
            academicPeriodId: ganjil.id,
            schoolUnitId: schoolUnit.id,
            recordedById: admin.id,
          },
        });
      }
    }
  }

  const behaviorPlan = [
    [
      "720001",
      "7A",
      "2026-09-15",
      "EXCELLENT",
      "Aktif dan membantu teman saat pembelajaran.",
    ],
    [
      "720002",
      "7A",
      "2026-09-16",
      "GOOD",
      "Mengikuti pembelajaran dengan baik.",
    ],
    [
      "720003",
      "7A",
      "2026-09-17",
      "NEEDS_ATTENTION",
      "Perlu meningkatkan fokus saat pembelajaran.",
    ],
    ["810001", "8A", "2026-09-18", "GOOD", "Disiplin dan menyelesaikan tugas."],
  ] as const;

  for (const [nis, className, day, rating, notes] of behaviorPlan) {
    const student = studentByNis.get(nis)!;
    const schoolClass = classByName.get(className)!;
    const behaviorDate = date(day);

    const existing = await prisma.studentBehavior.findFirst({
      where: {
        studentId: student.id,
        date: behaviorDate,
        recordedById: admin.id,
      },
    });

    if (!existing) {
      await prisma.studentBehavior.create({
        data: {
          date: behaviorDate,
          rating: rating as any,
          notes,
          studentId: student.id,
          classId: schoolClass.id,
          academicPeriodId: ganjil.id,
          schoolUnitId: schoolUnit.id,
          recordedById: admin.id,
        },
      });
    }
  }

  const teacherAttendancePlan = [
    {
      id: "seed-teacher-attendance-01",
      teacherId: mainTeacher.id,
      day: "2026-09-10",
      status: "PRESENT",
      checkInAt: new Date("2026-09-09T23:55:00.000Z"),
      checkOutAt: new Date("2026-09-10T10:00:00.000Z"),
      isEarlyCheckout: false,
      approvalStatus: null,
      notes: "Data contoh kehadiran guru.",
    },
    {
      id: "seed-teacher-attendance-02",
      teacherId: ipaTeacher.id,
      day: "2026-09-16",
      status: "LATE",
      checkInAt: new Date("2026-09-16T00:25:00.000Z"),
      checkOutAt: new Date("2026-09-16T09:50:00.000Z"),
      isEarlyCheckout: true,
      approvalStatus: null,
      notes: "Data contoh keterlambatan guru.",
    },
    {
      id: "seed-teacher-attendance-03",
      teacherId: mathTeacher.id,
      day: "2026-09-17",
      status: "SICK",
      checkInAt: null,
      checkOutAt: null,
      isEarlyCheckout: false,
      approvalStatus: "APPROVED",
      notes: "Data contoh pengajuan sakit.",
    },
  ];

  for (const item of teacherAttendancePlan) {
    const attendanceDate = date(item.day);
    const existing = await prisma.teacherAttendance.findFirst({
      where: { teacherId: item.teacherId, date: attendanceDate },
    });
    if (!existing) {
      await prisma.teacherAttendance.create({
        data: {
          id: item.id,
          date: attendanceDate,
          status: item.status as any,
          checkInAt: item.checkInAt,
          checkOutAt: item.checkOutAt,
          isEarlyCheckout: item.isEarlyCheckout,
          approvalStatus: item.approvalStatus as any,
          reviewedAt: item.approvalStatus
            ? new Date("2026-09-17T03:00:00.000Z")
            : null,
          reviewedById: item.approvalStatus ? admin.id : null,
          reviewNotes: item.approvalStatus
            ? "Disetujui untuk data demo."
            : null,
          notes: item.notes,
          teacherId: item.teacherId,
          schoolUnitId: schoolUnit.id,
        },
      });
    }
  }

  const sickAttendance = await prisma.teacherAttendance.findFirst({
    where: { teacherId: mathTeacher.id, date: date("2026-09-17") },
  });

  if (sickAttendance) {
    const evidence = await prisma.teacherAttendanceEvidence.findFirst({
      where: { attendanceId: sickAttendance.id },
    });
    if (!evidence || evidence.mimeType !== "application/pdf") {
      const content = sickDemoPdf();
      await prisma.teacherAttendanceEvidence.upsert({
        where: { attendanceId: sickAttendance.id },
        update: {
          fileName: "template-surat-sakit-demo.pdf",
          mimeType: "application/pdf",
          size: content.length,
          content,
          uploadedAt: new Date(),
        },
        create: {
          attendanceId: sickAttendance.id,
          fileName: "template-surat-sakit-demo.pdf",
          mimeType: "application/pdf",
          size: content.length,
          content,
        },
      });
    }
  }

  const auditSeeds = [
    {
      id: "seed-audit-01",
      action: "CREATE",
      entity: "Student",
      entityId: studentByNis.get("720001")!.id,
      metadata: { source: "seed", description: "Membuat data siswa demo" },
      userId: admin.id,
    },
    {
      id: "seed-audit-02",
      action: "CREATE",
      entity: "Assessment",
      entityId: "seed-assessment-mat-assignment",
      metadata: { source: "seed", description: "Membuat assessment demo" },
      userId: mainTeacher.id,
    },
    {
      id: "seed-audit-03",
      action: "CREATE",
      entity: "TeacherAttendance",
      entityId: sickAttendance?.id ?? null,
      metadata: { source: "seed", description: "Membuat absensi guru demo" },
      userId: admin.id,
    },
  ];

  for (const log of auditSeeds) {
    await prisma.auditLog.upsert({
      where: { id: log.id },
      update: {},
      create: {
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        metadata: log.metadata,
        ipAddress: "127.0.0.1",
        userId: log.userId,
        schoolUnitId: schoolUnit.id,
      },
    });
  }

  console.table({
    SchoolUnit: await prisma.schoolUnit.count(),
    User: await prisma.user.count(),
    Session: await prisma.session.count(),
    AcademicPeriod: await prisma.academicPeriod.count(),
    SchoolClass: await prisma.schoolClass.count(),
    Student: await prisma.student.count(),
    StudentAttendance: await prisma.studentAttendance.count(),
    StudentBehavior: await prisma.studentBehavior.count(),
    ClassEnrollment: await prisma.classEnrollment.count(),
    Subject: await prisma.subject.count(),
    TeachingAssignment: await prisma.teachingAssignment.count(),
    TeacherScheduleSlot: await prisma.teacherScheduleSlot.count(),
    Assessment: await prisma.assessment.count(),
    Score: await prisma.score.count(),
    AuditLog: await prisma.auditLog.count(),
    TeacherAttendance: await prisma.teacherAttendance.count(),
    TeacherAttendanceEvidence: await prisma.teacherAttendanceEvidence.count(),
  });

  console.log("");
  console.log("Seed lengkap selesai.");
  console.log("Admin  : admin@integration.sch.id / Integration123!");
  console.log("Teacher: guru@integration.sch.id / Integration123!");
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
