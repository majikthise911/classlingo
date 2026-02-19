import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processAnswer } from "@/lib/engine/lesson-engine";
import { LLMClient } from "@/lib/llm/client";
import { FEEDBACK_SYSTEM_PROMPT } from "@/lib/llm/prompts";
import type { ExerciseQuestion } from "@/lib/db/types";

export async function POST(request: NextRequest) {
  try {
    const { exerciseId, userAnswer } = await request.json();
    const supabase = await createClient();

    // Process answer (check + SM-2 + XP + hearts)
    const result = await processAnswer(supabase, exerciseId, userAnswer);

    // Generate AI feedback
    let feedback = result.correct
      ? "Correct! Well done."
      : `Not quite. The correct answer is: ${result.explanation || "N/A"}`;

    try {
      const { data: profile } = await supabase.from("user_profile").select("*").single();
      if (profile?.api_key) {
        const { data: exercise } = await supabase
          .from("exercises")
          .select("question_json")
          .eq("id", exerciseId)
          .single();

        if (exercise) {
          const exJson = exercise.question_json as ExerciseQuestion;
          const llm = new LLMClient({
            provider: profile.llm_provider,
            apiKey: profile.api_key,
            generationModel: profile.generation_model,
            feedbackModel: profile.feedback_model,
          });

          const feedbackPrompt = [
            `Exercise: ${exJson.question}`,
            `Correct answer: ${exJson.correct_answer}`,
            `Student's answer: ${userAnswer}`,
            `Was correct: ${result.correct}`,
            exJson.explanation ? `Explanation: ${exJson.explanation}` : "",
          ]
            .filter(Boolean)
            .join("\n");

          feedback = await llm.generate(FEEDBACK_SYSTEM_PROMPT, feedbackPrompt, "feedback", 300);
        }
      }
    } catch {
      // Use default feedback if LLM fails
    }

    return NextResponse.json({
      correct: result.correct,
      xpEarned: result.xpEarned,
      hearts: result.hearts,
      feedback,
      explanation: result.explanation,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Check failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
