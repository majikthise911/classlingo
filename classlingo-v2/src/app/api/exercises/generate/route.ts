import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LLMClient } from "@/lib/llm/client";
import { BATCH_EXERCISE_PROMPT, EXERCISE_SYSTEM_PROMPT } from "@/lib/llm/prompts";
import type { ExerciseQuestion } from "@/lib/db/types";

export async function POST(request: NextRequest) {
  try {
    const { classId, chunkId, count = 3 } = await request.json();
    const supabase = await createClient();

    // Get chunk
    const { data: chunk } = await supabase
      .from("chunks")
      .select("*")
      .eq("id", chunkId)
      .single();

    if (!chunk) {
      return NextResponse.json({ error: "Chunk not found" }, { status: 404 });
    }

    // Get LLM client from user profile
    const { data: profile } = await supabase.from("user_profile").select("*").single();
    if (!profile?.api_key) {
      return NextResponse.json({ error: "No API key configured" }, { status: 400 });
    }

    const llm = new LLMClient({
      provider: profile.llm_provider,
      apiKey: profile.api_key,
      generationModel: profile.generation_model,
      feedbackModel: profile.feedback_model,
    });

    const prompt = `Course material chunk (topic: ${chunk.topic_label}):\n\n${chunk.chunk_text}`;
    const systemPrompt = count === 1 ? EXERCISE_SYSTEM_PROMPT : BATCH_EXERCISE_PROMPT;

    const result = await llm.generateJson(systemPrompt, prompt);
    const exercisesData: ExerciseQuestion[] = Array.isArray(result)
      ? (result as ExerciseQuestion[])
      : [result as ExerciseQuestion];

    const exerciseIds: string[] = [];
    for (const exData of exercisesData) {
      const { data: exercise } = await supabase
        .from("exercises")
        .insert({
          class_id: classId,
          chunk_id: chunkId,
          exercise_type: exData.type || "mcq",
          question_json: exData,
          difficulty: exData.difficulty || 3,
          topic: exData.topic || chunk.topic_label,
        })
        .select("id")
        .single();

      if (exercise) exerciseIds.push(exercise.id);
    }

    return NextResponse.json({ exerciseIds, count: exerciseIds.length });
  } catch (e) {
    return NextResponse.json(
      { error: `Generation failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
