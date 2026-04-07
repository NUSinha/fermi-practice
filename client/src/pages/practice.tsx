import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, SkipForward, AlertCircle, Lightbulb } from "lucide-react";
import { ResultDisplay } from "@/components/result-display";
import { InlineTutor } from "@/components/chat-panel";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Problem, Session, Attempt } from "@shared/schema";

// ─── Session Stats Bar ───────────────────────────────────────────────────────

interface SessionStatsBarProps {
  session: Session | null;
}

function SessionStatsBar({ session }: SessionStatsBarProps) {
  if (!session || session.totalQuestions === 0) return null;

  const avgError =
    session.totalQuestions > 0
      ? (session.totalError / session.totalQuestions).toFixed(1)
      : "—";
  const accuracy =
    session.totalQuestions > 0
      ? Math.round((session.withinOneOrder / session.totalQuestions) * 100)
      : 0;

  return (
    <div
      className="sticky top-12 z-30 border-b border-border bg-white/95 backdrop-blur-sm"
      data-testid="session-stats-bar"
    >
      <div className="max-w-2xl mx-auto px-6 py-2 flex items-center gap-6 text-sm">
        <span className="text-muted-foreground">
          Questions:{" "}
          <span className="font-medium text-foreground font-mono" data-testid="stat-total-questions">
            {session.totalQuestions}
          </span>
        </span>
        <span className="text-muted-foreground">
          Avg error:{" "}
          <span className="font-medium text-foreground font-mono" data-testid="stat-avg-error">
            {avgError}
          </span>{" "}
          orders
        </span>
        <span className="text-muted-foreground">
          Accuracy:{" "}
          <span
            className={cn(
              "font-medium font-mono",
              accuracy >= 60 ? "text-emerald-600" : accuracy >= 40 ? "text-amber-600" : "text-red-600"
            )}
            data-testid="stat-accuracy"
          >
            {accuracy}%
          </span>
        </span>
      </div>
    </div>
  );
}

// ─── Filter Controls ─────────────────────────────────────────────────────────

interface Filters {
  category: string;
  difficulty: string;
  topic: string;
}

interface FilterControlsProps {
  filters: Filters;
  onChange: (f: Filters) => void;
}

