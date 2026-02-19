"use client";

import { CheckCircle, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { LatexRenderer } from "./latex-renderer";

interface FeedbackPanelProps {
  correct: boolean;
  feedback: string;
  explanation: string;
  xpEarned: number;
}

export function FeedbackPanel({ correct, feedback, explanation, xpEarned }: FeedbackPanelProps) {
  return (
    <div
      className={cn(
        "feedback-enter rounded-lg border p-4 space-y-2",
        correct
          ? "border-success/30 bg-success/10"
          : "border-destructive/30 bg-destructive/10"
      )}
    >
      <div className="flex items-center gap-2">
        {correct ? (
          <CheckCircle className="h-5 w-5 text-success" />
        ) : (
          <XCircle className="h-5 w-5 text-destructive" />
        )}
        <span className={cn("font-semibold", correct ? "text-success" : "text-destructive")}>
          {correct ? "Correct!" : "Not quite"}
        </span>
        <span className="ml-auto flex items-center gap-1 text-sm text-xp">
          <Zap className="h-4 w-4 fill-current" />
          +{xpEarned} XP
        </span>
      </div>
      <div className="text-sm">
        <LatexRenderer content={feedback} />
      </div>
      {explanation && !correct && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium">Show explanation</summary>
          <div className="mt-2">
            <LatexRenderer content={explanation} />
          </div>
        </details>
      )}
    </div>
  );
}
