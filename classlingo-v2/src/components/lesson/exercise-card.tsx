"use client";

import type { ExerciseQuestion } from "@/lib/db/types";
import { McqExercise } from "./mcq-exercise";
import { ComputationExercise } from "./computation-exercise";
import { FillBlankExercise } from "./fill-blank-exercise";
import { ConceptualExercise } from "./conceptual-exercise";

interface ExerciseCardProps {
  question: ExerciseQuestion;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

export function ExerciseCard({ question, onAnswer, disabled }: ExerciseCardProps) {
  switch (question.type) {
    case "mcq":
      return <McqExercise question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "computation":
      return <ComputationExercise question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "fill_blank":
      return <FillBlankExercise question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "conceptual":
      return <ConceptualExercise question={question} onAnswer={onAnswer} disabled={disabled} />;
    default:
      return <McqExercise question={question} onAnswer={onAnswer} disabled={disabled} />;
  }
}
