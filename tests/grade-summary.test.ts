import { describe, expect, it } from 'vitest';
import { averagePercentages, weightedPercentage } from '../src/modules/reports/grade-summary.js';

describe('student grade summary', () => {
  it('normalizes a score to 100 then applies assessment weights', () => {
    expect(weightedPercentage([
      { value: 40, maxScore: 50, weight: 20 },
      { value: 90, maxScore: 100, weight: 30 },
    ])).toBe(86);
  });

  it('excludes missing scores and returns no average when all are missing', () => {
    expect(weightedPercentage([{ value: null, maxScore: 100, weight: 20 }])).toBeNull();
    expect(weightedPercentage([
      { value: null, maxScore: 100, weight: 80 },
      { value: 75, maxScore: 100, weight: 20 },
    ])).toBe(75);
  });

  it('averages only subjects with published grades', () => {
    expect(averagePercentages([80, null, 90])).toBe(85);
    expect(averagePercentages([null])).toBeNull();
  });
});
