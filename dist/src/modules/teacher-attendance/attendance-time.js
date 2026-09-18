export function schoolMinutes(now, timeZone) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
    return hour * 60 + minute;
}
export function minutesFromClock(value) {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
}
export function isBeforeSchoolTime(value, timeZone, cutoff) {
    return !!value && schoolMinutes(value, timeZone) < minutesFromClock(cutoff);
}
