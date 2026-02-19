"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Week } from "@/lib/db/types";
import { WesRenderer } from "@/components/wes/wes-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookMarked, Sparkles } from "lucide-react";
import { extractExercisesFromWes } from "@/lib/engine/wes-engine";

export default function WesGeneratePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = params.classId as string;
  const preselectedWeekId = searchParams.get("weekId");

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(preselectedWeekId || "all");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState("");
  const [wesId, setWesId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("weeks")
      .select("*")
      .eq("class_id", classId)
      .order("week_number")
      .then(({ data }) => setWeeks(data ?? []));
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setGenerating(true);
    setContent("");
    setError("");
    setWesId(null);

    try {
      const res = await fetch("/api/wes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          weekId: selectedWeek === "all" ? null : selectedWeek,
          title: title || "Weekly Engagement Summary",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Generation failed");
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.error) {
            setError(data.error);
            break;
          }
          if (data.text) {
            setContent((prev) => prev + data.text);
          }
          if (data.done) {
            setWesId(data.wesId);
          }
        }
      }
    } catch (e) {
      setError(`Failed: ${e instanceof Error ? e.message : e}`);
    }
    setGenerating(false);
  }

  async function handleExtractExercises() {
    if (!wesId || !content) return;
    setExtracting(true);

    const exercises = extractExercisesFromWes(content);
    for (const { exercise, tier } of exercises) {
      await supabase.from("exercises").insert({
        class_id: classId,
        wes_id: wesId,
        exercise_type: exercise.type,
        question_json: exercise,
        difficulty: exercise.difficulty,
        topic: exercise.topic,
        tier,
      });
    }

    setExtracting(false);
    alert(`Extracted ${exercises.length} exercises from WES!`);
  }

  return (
    <div className="space-y-4">
      {!content && !generating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate WES
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input
                placeholder="e.g., Week 3 — Keplerian Elements"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Source Materials</Label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger>
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All class materials</SelectItem>
                  {weeks.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      Week {w.week_number}{w.title ? `: ${w.title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={handleGenerate} className="w-full" size="lg" disabled={generating}>
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BookMarked className="mr-2 h-4 w-4" />
              )}
              Generate
            </Button>
          </CardContent>
        </Card>
      )}

      {(content || generating) && (
        <div className="space-y-4">
          {generating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating WES...
            </div>
          )}

          <WesRenderer content={content} />

          {wesId && !generating && (
            <div className="flex gap-2">
              <Button onClick={handleExtractExercises} disabled={extracting} className="flex-1">
                {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Extract Exercises from Section 6
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/classes/${classId}/wes/${wesId}`)}
              >
                View WES
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
