"""Progress page: stats, weak areas, review history."""

import streamlit as st
from datetime import date, timedelta
from core.database import (
    init_db, get_profile, get_stats_history, get_classes,
    get_exercises_for_class, get_connection,
)
from core.gamification import get_level_info

init_db()

st.set_page_config(page_title="Progress | Classlingo", page_icon="📊", layout="centered")

from pathlib import Path
css_path = Path(__file__).parent.parent / "assets" / "style.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text()}</style>", unsafe_allow_html=True)

st.title("📊 Progress")

profile = get_profile()
level_info = get_level_info()

# --- Overview ---
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Level", level_info["level"])
with col2:
    st.metric("Total XP", level_info["total_xp"])
with col3:
    st.metric("Current Streak", f"{profile['current_streak']} days")
with col4:
    st.metric("Best Streak", f"{profile['longest_streak']} days")

st.divider()

# --- XP History Chart ---
st.subheader("Daily XP (last 30 days)")
history = get_stats_history(30)

if history:
    import pandas as pd
    df = pd.DataFrame(history)
    df["date"] = pd.to_datetime(df["date"])
    st.bar_chart(df.set_index("date")["xp_earned"])
else:
    st.info("No activity yet. Complete some lessons to see your progress!")

st.divider()

# --- Per-Class Stats ---
st.subheader("Class Breakdown")
classes = get_classes()

for cls in classes:
    with st.expander(f"📚 {cls['name']}"):
        exercises = get_exercises_for_class(cls["id"])
        if not exercises:
            st.caption("No exercises yet.")
            continue

        # Get progress stats
        conn = get_connection()
        stats = conn.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN p.times_seen > 0 THEN 1 ELSE 0 END) as attempted,
                SUM(p.times_correct) as correct,
                SUM(p.times_seen) as total_attempts,
                AVG(p.ease_factor) as avg_ease
            FROM exercises e
            LEFT JOIN progress p ON p.exercise_id = e.id
            WHERE e.class_id = ?
        """, (cls["id"],)).fetchone()
        conn.close()

        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Exercises", stats["total"])
        with col2:
            attempted = stats["attempted"] or 0
            st.metric("Attempted", attempted)
        with col3:
            total_attempts = stats["total_attempts"] or 0
            correct = stats["correct"] or 0
            accuracy = (correct / total_attempts * 100) if total_attempts > 0 else 0
            st.metric("Accuracy", f"{accuracy:.0f}%")

        # Topic breakdown
        conn = get_connection()
        topics = conn.execute("""
            SELECT e.topic,
                   COUNT(*) as count,
                   SUM(CASE WHEN p.times_seen > 0 THEN p.times_correct ELSE 0 END) as correct,
                   SUM(CASE WHEN p.times_seen > 0 THEN p.times_seen ELSE 0 END) as attempts
            FROM exercises e
            LEFT JOIN progress p ON p.exercise_id = e.id
            WHERE e.class_id = ?
            GROUP BY e.topic
            ORDER BY e.topic
        """, (cls["id"],)).fetchall()
        conn.close()

        if topics:
            st.caption("**Topics:**")
            for t in topics:
                attempts = t["attempts"] or 0
                correct = t["correct"] or 0
                acc = (correct / attempts * 100) if attempts > 0 else 0
                icon = "🟢" if acc >= 80 else "🟡" if acc >= 50 else "🔴" if attempts > 0 else "⚪"
                st.markdown(f"{icon} **{t['topic']}** — {t['count']} exercises, {acc:.0f}% accuracy")

st.divider()

# --- Upcoming Reviews ---
st.subheader("Upcoming Reviews")
conn = get_connection()
upcoming = conn.execute("""
    SELECT e.topic, p.next_review, COUNT(*) as count
    FROM progress p
    JOIN exercises e ON e.id = p.exercise_id
    WHERE p.next_review IS NOT NULL AND p.times_seen > 0
    GROUP BY e.topic, p.next_review
    ORDER BY p.next_review
    LIMIT 20
""").fetchall()
conn.close()

if upcoming:
    today = date.today().isoformat()
    for row in upcoming:
        is_due = row["next_review"] <= today
        status = "🔔 DUE" if is_due else row["next_review"]
        st.markdown(f"- **{row['topic']}**: {row['count']} exercises — {status}")
else:
    st.info("No reviews scheduled yet.")
