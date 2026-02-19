import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractText, chunkBySections, fallbackTopicLabel } from "@/lib/engine/content-parser";
import { LLMClient } from "@/lib/llm/client";
import { TOPIC_LABEL_PROMPT } from "@/lib/llm/prompts";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const classId = formData.get("classId") as string;
    const storagePath = formData.get("storagePath") as string;
    const weekId = formData.get("weekId") as string | null;

    if (!file || !classId) {
      return NextResponse.json({ error: "Missing file or classId" }, { status: 400 });
    }

    const supabase = await createClient();

    // Extract text from file
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentText = await extractText(file.name, buffer);

    // Save material to DB
    const { data: material, error: matError } = await supabase
      .from("materials")
      .insert({
        class_id: classId,
        filename: file.name,
        content_text: contentText,
        storage_path: storagePath || null,
        week_id: weekId || null,
      })
      .select()
      .single();

    if (matError || !material) {
      return NextResponse.json({ error: "Failed to save material" }, { status: 500 });
    }

    // Chunk the content
    const chunks = chunkBySections(contentText);

    // Try to get LLM client for topic labeling
    let llmClient: LLMClient | null = null;
    try {
      const { data: profile } = await supabase.from("user_profile").select("*").single();
      if (profile?.api_key) {
        llmClient = new LLMClient({
          provider: profile.llm_provider,
          apiKey: profile.api_key,
          generationModel: profile.generation_model,
          feedbackModel: profile.feedback_model,
        });
      }
    } catch {
      // No LLM available — use fallback labeling
    }

    // Save chunks with topic labels
    let chunkCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      let topicLabel: string;
      if (llmClient) {
        try {
          topicLabel = await llmClient.generate(
            TOPIC_LABEL_PROMPT,
            chunks[i].slice(0, 1500),
            "feedback"
          );
          topicLabel = topicLabel.trim().replace(/^["']|["']$/g, "").slice(0, 60);
        } catch {
          topicLabel = fallbackTopicLabel(chunks[i]);
        }
      } else {
        topicLabel = fallbackTopicLabel(chunks[i]);
      }

      await supabase.from("chunks").insert({
        material_id: material.id,
        chunk_text: chunks[i],
        topic_label: topicLabel,
        chunk_index: i,
      });
      chunkCount++;
    }

    return NextResponse.json({
      materialId: material.id,
      chunks: chunkCount,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Parse failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
