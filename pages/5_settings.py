"""Settings page: LLM provider selection and API key entry."""

import streamlit as st
from core.database import init_db, get_profile, update_profile
from core.llm_client import PROVIDERS

init_db()

st.set_page_config(page_title="Settings | Classlingo", page_icon="⚙️", layout="centered")

# Load CSS
from pathlib import Path
css_path = Path(__file__).parent.parent / "assets" / "style.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text()}</style>", unsafe_allow_html=True)

st.title("⚙️ Settings")

profile = get_profile()

st.subheader("LLM Provider")

provider = st.selectbox(
    "Choose your AI provider",
    options=list(PROVIDERS.keys()),
    index=list(PROVIDERS.keys()).index(profile.get("llm_provider", "anthropic")),
    format_func=lambda x: {"anthropic": "Anthropic (Claude)", "openai": "OpenAI (GPT-4o)", "xai": "xAI (Grok)"}[x],
)

provider_info = {
    "anthropic": "Uses Claude Sonnet for generation, Haiku for feedback. ~$0.90/month.",
    "openai": "Uses GPT-4o for generation, GPT-4o-mini for feedback. ~$1.20/month.",
    "xai": "Uses Grok-3 for generation, Grok-3-mini for feedback. ~$0.90/month.",
}
st.caption(provider_info[provider])

api_key = st.text_input(
    "API Key",
    value=profile.get("api_key", ""),
    type="password",
    placeholder=f"Enter your {provider} API key",
)

st.divider()

st.subheader("Daily Goal")
goal = st.select_slider(
    "Daily goal (minutes)",
    options=[5, 10, 15],
    value=profile.get("daily_goal_minutes", 5),
)

st.divider()

if st.button("Save Settings", use_container_width=True, type="primary"):
    update_profile(
        llm_provider=provider,
        api_key=api_key,
        daily_goal_minutes=goal,
    )
    st.success("Settings saved!")

# Test connection
st.divider()
st.subheader("Test Connection")
if st.button("Test LLM Connection", use_container_width=True):
    if not api_key:
        st.error("Please enter an API key first.")
    else:
        with st.spinner("Testing..."):
            try:
                from core.llm_client import LLMClient
                client = LLMClient(provider=provider, api_key=api_key)
                response = client.generate(
                    "You are a helpful assistant.",
                    "Say 'Connection successful!' and nothing else.",
                    model_tier="feedback",
                    max_tokens=50,
                )
                st.success(f"✅ {response.strip()}")
            except Exception as e:
                st.error(f"❌ Connection failed: {e}")
