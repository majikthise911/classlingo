"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, ExerciseQuestion } from "@/lib/db/types";
import { ExerciseCard } from "@/components/lesson/exercise-card";
import { FeedbackPanel } from "@/components/lesson/feedback-panel";
import { LessonComplete } from "@/components/lesson/lesson-complete";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Heart, Loader2 } from "lucide-react";

interface AnswerResult {
  correct: boolean;
  xpEarned: number;
  hearts: number;
  feedback: string;
  explanation: string;
}

export default function LessonPlayPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [hearts, setHearts] = useState(5);
  const [totalXp, setTotalXp] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [bonusXp, setBonusXp] = useState(0);

  useEffect(() => {
    async function loadLesson() {
      const supabase = createClient();

      // Get user hearts
      const { data: profile } = await supabase.from("user_profile").select("hearts").single();
      if (profile) setHearts(profile.hearts);

      // Get due exercises first
      const today = new Date().toISOString().split("T")[0];
      const { data: dueProgress } = await supabase
        .from("progress")
        .select("exercise_id, exercises!inner(*)")
        .eq("exercises.class_id", classId)
        .lte("next_review", today)
        .order("next_review", { ascending: true })
        .limit(4);

      const dueExercises: Exercise[] = (dueProgress ?? []).map(
        (r: Record<string, unknown>) => r.exercises as Exercise
      );

      // Get new exercises
      const dueIds = dueExercises.map((e) => e.id);
      let newExercisesQuery = supabase
        .from("exercises")
        .select("*")
        .eq("class_id", classId);

      if (dueIds.length > 0) {
        newExercisesQuery = newExercisesQuery.not("id", "in", `(${dueIds.join(",")})`);
      }

      const { data: newExercises } = await newExercisesQuery.limit(7 - dueExercises.length);

      const all = [...dueExercises, ...(newExercises ?? [])];
      // Shuffle
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }

      setExercises(all.slice(0, 7));
      setLoading(false);
    }
    loadLesson();
  }, [classId]);

  async function handleAnswer(answer: string) {
    if (checking || result) return;
    setChecking(true);

    const exercise = exercises[currentIndex];
    try {
      const res = await fetch("/api/exercises/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: exercise.id, userAnswer: answer }),
      });
      const data: AnswerResult = await res.json();
      setResult(data);
      setHearts(data.hearts);
      setTotalXp((prev) => prev + data.xpEarned);
      if (data.correct) setCorrectCount((prev) => prev + 1);
    } catch {
      setResult({
        correct: false,
        xpEarned: 0,
        hearts,
        feedback: "Error checking answer. Please try again.",
        explanation: "",
      });
    }
    setChecking(false);
  }

  async function handleContinue() {
    if (currentIndex + 1 >= exercises.length) {
      // Lesson complete — award bonus
      try {
        const supabase = createClient();
        const { data: profile } = await supabase.from("user_profile").select("*").single();
        if (profile) {
          const bonus = 50; // XP_LESSON_BONUS
          const newTotal = profile.total_xp + bonus;
          await supabase.from("user_profile").update({
            total_xp: newTotal,
            level: Math.floor(newTotal / 100) + 1,
          }).eq("id", profile.id);
          setBonusXp(bonus);
        }
      } catch {
        // ignore
      }
      setCompleted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setResult(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No exercises available for this lesson.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (completed) {
    return (
      <LessonComplete
        totalExercises={exercises.length}
        correctCount={correctCount}
        totalXp={totalXp}
        bonusXp={bonusXp}
        classId={classId}
      />
    );
  }

  const exercise = exercises[currentIndex];
  const question = exercise.question_json as ExerciseQuestion;
  const progressPercent = ((currentIndex + (result ? 1 : 0)) / exercises.length) * 100;

  return (
    <div className="-mx-4 -mt-6 min-h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/classes/${classId}/lessons`)}
        >
          <X className="h-5 w-5" />
        </Button>
        <Progress value={progressPercent} className="h-2 flex-1" />
        <div className="flex items-center gap-1 text-hearts">
          <Heart className="h-4 w-4 fill-current" />
          <span className="text-sm font-medium">{hearts}</span>
        </div>
      </div>

      {/* Exercise */}
      <div className="px-4 py-6">
        <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
          {question.topic} — {exercise.exercise_type}
        </p>

        <div className="exercise-enter">
          <ExerciseCard
            question={question}
            onAnswer={handleAnswer}
            disabled={!!result || checking}
          />
        </div>

        {checking && (
          <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking...</span>
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-4">
            <FeedbackPanel
              correct={result.correct}
              feedback={result.feedback}
              explanation={result.explanation}
              xpEarned={result.xpEarned}
            />
            <Button onClick={handleContinue} className="w-full" size="lg">
              {currentIndex + 1 >= exercises.length ? "Finish Lesson" : "Continue"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
