"""Lesson player page: the core exercise interaction loop."""

import json
import streamlit as st
from core.database import init_db, get_classes, get_exercises_for_class
from core.lesson_engine import select_lesson_exercises, process_answer
from core.gamification import get_hearts, complete_lesson, get_level_info

init_db()

st.set_page_config(page_title="Lesson | Classlingo", page_icon="📖", layout="centered")

from pathlib import Path
css_path = Path(__file__).parent.parent / "assets" / "style.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text()}</style>", unsafe_allow_html=True)


def init_lesson_state():
    if "lesson_exercises" not in st.session_state:
        st.session_state.lesson_exercises = []
    if "lesson_index" not in st.session_state:
        st.session_state.lesson_index = 0
    if "lesson_score" not in st.session_state:
        st.session_state.lesson_score = 0
    if "lesson_total_xp" not in st.session_state:
        st.session_state.lesson_total_xp = 0
    if "lesson_answered" not in st.session_state:
        st.session_state.lesson_answered = False
    if "lesson_result" not in st.session_state:
        st.session_state.lesson_result = None
    if "lesson_complete" not in st.session_state:
        st.session_state.lesson_complete = False
    if "lesson_class_id" not in st.session_state:
        st.session_state.lesson_class_id = None


init_lesson_state()


def start_lesson(class_id: int):
    exercises = select_lesson_exercises(class_id)
    if not exercises:
        st.error("No exercises available. Upload materials and generate exercises first!")
        return False
    st.session_state.lesson_exercises = exercises
    st.session_state.lesson_index = 0
    st.session_state.lesson_score = 0
    st.session_state.lesson_total_xp = 0
    st.session_state.lesson_answered = False
    st.session_state.lesson_result = None
    st.session_state.lesson_complete = False
    st.session_state.lesson_class_id = class_id
    return True


def reset_lesson():
    st.session_state.lesson_exercises = []
    st.session_state.lesson_index = 0
    st.session_state.lesson_score = 0
    st.session_state.lesson_total_xp = 0
    st.session_state.lesson_answered = False
    st.session_state.lesson_result = None
    st.session_state.lesson_complete = False


# --- Header ---
hearts = get_hearts()
level_info = get_level_info()

col1, col2, col3 = st.columns(3)
with col1:
    st.markdown(f"❤️ **{hearts}**")
with col2:
    st.markdown(f"⭐ **Lv {level_info['level']}**")
with col3:
    st.markdown(f"✨ **{level_info['total_xp']} XP**")

st.title("📖 Lesson")

# --- Class Selection / Start ---
if not st.session_state.lesson_exercises:
    classes = get_classes()
    if not classes:
        st.info("No classes created yet. Go to **Upload** to create a class and add materials.")
        st.stop()

    class_names = {c["id"]: c["name"] for c in classes}
    selected = st.selectbox(
        "Choose a class",
        options=[c["id"] for c in classes],
        format_func=lambda x: class_names[x],
    )

    # Show exercise count
    exercises = get_exercises_for_class(selected)
    st.caption(f"{len(exercises)} exercises available")

    if not exercises:
        st.warning("No exercises for this class. Upload materials first, then generate exercises.")
        st.stop()

    if st.button("Start Lesson", use_container_width=True, type="primary"):
        if start_lesson(selected):
            st.rerun()
    st.stop()

# --- Lesson Complete ---
if st.session_state.lesson_complete:
    st.balloons()

    total = len(st.session_state.lesson_exercises)
    score = st.session_state.lesson_score

    st.markdown("---")
    st.markdown(f"## 🎉 Lesson Complete!")
    st.markdown(f"### Score: {score}/{total}")

    # Progress bar for score
    st.progress(score / total if total > 0 else 0)

    col1, col2 = st.columns(2)
    with col1:
        st.metric("XP Earned", f"+{st.session_state.lesson_total_xp}")
    with col2:
        st.metric("Accuracy", f"{(score/total*100):.0f}%" if total > 0 else "0%")

    st.markdown("---")
    if st.button("Start Another Lesson", use_container_width=True, type="primary"):
        reset_lesson()
        st.rerun()
    if st.button("Back to Dashboard", use_container_width=True):
        reset_lesson()
        st.switch_page("pages/1_dashboard.py")
    st.stop()

