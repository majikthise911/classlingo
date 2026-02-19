import { SupabaseClient } from "@supabase/supabase-js";
import type {
  UserProfile,
  Class,
  Week,
  Material,
  Chunk,
  WesDocument,
  Exercise,
  ExerciseQuestion,
  Progress,
  DailyStats,
  Note,
} from "./types";

// ============================================================
// User Profile
// ============================================================

export async function getProfile(supabase: SupabaseClient): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profile")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
}

export async function updateProfile(
  supabase: SupabaseClient,
  updates: Partial<Omit<UserProfile, "id" | "created_at" | "updated_at">>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("user_profile").update(updates).eq("id", user.id);
}

export async function rechargeHearts(supabase: SupabaseClient): Promise<number> {
  const profile = await getProfile(supabase);
  if (!profile) return 0;

  const lastRecharge = new Date(profile.hearts_recharged_at);
  const now = new Date();
  const hoursElapsed = (now.getTime() - lastRecharge.getTime()) / 3600000;
  const heartsToAdd = Math.floor(hoursElapsed);

  if (heartsToAdd > 0) {
    const newHearts = Math.min(5, profile.hearts + heartsToAdd);
    await updateProfile(supabase, {
      hearts: newHearts,
      hearts_recharged_at: now.toISOString(),
    });
    return newHearts;
  }
  return profile.hearts;
}

// ============================================================
// Classes
// ============================================================

export async function getClasses(supabase: SupabaseClient): Promise<Class[]> {
  const { data } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getClass(supabase: SupabaseClient, classId: string): Promise<Class | null> {
  const { data } = await supabase.from("classes").select("*").eq("id", classId).single();
  return data;
}

export async function createClass(supabase: SupabaseClient, name: string): Promise<Class | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("classes")
    .insert({ name, user_id: user.id })
    .select()
    .single();
  return data;
}

export async function deleteClass(supabase: SupabaseClient, classId: string): Promise<void> {
  await supabase.from("classes").delete().eq("id", classId);
}

// ============================================================
// Weeks
// ============================================================

export async function getWeeks(supabase: SupabaseClient, classId: string): Promise<Week[]> {
  const { data } = await supabase
    .from("weeks")
    .select("*")
    .eq("class_id", classId)
    .order("week_number", { ascending: true });
  return data ?? [];
}

export async function createWeek(
  supabase: SupabaseClient,
  classId: string,
  weekNumber: number,
  title: string
): Promise<Week | null> {
  const { data } = await supabase
    .from("weeks")
    .insert({ class_id: classId, week_number: weekNumber, title })
    .select()
    .single();
  return data;
}

export async function deleteWeek(supabase: SupabaseClient, weekId: string): Promise<void> {
  await supabase.from("weeks").delete().eq("id", weekId);
}

// ============================================================
// Materials
// ============================================================

export async function getMaterials(supabase: SupabaseClient, classId: string): Promise<Material[]> {
  const { data } = await supabase
    .from("materials")
    .select("*")
    .eq("class_id", classId)
    .order("uploaded_at", { ascending: false });
  return data ?? [];
}

export async function getMaterialsByWeek(
  supabase: SupabaseClient,
  weekId: string
): Promise<Material[]> {
  const { data } = await supabase
    .from("materials")
    .select("*")
    .eq("week_id", weekId)
    .order("uploaded_at", { ascending: false });
  return data ?? [];
}

export async function addMaterial(
  supabase: SupabaseClient,
  classId: string,
  filename: string,
  contentText: string | null,
  storagePath: string | null,
  weekId?: string | null
): Promise<Material | null> {
  const { data } = await supabase
    .from("materials")
    .insert({
      class_id: classId,
      filename,
      content_text: contentText,
      storage_path: storagePath,
      week_id: weekId ?? null,
    })
    .select()
    .single();
  return data;
}

export async function deleteMaterial(supabase: SupabaseClient, materialId: string): Promise<void> {
  await supabase.from("materials").delete().eq("id", materialId);
}

