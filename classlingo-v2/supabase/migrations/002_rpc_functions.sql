-- RPC functions for atomic counter increments

CREATE OR REPLACE FUNCTION increment_progress_counters(
  p_exercise_id UUID,
  p_correct BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  UPDATE progress
  SET
    times_seen = times_seen + 1,
    times_correct = times_correct + CASE WHEN p_correct THEN 1 ELSE 0 END
  WHERE exercise_id = p_exercise_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_daily_stats(
  p_user_id UUID,
  p_date DATE,
  p_xp_delta INTEGER,
  p_exercises_delta INTEGER,
  p_lesson_completed BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_stats (user_id, date)
  VALUES (p_user_id, p_date)
  ON CONFLICT (user_id, date) DO NOTHING;

  UPDATE daily_stats
  SET
    xp_earned = xp_earned + p_xp_delta,
    exercises_completed = exercises_completed + p_exercises_delta,
    lessons_completed = lessons_completed + CASE WHEN p_lesson_completed THEN 1 ELSE 0 END,
    streak_maintained = CASE WHEN p_lesson_completed THEN true ELSE streak_maintained END
  WHERE user_id = p_user_id AND date = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
