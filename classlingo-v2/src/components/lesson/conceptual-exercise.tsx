"use client";

import { useState } from "react";
import type { ExerciseQuestion } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LatexRenderer } from "./latex-renderer";

interface ConceptualExerciseProps {
  question: ExerciseQuestion;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

export function ConceptualExercise({ question, onAnswer, disabled }: ConceptualExerciseProps) {
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
      <Textarea
        placeholder="Explain your answer..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        rows={4}
        className="text-base"
      />
      <Button onClick={handleSubmit} disabled={!value.trim() || disabled} className="w-full">
        Submit
      </Button>
    </div>
  );
}
