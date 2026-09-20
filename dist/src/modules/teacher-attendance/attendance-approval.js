export function countsAsFinalAttendance(approvalStatus) {
    return approvalStatus !== 'PENDING' && approvalStatus !== 'PENDING_BRANCH' && approvalStatus !== 'PENDING_CENTRAL' && approvalStatus !== 'REJECTED';
}
