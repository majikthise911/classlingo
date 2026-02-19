"use client";

import { useState } from "react";
import type { ExerciseQuestion } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LatexRenderer } from "./latex-renderer";

interface McqExerciseProps {
  question: ExerciseQuestion;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

export function McqExercise({ question, onAnswer, disabled }: McqExerciseProps) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(option: string) {
    if (disabled) return;
    const letter = option.charAt(0);
    setSelected(letter);
    onAnswer(letter);
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-medium">
        <LatexRenderer content={question.question} />
      </div>
      {question.hint && (
        <p className="text-sm text-muted-foreground italic">
          Hint: <LatexRenderer content={question.hint} />
        </p>
      )}
      <div className="space-y-2">
        {question.options?.map((option, i) => (
          <Button
            key={i}
            variant={selected === option.charAt(0) ? "default" : "outline"}
            className={cn("w-full justify-start text-left h-auto py-3 px-4", disabled && "pointer-events-none")}
            onClick={() => handleSelect(option)}
          >
            <LatexRenderer content={option} />
          </Button>
        ))}
      </div>
    </div>
  );
}
