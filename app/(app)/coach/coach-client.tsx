"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUp, Info, Sparkles } from "lucide-react";
import type { CoachMessage } from "@/lib/data/coach";
import { sendCoachMessage, type SendResult } from "./actions";
import { Card } from "@/components/ui/card";
import { BorderBeam } from "@/components/ui/border-beam";
import { cn } from "@/lib/utils";

type Message = CoachMessage;

const SUGGESTIONS = [
  "How am I doing this week?",
  "Am I hitting my protein target?",
  "Has my weight actually stalled?",
  "I only have 30 minutes today — what should I cut?",
];

export function CoachClient({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  // Clear any in-flight reveal timers if the component unmounts mid-answer.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || streaming) return;

    // Shown immediately; the stored row replaces it when the action returns.
    const pendingId = `pending-${Date.now()}`;
    setMessages((m) => [...m, { id: pendingId, role: "user", content: question }]);
    setInput("");
    setStreaming(true);
    setError(null);

    void (async () => {
      // An action that rejects — a dropped connection, a timeout, something
      // thrown server-side — used to leave the typing dots running forever
      // with nothing to click. Treat it as a failed send instead.
      let result: SendResult;
      try {
        result = await sendCoachMessage(question);
      } catch {
        result = {
          ok: false,
          error: "That did not reach your coach. Check your connection and try again.",
        };
      }

      if (!result.ok) {
        setMessages((m) => m.filter((msg) => msg.id !== pendingId));
        setInput(question);
        setError(result.error);
        setStreaming(false);
        return;
      }

      const answer = result.messages.find((m) => m.role === "assistant");
      const stored = result.messages.find((m) => m.role === "user");

      setMessages((m) =>
        m.map((msg) => (msg.id === pendingId && stored ? stored : msg)),
      );

      if (!answer) {
        setStreaming(false);
        return;
      }

      // Reveal the saved answer word by word — the content is already in the
      // database, this is presentation only.
      const words = answer.content.split(" ");
      setMessages((m) => [...m, { ...answer, content: "" }]);
      words.forEach((_, i) => {
        timers.current.push(
          setTimeout(() => {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === answer.id
                  ? { ...msg, content: words.slice(0, i + 1).join(" ") }
                  : msg,
              ),
            );
            if (i === words.length - 1) setStreaming(false);
          }, i * 18),
        );
      });
    })();
  };

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-21rem)] max-w-3xl flex-col">
      <div className="flex-1">
        {empty ? (
          <div className="py-4">
            <Card className="mb-6">
              <span className="mb-4 flex size-12 items-center justify-center rounded-[14px] bg-primary text-primary-foreground">
                <Sparkles className="size-6" />
              </span>
              <h2 className="text-section-title">Ask me anything</h2>
              <p className="text-caption mt-2 leading-relaxed">
                I can see your profile, your current plan and your recent
                training and food logs — so ask about your training, not
                training in general. Every conversation is saved to your
                account.
              </p>
            </Card>

            <p className="text-label mb-3 px-1">Try one of these</p>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="card card-interactive flex w-full items-center gap-3 p-4 text-left text-sm transition-colors hover:bg-surface-hover"
                >
                  <Sparkles className="size-4 shrink-0 text-primary" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-[16px] rounded-br-[6px] bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
                    <Sparkles className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-3 pt-1">
                    {m.content
                      .split("\n\n")
                      .filter(Boolean)
                      .map((para, i) => (
                        <p key={i} className="text-sm leading-relaxed">
                          {para}
                        </p>
                      ))}
                    {streaming && m.id === messages[messages.length - 1].id && (
                      <span className="inline-block size-2 animate-pulse rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              ),
            )}

            {streaming && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
                  <Sparkles className="size-4" />
                </span>
                <div className="flex items-center gap-1 pt-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 animate-bounce rounded-full bg-border-strong"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* --------------------------------------------------- composer -- */}
      <div className="sticky bottom-24 z-30 mt-6 sm:bottom-20">
        {/* The beam wraps the panel rather than replacing its border: the
            hairline still defines the shape when the animation is suppressed
            by prefers-reduced-motion. Radius is read off the child. */}
        <BorderBeam size="md" colorVariant="colorful" theme="dark">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-2 shadow-[var(--shadow-md)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <label htmlFor="coach-input" className="sr-only">
                Ask your coach a question
              </label>
              <textarea
                id="coach-input"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask about your plan, your food, your progress…"
                className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm placeholder:text-subtle focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                aria-label="Send"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-[10px] transition-all active:scale-95",
                  input.trim() && !streaming
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "bg-surface-muted text-subtle",
                )}
              >
                <ArrowUp className="size-5" />
              </button>
            </form>
          </div>
        </BorderBeam>

        {error && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[0.8125rem] text-danger">
            <AlertCircle className="size-3.5 shrink-0" />
            {error}
          </p>
        )}

        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-subtle">
          <Info className="size-3 shrink-0" />
          Answers are built from your own logs. General guidance, not medical
          advice.
        </p>
      </div>
    </div>
  );
}
