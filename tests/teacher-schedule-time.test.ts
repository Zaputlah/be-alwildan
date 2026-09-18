import { describe, expect, it } from 'vitest';
import { dateInTimezone, minuteLabel, weekdayInTimezone } from '../src/modules/teacher-schedule/schedule-time.js';

describe('teacher schedule time', () => {
  it('uses the school timezone for the current weekday', () => {
    const instant = new Date('2026-09-13T18:00:00.000Z');
    expect(weekdayInTimezone(instant, 'Asia/Jakarta')).toBe(1);
    expect(weekdayInTimezone(instant, 'UTC')).toBe(7);
    expect(dateInTimezone(instant, 'Asia/Jakarta')).toBe('2026-09-14');
    expect(dateInTimezone(instant, 'UTC')).toBe('2026-09-13');
  });

  it('formats minute offsets as local teaching hours', () => {
    expect(minuteLabel(480)).toBe('08:00');
    expect(minuteLabel(665)).toBe('11:05');
  });
});
