/**
 * LLM provider configurations.
 * Port of Python core/llm_client.py PROVIDERS dict.
 */

export interface ProviderConfig {
  package: "anthropic" | "openai";
  baseUrl?: string;
  models: string[];
  defaultGeneration: string;
  defaultFeedback: string;
  displayName: string;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  anthropic: {
    package: "anthropic",
    models: [
      "claude-opus-4-6",
      "claude-sonnet-4-6",
      "claude-haiku-4-5-20251001",
      "claude-sonnet-4-5",
      "claude-opus-4-5",
    ],
    defaultGeneration: "claude-sonnet-4-6",
    defaultFeedback: "claude-haiku-4-5-20251001",
    displayName: "Anthropic (Claude)",
  },
  openai: {
    package: "openai",
    models: [
      "gpt-5.2",
      "gpt-5.2-pro",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
    ],
    defaultGeneration: "gpt-5.2",
    defaultFeedback: "gpt-5-mini",
    displayName: "OpenAI",
  },
  xai: {
    package: "openai",
    baseUrl: "https://api.x.ai/v1",
    models: [
      "grok-4-1-fast-reasoning",
      "grok-4-1-fast-non-reasoning",
      "grok-4-fast-reasoning",
      "grok-4-fast-non-reasoning",
      "grok-4-0709",
      "grok-code-fast-1",
      "grok-3",
      "grok-3-mini",
    ],
    defaultGeneration: "grok-4-1-fast-reasoning",
    defaultFeedback: "grok-4-fast-non-reasoning",
    displayName: "xAI (Grok)",
  },
};

export function getModelsForProvider(provider: string): string[] {
  return PROVIDERS[provider]?.models ?? [];
}

export function getDefaultModels(provider: string): { generation: string; feedback: string } {
  const cfg = PROVIDERS[provider];
  return {
    generation: cfg?.defaultGeneration ?? "",
    feedback: cfg?.defaultFeedback ?? "",
  };
}
