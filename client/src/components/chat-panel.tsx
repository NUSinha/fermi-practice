import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Lightbulb, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Problem, Attempt } from "@shared/schema";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export interface InlineTutorProps {
  currentProblem: Problem | null;
  currentAttempt: Attempt | null;
  isVisible: boolean;
  mode?: "explain" | "hint";
}

async function streamChat(
  body: Record<string, unknown>,
  onChunk: (text: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Chat API error: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) onChunk(parsed.text);
          if (parsed.error) throw new Error(parsed.error);
        } catch (e: any) {
          if (e.message && !e.message.includes("JSON")) throw e;
        }
      }
    }
  }
}

function renderContent(text: string): string {
  // Strip markdown artifacts the LLM might still produce
  let clean = text;
  // Remove markdown headers (## Header → Header)
  clean = clean.replace(/^#{1,4}\s+/gm, "");
  // Remove horizontal rules
  clean = clean.replace(/^---+$/gm, "");
  // Remove LaTeX blocks — render as plain inline math
  clean = clean.replace(/\$\$([^$]+)\$\$/g, (_, expr) => {
    // Convert LaTeX to readable text
    let readable = expr
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)')
      .replace(/\\times/g, '×')
      .replace(/\\approx/g, '≈')
      .replace(/\\cdot/g, '·')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\left[()]/g, '')
      .replace(/\\right[()]/g, '')
      .replace(/\\,/g, ' ')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .trim();
    return readable;
  });
  // Remove inline LaTeX $...$
  clean = clean.replace(/\$([^$]+)\$/g, (_, expr) => {
    return expr
      .replace(/\\times/g, '×')
      .replace(/\\approx/g, '≈')
      .replace(/\\cdot/g, '·')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
      .trim();
  });
  // Bold: **text** → <strong>text</strong>
  clean = clean.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text* → <em>text</em>
  clean = clean.replace(/(?<![*])\*([^*]+)\*(?![*])/g, '<em>$1</em>');
  // Numbered lists
  clean = clean.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="pl-4">$1. $2</div>');
  // Newlines
  clean = clean.replace(/\n\n+/g, '</p><p class="mt-2">');
  clean = clean.replace(/\n/g, '<br />');
  // Remove empty paragraphs
  clean = clean.replace(/<p class="mt-2"><\/p>/g, '');
  return `<p>${clean}</p>`;
}

/** InlineTutor — button-triggered, streams explanation inline */
export function InlineTutor({
  currentProblem,
  currentAttempt,
  isVisible,
  mode = "explain",
}: InlineTutorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasExplained, setHasExplained] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAutoStarted = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
  }, []);

  const sendMessage = useCallback(
    async (body: Record<string, unknown>, displayMessage: string) => {
      if (isStreaming) return;
      setError(null);

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: displayMessage,
      };

      const assistantMsgId = `assistant-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      scrollToBottom();

      try {
        await streamChat(body, (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m
            )
          );
          scrollToBottom();
        });
        setHasExplained(true);
      } catch (err: any) {
        const errMsg = err?.message || "Could not connect to the tutor.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: "Sorry, the tutor is temporarily unavailable. Try again in a moment." }
              : m
          )
        );
        setError(errMsg);
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, streaming: false } : m))
        );
        setIsStreaming(false);
        scrollToBottom();
      }
    },
    [isStreaming, scrollToBottom]
  );

  // Auto-start the explanation/hint when component becomes visible
  useEffect(() => {
    if (isVisible && !hasAutoStarted.current && currentProblem) {
      hasAutoStarted.current = true;

      if (mode === "explain" && currentAttempt) {
        sendMessage(
          {
            mode: "explain",
            question: currentProblem.question,
            correctAnswer: currentAttempt.correctAnswer,
            userAnswer: currentAttempt.userAnswer,
            userOrderOfMagnitude: currentAttempt.userOrderOfMagnitude,
          },
          "Explain this problem"
        );
      } else if (mode === "hint") {
        sendMessage(
          {
            mode: "hint",
            question: currentProblem.question,
            correctAnswer: currentProblem.answer,
          },
          "Give me a hint"
        );
      }
    }
    if (!isVisible) {
      hasAutoStarted.current = false;
      setMessages([]);
      setInputValue("");
      setHasExplained(false);
      setError(null);
    }
  }, [isVisible, currentProblem, currentAttempt, mode, sendMessage]);

  const handleSendUserMessage = () => {
    const msg = inputValue.trim();
    if (!msg || !currentProblem) return;
    setInputValue("");
    sendMessage(
      {
        mode: "chat",
        question: currentProblem.question,
        correctAnswer: currentAttempt?.correctAnswer ?? currentProblem.answer,
        message: msg,
      },
      msg
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendUserMessage();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="rounded-lg border border-border overflow-hidden animate-slide-in"
      data-testid="inline-tutor"
      aria-label="Fermi Tutor"
    >
      {/* Messages */}
      <div ref={containerRef} className="max-h-80 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && isStreaming && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 size={14} className="animate-spin" />
            Thinking…
          </div>
        )}

        {messages.map((msg) =>
          msg.role === "user" ? null : (
            <div
              key={msg.id}
              className="text-sm leading-relaxed text-foreground"
              data-testid={`chat-message-${msg.role}`}
            >
              {msg.content ? (
                <span
                  className={cn(msg.streaming && "streaming-cursor")}
                  dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                />
              ) : msg.streaming ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  Thinking…
                </span>
              ) : null}
            </div>
          )
        )}
      </div>

      {/* Follow-up input — only after initial explanation loaded */}
      {hasExplained && !error && (
        <div className="border-t border-border px-4 py-3">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up question…"
              rows={1}
              disabled={isStreaming || !currentProblem}
              data-testid="input-chat-message"
              className="resize-none text-sm flex-1 min-h-[36px]"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleSendUserMessage}
              disabled={isStreaming || !inputValue.trim() || !currentProblem}
              data-testid="button-send-chat"
              aria-label="Send message"
              className="flex-shrink-0 h-9 w-9"
            >
              <Send size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { InlineTutor as ChatPanel };
