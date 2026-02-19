"""Multi-provider LLM client supporting Anthropic, OpenAI, and xAI."""

import json
import re
from typing import Optional

from core.database import get_profile

PROVIDERS = {
    "anthropic": {
        "package": "anthropic",
        "models": [
            "claude-opus-4-6",
            "claude-sonnet-4-6",
            "claude-haiku-4-5-20251001",
            "claude-sonnet-4-5",
            "claude-opus-4-5",
        ],
        "default_generation": "claude-sonnet-4-6",
        "default_feedback": "claude-haiku-4-5-20251001",
    },
    "openai": {
        "package": "openai",
        "models": [
            "gpt-5.2",
            "gpt-5.2-pro",
            "gpt-5",
            "gpt-5-mini",
            "gpt-5-nano",
        ],
        "default_generation": "gpt-5.2",
        "default_feedback": "gpt-5-mini",
    },
    "xai": {
        "package": "openai",
        "base_url": "https://api.x.ai/v1",
        "models": [
            "grok-4-1-fast-reasoning",
            "grok-4-1-fast-non-reasoning",
            "grok-4-fast-reasoning",
            "grok-4-fast-non-reasoning",
            "grok-4-0709",
            "grok-code-fast-1",
            "grok-3",
            "grok-3-mini",
        ],
        "default_generation": "grok-4-1-fast-reasoning",
        "default_feedback": "grok-4-fast-non-reasoning",
    },
}


def get_models_for_provider(provider: str) -> list[str]:
    return PROVIDERS.get(provider, {}).get("models", [])


def get_default_models(provider: str) -> tuple[str, str]:
    cfg = PROVIDERS.get(provider, {})
    return cfg.get("default_generation", ""), cfg.get("default_feedback", "")


class LLMClient:
    def __init__(self, provider: Optional[str] = None, api_key: Optional[str] = None,
                 generation_model: Optional[str] = None, feedback_model: Optional[str] = None):
        profile = get_profile()

        self.provider = provider or profile.get("llm_provider", "anthropic")
        self.api_key = api_key or profile.get("api_key", "")

        if not self.api_key:
            raise ValueError("No API key configured. Go to Settings to add one.")

        self.config = PROVIDERS[self.provider]

        # Resolve models: explicit arg > DB setting > provider default
        default_gen, default_fb = get_default_models(self.provider)
        self.generation_model = (
            generation_model
            or profile.get("generation_model")
            or default_gen
        )
        self.feedback_model = (
            feedback_model
            or profile.get("feedback_model")
            or default_fb
        )

        self._client = None

    def _get_model(self, model_tier: str) -> str:
        if model_tier == "feedback":
            return self.feedback_model
        return self.generation_model

    def _get_client(self):
        if self._client is not None:
            return self._client

        if self.config["package"] == "anthropic":
            import anthropic
            self._client = anthropic.Anthropic(api_key=self.api_key)
        else:
            import openai
            kwargs = {"api_key": self.api_key}
            if "base_url" in self.config:
                kwargs["base_url"] = self.config["base_url"]
            self._client = openai.OpenAI(**kwargs)
        return self._client

    def generate(self, system_prompt: str, user_prompt: str,
                 model_tier: str = "generation", max_tokens: int = 4096) -> str:
        client = self._get_client()
        model = self._get_model(model_tier)

        if self.config["package"] == "anthropic":
            response = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            return response.content[0].text
        else:
            response = client.chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return response.choices[0].message.content

    def generate_json(self, system_prompt: str, user_prompt: str,
                      model_tier: str = "generation") -> dict:
        raw = self.generate(system_prompt, user_prompt, model_tier)
        # Extract JSON from markdown code blocks if present
        json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", raw, re.DOTALL)
        if json_match:
            raw = json_match.group(1)
        # Try to find a JSON array or object
        raw = raw.strip()
        if not raw.startswith(("{", "[")):
            start = raw.find("{")
            if start == -1:
                start = raw.find("[")
            if start != -1:
                raw = raw[start:]
        return json.loads(raw)