function FilterControls({ filters, onChange }: FilterControlsProps) {
  const { data: categories } = useQuery<{ category: string; count: number }[]>({
    queryKey: ["/api/problems/categories"],
  });
  const { data: difficulties } = useQuery<{ difficulty: string; count: number }[]>({
    queryKey: ["/api/problems/difficulties"],
  });
  const { data: topics } = useQuery<{ topic: string; count: number }[]>({
    queryKey: ["/api/problems/topics"],
  });

  return (
    <div className="flex flex-wrap gap-2" data-testid="filter-controls">
      <Select
        value={filters.category || "all"}
        onValueChange={(v) => onChange({ ...filters, category: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[150px] h-8 text-xs" data-testid="select-category">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories?.map((c) => (
            <SelectItem key={c.category} value={c.category}>
              {c.category} ({c.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.difficulty || "all"}
        onValueChange={(v) => onChange({ ...filters, difficulty: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="select-difficulty">
          <SelectValue placeholder="Difficulty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All levels</SelectItem>
          {difficulties?.map((d) => (
            <SelectItem key={d.difficulty} value={d.difficulty}>
              {d.difficulty} ({d.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.topic || "all"}
        onValueChange={(v) => onChange({ ...filters, topic: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="select-topic">
          <SelectValue placeholder="Topic" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All topics</SelectItem>
          {topics?.map((t) => (
            <SelectItem key={t.topic} value={t.topic}>
              {t.topic} ({t.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Difficulty Badge ────────────────────────────────────────────────────────

function DifficultyDot({ difficulty }: { difficulty: string }) {
  const color =
    difficulty === "easy"
      ? "bg-emerald-500"
      : difficulty === "medium"
      ? "bg-amber-500"
      : "bg-red-500";
  return <span className={cn("w-1.5 h-1.5 rounded-full inline-block mr-1", color)} />;
}

// ─── Main Practice Page ──────────────────────────────────────────────────────

export default function Practice() {
  const [filters, setFilters] = useState<Filters>({ category: "", difficulty: "", topic: "" });
  const [problemSeed, setProblemSeed] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<Attempt | null>(null);
  const [answerInput, setAnswerInput] = useState("");
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [guidedMode, setGuidedMode] = useState(true);
  const [assumptionsExpanded, setAssumptionsExpanded] = useState(false);
  const [assumptions, setAssumptions] = useState("");
  const [weakestAssumption, setWeakestAssumption] = useState("");
  const [tutorVisible, setTutorVisible] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiRequest("POST", "/api/sessions")
      .then((res) => res.json())
      .then((s: Session) => setSession(s))
      .catch(console.error);
  }, []);

  const queryParams = new URLSearchParams();
  if (filters.category)   queryParams.set("category", filters.category);
  if (filters.difficulty) queryParams.set("difficulty", filters.difficulty);
  if (filters.topic)      queryParams.set("topic", filters.topic);
  const paramsStr = queryParams.toString();

  const {
    data: problem,
    isLoading,
    isError,
  } = useQuery<Problem>({
    queryKey: ["/api/problems/random", filters.category, filters.difficulty, filters.topic, problemSeed],
    queryFn: async () => {
      const url = paramsStr ? `/api/problems/random?${paramsStr}` : "/api/problems/random";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    staleTime: 0,
  });

  const attemptMutation = useMutation({
    mutationFn: async (data: {
      sessionId: number;
      problemId: number;
      userAnswer: number;
      assumptions?: string[];
      weakestAssumption?: string;
    }) => {
      const res = await apiRequest("POST", "/api/attempts", data);
      return res.json() as Promise<Attempt>;
    },
    onSuccess: (attempt: Attempt) => {
      setCurrentAttempt(attempt);
      setHintVisible(false);
      // Don't auto-show tutor — user clicks "Explain this"
      setTutorVisible(false);
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalQuestions: prev.totalQuestions + 1,
          totalError: prev.totalError + attempt.error,
          withinOneOrder: prev.withinOneOrder + (attempt.error <= 1 ? 1 : 0),
        };
      });
    },
  });

  const handleSubmit = useCallback(() => {
    if (!problem || !session) return;
    const raw = answerInput.trim();
    if (!raw) {
      setAnswerError("Please enter a number.");
      return;
    }
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) {
      setAnswerError("Enter a positive number (e.g., 50000 or 5e4).");
      return;
    }
    setAnswerError(null);
    const assumptionsList = assumptions.split("\n").map((a) => a.trim()).filter(Boolean);
    attemptMutation.mutate({
      sessionId: session.id,
      problemId: problem.id,
      userAnswer: parsed,
      assumptions: assumptionsList.length > 0 ? assumptionsList : undefined,
      weakestAssumption: weakestAssumption.trim() || undefined,
    });
  }, [problem, session, answerInput, assumptions, weakestAssumption, attemptMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleNextQuestion = useCallback(() => {
    setCurrentAttempt(null);
    setAnswerInput("");
    setAnswerError(null);
    setAssumptions("");
    setWeakestAssumption("");
    setAssumptionsExpanded(false);
    setTutorVisible(false);
    setHintVisible(false);
    setProblemSeed((prev) => prev + 1);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSkip = useCallback(() => {
    setCurrentAttempt(null);
    setAnswerInput("");
    setAnswerError(null);
    setAssumptions("");
    setWeakestAssumption("");
    setAssumptionsExpanded(false);
    setTutorVisible(false);
    setHintVisible(false);
    setProblemSeed((prev) => prev + 1);
  }, []);

  const handleFiltersChange = (f: Filters) => {
    setFilters(f);
    setCurrentAttempt(null);
    setAnswerInput("");
    setAnswerError(null);
    setTutorVisible(false);
    setHintVisible(false);
    setProblemSeed((prev) => prev + 1);
  };

  const hasAnswered = currentAttempt !== null;

  return (
    <>
      <SessionStatsBar session={session} />

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Filters + Skip */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <FilterControls filters={filters} onChange={handleFiltersChange} />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={isLoading}
            data-testid="button-skip"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <SkipForward size={14} />
            Skip
          </Button>
        </div>

        {/* Problem Card */}
        <div className="rounded-lg border border-border p-6" data-testid="problem-card">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/4 mt-2" />
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={16} />
              No problems found for the selected filters.
            </div>
          ) : problem ? (
            <>
              <p
                className="text-base font-medium leading-relaxed text-foreground mb-3"
                data-testid="problem-question"
              >
                {problem.question}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span
                  className="inline-flex items-center text-xs px-2 py-0.5 rounded border border-border text-muted-foreground"
                  data-testid="problem-category"
                >
                  {problem.category}
                </span>
                <span
                  className="inline-flex items-center text-xs px-2 py-0.5 rounded border border-border text-muted-foreground"
                  data-testid="problem-difficulty"
                >
                  <DifficultyDot difficulty={problem.difficulty} />
                  {problem.difficulty}
                </span>
                <span
                  className="inline-flex items-center text-xs px-2 py-0.5 rounded border border-border text-muted-foreground"
                  data-testid="problem-topic"
                >
                  {problem.topic}
                </span>
                {problem.source && (
                  <span className="inline-flex items-center text-xs px-2 py-0.5 rounded border border-border text-muted-foreground">
                    {problem.source}
                  </span>
                )}
              </div>

              {/* Hint button — before answering */}
              {!hasAnswered && (
                <div className="mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHintVisible(true)}
                    disabled={hintVisible}
                    data-testid="button-get-hint-problem"
                    className="text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 gap-1.5"
                  >
                    <Lightbulb size={13} />
                    Get a hint
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Hint Tutor — inline, before answering */}
        {hintVisible && problem && !hasAnswered && (
          <InlineTutor
            currentProblem={problem}
            currentAttempt={null}
            isVisible={hintVisible}
            mode="hint"
          />
        )}

        {/* Answer Section */}
        {!hasAnswered && problem && !isLoading && !isError && (
          <div className="space-y-4">
            {/* Guided Mode Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="guided-mode"
                checked={guidedMode}
                onCheckedChange={setGuidedMode}
                data-testid="switch-guided-mode"
              />
              <Label htmlFor="guided-mode" className="text-sm text-muted-foreground cursor-pointer">
                Guided mode (Three-Assumptions Protocol)
              </Label>
            </div>

            {/* Assumptions */}
            {guidedMode && (
              <div className="rounded-lg border border-border overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => setAssumptionsExpanded((p) => !p)}
                  data-testid="button-toggle-assumptions"
                  aria-expanded={assumptionsExpanded}
                >
                  <span>List your assumptions (optional)</span>
                  {assumptionsExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {assumptionsExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border">
                    <div className="pt-3">
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Assumptions (one per line)
                      </Label>
                      <Textarea
                        value={assumptions}
                        onChange={(e) => setAssumptions(e.target.value)}
                        placeholder={"e.g., US population is ~330 million\nAverage household has 2.5 people"}
                        rows={3}
                        data-testid="textarea-assumptions"
                        className="text-sm resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Weakest assumption
                      </Label>
                      <Textarea
                        value={weakestAssumption}
                        onChange={(e) => setWeakestAssumption(e.target.value)}
                        placeholder="Which assumption are you least confident about?"
                        rows={2}
                        data-testid="textarea-weakest-assumption"
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Answer Input */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  type="text"
                  inputMode="decimal"
                  value={answerInput}
                  onChange={(e) => {
                    setAnswerInput(e.target.value);
                    setAnswerError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your estimate (e.g., 50000 or 5e4)"
                  className={cn(
                    "h-11 text-sm flex-1 font-mono",
                    answerError && "border-red-400 focus-visible:ring-red-400"
                  )}
                  data-testid="input-answer"
                  autoFocus
                />
                <Button
                  className="h-11 px-5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  onClick={handleSubmit}
                  disabled={attemptMutation.isPending || !answerInput.trim()}
                  data-testid="button-submit-answer"
                >
                  {attemptMutation.isPending ? "Checking…" : "Submit"}
                </Button>
              </div>
              {answerError && (
                <p className="text-xs text-red-600 flex items-center gap-1" data-testid="answer-error">
                  <AlertCircle size={12} />
                  {answerError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter a number (e.g., 50000 or 5e4). Press Enter to submit.
              </p>
            </div>
          </div>
        )}

        {/* Result Display — user clicks "Explain this" to open tutor */}
        {hasAnswered && problem && currentAttempt && (
          <ResultDisplay
            attempt={currentAttempt}
            problem={problem}
            onExplain={() => setTutorVisible(true)}
            onNextQuestion={handleNextQuestion}
            tutorVisible={tutorVisible}
          />
        )}

        {/* Inline Tutor — only shown when user clicks "Explain this" */}
        {hasAnswered && problem && currentAttempt && tutorVisible && (
          <InlineTutor
            currentProblem={problem}
            currentAttempt={currentAttempt}
            isVisible={tutorVisible}
            mode="explain"
          />
        )}
      </div>
    </>
  );
}
