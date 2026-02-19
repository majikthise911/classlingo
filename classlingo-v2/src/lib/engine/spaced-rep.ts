/**
 * SM-2 spaced repetition algorithm.
 * Port of Python core/spaced_rep.py
 */

export interface SM2Result {
  repetitions: number;
  easeFactor: number;
  interval: number; // days
}

/**
 * SM-2 spaced repetition update.
 * @param quality 0-5 (0=blackout, 3=correct with difficulty, 5=perfect recall)
 * @param repetitions current repetition count
 * @param easeFactor current ease factor (>=1.3)
 * @param interval current interval in days
 */
export function sm2Update(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number
): SM2Result {
  if (quality >= 3) {
    // correct
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // incorrect — reset
    repetitions = 0;
    interval = 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  return { repetitions, easeFactor, interval };
}

/**
 * Map a correct/incorrect answer + difficulty to SM-2 quality score.
 * @returns 0-5 quality score
 */
export function qualityFromCorrect(correct: boolean, difficulty: number = 3): number {
  if (correct) {
    if (difficulty <= 2) return 5; // easy + correct = perfect
    if (difficulty <= 3) return 4; // medium + correct = good
    return 3; // hard + correct = acceptable
  } else {
    if (difficulty >= 4) return 2; // hard + wrong = partial
    return 1; // easy/medium + wrong = poor
  }
}
