import { minutesFromClock, schoolMinutes } from './attendance-time.js';
export function attendanceRemarks(record, timeZone, lateAfter, earlyCheckoutBefore) {
    const remarks = [];
    if (record.approvalStatus === 'PENDING')
        remarks.push('Pengajuan menunggu persetujuan Admin.');
    if (record.approvalStatus === 'REJECTED')
        remarks.push('Pengajuan ditolak Admin.');
    const clock = (value) => new Intl.DateTimeFormat('en-GB', {
        timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(value);
    if (record.checkInAt) {
        const checkedInAt = schoolMinutes(record.checkInAt, timeZone);
        const lateMinutes = checkedInAt - minutesFromClock(lateAfter);
        remarks.push(lateMinutes > 0
            ? `Terlambat ${lateMinutes} menit (masuk ${clock(record.checkInAt)}; batas ${lateAfter}).`
            : `Masuk tepat waktu (${clock(record.checkInAt)}; batas ${lateAfter}).`);
    }
    else if (record.status === 'SICK') {
        remarks.push('Tidak check-in karena sakit.');
    }
    else if (record.status === 'LEAVE') {
        remarks.push('Tidak check-in karena izin.');
    }
    else if (record.status === 'DUTY') {
        remarks.push('Tidak check-in karena tugas sekolah/dinas.');
    }
    else if (record.status === 'ABSENT') {
        remarks.push('Tidak hadir (alpa).');
    }
    else {
        remarks.push('Belum check-in.');
    }
    if (record.checkOutAt) {
        const checkedOutAt = schoolMinutes(record.checkOutAt, timeZone);
        const earlyMinutes = minutesFromClock(earlyCheckoutBefore) - checkedOutAt;
        remarks.push(earlyMinutes > 0
            ? `Pulang terlalu cepat ${earlyMinutes} menit (${clock(record.checkOutAt)}; jadwal ${earlyCheckoutBefore}).`
            : `Pulang sesuai jadwal (${clock(record.checkOutAt)}; mulai ${earlyCheckoutBefore}).`);
    }
    else if (record.checkInAt) {
        remarks.push('Belum check-out.');
    }
    if (record.notes)
        remarks.push(`Catatan: ${record.notes}`);
    return remarks;
}
