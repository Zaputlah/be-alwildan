CREATE TABLE "TeacherScheduleSlot" (
  "id" TEXT NOT NULL,
  "teachingAssignmentId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "room" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherScheduleSlot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeacherScheduleSlot_weekday_check" CHECK ("weekday" BETWEEN 1 AND 7),
  CONSTRAINT "TeacherScheduleSlot_time_check" CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "startMinute" < "endMinute")
);

CREATE UNIQUE INDEX "TeacherScheduleSlot_teachingAssignmentId_weekday_startMinute_key" ON "TeacherScheduleSlot"("teachingAssignmentId", "weekday", "startMinute");
CREATE INDEX "TeacherScheduleSlot_weekday_startMinute_idx" ON "TeacherScheduleSlot"("weekday", "startMinute");
ALTER TABLE "TeacherScheduleSlot" ADD CONSTRAINT "TeacherScheduleSlot_teachingAssignmentId_fkey" FOREIGN KEY ("teachingAssignmentId") REFERENCES "TeachingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
