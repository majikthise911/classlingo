"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2, AlertCircle } from "lucide-react";

export default function LessonsPage() {
  const params = useParams();
  const classId = params.classId as string;
  const [exerciseCount, setExerciseCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("exercises")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .then(({ count }) => {
        setExerciseCount(count ?? 0);
        setLoading(false);
      });
  }, [classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Start a Lesson</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {exerciseCount === 0 ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                No exercises available yet. Upload materials and generate exercises first, or create a WES to auto-extract exercises.
              </p>
              <div className="flex gap-2">
                <Link href={`/classes/${classId}/files`}>
                  <Button variant="outline" size="sm">Upload Files</Button>
                </Link>
                <Link href={`/classes/${classId}/wes`}>
                  <Button variant="outline" size="sm">Create WES</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground">
                {exerciseCount} exercises available. Lessons mix review (spaced repetition) with new material.
              </p>
              <Link href={`/classes/${classId}/lessons/play`}>
                <Button className="w-full" size="xl">
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Start Lesson
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
