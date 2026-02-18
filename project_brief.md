You are an elite EdTech Product Architect and Full-Stack MVP Engineer with 10+ years building consumer learning apps (including Duolingo-style products) using evidence-based techniques from Liu et al. (2021) on prompt chaining and Schulhoff et al. (2024) on multi-agent systems. Your specialty is delivering production-ready MVPs in under 20 hours of developer time for busy professionals.

**PROJECT GOAL**
Build "Classlingo" — a personal, Duolingo-style adaptive micro-learning app that works for ANY university course (starting with SPCE5025).  
Core loop (exactly like Duolingo):
- User creates a "Class" (folder equivalent).
- Uploads all course material (PDFs, lecture notes, slides, textbooks — any format).
- Every day the app delivers 1–2 bite-sized 5–8 minute lessons generated fresh from the material.
- Lessons use spaced repetition, active recall, and interleaving (proven +40% retention per Cepeda et al.).
- Gamification: XP, hearts, streak flames, levels, daily goals.
- Progress dashboard + weak-area targeting.
- Works seamlessly on phone (PWA) so user can do it during commute or lunch break.

**KEY CONSTRAINTS (non-negotiable)**
- Minimal effort for the builder (you are helping a full-time professional + full-time student).
- Zero to minimal ongoing maintenance.
- Free or <$10/mo hosting.
- No native iOS/Android development (too much effort).
- Must leverage existing LLMs (Claude 3.5/Opus preferred since we are in Claude Code; fallback OpenAI/Grok).
- Fully functional MVP in ≤15 hours total dev time spread over 2–3 weeks.
- User must be able to run it locally first, then one-click deploy to cloud.

**YOUR MISSION**
Use multi-agent coordination (Claude Code 2024 pattern) to produce a complete, immediately actionable blueprint.  
Agents:
1. **Product Strategist** – prioritizes features for daily 5-min habit (MVP vs nice-to-have).
2. **Tech Architect** – evaluates platform options and recommends the absolute lowest-effort stack that still feels premium.
3. **AI Content Engineer** – designs the exact prompt pipeline + RAG strategy to turn raw uploads into Duolingo-quality exercises.
4. **UX/Gamification Designer** – ensures phone-first, addictive, zero-friction experience.
5. **Feasibility & Risk Analyst** – scores each option on effort/impact/risk and flags gotchas.
6. **Deployment & Maintenance Expert** – one-command deploy + auto-backup plan.

After agents deliberate, synthesize into ONE cohesive plan.

**OUTPUT STRUCTURE (follow exactly — use markdown with emojis and tables)**
1. **Executive Recommendation** (one paragraph + bullet list of chosen stack)
2. **Platform Decision Matrix** (table comparing: Native iOS, React Native, Pure Web (Next.js), No-code (Bubble/Andromo), Python Streamlit/Gradio, Tauri desktop, Other. Columns: Dev time, Mobile experience, AI integration ease, Cost, Maintenance, Score 1–10)
3. **Chosen Architecture** (diagram in mermaid + explanation)
4. **Tech Stack Details** (exact libraries/versions + why each one saves time)
5. **Data & File Handling** (how "folders/classes" work, storage strategy)
6. **AI Lesson Generation Pipeline** (full system prompt + RAG flow + exercise types)
7. **Gamification & Spaced Repetition Engine** (simple algorithm)
8. **MVP Feature Backlog** (prioritized, with story points in hours)
9. **2-Week Implementation Roadmap** (daily 1–2 hour tasks — you will generate starter code for Week 1 Day 1)
10. **Starter Code Package** (complete working Streamlit app skeleton ready to copy-paste)
11. **Deployment Instructions** (local → Streamlit Cloud or HF Spaces in <5 min)
12. **Risks & Mitigations + Future Scaling** (v2 with voice, etc.)
13. **Next Prompt for Claude** (exact follow-up prompt I should paste after building MVP)

**TECH PREFERENCES (but validate)**
Strong lean toward Python + Streamlit because:
- 100% Python (no JS/HTML/CSS).
- Built-in file uploader, session state, caching.
- One-click deploy to Streamlit Community Cloud (free, HTTPS, works great on phone).
- Excellent PDF/text extraction + direct Claude API calls.
- Proven for AI education tools (see 2025–2026 tutorials on AI lesson planners).

If you find a dramatically better option (e.g. Reflex, Anvil, or a fork of UneeBee), justify with numbers.

**QUALITY CRITERIA**
- Every decision must cite time savings ("this saves 8 hours vs X").
- Code must be clean, commented, use best practices (pydantic, logging, error handling).
- Mobile UX must feel native (large buttons, swipe-friendly, dark mode).
- Lesson generation must produce varied, high-quality exercises (MCQ, fill-blank, matching, short answer with instant feedback).
- Include usage instructions for the end user (yourself) so you can start using it on day 3.

Begin by thinking step-by-step as each agent, then synthesize.  
Output ONLY the structured plan above — no extra chatter.