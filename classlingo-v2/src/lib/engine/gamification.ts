/**
 * Gamification: XP, hearts, streaks, levels.
 * Port of Python core/gamification.py
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  getProfile,
  updateProfile,
  getTodayStats,
  updateTodayStats,
  rechargeHearts,
} from "@/lib/db/queries";

// XP rewards
export const XP_CORRECT = 10;
export const XP_INCORRECT = 5; // effort reward
export const XP_LESSON_BONUS = 50;
export const XP_STREAK_BONUS = 20;

/** Award XP for answering an exercise. Returns XP earned. */
export async function awardXp(supabase: SupabaseClient, correct: boolean): Promise<number> {
  const xp = correct ? XP_CORRECT : XP_INCORRECT;
  const profile = await getProfile(supabase);
  if (!profile) return 0;

  const newTotal = profile.total_xp + xp;
  const newLevel = Math.floor(newTotal / 100) + 1;
  await updateProfile(supabase, { total_xp: newTotal, level: newLevel });
  await updateTodayStats(supabase, { xp_delta: xp, exercises_delta: 1 });
  return xp;
}

/** Award lesson completion bonus. Returns total bonus XP. */
export async function completeLesson(supabase: SupabaseClient): Promise<number> {
  const profile = await getProfile(supabase);
  if (!profile) return 0;

  let bonus = XP_LESSON_BONUS;

  const todayStats = await getTodayStats(supabase);
  if (todayStats && !todayStats.streak_maintained) {
    bonus += XP_STREAK_BONUS;
    await updateStreak(supabase);
  }

  const newTotal = profile.total_xp + bonus;
  const newLevel = Math.floor(newTotal / 100) + 1;
  await updateProfile(supabase, { total_xp: newTotal, level: newLevel });
  await updateTodayStats(supabase, { xp_delta: bonus, lesson_completed: true });
  return bonus;
}

async function updateStreak(supabase: SupabaseClient): Promise<void> {
  const profile = await getProfile(supabase);
  if (!profile) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const { data: yesterdayRow } = await supabase
    .from("daily_stats")
    .select("streak_maintained")
    .eq("user_id", user.id)
    .eq("date", yesterdayStr)
    .single();

  let newStreak: number;
  if (yesterdayRow?.streak_maintained) {
    newStreak = profile.current_streak + 1;
  } else {
    newStreak = 1;
  }

  const longest = Math.max(profile.longest_streak, newStreak);
  await updateProfile(supabase, { current_streak: newStreak, longest_streak: longest });
}

/** Consume a heart on wrong answer. Returns false if no hearts left. */
export async function useHeart(supabase: SupabaseClient): Promise<boolean> {
  const hearts = await rechargeHearts(supabase);
  if (hearts <= 0) return false;
  await updateProfile(supabase, { hearts: hearts - 1 });
  return true;
}

/** Get current heart count (after recharging). */
export async function getHearts(supabase: SupabaseClient): Promise<number> {
  return rechargeHearts(supabase);
}

/** Get level info for display. */
export async function getLevelInfo(
  supabase: SupabaseClient
): Promise<{ level: number; totalXp: number; xpInLevel: number; xpToNext: number }> {
  const profile = await getProfile(supabase);
  if (!profile) return { level: 1, totalXp: 0, xpInLevel: 0, xpToNext: 100 };

  const xpInLevel = profile.total_xp % 100;
  return {
    level: profile.level,
    totalXp: profile.total_xp,
    xpInLevel,
    xpToNext: 100 - xpInLevel,
  };
}
