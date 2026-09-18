import type { AttendanceApprovalStatus } from '@prisma/client';

export function countsAsFinalAttendance(approvalStatus: AttendanceApprovalStatus | null): boolean {
  return approvalStatus !== 'PENDING' && approvalStatus !== 'REJECTED';
}
