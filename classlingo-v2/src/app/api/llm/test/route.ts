import { NextRequest, NextResponse } from "next/server";
import { LLMClient } from "@/lib/llm/client";
import { PROVIDERS } from "@/lib/llm/providers";

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, model } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: "No API key provided" }, { status: 400 });
    }

    if (!PROVIDERS[provider]) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const client = new LLMClient({
      provider,
      apiKey,
      generationModel: model,
      feedbackModel: model,
    });

    const response = await client.generate(
      "You are a helpful assistant.",
      "Say 'Connection successful!' and nothing else.",
      "feedback",
      50
    );

    return NextResponse.json({ message: response.trim() });
  } catch (e) {
    return NextResponse.json(
      { error: `Connection failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
