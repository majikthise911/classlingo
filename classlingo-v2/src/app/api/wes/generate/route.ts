import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LLMClient } from "@/lib/llm/client";
import { WES_SYSTEM_PROMPT } from "@/lib/llm/prompts";
import { buildWesPrompt } from "@/lib/engine/wes-engine";

export async function POST(request: NextRequest) {
  try {
    const { classId, weekId, title } = await request.json();
    const supabase = await createClient();

    // Get user's LLM config
    const { data: profile } = await supabase.from("user_profile").select("*").single();
    if (!profile?.api_key) {
      return new Response(JSON.stringify({ error: "No API key configured" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get materials for this week (or all class materials if no week)
    let materialsQuery = supabase.from("materials").select("filename, content_text");
    if (weekId) {
      materialsQuery = materialsQuery.eq("week_id", weekId);
    } else {
      materialsQuery = materialsQuery.eq("class_id", classId);
    }
    const { data: materials } = await materialsQuery;

    if (!materials?.length) {
      return new Response(JSON.stringify({ error: "No materials found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const llm = new LLMClient({
      provider: profile.llm_provider,
      apiKey: profile.api_key,
      generationModel: profile.generation_model,
      feedbackModel: profile.feedback_model,
    });

    const userPrompt = buildWesPrompt(materials, title);

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        try {
          for await (const chunk of llm.generateStream(
            WES_SYSTEM_PROMPT,
            userPrompt,
            "generation",
            16384
          )) {
            fullContent += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }

          // Save WES document to DB
          const { data: wesDoc } = await supabase
            .from("wes_documents")
            .insert({
              class_id: classId,
              week_id: weekId || null,
              title: title || "Weekly Engagement Summary",
              markdown_content: fullContent,
              source: "generated",
            })
            .select("id")
            .single();

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, wesId: wesDoc?.id, content: fullContent })}\n\n`
            )
          );
        } catch (e) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: e instanceof Error ? e.message : "Generation failed" })}\n\n`
            )
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `WES generation failed: ${e instanceof Error ? e.message : e}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
