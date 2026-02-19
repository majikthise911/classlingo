// Database types matching Supabase schema

export interface UserProfile {
  id: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  level: number;
  hearts: number;
  hearts_recharged_at: string;
  daily_goal_minutes: number;
  llm_provider: string;
  api_key: string;
  generation_model: string;
  feedback_model: string;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Week {
  id: string;
  class_id: string;
  week_number: number;
  title: string;
  created_at: string;
}

export interface Material {
  id: string;
  class_id: string;
  week_id: string | null;
  filename: string;
  content_text: string | null;
  storage_path: string | null;
  uploaded_at: string;
}

export interface Chunk {
  id: string;
  material_id: string;
  chunk_text: string;
  topic_label: string;
  chunk_index: number;
}

export interface WesDocument {
  id: string;
  class_id: string;
  week_id: string | null;
  title: string;
  markdown_content: string;
  source: "generated" | "imported";
  created_at: string;
  updated_at: string;
}

export interface ExerciseQuestion {
  type: "mcq" | "fill_blank" | "computation" | "conceptual";
  question: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
  hint?: string;
  difficulty: number;
  topic: string;
  tolerance?: number | null;
}

export interface Exercise {
  id: string;
  class_id: string;
  chunk_id: string | null;
  wes_id: string | null;
  exercise_type: string;
  question_json: ExerciseQuestion;
  difficulty: number;
  topic: string;
  tier: number | null;
  created_at: string;
}

export interface Progress {
  id: string;
  exercise_id: string;
  user_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
  last_quality: number | null;
  times_seen: number;
  times_correct: number;
  last_reviewed: string | null;
}

export interface DailyStats {
  id: string;
  user_id: string;
  date: string;
  xp_earned: number;
  lessons_completed: number;
  exercises_completed: number;
  streak_maintained: boolean;
}

export interface Note {
  id: string;
  class_id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}
