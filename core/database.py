"""SQLite database schema and CRUD operations for Classlingo."""

import sqlite3
import json
import os
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "data" / "classlingo.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    conn = get_connection()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
        filename TEXT,
        content_text TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY,
        material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
        chunk_text TEXT,
        topic_label TEXT,
        embedding BLOB,
        chunk_index INTEGER
    );

    CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
        chunk_id INTEGER REFERENCES chunks(id),
        exercise_type TEXT,
        question_json TEXT,
        difficulty INTEGER,
        topic TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS progress (
        id INTEGER PRIMARY KEY,
        exercise_id INTEGER UNIQUE REFERENCES exercises(id) ON DELETE CASCADE,
        ease_factor REAL DEFAULT 2.5,
        interval_days INTEGER DEFAULT 1,
        repetitions INTEGER DEFAULT 0,
        next_review DATE,
        last_quality INTEGER,
        times_seen INTEGER DEFAULT 0,
        times_correct INTEGER DEFAULT 0,
        last_reviewed TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
        date DATE PRIMARY KEY,
        xp_earned INTEGER DEFAULT 0,
        lessons_completed INTEGER DEFAULT 0,
        exercises_completed INTEGER DEFAULT 0,
        streak_maintained BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total_xp INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        hearts INTEGER DEFAULT 5,
        hearts_recharged_at TIMESTAMP,
        daily_goal_minutes INTEGER DEFAULT 5,
        llm_provider TEXT DEFAULT 'anthropic',
        api_key TEXT DEFAULT ''
    );
    """)
    # Ensure user profile row exists
    existing = conn.execute("SELECT id FROM user_profile WHERE id = 1").fetchone()
    if not existing:
        conn.execute(
            "INSERT INTO user_profile (id, hearts_recharged_at) VALUES (1, ?)",
            (datetime.now(),),
        )
    conn.commit()
    conn.close()


# --- Classes ---

def create_class(name: str) -> int:
    conn = get_connection()
    cur = conn.execute("INSERT INTO classes (name) VALUES (?)", (name,))
    conn.commit()
    class_id = cur.lastrowid
    conn.close()
    return class_id


def get_classes() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM classes ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_class(class_id: int) -> None:
    conn = get_connection()
    conn.execute("DELETE FROM classes WHERE id = ?", (class_id,))
    conn.commit()
    conn.close()


# --- Materials ---

def add_material(class_id: int, filename: str, content_text: str) -> int:
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO materials (class_id, filename, content_text) VALUES (?, ?, ?)",
        (class_id, filename, content_text),
    )
    conn.commit()
    mid = cur.lastrowid
    conn.close()
    return mid


def get_materials(class_id: int) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM materials WHERE class_id = ? ORDER BY uploaded_at DESC",
        (class_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_material(material_id: int) -> None:
    conn = get_connection()
    conn.execute("DELETE FROM materials WHERE id = ?", (material_id,))
    conn.commit()
    conn.close()


# --- Chunks ---

def add_chunk(material_id: int, chunk_text: str, topic_label: str,
              embedding: Optional[bytes], chunk_index: int) -> int:
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO chunks (material_id, chunk_text, topic_label, embedding, chunk_index) "
        "VALUES (?, ?, ?, ?, ?)",
        (material_id, chunk_text, topic_label, embedding, chunk_index),
    )
    conn.commit()
    cid = cur.lastrowid
    conn.close()
    return cid


def get_chunks_for_class(class_id: int) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        """SELECT c.* FROM chunks c
           JOIN materials m ON c.material_id = m.id
           WHERE m.class_id = ?
           ORDER BY c.material_id, c.chunk_index""",
        (class_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_chunk_by_id(chunk_id: int) -> Optional[dict]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM chunks WHERE id = ?", (chunk_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# --- Exercises ---

def add_exercise(class_id: int, chunk_id: int, exercise_type: str,
                 question_json: str, difficulty: int, topic: str) -> int:
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO exercises (class_id, chunk_id, exercise_type, question_json, difficulty, topic) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (class_id, chunk_id, exercise_type, question_json, difficulty, topic),
    )
    conn.commit()
    eid = cur.lastrowid
    conn.close()
    return eid


def get_exercises_for_class(class_id: int) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM exercises WHERE class_id = ? ORDER BY created_at",
        (class_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_exercise_by_id(exercise_id: int) -> Optional[dict]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM exercises WHERE id = ?", (exercise_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# --- Progress ---

def get_or_create_progress(exercise_id: int) -> dict:
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM progress WHERE exercise_id = ?", (exercise_id,)
    ).fetchone()
    if not row:
        conn.execute(
            "INSERT INTO progress (exercise_id, next_review) VALUES (?, ?)",
            (exercise_id, date.today().isoformat()),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM progress WHERE exercise_id = ?", (exercise_id,)
        ).fetchone()
    conn.close()
    return dict(row)


def update_progress(exercise_id: int, ease_factor: float, interval_days: int,
                    repetitions: int, quality: int, correct: bool) -> None:
    conn = get_connection()
    next_rev = (date.today() + timedelta(days=interval_days)).isoformat()
    conn.execute(
        """UPDATE progress SET
           ease_factor = ?, interval_days = ?, repetitions = ?,
           next_review = ?, last_quality = ?,
           times_seen = times_seen + 1,
           times_correct = times_correct + ?,
           last_reviewed = ?
           WHERE exercise_id = ?""",
        (ease_factor, interval_days, repetitions, next_rev, quality,
         1 if correct else 0, datetime.now(), exercise_id),
    )
    conn.commit()
    conn.close()


def get_due_exercises(class_id: int, limit: int = 20) -> list[dict]:
    conn = get_connection()
    today = date.today().isoformat()
    rows = conn.execute(
        """SELECT e.*, p.next_review, p.times_seen, p.ease_factor
           FROM exercises e
           JOIN progress p ON p.exercise_id = e.id
           WHERE e.class_id = ? AND p.next_review <= ?
           ORDER BY p.next_review ASC, p.ease_factor ASC
           LIMIT ?""",
        (class_id, today, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_new_exercises(class_id: int, limit: int = 10) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        """SELECT e.* FROM exercises e
           LEFT JOIN progress p ON p.exercise_id = e.id
           WHERE e.class_id = ? AND p.id IS NULL
           ORDER BY RANDOM()
           LIMIT ?""",
        (class_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# --- Daily Stats ---

def get_today_stats() -> dict:
    conn = get_connection()
    today = date.today().isoformat()
    row = conn.execute("SELECT * FROM daily_stats WHERE date = ?", (today,)).fetchone()
    if not row:
        conn.execute(
            "INSERT INTO daily_stats (date) VALUES (?)", (today,)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM daily_stats WHERE date = ?", (today,)).fetchone()
    conn.close()
    return dict(row)


def update_today_stats(xp_delta: int = 0, exercises_delta: int = 0,
                       lesson_completed: bool = False) -> None:
    conn = get_connection()
    today = date.today().isoformat()
    # Ensure row exists
    conn.execute("INSERT OR IGNORE INTO daily_stats (date) VALUES (?)", (today,))
    conn.execute(
        """UPDATE daily_stats SET
           xp_earned = xp_earned + ?,
           exercises_completed = exercises_completed + ?,
           lessons_completed = lessons_completed + ?,
           streak_maintained = CASE WHEN ? THEN 1 ELSE streak_maintained END
           WHERE date = ?""",
        (xp_delta, exercises_delta, 1 if lesson_completed else 0,
         lesson_completed, today),
    )
    conn.commit()
    conn.close()


def get_stats_history(days: int = 30) -> list[dict]:
    conn = get_connection()
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    rows = conn.execute(
        "SELECT * FROM daily_stats WHERE date >= ? ORDER BY date", (cutoff,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# --- User Profile ---

def get_profile() -> dict:
    conn = get_connection()
    row = conn.execute("SELECT * FROM user_profile WHERE id = 1").fetchone()
    conn.close()
    return dict(row)


def update_profile(**kwargs) -> None:
    conn = get_connection()
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    vals = list(kwargs.values())
    conn.execute(f"UPDATE user_profile SET {sets} WHERE id = 1", vals)
    conn.commit()
    conn.close()


def recharge_hearts() -> int:
    """Recharge hearts based on time elapsed. Returns current heart count."""
    profile = get_profile()
    last_recharge = profile["hearts_recharged_at"]
    if isinstance(last_recharge, str):
        last_recharge = datetime.fromisoformat(last_recharge)
    now = datetime.now()
    hours_elapsed = (now - last_recharge).total_seconds() / 3600
    hearts_to_add = int(hours_elapsed)
    if hearts_to_add > 0:
        new_hearts = min(5, profile["hearts"] + hearts_to_add)
        update_profile(hearts=new_hearts, hearts_recharged_at=now)
        return new_hearts
    return profile["hearts"]
