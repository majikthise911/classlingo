"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, Loader2 } from "lucide-react";
import { extractExercisesFromWes } from "@/lib/engine/wes-engine";

export default function WesImportPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  async function handleImport() {
    if (!markdown.trim()) return;
    setSaving(true);

    // Save WES document
    const { data: wesDoc } = await supabase
      .from("wes_documents")
      .insert({
        class_id: classId,
        title: title || "Imported WES",
        markdown_content: markdown,
        source: "imported",
      })
      .select("id")
      .single();

    if (wesDoc) {
      // Extract exercises from Section 6
      const exercises = extractExercisesFromWes(markdown);
      for (const { exercise, tier } of exercises) {
        await supabase.from("exercises").insert({
          class_id: classId,
          wes_id: wesDoc.id,
          exercise_type: exercise.type,
          question_json: exercise,
          difficulty: exercise.difficulty,
          topic: exercise.topic,
          tier,
        });
      }

      router.push(`/classes/${classId}/wes/${wesDoc.id}`);
    }
    setSaving(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setMarkdown(text);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileUp className="h-5 w-5" />
            Import WES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="WES title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Upload markdown file</Label>
            <Input type="file" accept=".md,.markdown,.txt" onChange={handleFileUpload} />
          </div>

          <div className="space-y-2">
            <Label>Or paste markdown content</Label>
            <Textarea
              placeholder="Paste your WES markdown here..."
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          <Button
            onClick={handleImport}
            disabled={saving || !markdown.trim()}
            className="w-full"
            size="lg"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Import & Extract Exercises
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