export async function assignMaterialToWeek(
  supabase: SupabaseClient,
  materialId: string,
  weekId: string | null
): Promise<void> {
  await supabase.from("materials").update({ week_id: weekId }).eq("id", materialId);
}

// ============================================================
// Chunks
// ============================================================

export async function addChunk(
  supabase: SupabaseClient,
  materialId: string,
  chunkText: string,
  topicLabel: string,
  chunkIndex: number
): Promise<Chunk | null> {
  const { data } = await supabase
    .from("chunks")
    .insert({ material_id: materialId, chunk_text: chunkText, topic_label: topicLabel, chunk_index: chunkIndex })
    .select()
    .single();
  return data;
}

export async function getChunksForClass(supabase: SupabaseClient, classId: string): Promise<Chunk[]> {
  const { data } = await supabase
    .from("chunks")
    .select("*, materials!inner(class_id)")
    .eq("materials.class_id", classId)
    .order("chunk_index", { ascending: true });
  return data ?? [];
}

export async function getChunkById(supabase: SupabaseClient, chunkId: string): Promise<Chunk | null> {
  const { data } = await supabase.from("chunks").select("*").eq("id", chunkId).single();
  return data;
}

// ============================================================
// WES Documents
// ============================================================

export async function getWesDocuments(supabase: SupabaseClient, classId: string): Promise<WesDocument[]> {
  const { data } = await supabase
    .from("wes_documents")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getWesDocument(supabase: SupabaseClient, wesId: string): Promise<WesDocument | null> {
  const { data } = await supabase.from("wes_documents").select("*").eq("id", wesId).single();
  return data;
}

export async function createWesDocument(
  supabase: SupabaseClient,
  classId: string,
  title: string,
  markdownContent: string,
  source: "generated" | "imported",
  weekId?: string | null
): Promise<WesDocument | null> {
  const { data } = await supabase
    .from("wes_documents")
    .insert({
      class_id: classId,
      week_id: weekId ?? null,
      title,
      markdown_content: markdownContent,
      source,
    })
    .select()
    .single();
  return data;
}

export async function updateWesDocument(
  supabase: SupabaseClient,
  wesId: string,
  updates: Partial<Pick<WesDocument, "title" | "markdown_content">>
): Promise<void> {
  await supabase.from("wes_documents").update(updates).eq("id", wesId);
}

export async function deleteWesDocument(supabase: SupabaseClient, wesId: string): Promise<void> {
  await supabase.from("wes_documents").delete().eq("id", wesId);
}

// ============================================================
// Exercises
// ============================================================

export async function addExercise(
  supabase: SupabaseClient,
  classId: string,
  questionJson: ExerciseQuestion,
  opts: { chunkId?: string; wesId?: string; tier?: number }
): Promise<Exercise | null> {
  const { data } = await supabase
    .from("exercises")
    .insert({
      class_id: classId,
      chunk_id: opts.chunkId ?? null,
      wes_id: opts.wesId ?? null,
      exercise_type: questionJson.type,
      question_json: questionJson,
      difficulty: questionJson.difficulty,
      topic: questionJson.topic,
      tier: opts.tier ?? null,
    })
    .select()
    .single();
  return data;
}

export async function getExercisesForClass(supabase: SupabaseClient, classId: string): Promise<Exercise[]> {
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getExerciseById(supabase: SupabaseClient, exerciseId: string): Promise<Exercise | null> {
  const { data } = await supabase.from("exercises").select("*").eq("id", exerciseId).single();
  return data;
}

// ============================================================
// Progress
// ============================================================

export async function getOrCreateProgress(
  supabase: SupabaseClient,
  exerciseId: string
): Promise<Progress | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("progress")
    .select("*")
    .eq("exercise_id", exerciseId)
    .single();

  if (existing) return existing;

  const { data } = await supabase
    .from("progress")
    .insert({
      exercise_id: exerciseId,
      user_id: user.id,
      next_review: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();
  return data;
}

export async function updateProgress(
  supabase: SupabaseClient,
  exerciseId: string,
  updates: {
    ease_factor: number;
    interval_days: number;
    repetitions: number;
    last_quality: number;
    correct: boolean;
  }
): Promise<void> {
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + updates.interval_days);

  await supabase
    .from("progress")
    .update({
      ease_factor: updates.ease_factor,
      interval_days: updates.interval_days,
      repetitions: updates.repetitions,
      next_review: nextReview.toISOString().split("T")[0],
      last_quality: updates.last_quality,
      times_seen: supabase.rpc ? undefined : undefined, // handled in SQL
      last_reviewed: new Date().toISOString(),
    })
    .eq("exercise_id", exerciseId);

  // Increment counters separately since Supabase doesn't support increment in update
  await supabase.rpc("increment_progress_counters", {
    p_exercise_id: exerciseId,
    p_correct: updates.correct,
  });
}

export async function getDueExercises(
  supabase: SupabaseClient,
  classId: string,
  limit: number = 20
): Promise<(Exercise & { next_review: string; times_seen: number; ease_factor: number })[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("progress")
    .select("*, exercises!inner(*)")
    .eq("exercises.class_id", classId)
    .lte("next_review", today)
    .order("next_review", { ascending: true })
    .order("ease_factor", { ascending: true })
    .limit(limit);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row.exercises as Exercise),
    next_review: row.next_review as string,
    times_seen: row.times_seen as number,
    ease_factor: row.ease_factor as number,
  }));
}

