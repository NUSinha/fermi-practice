import { CheckCircle, XCircle, AlertCircle, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberLine } from "@/components/number-line";
import { cn } from "@/lib/utils";
import type { Attempt, Problem } from "@shared/schema";

interface ResultDisplayProps {
  attempt: Attempt;
  problem: Problem;
  onExplain: () => void;
  onNextQuestion: () => void;
  tutorVisible?: boolean;
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (Math.abs(n) >= 1e9)  return (n / 1e9).toFixed(1)  + "B";
  if (Math.abs(n) >= 1e6)  return (n / 1e6).toFixed(1)  + "M";
  if (Math.abs(n) >= 1e3)  return (n / 1e3).toFixed(1)  + "K";
  return n.toLocaleString();
}

function humanDescription(exp: number): string {
  const descriptions: Record<string, string> = {
    "-3": "one thousandth",
    "-2": "one hundredth",
    "-1": "one tenth",
    "0":  "about 1",
    "1":  "about 10",
    "2":  "about 100",
    "3":  "about 1,000",
    "4":  "about 10,000",
    "5":  "about 100,000",
    "6":  "about 1 million",
    "7":  "about 10 million",
    "8":  "about 100 million",
    "9":  "about 1 billion",
    "10": "about 10 billion",
    "11": "about 100 billion",
    "12": "about 1 trillion",
  };
  return descriptions[String(exp)] ?? `≈ 10^${exp}`;
}

interface FeedbackConfig {
  color: string;
  bgClass: string;
  accentColor: string;
  icon: React.ReactNode;
  label: string;
}

function getFeedback(error: number): FeedbackConfig {
  if (error === 0) {
    return {
      color: "text-emerald-700",
      bgClass: "bg-emerald-50 border-emerald-200",
      accentColor: "bg-emerald-500",
      icon: <CheckCircle size={15} className="flex-shrink-0" />,
      label: "Exact match",
    };
  }
  if (error === 1) {
    return {
      color: "text-indigo-700",
      bgClass: "bg-indigo-50 border-indigo-200",
      accentColor: "bg-indigo-500",
      icon: <CheckCircle size={15} className="flex-shrink-0" />,
      label: "Off by 1 order — close",
    };
  }
  if (error === 2) {
    return {
      color: "text-amber-700",
      bgClass: "bg-amber-50 border-amber-200",
      accentColor: "bg-amber-500",
      icon: <AlertCircle size={15} className="flex-shrink-0" />,
      label: "Off by 2 orders — in the ballpark",
    };
  }
  return {
    color: "text-red-700",
    bgClass: "bg-red-50 border-red-200",
    accentColor: "bg-red-500",
    icon: <XCircle size={15} className="flex-shrink-0" />,
    label: `Off by ${error} orders of magnitude`,
  };
}

export function ResultDisplay({
  attempt,
  problem,
  onExplain,
  onNextQuestion,
  tutorVisible = false,
}: ResultDisplayProps) {
  const { error, userAnswer, userOrderOfMagnitude, correctAnswer } = attempt;
  const feedback = getFeedback(error);

  return (
    <div className="space-y-4 animate-slide-in" data-testid="result-display">
      {/* Feedback Banner */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium",
          feedback.bgClass,
          feedback.color
        )}
        data-testid="result-feedback-banner"
      >
        {feedback.icon}
        {feedback.label}
      </div>

      {/* Answer Comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-4" data-testid="result-user-answer">
          <div className="text-xs text-muted-foreground mb-1">Your answer</div>
          <div className="text-lg font-semibold text-foreground font-mono">
            {formatNumber(userAnswer)}
          </div>
          <div className="text-sm text-muted-foreground mt-0.5 font-mono">
            ≈ 10<sup>{userOrderOfMagnitude}</sup>
          </div>
        </div>

        <div
          className={cn("rounded-lg border p-4", feedback.bgClass)}
          data-testid="result-correct-answer"
        >
          <div className="text-xs text-muted-foreground mb-1">Correct answer</div>
          <div className={cn("text-lg font-semibold font-mono", feedback.color)}>
            10<sup>{correctAnswer}</sup>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {humanDescription(correctAnswer)}
          </div>
        </div>
      </div>

      {/* Number Line */}
      <div className="rounded-lg border border-border p-4">
        <NumberLine
          userExponent={userOrderOfMagnitude}
          correctExponent={correctAnswer}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        {!tutorVisible && (
          <Button
            variant="outline"
            className="flex-1 text-sm gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 transition-colors"
            onClick={onExplain}
            data-testid="button-explain-this"
          >
            <BookOpen size={15} />
            Explain this
          </Button>
        )}
        <Button
          className={cn(
            "text-sm gap-2 transition-all",
            !tutorVisible ? "flex-1" : "w-full"
          )}
          onClick={onNextQuestion}
          data-testid="button-next-question"
        >
          Next question
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
