/**
 * WES (Weekly Engagement Summary) engine.
 * Handles Section 6 exercise extraction from WES markdown.
 */

import type { ExerciseQuestion } from "@/lib/db/types";

/**
 * Extract exercises from WES Section 6 (Active Recall).
 * Looks for ```exercise JSON code blocks.
 */
export function extractExercisesFromWes(
  markdown: string
): { exercise: ExerciseQuestion; tier: number }[] {
  const results: { exercise: ExerciseQuestion; tier: number }[] = [];

  // Find all ```exercise blocks
  const exerciseBlockRegex = /```exercise\s*\n([\s\S]*?)```/g;
  let match;

  // Track which tier section we're in
  let currentTier = 1;

  // Split markdown by lines to track tier headers
  const lines = markdown.split("\n");
  let lineIndex = 0;

  while ((match = exerciseBlockRegex.exec(markdown)) !== null) {
    // Find what line this match is on to determine tier
    const matchPos = match.index;
    const textBefore = markdown.slice(0, matchPos);
    const linesBefore = textBefore.split("\n").length;

    // Look backwards from this exercise for the nearest tier header
    for (let i = linesBefore - 1; i >= 0; i--) {
      if (i < lines.length) {
        const line = lines[i].toLowerCase();
        if (line.includes("tier 3") || line.includes("synthesis")) {
          currentTier = 3;
          break;
        } else if (line.includes("tier 2") || line.includes("application")) {
          currentTier = 2;
          break;
        } else if (line.includes("tier 1") || line.includes("recall")) {
          currentTier = 1;
          break;
        }
      }
    }

    try {
      const jsonStr = match[1].trim();
      const parsed = JSON.parse(jsonStr) as ExerciseQuestion;

      // Validate required fields
      if (parsed.question && parsed.correct_answer && parsed.type) {
        results.push({
          exercise: {
            type: parsed.type,
            question: parsed.question,
            options: parsed.options,
            correct_answer: parsed.correct_answer,
            explanation: parsed.explanation ?? "",
            hint: parsed.hint,
            difficulty: parsed.difficulty ?? currentTier + 1,
            topic: parsed.topic ?? "General",
            tolerance: parsed.tolerance,
          },
          tier: currentTier,
        });
      }
    } catch {
      // Skip malformed JSON blocks
      continue;
    }
  }

  return results;
}

/**
 * Build the user prompt for WES generation from materials.
 */
export function buildWesPrompt(
  materials: { filename: string; content_text: string | null }[],
  weekTitle?: string
): string {
  const parts: string[] = [];

  if (weekTitle) {
    parts.push(`# Week: ${weekTitle}\n`);
  }

  parts.push("# Course Materials\n");

  for (const mat of materials) {
    if (mat.content_text) {
      parts.push(`## ${mat.filename}\n\n${mat.content_text}\n`);
    }
  }

  parts.push(
    "\n---\n\nBased on the above course materials, generate a comprehensive Weekly Engagement Summary (WES) following the structure specified in your system prompt."
  );

  return parts.join("\n");
}
