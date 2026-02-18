"""Dashboard: home screen with streak, XP, and start lesson button."""

import streamlit as st
from datetime import date
from core.database import init_db, get_classes, get_profile, get_today_stats, get_exercises_for_class
from core.gamification import get_hearts, get_level_info

init_db()

st.set_page_config(page_title="Classlingo", page_icon="🎓", layout="centered")

from pathlib import Path
css_path = Path(__file__).parent.parent / "assets" / "style.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text()}</style>", unsafe_allow_html=True)

profile = get_profile()
today_stats = get_today_stats()
level_info = get_level_info()
hearts = get_hearts()

# --- Header ---
st.markdown(f"# 🎓 Classlingo")

# --- Stats Row ---
col1, col2, col3, col4 = st.columns(4)
with col1:
    streak = profile["current_streak"]
    st.markdown(f"### 🔥 {streak}")
    st.caption("Streak")
with col2:
    st.markdown(f"### ⭐ {level_info['level']}")
    st.caption("Level")
with col3:
    st.markdown(f"### ✨ {level_info['total_xp']}")
    st.caption("Total XP")
with col4:
    st.markdown(f"### ❤️ {hearts}")
    st.caption("Hearts")

# Level progress
st.progress(level_info["xp_in_level"] / 100)
st.caption(f"{level_info['xp_to_next']} XP to Level {level_info['level'] + 1}")

st.divider()

# --- Today's Progress ---
st.subheader("Today")
col1, col2, col3 = st.columns(3)
with col1:
    st.metric("XP Today", today_stats["xp_earned"])
with col2:
    st.metric("Exercises", today_stats["exercises_completed"])
with col3:
    st.metric("Lessons", today_stats["lessons_completed"])

st.divider()

# --- Start Lesson ---
classes = get_classes()

if not classes:
    st.info("Welcome to Classlingo! Start by creating a class and uploading materials.")
    if st.button("Go to Upload →", use_container_width=True, type="primary"):
        st.switch_page("pages/3_upload.py")
    st.stop()

if not profile.get("api_key"):
    st.warning("Set up your AI provider in Settings to start generating lessons.")
    if st.button("Go to Settings →", use_container_width=True, type="primary"):
        st.switch_page("pages/5_settings.py")

st.subheader("Start a Lesson")

for cls in classes:
    exercises = get_exercises_for_class(cls["id"])
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown(f"**{cls['name']}**")
        st.caption(f"{len(exercises)} exercises")
    with col2:
        if exercises:
            if st.button("Start", key=f"start_{cls['id']}", use_container_width=True, type="primary"):
                st.session_state.lesson_class_id = cls["id"]
                st.switch_page("pages/2_lesson.py")
        else:
            st.button("No exercises", key=f"no_{cls['id']}", disabled=True, use_container_width=True)

st.divider()

# --- Quick Links ---
col1, col2 = st.columns(2)
with col1:
    if st.button("📤 Upload Materials", use_container_width=True):
        st.switch_page("pages/3_upload.py")
with col2:
    if st.button("📊 View Progress", use_container_width=True):
        st.switch_page("pages/4_progress.py")