# --- Exercise Flow ---
exercises = st.session_state.lesson_exercises
idx = st.session_state.lesson_index
total = len(exercises)

# Progress bar
st.progress((idx) / total)
st.caption(f"Question {idx + 1} of {total}")

exercise = exercises[idx]
ex_json = json.loads(exercise["question_json"])
ex_type = ex_json.get("type", "mcq")

# Display question
st.markdown(f"### {ex_json['question']}")

if ex_json.get("hint") and not st.session_state.lesson_answered:
    with st.expander("💡 Hint"):
        st.markdown(ex_json["hint"])

# --- Answer Input ---
if not st.session_state.lesson_answered:
    if ex_type == "mcq":
        options = ex_json.get("options", [])
        if options:
            # Use buttons for mobile-friendly MCQ
            for i, opt in enumerate(options):
                letter = chr(65 + i)  # A, B, C, D
                if st.button(opt, key=f"opt_{idx}_{i}", use_container_width=True):
                    with st.spinner("Checking..."):
                        result = process_answer(exercise["id"], letter)
                    st.session_state.lesson_result = result
                    st.session_state.lesson_answered = True
                    if result["correct"]:
                        st.session_state.lesson_score += 1
                    st.session_state.lesson_total_xp += result["xp_earned"]
                    st.rerun()

    elif ex_type == "computation":
        with st.form(key=f"comp_form_{idx}"):
            answer = st.text_input("Your answer (number):", placeholder="e.g. 6820000")
            submitted = st.form_submit_button("Submit", use_container_width=True, type="primary")
            if submitted and answer:
                with st.spinner("Checking..."):
                    result = process_answer(exercise["id"], answer)
                st.session_state.lesson_result = result
                st.session_state.lesson_answered = True
                if result["correct"]:
                    st.session_state.lesson_score += 1
                st.session_state.lesson_total_xp += result["xp_earned"]
                st.rerun()

    elif ex_type == "fill_blank":
        with st.form(key=f"fill_form_{idx}"):
            answer = st.text_input("Fill in the blank:", placeholder="Your answer")
            submitted = st.form_submit_button("Submit", use_container_width=True, type="primary")
            if submitted and answer:
                with st.spinner("Checking..."):
                    result = process_answer(exercise["id"], answer)
                st.session_state.lesson_result = result
                st.session_state.lesson_answered = True
                if result["correct"]:
                    st.session_state.lesson_score += 1
                st.session_state.lesson_total_xp += result["xp_earned"]
                st.rerun()

    else:  # conceptual
        with st.form(key=f"concept_form_{idx}"):
            answer = st.text_area("Your answer:", placeholder="Explain your reasoning...")
            submitted = st.form_submit_button("Submit", use_container_width=True, type="primary")
            if submitted and answer:
                with st.spinner("Checking..."):
                    result = process_answer(exercise["id"], answer)
                st.session_state.lesson_result = result
                st.session_state.lesson_answered = True
                if result["correct"]:
                    st.session_state.lesson_score += 1
                st.session_state.lesson_total_xp += result["xp_earned"]
                st.rerun()

# --- Show Result ---
if st.session_state.lesson_answered and st.session_state.lesson_result:
    result = st.session_state.lesson_result
    st.markdown("---")

    if result["correct"]:
        st.success(f"✅ Correct! +{result['xp_earned']} XP")
    else:
        st.error(f"❌ Incorrect. +{result['xp_earned']} XP (effort)")

    st.markdown(f"**Feedback:** {result['feedback']}")

    if result.get("explanation"):
        with st.expander("📚 Full Explanation"):
            st.markdown(result["explanation"])

    st.markdown(f"❤️ Hearts: {result['hearts']}")

    # Next button
    if idx + 1 < total:
        if st.button("Next Question →", use_container_width=True, type="primary"):
            st.session_state.lesson_index += 1
            st.session_state.lesson_answered = False
            st.session_state.lesson_result = None
            st.rerun()
    else:
        if st.button("Finish Lesson 🎉", use_container_width=True, type="primary"):
            bonus = complete_lesson()
            st.session_state.lesson_total_xp += bonus
            st.session_state.lesson_complete = True
            st.rerun()
