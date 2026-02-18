"""Classlingo: Duolingo-style adaptive micro-learning for any university course."""

import streamlit as st
from core.database import init_db

init_db()

st.set_page_config(
    page_title="Classlingo",
    page_icon="🎓",
    layout="centered",
    initial_sidebar_state="collapsed",
)

from pathlib import Path
css_path = Path(__file__).parent / "assets" / "style.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text()}</style>", unsafe_allow_html=True)

# Redirect to dashboard
st.switch_page("pages/1_dashboard.py")
