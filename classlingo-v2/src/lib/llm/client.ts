/**
 * Multi-provider LLM client.
 * Port of Python core/llm_client.py
 * Server-side only — uses Node.js SDKs.
 */

import Anthropic from "anthropic";
import OpenAI from "openai";
import { PROVIDERS } from "./providers";

export interface LLMClientConfig {
  provider: string;
  apiKey: string;
  generationModel: string;
  feedbackModel: string;
}

export class LLMClient {
  private config: LLMClientConfig;
  private anthropicClient?: Anthropic;
  private openaiClient?: OpenAI;

  constructor(config: LLMClientConfig) {
    this.config = config;
    if (!config.apiKey) {
      throw new Error("No API key configured. Go to Settings to add one.");
    }
  }

  private getModel(tier: "generation" | "feedback"): string {
    return tier === "feedback" ? this.config.feedbackModel : this.config.generationModel;
  }

  private getClient(): { type: "anthropic"; client: Anthropic } | { type: "openai"; client: OpenAI } {
    const providerConfig = PROVIDERS[this.config.provider];
    if (!providerConfig) throw new Error(`Unknown provider: ${this.config.provider}`);

    if (providerConfig.package === "anthropic") {
      if (!this.anthropicClient) {
        this.anthropicClient = new Anthropic({ apiKey: this.config.apiKey });
      }
      return { type: "anthropic", client: this.anthropicClient };
    } else {
      if (!this.openaiClient) {
        this.openaiClient = new OpenAI({
          apiKey: this.config.apiKey,
          ...(providerConfig.baseUrl ? { baseURL: providerConfig.baseUrl } : {}),
        });
      }
      return { type: "openai", client: this.openaiClient };
    }
  }

  async generate(
    systemPrompt: string,
    userPrompt: string,
    modelTier: "generation" | "feedback" = "generation",
    maxTokens: number = 4096
  ): Promise<string> {
    const { type, client } = this.getClient();
    const model = this.getModel(modelTier);

    if (type === "anthropic") {
      const response = await (client as Anthropic).messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      const block = response.content[0];
      return block.type === "text" ? block.text : "";
    } else {
      const response = await (client as OpenAI).chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      return response.choices[0]?.message?.content ?? "";
    }
  }

  async generateJson(
    systemPrompt: string,
    userPrompt: string,
    modelTier: "generation" | "feedback" = "generation"
  ): Promise<unknown> {
    const raw = await this.generate(systemPrompt, userPrompt, modelTier);
    return extractJson(raw);
  }

  async *generateStream(
    systemPrompt: string,
    userPrompt: string,
    modelTier: "generation" | "feedback" = "generation",
    maxTokens: number = 16384
  ): AsyncGenerator<string> {
    const { type, client } = this.getClient();
    const model = this.getModel(modelTier);

    if (type === "anthropic") {
      const stream = (client as Anthropic).messages.stream({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
    } else {
      const stream = await (client as OpenAI).chat.completions.create({
        model,
        max_tokens: maxTokens,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    }
  }
}

/** Extract JSON from a string that may contain markdown code blocks. */
export function extractJson(raw: string): unknown {
  // Try extracting from markdown code blocks
  const jsonMatch = raw.match(/```(?:json)?\s*\n?(.*?)\n?```/s);
  let cleaned = jsonMatch ? jsonMatch[1] : raw;

  cleaned = cleaned.trim();
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const start = cleaned.indexOf("{");
    const arrStart = cleaned.indexOf("[");
    const idx = start === -1 ? arrStart : arrStart === -1 ? start : Math.min(start, arrStart);
    if (idx !== -1) cleaned = cleaned.slice(idx);
  }

  return JSON.parse(cleaned);
}
