import type { AssessmentType } from '@prisma/client';

// Standard contribution to the final score. The total academic contribution
// is 75%; student attendance contributes the remaining 25%.
export const ASSESSMENT_WEIGHTS: Record<AssessmentType, number> = {
  ASSIGNMENT: 15,
  QUIZ: 7.5,
  PRACTICE: 11.25,
  PROJECT: 11.25,
  MIDTERM: 11.25,
  FINAL: 18.75,
};

export function assessmentWeight(type: AssessmentType) {
  return ASSESSMENT_WEIGHTS[type];
}
