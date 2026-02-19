"use client";

import { useState } from "react";
import type { ExerciseQuestion } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LatexRenderer } from "./latex-renderer";

interface FillBlankExerciseProps {
  question: ExerciseQuestion;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

export function FillBlankExercise({ question, onAnswer, disabled }: FillBlankExerciseProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    if (!value.trim() || disabled) return;
    onAnswer(value.trim());
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
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Fill in the blank..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={disabled}
          className="text-lg"
        />
        <Button onClick={handleSubmit} disabled={!value.trim() || disabled}>
          Submit
        </Button>
      </div>
    </div>
  );
}