export async function getNewExercises(
  supabase: SupabaseClient,
  classId: string,
  limit: number = 10
): Promise<Exercise[]> {
  // Get exercises that don't have progress entries yet
  const { data: allExercises } = await supabase
    .from("exercises")
    .select("*, progress(id)")
    .eq("class_id", classId)
    .is("progress.id", null)
    .limit(limit);
  return allExercises ?? [];
}

// ============================================================
// Daily Stats
// ============================================================

export async function getTodayStats(supabase: SupabaseClient): Promise<DailyStats | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_stats")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (data) return data;

  // Create today's stats entry
  const { data: newData } = await supabase
    .from("daily_stats")
    .insert({ user_id: user.id, date: today })
    .select()
    .single();
  return newData;
}

export async function updateTodayStats(
  supabase: SupabaseClient,
  updates: { xp_delta?: number; exercises_delta?: number; lesson_completed?: boolean }
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split("T")[0];

  // Upsert today's stats
  await supabase.from("daily_stats").upsert(
    { user_id: user.id, date: today },
    { onConflict: "user_id,date" }
  );

  if (updates.xp_delta || updates.exercises_delta || updates.lesson_completed) {
    await supabase.rpc("update_daily_stats", {
      p_user_id: user.id,
      p_date: today,
      p_xp_delta: updates.xp_delta ?? 0,
      p_exercises_delta: updates.exercises_delta ?? 0,
      p_lesson_completed: updates.lesson_completed ?? false,
    });
  }
}

export async function getStatsHistory(
  supabase: SupabaseClient,
  days: number = 30
): Promise<DailyStats[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { data } = await supabase
    .from("daily_stats")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", cutoff.toISOString().split("T")[0])
    .order("date", { ascending: true });
  return data ?? [];
}

// ============================================================
// Notes
// ============================================================

export async function getNotes(supabase: SupabaseClient, classId: string): Promise<Note[]> {
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("class_id", classId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function createNote(
  supabase: SupabaseClient,
  classId: string,
  title: string,
  content: string
): Promise<Note | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("notes")
    .insert({ class_id: classId, user_id: user.id, title, content })
    .select()
    .single();
  return data;
}

export async function updateNote(
  supabase: SupabaseClient,
  noteId: string,
  updates: Partial<Pick<Note, "title" | "content">>
): Promise<void> {
  await supabase.from("notes").update(updates).eq("id", noteId);
}

export async function deleteNote(supabase: SupabaseClient, noteId: string): Promise<void> {
  await supabase.from("notes").delete().eq("id", noteId);
}
