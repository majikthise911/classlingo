Plan to implement                                                         │
│                                                                           │
│ Classlingo Implementation Plan                                            │
│                                                                           │
│ Context                                                                   │
│                                                                           │
│ Jordan is a full-time professional + full-time grad student (SPCE 5025 —  │
│ orbital mechanics). He wants a personal Duolingo-style app that turns     │
│ uploaded course materials (math-heavy PDFs, lecture slides, homework with │
│  LaTeX) into daily 5-8 minute micro-lessons with spaced repetition and    │
│ gamification. Must be built in ≤15 hours, run on phone (PWA), cost        │
│ <$10/mo, and require zero maintenance.                                    │
│                                                                           │
│ ---                                                                       │
│ 1. Executive Recommendation                                               │
│                                                                           │
│ Python + Streamlit + Claude API + SQLite. This is the fastest path to a   │
│ working, phone-usable MVP. Streamlit eliminates all frontend work,        │
│ deploys free to Streamlit Community Cloud with one click, and integrates  │
│ natively with Claude. SQLite provides zero-config persistence. The entire │
│  app is ~6-8 files.                                                       │
│                                                                           │
│ Chosen Stack:                                                             │
│ - UI: Streamlit 1.41+ (with custom CSS for mobile)                        │
│ - AI: Multi-provider LLM support — user selects Anthropic (Claude),       │
│ OpenAI (GPT-4o), or xAI (Grok) in Settings. Unified llm_client.py wrapper │
│  with thin adapters per provider.                                         │
│ - PDF Parsing: PyMuPDF (fitz) — best for math-heavy PDFs with layout      │
│ preservation                                                              │
│ - Embeddings/RAG: sentence-transformers + numpy cosine similarity (no     │
│ vector DB needed for single-user)                                         │
│ - Storage: SQLite via Python sqlite3 — local-only (no cloud persistence)  │
│ - Spaced Repetition: SM-2 algorithm (simple, proven, ~50 lines of code)   │
│ - Deployment: Local-first; optional Streamlit Community Cloud later       │
│ - LaTeX: Streamlit's native st.latex() + st.markdown() with KaTeX         │
│                                                                           │
│ ---                                                                       │
│ 2. Platform Decision Matrix                                               │
│                                                                           │
│ Platform: Native iOS                                                      │
│ Dev Time: 80h+                                                            │
│ Mobile UX: 10/10                                                          │
│ AI Integration: 5/10                                                      │
│ Cost: $99/yr                                                              │
│ Maintenance: High                                                         │
│ Score: 3/10                                                               │
│ ────────────────────────────────────────                                  │
│ Platform: React Native                                                    │
│ Dev Time: 60h+                                                            │
│ Mobile UX: 9/10                                                           │
│ AI Integration: 6/10                                                      │
│ Cost: Free                                                                │
│ Maintenance: High                                                         │
│ Score: 4/10                                                               │
│ ────────────────────────────────────────                                  │
│ Platform: Next.js PWA                                                     │
│ Dev Time: 40h+                                                            │
│ Mobile UX: 8/10                                                           │
│ AI Integration: 8/10                                                      │
│ Cost: Free                                                                │
│ Maintenance: Medium                                                       │
│ Score: 5/10                                                               │
│ ────────────────────────────────────────                                  │
│ Platform: Bubble/No-code                                                  │
│ Dev Time: 30h                                                             │
│ Mobile UX: 6/10                                                           │
│ AI Integration: 3/10                                                      │
│ Cost: $29/mo                                                              │
│ Maintenance: Low                                                          │
│ Score: 4/10                                                               │
│ ────────────────────────────────────────                                  │
│ Platform: Streamlit                                                       │
│ Dev Time: 12-15h                                                          │
│ Mobile UX: 6/10                                                           │
│ AI Integration: 10/10                                                     │
│ Cost: Free                                                                │
│ Maintenance: Zero                                                         │
│ Score: 8/10                                                               │
│ ────────────────────────────────────────                                  │
│ Platform: Gradio                                                          │
│ Dev Time: 15h                                                             │
│ Mobile UX: 5/10                                                           │
│ AI Integration: 9/10                                                      │
│ Cost: Free                                                                │
│ Maintenance: Zero                                                         │
│ Score: 6/10                                                               │
│ ────────────────────────────────────────                                  │
│ Platform: Reflex                                                          │
│ Dev Time: 20h                                                             │
│ Mobile UX: 7/10                                                           │
│ AI Integration: 8/10                                                      │
│ Cost: Free                                                                │
│ Maintenance: Low                                                          │
│ Score: 6/10                                                               │
│                                                                           │
│ Streamlit wins on dev time + AI integration + zero maintenance. Mobile UX │
│  is "good enough" with custom CSS (large buttons, dark mode, minimal      │
│ scrolling).                                                               │
│                                                                           │
│ ---                                                                       │
│ 3. Architecture                                                           │
│                                                                           │
│ User Phone (PWA) → Streamlit App                                          │
│                         ├── Pages (multipage app)                         │
│                         │   ├── Home/Dashboard                            │
│                         │   ├── Lesson Player                             │
│                         │   ├── Upload Materials                          │
│                         │   └── Progress Stats                            │
│                         ├── Core Modules                                  │
│                         │   ├── llm_client.py        (multi-provider:     │
│ Anthropic/OpenAI/xAI)                                                     │
│                         │   ├── content_parser.py    (PDF/MD → chunks)    │
│                         │   ├── lesson_engine.py     (LLM → exercises)    │
│                         │   ├── spaced_rep.py        (SM-2 scheduling)    │
│                         │   └── gamification.py      (XP, streaks,        │
│ hearts)                                                                   │
│                         └── Storage                                       │
│                             └── classlingo.db (SQLite)                    │
│                                                                           │
│                                                                           │
│ ---                                                                       │
│ 4. File Structure                                                         │
│                                                                           │
│ classlingo/                                                               │
│ ├── app.py                  # Streamlit entry point + navigation          │
│ ├── pages/                                                                │
│ │   ├── 1_dashboard.py      # Home screen: streak, XP, start lesson       │
│ │   ├── 2_lesson.py         # Lesson player: exercise flow                │
│ │   ├── 3_upload.py         # Upload & manage class materials             │
│ │   └── 4_progress.py       # Stats, weak areas, review history           │
│ ├── core/                                                                 │
│ │   ├── __init__.py                                                       │
│ │   ├── llm_client.py       # Multi-provider LLM wrapper                  │
│ (Anthropic/OpenAI/xAI)                                                    │
│ │   ├── content_parser.py   # PDF/MD extraction + chunking                │
│ │   ├── lesson_engine.py    # Prompt chain → exercise generation          │
│ │   ├── spaced_rep.py       # SM-2 algorithm + scheduling                 │
│ │   ├── gamification.py     # XP, hearts, streaks, levels                 │
│ │   └── database.py         # SQLite schema + CRUD operations             │
│ ├── pages/                                                                │
│ │   ...                                                                   │
│ │   └── 5_settings.py       # LLM provider selection + API key entry      │
│ ├── assets/                                                               │
│ │   └── style.css           # Mobile-first dark mode CSS                  │
│ ├── requirements.txt                                                      │
│ ├── .streamlit/                                                           │
│ │   └── config.toml         # Theme + server config                       │
│ └── README.md                                                             │
│                                                                           │
│                                                                           │
│ ---                                                                       │
│ 5. Data Model (SQLite)                                                    │
│                                                                           │
│ -- Classes (like Duolingo courses)                                        │
│ CREATE TABLE classes (                                                    │
│     id INTEGER PRIMARY KEY,                                               │
│     name TEXT NOT NULL,                                                   │
│     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP                        │
│ );                                                                        │
│                                                                           │
│ -- Uploaded materials (source documents)                                  │
│ CREATE TABLE materials (                                                  │
│     id INTEGER PRIMARY KEY,                                               │
│     class_id INTEGER REFERENCES classes(id),                              │
│     filename TEXT,                                                        │
│     content_text TEXT,        -- extracted full text                      │
│     uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP                       │
│ );                                                                        │
│                                                                           │
│ -- Content chunks (for RAG retrieval)                                     │
│ CREATE TABLE chunks (                                                     │
│     id INTEGER PRIMARY KEY,                                               │
│     material_id INTEGER REFERENCES materials(id),                         │
│     chunk_text TEXT,                                                      │
│     topic_label TEXT,         -- AI-generated topic tag                   │
│     embedding BLOB,           -- numpy array as bytes                     │
│     chunk_index INTEGER                                                   │
│ );                                                                        │
│                                                                           │
│ -- Generated exercises (cached for reuse)                                 │
│ CREATE TABLE exercises (                                                  │
│     id INTEGER PRIMARY KEY,                                               │
│     class_id INTEGER REFERENCES classes(id),                              │
│     chunk_id INTEGER REFERENCES chunks(id),                               │
│     exercise_type TEXT,       -- mcq, fill_blank, matching, computation,  │
│ conceptual                                                                │
│     question_json TEXT,       -- full exercise as JSON                    │
│     difficulty INTEGER,       -- 1-5                                      │
│     topic TEXT,                                                           │
│     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP                        │
│ );                                                                        │
│                                                                           │
│ -- User progress per exercise (SM-2 tracking)                             │
│ CREATE TABLE progress (                                                   │
│     id INTEGER PRIMARY KEY,                                               │
│     exercise_id INTEGER REFERENCES exercises(id),                         │
│     ease_factor REAL DEFAULT 2.5,                                         │
│     interval_days INTEGER DEFAULT 1,                                      │
│     repetitions INTEGER DEFAULT 0,                                        │
│     next_review DATE,                                                     │
│     last_quality INTEGER,     -- 0-5 SM-2 quality score                   │
│     times_seen INTEGER DEFAULT 0,                                         │
│     times_correct INTEGER DEFAULT 0,                                      │
│     last_reviewed TIMESTAMP                                               │
│ );                                                                        │
│                                                                           │
│ -- Daily stats (gamification)                                             │
│ CREATE TABLE daily_stats (                                                │
│     date DATE PRIMARY KEY,                                                │
│     xp_earned INTEGER DEFAULT 0,                                          │
│     lessons_completed INTEGER DEFAULT 0,                                  │
│     exercises_completed INTEGER DEFAULT 0,                                │
│     streak_maintained BOOLEAN DEFAULT 0                                   │
│ );                                                                        │
│                                                                           │
│ -- User profile (single user, but extensible)                             │
│ CREATE TABLE user_profile (                                               │
│     id INTEGER PRIMARY KEY DEFAULT 1,                                     │
│     total_xp INTEGER DEFAULT 0,                                           │
│     current_streak INTEGER DEFAULT 0,                                     │
│     longest_streak INTEGER DEFAULT 0,                                     │
│     level INTEGER DEFAULT 1,                                              │
│     hearts INTEGER DEFAULT 5,                                             │
│     hearts_recharged_at TIMESTAMP,                                        │
│     daily_goal_minutes INTEGER DEFAULT 5                                  │
│ );                                                                        │
│                                                                           │
│ ---                                                                       │
│ 6. Multi-Provider LLM Client (core/llm_client.py)                         │
│                                                                           │
│ Unified interface so lesson_engine.py never knows which provider is       │
│ active:                                                                   │
│                                                                           │
│ # Supported providers and their models:                                   │
│ PROVIDERS = {                                                             │
│     "anthropic": {                                                        │
│         "generation": "claude-sonnet-4-20250514",                         │
│         "feedback": "claude-haiku-4-5-20251001",                          │
│         "package": "anthropic",                                           │
│     },                                                                    │
│     "openai": {                                                           │
│         "generation": "gpt-4o",                                           │
│         "feedback": "gpt-4o-mini",                                        │
│         "package": "openai",                                              │
│     },                                                                    │
│     "xai": {                                                              │
│         "generation": "grok-3",                                           │
│         "feedback": "grok-3-mini",                                        │
│         "package": "openai",  # xAI uses OpenAI-compatible API            │
│         "base_url": "https://api.x.ai/v1",                                │
│     },                                                                    │
│ }                                                                         │
│                                                                           │
│ class LLMClient:                                                          │
│     def generate(self, system_prompt: str, user_prompt: str, model_tier:  │
│ str = "generation") -> str:                                               │
│         """Unified generation call. model_tier is 'generation' or         │
│ 'feedback'."""                                                            │
│         # Routes to correct provider based on user settings in DB         │
│                                                                           │
│ - User selects provider + enters API key in Settings page (stored in      │
│ user_profile table)                                                       │
│ - xAI uses the OpenAI SDK with a custom base_url — zero extra code        │
│ - All three providers support JSON mode for structured exercise output    │
│ - Adds ~1 hour to build, but makes the app provider-agnostic              │
│                                                                           │
│ ---                                                                       │
│ 7. AI Lesson Generation Pipeline                                          │
│                                                                           │
│ Step 1: Content Parsing (content_parser.py)                               │
│                                                                           │
│ - PyMuPDF extracts text from PDFs preserving layout (important for        │
│ equations)                                                                │
│ - Markdown files read directly                                            │
│ - Chunking strategy: Split by headings/sections (not fixed-size) to keep  │
│ conceptual units together. Target 500-1000 tokens per chunk. For math     │
│ content, keep equation + surrounding context as one chunk.                │
│ - Topic tagging: One Claude Haiku call per chunk to assign a topic label  │
│ (e.g., "Rotation Matrices", "Keplerian Elements", "UVW Frame")            │
│                                                                           │
│ Step 2: Lesson Topic Selection (lesson_engine.py)                         │
│                                                                           │
│ Based on spaced repetition schedule:                                      │
│ 1. Query progress table for exercises due today (next_review ≤ today)     │
│ 2. If < 5 review exercises, select new topics from least-seen chunks      │
│ 3. Mix: 60% review (spaced rep), 40% new material (interleaving)          │
│                                                                           │
│ Step 3: Exercise Generation (via LLM Client — any provider)               │
│                                                                           │
│ System prompt for exercise generation:                                    │
│                                                                           │
│ You are an expert tutor for a graduate orbital mechanics course (SPCE     │
│ 5025).                                                                    │
│ Generate exercises from the provided course material chunk.               │
│                                                                           │
│ Rules:                                                                    │
│ - Each exercise tests ONE concept from the chunk                          │
│ - Use the exact notation from the course material                         │
│ - For math: use LaTeX notation wrapped in $...$ or $$...$$                │
│ - Difficulty 1-5 (1=definition recall, 5=multi-step computation)          │
│ - Always include a detailed explanation for the correct answer            │
│ - Reference specific slide numbers or homework problems when possible     │
│                                                                           │
│ Output as JSON with this schema:                                          │
│ {                                                                         │
│   "type":                                                                 │
│ "mcq|fill_blank|matching|computation|conceptual|code_completion",         │
│   "question": "string with LaTeX",                                        │
│   "options": ["A", "B", "C", "D"],  // for MCQ only                       │
│   "correct_answer": "string",                                             │
│   "explanation": "detailed explanation with LaTeX",                       │
│   "hint": "optional hint",                                                │
│   "difficulty": 1-5,                                                      │
│   "topic": "topic label"                                                  │
│ }                                                                         │
│                                                                           │
│                                                                           │
│ Exercise types for math-heavy content:                                    │
│                                                                           │
│ Type: MCQ                                                                 │
│ Example for SPCE 5025: "Which formula gives the semi-major axis from      │
│   specific energy?" with 4 LaTeX options                                  │
│ UI: Radio buttons                                                         │
│ ────────────────────────────────────────                                  │
│ Type: Fill-blank                                                          │
│ Example for SPCE 5025: "The UVW frame: U points ___, V points ___, W      │
│ points                                                                    │
│   ___"                                                                    │
│ UI: Text inputs                                                           │
│ ────────────────────────────────────────                                  │
│ Type: Computation                                                         │
│ Example for SPCE 5025: "Given r=[326151, 6077471, 2944584] m, compute     │
│ |r|"                                                                      │
│   with numeric answer ±tolerance                                          │
│ UI: Number input                                                          │
│ ────────────────────────────────────────                                  │
│ Type: Conceptual                                                          │
│ Example for SPCE 5025: "What does a negative U-component in the UVW       │
│   separation mean physically?"                                            │
│ UI: Free text + AI grading                                                │
│ ────────────────────────────────────────                                  │
│ Type: Matching                                                            │
│ Example for SPCE 5025: Match: {h-vec → angular momentum, B-vec →          │
│   eccentricity, N-vec → ascending node}                                   │
│ UI: Drag/select pairs                                                     │
│ ────────────────────────────────────────                                  │
│ Type: Code completion                                                     │
│ Example for SPCE 5025: "Complete the cross product: h_vec = np.cross(___, │
│                                                                           │
│   ___)"                                                                   │
│ UI: Code input                                                            │
│                                                                           │
│ Step 4: Answer Feedback (fast/cheap model tier)                           │
│                                                                           │
│ Given the exercise, the student's answer, and the correct answer,         │
│ provide brief encouraging feedback (1-2 sentences).                       │
│ If wrong, explain the specific mistake and give one hint toward the right │
│  approach.                                                                │
│ Use the same notation as the course material.                             │
│                                                                           │
│                                                                           │
│ Cost estimate (daily session of 10 exercises):                            │
│                                                                           │
│ ┌───────────┬──────────────────┬────────────────┬────────┬──────────┐     │
│ │ Provider  │ Generation model │ Feedback model │ ~$/day │ ~$/month │     │
│ ├───────────┼──────────────────┼────────────────┼────────┼──────────┤     │
│ │ Anthropic │ Sonnet           │ Haiku          │ $0.03  │ $0.90    │     │
│ ├───────────┼──────────────────┼────────────────┼────────┼──────────┤     │
│ │ OpenAI    │ GPT-4o           │ GPT-4o-mini    │ $0.04  │ $1.20    │     │
│ ├───────────┼──────────────────┼────────────────┼────────┼──────────┤     │
│ │ xAI       │ Grok-3           │ Grok-3-mini    │ $0.03  │ $0.90    │     │
│ └───────────┴──────────────────┴────────────────┴────────┴──────────┘     │
│                                                                           │
│ All well under $10/month. Exercise caching in SQLite further reduces      │
│ costs.                                                                    │
│                                                                           │
│ ---                                                                       │
│ 8. Gamification & Spaced Repetition                                       │
│                                                                           │
│ SM-2 Algorithm (spaced_rep.py, ~50 lines):                                │
│                                                                           │
│ def sm2_update(quality: int, repetitions: int, ease_factor: float,        │
│ interval: int):                                                           │
│     """SM-2 spaced repetition. quality: 0-5 (0=blackout, 5=perfect)"""    │
│     if quality >= 3:  # correct                                           │
│         if repetitions == 0:                                              │
│             interval = 1                                                  │
│         elif repetitions == 1:                                            │
│             interval = 6                                                  │
│         else:                                                             │
│             interval = round(interval * ease_factor)                      │
│         repetitions += 1                                                  │
│     else:  # incorrect — reset                                            │
│         repetitions = 0                                                   │
│         interval = 1                                                      │
│                                                                           │
│     ease_factor = max(1.3, ease_factor + 0.1 - (5 - quality) * (0.08 + (5 │
│  - quality) * 0.02))                                                      │
│     return repetitions, ease_factor, interval                             │
│                                                                           │
│ Gamification:                                                             │
│                                                                           │
│ - XP: +10 per correct answer, +5 per incorrect (effort reward), +50       │
│ lesson completion bonus, +20 streak bonus                                 │
│ - Hearts: Start with 5/day. Lose 1 per wrong answer. Regenerate 1/hour    │
│ (max 5). Encourages careful thinking.                                     │
│ - Streak: +1 day if ≥1 lesson completed. Reset to 0 if a day is missed.   │
│ Display flame icon.                                                       │
│ - Levels: Level = floor(total_xp / 100) + 1. Simple, transparent.         │
│ - Daily goal: Default 5 min. Options: 5/10/15 min.                        │
│                                                                           │
│ ---                                                                       │
│ 9. MVP Feature Backlog (prioritized, with hour estimates)                 │
│                                                                           │
│ #: 1                                                                      │
│ Feature: SQLite schema + database.py CRUD                                 │
│ Hours: 1.0                                                                │
│ Priority: P0                                                              │
│ ────────────────────────────────────────                                  │
│ #: 2                                                                      │
│ Feature: Content parser (PDF + MD → chunks)                               │
│ Hours: 1.5                                                                │
│ Priority: P0                                                              │
│ ────────────────────────────────────────                                  │
│ #: 3                                                                      │
│ Feature: LLM client (multi-provider: Anthropic/OpenAI/xAI)                │
│ Hours: 1.0                                                                │
│ Priority: P0                                                              │
│ ────────────────────────────────────────                                  │
│ #: 4                                                                      │
│ Feature: Lesson engine (prompt chain → exercises via LLM client)          │
│ Hours: 2.0                                                                │
│ Priority: P0                                                              │
│ ────────────────────────────────────────                                  │
│ #: 5                                                                      │
│ Feature: Lesson player UI (exercise flow + answer checking)               │
│ Hours: 2.0                                                                │
│ Priority: P0                                                              │
│ ────────────────────────────────────────                                  │
│ #: 6                                                                      │
│ Feature: Dashboard (streak, XP, start lesson button)                      │
│ Hours: 1.0                                                                │
│ Priority: P0                                                              │
│ ────────────────────────────────────────                                  │
│ #: 7                                                                      │
│ Feature: Upload page (file upload + parsing trigger)                      │
│ Hours: 1.0                                                                │
│ Priority: P0                                                              │
│ ────────────────────────────────────────                                  │
│ #: 8                                                                      │
│ Feature: Settings page (provider select + API key)                        │
│ Hours: 0.5                                                                │
│ Priority: P0                                                              │
│ ────────────────────────────────────────                                  │
│ #: 9                                                                      │
│ Feature: Gamification (XP, hearts, streak tracking)                       │
│ Hours: 1.0                                                                │
│ Priority: P0                                                              │
│ ────────────────────────────────────────                                  │
│ #: 10                                                                     │
│ Feature: SM-2 spaced repetition scheduling                                │
│ Hours: 1.0                                                                │
│ Priority: P0                                                              │
│ ────────────────────────────────────────                                  │
│ #: 11                                                                     │
│ Feature: Mobile CSS + dark mode                                           │
│ Hours: 1.0                                                                │
│ Priority: P0                                                              │
│ ────────────────────────────────────────                                  │
│ #: 12                                                                     │
│ Feature: Progress/stats page                                              │
│ Hours: 0.5                                                                │
│ Priority: P1                                                              │
│ ────────────────────────────────────────                                  │
│ #: 13                                                                     │
│ Feature: LaTeX rendering polish                                           │
│ Hours: 0.5                                                                │
│ Priority: P1                                                              │
│ ────────────────────────────────────────                                  │
│ #: 14                                                                     │
│ Feature: Exercise caching (don't regenerate)                              │
│ Hours: 0.5                                                                │
│ Priority: P1                                                              │
│ ────────────────────────────────────────                                  │
│ #: Total                                                                  │
│ Feature:                                                                  │
│ Hours: 14.5h                                                              │
│ Priority:                                                                 │
│                                                                           │
│ v2 (nice-to-have, post-MVP):                                              │
│ - Voice/audio lessons (TTS)                                               │
│ - Multi-class support                                                     │
│ - Weak-area heatmap                                                       │
│ - Custom exercise difficulty slider                                       │
│ - Export progress to CSV                                                  │
│ - Offline mode via service worker                                         │
│                                                                           │
│ ---                                                                       │
│ 10. 2-Week Implementation Roadmap                                         │
│                                                                           │
│ Week 1: Core Engine                                                       │
│                                                                           │
│ Day: 1                                                                    │
│ Task: Project setup + SQLite schema + database.py                         │
│ Hours: 1.5                                                                │
│ Deliverable: Working DB with all tables                                   │
│ ────────────────────────────────────────                                  │
│ Day: 2                                                                    │
│ Task: content_parser.py (PDF + MD extraction + chunking)                  │
│ Hours: 1.5                                                                │
│ Deliverable: Can parse SPCE5025 materials into chunks                     │
│ ────────────────────────────────────────                                  │
│ Day: 3                                                                    │
│ Task: llm_client.py (multi-provider) + lesson_engine.py                   │
│ Hours: 2.5                                                                │
│ Deliverable: Generates exercises from chunks with any provider            │
│ ────────────────────────────────────────                                  │
│ Day: 4                                                                    │
│ Task: Lesson player page (exercise flow UI)                               │
│ Hours: 2.0                                                                │
│ Deliverable: Can play through a lesson on screen                          │
│ ────────────────────────────────────────                                  │
│ Day: 5                                                                    │
│ Task: Gamification + SM-2 integration                                     │
│ Hours: 1.5                                                                │
│ Deliverable: XP/hearts/streak working, spaced rep scheduling              │
│                                                                           │
│ Week 2: Polish & Ship                                                     │
│                                                                           │
│ Day: 6                                                                    │
│ Task: Dashboard + Upload page + Settings page                             │
│ Hours: 1.5                                                                │
│ Deliverable: Full navigation, provider selection working                  │
│ ────────────────────────────────────────                                  │
│ Day: 7                                                                    │
│ Task: Mobile CSS + dark mode + LaTeX polish                               │
│ Hours: 1.5                                                                │
│ Deliverable: Looks good on phone                                          │
│ ────────────────────────────────────────                                  │
│ Day: 8                                                                    │
│ Task: Progress page + exercise caching                                    │
│ Hours: 1.0                                                                │
│ Deliverable: Stats visible, no redundant API calls                        │
│ ────────────────────────────────────────                                  │
│ Day: 9                                                                    │
│ Task: Testing with real SPCE5025 materials + bug fixes                    │
│ Hours: 1.0                                                                │
│ Deliverable: End-to-end flow working                                      │
│ ────────────────────────────────────────                                  │
│ Day: 10                                                                   │
│ Task: IMPLEMENTATION_PLAN.md + README + final polish                      │
│ Hours: 0.5                                                                │
│ Deliverable: Documented and ready                                         │
│                                                                           │
│ ---                                                                       │
│ 11. Key Implementation Details                                            │
│                                                                           │
│ Mobile CSS Strategy (assets/style.css):                                   │
│                                                                           │
│ - Max-width container (480px centered)                                    │
│ - Large touch targets (min 48px height for buttons)                       │
│ - Dark mode via Streamlit theme config + custom CSS variables             │
│ - Hide Streamlit hamburger menu and footer                                │
│ - Full-width buttons for answer choices                                   │
│ - Progress bar at top of lesson                                           │
│                                                                           │
│ LaTeX Rendering:                                                          │
│                                                                           │
│ - Streamlit's st.markdown() supports KaTeX via $...$ inline and $$...$$   │
│ block                                                                     │
│ - For exercise questions: render with st.markdown(question,               │
│ unsafe_allow_html=True)                                                   │
│ - For code exercises: use st.code() blocks                                │
│                                                                           │
│ PWA Setup:                                                                │
│                                                                           │
│ - Add manifest.json and service worker via Streamlit's                    │
│ st.components.v1.html()                                                   │
│ - Or use streamlit-pwa community component if available                   │
│ - Fallback: just use mobile Chrome "Add to Home Screen" — works without   │
│ any extra code on Streamlit Cloud                                         │
│                                                                           │
│ API Key Management:                                                       │
│                                                                           │
│ - User enters API key in the Settings page on first launch                │
│ - Stored in SQLite user_profile table (local-only, your machine)          │
│ - Supports any of: Anthropic, OpenAI, or xAI API keys                     │
│ - No .env files or secrets.toml needed — all in-app                       │
│                                                                           │
│ ---                                                                       │
│ 12. Deployment Instructions                                               │
│                                                                           │
│ Local (30 seconds):                                                       │
│                                                                           │
│ cd classlingo                                                             │
│ pip install -r requirements.txt                                           │
│ streamlit run app.py                                                      │
│ # On first launch, go to Settings page to select LLM provider + enter API │
│  key                                                                      │
│                                                                           │
│                                                                           │
│ Data:                                                                     │
│                                                                           │
│ - SQLite file at classlingo/data/classlingo.db — lives on your machine,   │
│ durable                                                                   │
│ - Uploaded materials stored as extracted text in the DB (originals stay   │
│ in your filesystem)                                                       │
│ - No cloud deployment needed for MVP — local is simpler and data is       │
│ always safe                                                               │
│                                                                           │
│ ---                                                                       │
│ 13. Risks & Mitigations                                                   │
│                                                                           │
│ Risk: PDF math extraction poor quality                                    │
│ Likelihood: Medium                                                        │
│ Impact: High                                                              │
│ Mitigation: Use PyMuPDF with layout preservation; supplement with manual  │
│   markdown upload; test immediately with SPCE5025 PDF                     │
│ ────────────────────────────────────────                                  │
│ Risk: LLM API cost overrun                                                │
│ Likelihood: Low                                                           │
│ Impact: Medium                                                            │
│ Mitigation: Cache all generated exercises in SQLite; use cheap model for  │
│   feedback; pre-generate batches                                          │
│ ────────────────────────────────────────                                  │
│ Risk: LaTeX rendering issues in Streamlit                                 │
│ Likelihood: Medium                                                        │
│ Impact: Medium                                                            │
│ Mitigation: Test early; fall back to Unicode math symbols; use st.latex() │
│                                                                           │
│   for block equations                                                     │
│ ────────────────────────────────────────                                  │
│ Risk: Streamlit mobile UX feels clunky                                    │
│ Likelihood: Medium                                                        │
│ Impact: Medium                                                            │
│ Mitigation: Custom CSS from day 1; test on phone every day; large         │
│ buttons,                                                                  │
│   minimal scrolling                                                       │
│ ────────────────────────────────────────                                  │
│ Risk: 15-hour budget insufficient                                         │
│ Likelihood: Low                                                           │
│ Impact: High                                                              │
│ Mitigation: Ruthlessly cut scope — skip matching exercises, skip progress │
│                                                                           │
│   page, skip dark mode if needed                                          │
│ ────────────────────────────────────────                                  │
│ Risk: Provider API differences cause bugs                                 │
│ Likelihood: Low                                                           │
│ Impact: Medium                                                            │
│ Mitigation: All 3 providers support OpenAI-compatible chat format; xAI    │
│   literally uses the openai SDK; test with at least 2 providers           │
│ ────────────────────────────────────────                                  │
│ Risk: AI generates incorrect exercises                                    │
│ Likelihood: Medium                                                        │
│ Impact: High                                                              │
│ Mitigation: Always show explanation; add "Report bad question" button;    │
│   include source chunk reference                                          │
│                                                                           │
│ ---                                                                       │
│ 14. Verification Plan                                                     │
│                                                                           │
│ After each milestone, verify:                                             │
│                                                                           │
│ 1. Day 2: Upload the SPCE5025 PDF and homework MD → confirm chunks are    │
│ extracted with math intact                                                │
│ 2. Day 3: Generate 5 exercises from chunks → confirm variety of types,    │
│ correct LaTeX, accurate answers                                           │
│ 3. Day 4: Play through a full lesson (5-8 exercises) → confirm flow,      │
│ answer checking, XP awarded                                               │
│ 4. Day 5: Complete a lesson, close app, reopen → confirm streak/XP        │
│ persisted, SM-2 scheduled next review                                     │
│ 5. Day 7: Open on phone browser → confirm large buttons, readable text,   │
│ dark mode working                                                         │
│ 6. Day 9: Full end-to-end: upload → generate → play lesson → check        │
│ progress → verify spaced rep schedule                                     │
│ 7. Day 10: Access via Streamlit Cloud URL on phone → confirm everything   │
│ works deployed                                                            │
│                                                                           │
│ ---                                                                       │
│ 15. Implementation Order (what to build first in code)                    │
│                                                                           │
│ 1. core/database.py — Schema creation + all CRUD functions (incl. user    │
│ settings for LLM provider/key)                                            │
│ 2. core/llm_client.py — Multi-provider wrapper (Anthropic, OpenAI, xAI)   │
│ with unified generate()                                                   │
│ 3. core/content_parser.py — PDF/MD text extraction + section-based        │
│ chunking                                                                  │
│ 4. core/lesson_engine.py — Topic selection → exercise generation →        │
│ feedback (uses llm_client)                                                │
│ 5. core/spaced_rep.py — SM-2 algorithm + scheduling queries               │
│ 6. core/gamification.py — XP calculation, hearts management, streak       │
│ logic, level computation                                                  │
│ 7. pages/5_settings.py — LLM provider selection + API key entry           │
│ 8. pages/3_upload.py — File upload UI + trigger parsing                   │
│ 9. pages/2_lesson.py — Exercise player (the core interaction loop)        │
│ 10. pages/1_dashboard.py — Home screen with stats + start lesson          │
│ 11. pages/4_progress.py — Charts and weak-area display                    │
│ 12. app.py — Entry point, navigation, session init                        │
│ 13. assets/style.css — Mobile-first dark mode                             │
│ 14. .streamlit/config.toml — Theme configuration                          │
│ 15. requirements.txt                                                      │
│ 16. IMPLEMENTATION_PLAN.md — Polished 13-section doc as specified in      │
│ brief                                                                     │
╰───────────────────────────────────────────────────────────────────────────╯

⏺ I'll implement this plan systematically. Let me start by reading the
  project brief and any existing materials, then build everything in the
  specified order.                                                           
   
⏺ Read 3 files (ctrl+o to expand)                                            
                                                               
⏺ Good, I have the full context. Let me build this systematically. I'll
  create tasks and work through the implementation order.
                                                                             
⏺ Let me create the directory structure and start building.                  
                                                                             
⏺ Bash(mkdir -p /Users/jordanclayton/code/classlingo/{core,pages,assets,.stre
      amlit,data})                                                           
  ⎿  Running…                                                                
                                                                             
  4 tasks (0 done, 1 in progress, 3 open)                                    
  ◼ Create project structure and core/database.py                            
  ◻ Create core modules (llm_client, content_parser, lesson_engin…           
  ◻ Create all Streamlit pages and app.py                                  
  ◻ Create CSS, config, and requirements                                     
                                                                           