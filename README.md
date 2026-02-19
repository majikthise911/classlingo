# Classlingo

Duolingo-style adaptive micro-learning app that turns your course materials into daily 5-8 minute lessons with spaced repetition and gamification.

## Quick Start

```bash
cd classliingo
pip install -r requirements.txt
streamlit run app.py
```

## First-Time Setup

1. **Settings** (sidebar) — Select your LLM provider (Anthropic, OpenAI, or xAI) and enter your API key. Hit "Test Connection" to verify.
2. **Upload** — Create a class (e.g. "SPCE 5025"), then upload your PDFs, markdown notes, or text files. The app extracts text, chunks it by section, and labels topics with AI.
3. **Generate Exercises** — After uploading, click "Generate exercises" to create MCQ, computation, fill-blank, and conceptual questions from your material.
4. **Dashboard** — Hit "Start" on any class to begin a lesson.

## Daily Use

- Open the app, tap **Start** on the Dashboard.
- Each lesson is ~7 exercises mixing review (spaced repetition) and new material.
- Earn XP for every answer (10 correct, 5 for effort). Maintain your streak by completing at least one lesson per day.
- Hearts (5 max) are lost on wrong answers and regenerate 1/hour.
- Check **Progress** to see weak topics and upcoming reviews.

## Supported Providers

| Provider | Generation Model | Feedback Model | ~Cost/month |
|----------|-----------------|----------------|-------------|
| Anthropic | Claude Sonnet | Claude Haiku | ~$0.90 |
| OpenAI | GPT-4o | GPT-4o-mini | ~$1.20 |
| xAI | Grok-3 | Grok-3-mini | ~$0.90 |

## Stack

- **UI**: Streamlit (multipage app with mobile-first CSS)
- **AI**: Multi-provider LLM client (Anthropic / OpenAI / xAI)
- **PDF Parsing**: PyMuPDF
- **Storage**: SQLite (local, zero-config)
- **Spaced Repetition**: SM-2 algorithm
- **Gamification**: XP, hearts, streaks, levels

## File Structure

```
classlingo/
├── app.py                  # Entry point
├── pages/
│   ├── 1_dashboard.py      # Home: streak, XP, start lesson
│   ├── 2_lesson.py         # Exercise flow
│   ├── 3_upload.py         # Upload & manage materials
│   ├── 4_progress.py       # Stats & weak areas
│   └── 5_settings.py       # LLM provider & API key
├── core/
│   ├── database.py         # SQLite schema + CRUD
│   ├── llm_client.py       # Multi-provider LLM wrapper
│   ├── content_parser.py   # PDF/MD extraction + chunking
│   ├── lesson_engine.py    # Exercise generation + feedback
│   ├── spaced_rep.py       # SM-2 algorithm
│   └── gamification.py     # XP, hearts, streaks, levels
├── assets/style.css        # Mobile-first dark mode
├── .streamlit/config.toml  # Theme config
└── requirements.txt
```
