-- Classlingo v2: Full schema with RLS
-- 10 tables: user_profile, classes, weeks, materials, chunks, wes_documents, exercises, progress, daily_stats, notes

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE user_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  hearts INTEGER NOT NULL DEFAULT 5,
  hearts_recharged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  daily_goal_minutes INTEGER NOT NULL DEFAULT 5,
  llm_provider TEXT NOT NULL DEFAULT 'anthropic',
  api_key TEXT NOT NULL DEFAULT '',
  generation_model TEXT NOT NULL DEFAULT '',
  feedback_model TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  content_text TEXT,
  storage_path TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  topic_label TEXT NOT NULL DEFAULT 'General',
  chunk_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE wes_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  markdown_content TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'generated', -- 'generated' or 'imported'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES chunks(id) ON DELETE SET NULL,
  wes_id UUID REFERENCES wes_documents(id) ON DELETE SET NULL,
  exercise_type TEXT NOT NULL DEFAULT 'mcq',
  question_json JSONB NOT NULL DEFAULT '{}',
  difficulty INTEGER NOT NULL DEFAULT 3,
  topic TEXT NOT NULL DEFAULT 'General',
  tier INTEGER, -- WES recall tier: 1, 2, or 3
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL UNIQUE REFERENCES exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 1,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review DATE NOT NULL DEFAULT CURRENT_DATE,
  last_quality INTEGER,
  times_seen INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  last_reviewed TIMESTAMPTZ
);

CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  exercises_completed INTEGER NOT NULL DEFAULT 0,
  streak_maintained BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, date)
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_classes_user ON classes(user_id);
CREATE INDEX idx_weeks_class ON weeks(class_id);
CREATE INDEX idx_materials_class ON materials(class_id);
CREATE INDEX idx_materials_week ON materials(week_id);
CREATE INDEX idx_chunks_material ON chunks(material_id);
CREATE INDEX idx_wes_class ON wes_documents(class_id);
CREATE INDEX idx_wes_week ON wes_documents(week_id);
CREATE INDEX idx_exercises_class ON exercises(class_id);
CREATE INDEX idx_exercises_wes ON exercises(wes_id);
CREATE INDEX idx_progress_user ON progress(user_id);
CREATE INDEX idx_progress_next_review ON progress(next_review);
CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date);
CREATE INDEX idx_notes_class ON notes(class_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wes_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- user_profile: users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profile FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON user_profile FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON user_profile FOR INSERT WITH CHECK (id = auth.uid());

-- classes: users can only access their own classes
CREATE POLICY "Users can view own classes" ON classes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create classes" ON classes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own classes" ON classes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own classes" ON classes FOR DELETE USING (user_id = auth.uid());

-- weeks: access through class ownership
CREATE POLICY "Users can view weeks" ON weeks FOR SELECT
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = weeks.class_id AND classes.user_id = auth.uid()));
CREATE POLICY "Users can create weeks" ON weeks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = weeks.class_id AND classes.user_id = auth.uid()));
CREATE POLICY "Users can update weeks" ON weeks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = weeks.class_id AND classes.user_id = auth.uid()));
CREATE POLICY "Users can delete weeks" ON weeks FOR DELETE
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = weeks.class_id AND classes.user_id = auth.uid()));

-- materials: access through class ownership
CREATE POLICY "Users can view materials" ON materials FOR SELECT
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = materials.class_id AND classes.user_id = auth.uid()));
CREATE POLICY "Users can create materials" ON materials FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = materials.class_id AND classes.user_id = auth.uid()));
CREATE POLICY "Users can delete materials" ON materials FOR DELETE
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = materials.class_id AND classes.user_id = auth.uid()));

-- chunks: access through material → class ownership
CREATE POLICY "Users can view chunks" ON chunks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM materials m JOIN classes c ON c.id = m.class_id
    WHERE m.id = chunks.material_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Users can create chunks" ON chunks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM materials m JOIN classes c ON c.id = m.class_id
    WHERE m.id = chunks.material_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete chunks" ON chunks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM materials m JOIN classes c ON c.id = m.class_id
    WHERE m.id = chunks.material_id AND c.user_id = auth.uid()
  ));

-- wes_documents: access through class ownership
CREATE POLICY "Users can view WES" ON wes_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = wes_documents.class_id AND classes.user_id = auth.uid()));
CREATE POLICY "Users can create WES" ON wes_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = wes_documents.class_id AND classes.user_id = auth.uid()));
CREATE POLICY "Users can update WES" ON wes_documents FOR UPDATE
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = wes_documents.class_id AND classes.user_id = auth.uid()));
CREATE POLICY "Users can delete WES" ON wes_documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = wes_documents.class_id AND classes.user_id = auth.uid()));

-- exercises: access through class ownership
CREATE POLICY "Users can view exercises" ON exercises FOR SELECT
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = exercises.class_id AND classes.user_id = auth.uid()));
CREATE POLICY "Users can create exercises" ON exercises FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = exercises.class_id AND classes.user_id = auth.uid()));
CREATE POLICY "Users can delete exercises" ON exercises FOR DELETE
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = exercises.class_id AND classes.user_id = auth.uid()));

-- progress: users can only access their own progress
CREATE POLICY "Users can view own progress" ON progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create progress" ON progress FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own progress" ON progress FOR UPDATE USING (user_id = auth.uid());

-- daily_stats: users can only access their own stats
CREATE POLICY "Users can view own stats" ON daily_stats FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create stats" ON daily_stats FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own stats" ON daily_stats FOR UPDATE USING (user_id = auth.uid());

-- notes: users can only access their own notes
CREATE POLICY "Users can view own notes" ON notes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create notes" ON notes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own notes" ON notes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notes" ON notes FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create user_profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profile (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_wes_documents_updated_at
  BEFORE UPDATE ON wes_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- STORAGE
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('course-materials', 'course-materials', false);

CREATE POLICY "Users can upload materials" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own materials" ON storage.objects FOR SELECT
  USING (bucket_id = 'course-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own materials" ON storage.objects FOR DELETE
  USING (bucket_id = 'course-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
