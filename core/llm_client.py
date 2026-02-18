"""Multi-provider LLM client supporting Anthropic, OpenAI, and xAI."""

import json
import re
from typing import Optional

from core.database import get_profile

PROVIDERS = {
    "anthropic": {
        "generation": "claude-sonnet-4-20250514",
        "feedback": "claude-haiku-4-5-20251001",
        "package": "anthropic",
    },
    "openai": {
        "generation": "gpt-4o",
        "feedback": "gpt-4o-mini",
        "package": "openai",
    },
    "xai": {
        "generation": "grok-3",
        "feedback": "grok-3-mini",
        "package": "openai",
        "base_url": "https://api.x.ai/v1",
    },
}


class LLMClient:
    def __init__(self, provider: Optional[str] = None, api_key: Optional[str] = None):
        if provider is None or api_key is None:
            profile = get_profile()
            self.provider = provider or profile.get("llm_provider", "anthropic")
            self.api_key = api_key or profile.get("api_key", "")
        else:
            self.provider = provider
            self.api_key = api_key

        if not self.api_key:
            raise ValueError("No API key configured. Go to Settings to add one.")

        self.config = PROVIDERS[self.provider]
        self._client = None

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
        model = self.config[model_tier]

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
