"""Settings page: LLM provider, model selection, and API key entry."""

import streamlit as st
from core.database import init_db, get_profile, update_profile
from core.llm_client import PROVIDERS, get_models_for_provider, get_default_models

init_db()

st.set_page_config(page_title="Settings | Classlingo", page_icon="⚙️", layout="centered")

from pathlib import Path
css_path = Path(__file__).parent.parent / "assets" / "style.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text()}</style>", unsafe_allow_html=True)

st.title("⚙️ Settings")

profile = get_profile()

# --- Provider ---
st.subheader("LLM Provider")

provider = st.selectbox(
    "Choose your AI provider",
    options=list(PROVIDERS.keys()),
    index=list(PROVIDERS.keys()).index(profile.get("llm_provider", "anthropic")),
    format_func=lambda x: {"anthropic": "Anthropic (Claude)", "openai": "OpenAI", "xai": "xAI (Grok)"}[x],
)

api_key = st.text_input(
    "API Key",
    value=profile.get("api_key", ""),
    type="password",
    placeholder=f"Enter your {provider} API key",
)

# --- Model Selection ---
st.subheader("Models")

models = get_models_for_provider(provider)
default_gen, default_fb = get_default_models(provider)

# Determine current selections
saved_gen = profile.get("generation_model", "")
saved_fb = profile.get("feedback_model", "")

# If saved model isn't in this provider's list, fall back to default
gen_index = models.index(saved_gen) if saved_gen in models else models.index(default_gen)
fb_index = models.index(saved_fb) if saved_fb in models else models.index(default_fb)

generation_model = st.selectbox(
    "Generation model (exercises & topic labeling)",
    options=models,
    index=gen_index,
    help="More capable model used to generate exercises. Bigger = better quality, higher cost.",
)

feedback_model = st.selectbox(
    "Feedback model (answer feedback & grading)",
    options=models,
    index=fb_index,
    help="Faster/cheaper model used for quick feedback on answers.",
)

st.divider()

# --- Daily Goal ---
st.subheader("Daily Goal")
goal = st.select_slider(
    "Daily goal (minutes)",
    options=[5, 10, 15],
    value=profile.get("daily_goal_minutes", 5),
)

st.divider()

# --- Save ---
if st.button("Save Settings", use_container_width=True, type="primary"):
    update_profile(
        llm_provider=provider,
        api_key=api_key,
        generation_model=generation_model,
        feedback_model=feedback_model,
        daily_goal_minutes=goal,
    )
    st.success("Settings saved!")

# --- Test Connection ---
st.divider()
st.subheader("Test Connection")
if st.button("Test LLM Connection", use_container_width=True):
    if not api_key:
        st.error("Please enter an API key first.")
    else:
        with st.spinner(f"Testing with {feedback_model}..."):
            try:
                from core.llm_client import LLMClient
                client = LLMClient(
                    provider=provider,
                    api_key=api_key,
                    generation_model=generation_model,
                    feedback_model=feedback_model,
                )
                response = client.generate(
                    "You are a helpful assistant.",
                    "Say 'Connection successful!' and nothing else.",
                    model_tier="feedback",
                    max_tokens=50,
                )
                st.success(f"✅ {response.strip()}")
            except Exception as e:
                st.error(f"❌ Connection failed: {e}")
