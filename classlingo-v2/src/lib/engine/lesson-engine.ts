/**
 * Lesson engine: topic selection, exercise generation, answer processing.
 * Port of Python core/lesson_engine.py
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Exercise, ExerciseQuestion } from "@/lib/db/types";
import {
  getDueExercises,
  getNewExercises,
  getOrCreateProgress,
  getExerciseById,
  updateProgress,
} from "@/lib/db/queries";
import { sm2Update, qualityFromCorrect } from "./spaced-rep";
import { awardXp, useHeart, getHearts } from "./gamification";

/**
 * Select exercises for a lesson using spaced repetition + new material mix.
 */
export async function selectLessonExercises(
  supabase: SupabaseClient,
  classId: string,
  targetCount: number = 7
): Promise<Exercise[]> {
  const reviewCount = Math.round(targetCount * 0.6);
  let newCount = targetCount - reviewCount;

  const due = await getDueExercises(supabase, classId, reviewCount);
  const exercises: Exercise[] = [...due];

  if (exercises.length < reviewCount) {
    newCount += reviewCount - exercises.length;
  }

  const newExercises = await getNewExercises(supabase, classId, newCount);
  // Initialize progress for new exercises
  for (const ex of newExercises) {
    await getOrCreateProgress(supabase, ex.id);
  }
  exercises.push(...newExercises);

  // Shuffle
  for (let i = exercises.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
  }

  return exercises.slice(0, targetCount);
}

/**
 * Check if user's answer is correct.
 */
export function checkAnswer(exerciseJson: ExerciseQuestion, userAnswer: string): boolean {
  const exType = exerciseJson.type;
  const correct = exerciseJson.correct_answer ?? "";

  if (exType === "mcq") {
    const userLetter = userAnswer.trim().toUpperCase().charAt(0);
    const correctLetter = correct.trim().toUpperCase().charAt(0);
    return userLetter === correctLetter;
  }

  if (exType === "computation") {
    try {
      const userVal = parseFloat(userAnswer.trim().replace(/,/g, ""));
      const correctVal = parseFloat(correct);
      let tolerance = exerciseJson.tolerance;
      if (tolerance == null) {
        tolerance = Math.abs(correctVal * 0.02);
      }
      return Math.abs(userVal - correctVal) <= Math.abs(tolerance);
    } catch {
      return false;
    }
  }

  if (exType === "fill_blank") {
    return userAnswer.trim().toLowerCase() === correct.trim().toLowerCase();
  }

  // Conceptual — always send to AI for grading, default to true for effort
  return true;
}

/**
 * Process a user's answer: check, update progress, return result.
 */
export async function processAnswer(
  supabase: SupabaseClient,
  exerciseId: string,
  userAnswer: string
): Promise<{
  correct: boolean;
  xpEarned: number;
  hearts: number;
  explanation: string;
}> {
  const exercise = await getExerciseById(supabase, exerciseId);
  if (!exercise) {
    return { correct: false, xpEarned: 0, hearts: 0, explanation: "Exercise not found." };
  }

  const exJson = exercise.question_json as ExerciseQuestion;
  const correct = checkAnswer(exJson, userAnswer);

  // Update spaced repetition
  const progress = await getOrCreateProgress(supabase, exerciseId);
  if (progress) {
    const quality = qualityFromCorrect(correct, exercise.difficulty);
    const result = sm2Update(
      quality,
      progress.repetitions,
      progress.ease_factor,
      progress.interval_days
    );
    await updateProgress(supabase, exerciseId, {
      ease_factor: result.easeFactor,
      interval_days: result.interval,
      repetitions: result.repetitions,
      last_quality: quality,
      correct,
    });
  }

  // XP and hearts
  const xp = await awardXp(supabase, correct);
  if (!correct) {
    await useHeart(supabase);
  }

  const hearts = await getHearts(supabase);

  return {
    correct,
    xpEarned: xp,
    hearts,
    explanation: exJson.explanation ?? "",
  };
}
