"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Zap, CheckCircle, XCircle } from "lucide-react";

interface LessonCompleteProps {
  totalExercises: number;
  correctCount: number;
  totalXp: number;
  bonusXp: number;
  classId: string;
}

export function LessonComplete({
  totalExercises,
  correctCount,
  totalXp,
  bonusXp,
  classId,
}: LessonCompleteProps) {
  const accuracy = Math.round((correctCount / totalExercises) * 100);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6">
      <Trophy className="h-16 w-16 text-xp" />
      <h1 className="text-3xl font-bold">Lesson Complete!</h1>

      <div className="grid grid-cols-3 gap-4 text-center">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-1 text-success">
              <CheckCircle className="h-5 w-5" />
              <span className="text-2xl font-bold">{correctCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Correct</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-1 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="text-2xl font-bold">{totalExercises - correctCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Wrong</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full max-w-xs">
        <CardContent className="flex items-center justify-center gap-2 p-4">
          <Zap className="h-6 w-6 fill-current text-xp" />
          <span className="text-2xl font-bold text-xp">+{totalXp + bonusXp} XP</span>
        </CardContent>
      </Card>

      <div className="flex w-full max-w-xs gap-2">
        <Link href={`/classes/${classId}/lessons`} className="flex-1">
          <Button variant="outline" className="w-full">
            Back
          </Button>
        </Link>
        <Link href={`/classes/${classId}/lessons/play`} className="flex-1">
          <Button className="w-full">Next Lesson</Button>
        </Link>
      </div>
    </div>
  );
}
