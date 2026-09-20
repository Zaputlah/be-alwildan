import type { AttendanceApprovalStatus } from '@prisma/client';

export function countsAsFinalAttendance(approvalStatus: AttendanceApprovalStatus | 'PENDING' | null): boolean {
  return approvalStatus !== 'PENDING' && approvalStatus !== 'PENDING_BRANCH' && approvalStatus !== 'PENDING_CENTRAL' && approvalStatus !== 'REJECTED';
}
