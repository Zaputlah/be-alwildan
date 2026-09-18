export interface WeightedScore {
  value: number | null;
  maxScore: number;
  weight: number;
}

export function weightedPercentage(scores: WeightedScore[]): number | null {
  const graded = scores.filter((item) => item.value !== null && item.maxScore > 0 && item.weight > 0);
  if (!graded.length) return null;
  const totalWeight = graded.reduce((total, item) => total + item.weight, 0);
  const weightedTotal = graded.reduce((total, item) => total + (item.value! / item.maxScore * 100 * item.weight), 0);
  return Math.round(weightedTotal / totalWeight * 10) / 10;
}

export function averagePercentages(values: (number | null)[]): number | null {
  const graded = values.filter((value): value is number => value !== null);
  if (!graded.length) return null;
  return Math.round(graded.reduce((total, value) => total + value, 0) / graded.length * 10) / 10;
}
