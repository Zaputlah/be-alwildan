export function countsAsFinalAttendance(approvalStatus) {
    return approvalStatus !== 'PENDING' && approvalStatus !== 'REJECTED';
}
