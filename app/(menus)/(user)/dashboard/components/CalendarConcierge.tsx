"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RiDeleteBinLine,
  RiRobot2Line,
  RiSendPlane2Line,
  RiSparklingLine,
  RiStopCircleLine,
} from "react-icons/ri";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import type { ExternalCalendarEvent } from "@/lib/addon-modules/calendar-integration/types";
import { cn } from "@/lib/utils";
import { dashboardTranslations } from "../translations";
import type { CalendarEvent } from "./DashboardCalendar";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AppCalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  category: string;
}

interface CalendarConciergeProps {
  language: "en" | "ja";
  events: CalendarEvent[];
  appEvents?: AppCalendarEvent[];
  externalEvents?: ExternalCalendarEvent[];
  selectedDate?: string | null;
}

function buildSystemPrompt(
  language: "en" | "ja",
  appEvents: AppCalendarEvent[],
  externalEvents: ExternalCalendarEvent[],
  selectedDate?: string | null,
): string {
  // App events with full time information
  const appLines: string[] = [];
  for (const ev of appEvents) {
    const startDate = ev.startTime.split("T")[0];
    const startTimePart = ev.startTime.split("T")[1]?.slice(0, 5) || "";
    const endTimePart = ev.endTime.split("T")[1]?.slice(0, 5) || "";
    const timeInfo = ev.allDay ? "（終日）" : ` ${startTimePart}-${endTimePart}`;
    const loc = ev.location ? ` [${ev.location}]` : "";
    const desc = ev.description ? `（${ev.description}）` : "";
    appLines.push(`- ${startDate}${timeInfo}: ${ev.title}${loc}${desc}`);
  }

  // Google Calendar events
  const googleLines: string[] = [];
  for (const ev of externalEvents) {
    const startDate = ev.allDay ? ev.start : ev.start.split("T")[0];
    const timeInfo =
      !ev.allDay && ev.start.includes("T")
        ? ` ${new Date(ev.start).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}-${new Date(ev.end).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`
        : "";
    const loc = ev.location ? ` [${ev.location}]` : "";
    googleLines.push(`- ${startDate}${timeInfo}: ${ev.title}${loc}`);
  }

  const noEvents = language === "ja" ? "（イベントなし）" : "(No events)";
  const appLabel = language === "ja" ? "アプリ" : "App";
  const googleLabel = "Google Calendar";

  let eventData = `[${appLabel}]\n${appLines.length > 0 ? appLines.join("\n") : noEvents}`;
  if (googleLines.length > 0) {
    eventData += `\n\n[${googleLabel}]\n${googleLines.join("\n")}`;
  }

  const selectedInfo = selectedDate
    ? language === "ja"
      ? `\n【選択中の日付】${selectedDate}`
      : `\n[Selected Date] ${selectedDate}`
    : "";

  if (language === "ja") {
    return `あなたはカレンダーコンシェルジュです。

## 応答ルール

### スケジュールに関する質問
- 箇条書き・表形式を積極的に使い、一目で把握できるように整理する
- 日付・時間・場所などは太字やインデントで見やすく強調する
- 長文の説明は避け、要点だけを簡潔に提示する
- 複数日にまたがる場合は日付順に並べる

### スケジュール以外の質問
- コンシェルジュとして丁寧かつ親切に対応する
- スケジュールデータに無い内容は正直にその旨を伝える

【カレンダーデータ】
${eventData}${selectedInfo}`;
  }

  return `You are a calendar concierge.

## Response Guidelines

### Schedule-related questions
- Use bullet points and tables to present information at a glance
- Highlight dates, times, and locations with bold text
- Keep responses concise — key facts only, no lengthy explanations
- Sort by date when listing multiple events

### Non-schedule questions
- Respond politely and helpfully as a concierge
- Be honest when information is not available in the calendar data

[Calendar Data]
${eventData}${selectedInfo}`;
}

export function CalendarConcierge({
  language,
  events,
  appEvents = [],
  externalEvents = [],
  selectedDate,
}: CalendarConciergeProps) {
  const t = dashboardTranslations[language];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isComposingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const handleReset = useCallback(() => {
    handleStop();
    setMessages([]);
    setInput("");
  }, [handleStop]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const systemPrompt = buildSystemPrompt(
      language,
      appEvents,
      externalEvents,
      selectedDate,
    );

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const chatMessages = newMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          systemPrompt,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);
            if (parsed.done) continue;
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              assistantContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // User cancelled
        return;
      }
      setMessages((prev) => {
        const updated = [...prev];
        if (
          updated.length > 0 &&
          updated[updated.length - 1].role === "assistant"
        ) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: t.conciergeError,
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    input,
    isLoading,
    messages,
    language,
    appEvents,
    externalEvents,
    selectedDate,
    t.conciergeError,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <RiSparklingLine className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">{t.conciergeTitle}</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-8">
            <RiRobot2Line className="w-8 h-8" />
            <p className="text-xs text-center">{t.conciergeWelcome}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={`msg-${i}-${msg.role}`}
            className={cn(
              "text-sm",
              msg.role === "user" ? "flex justify-end" : "",
            )}
          >
            {msg.role === "user" ? (
              <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[85%]">
                {msg.content}
              </div>
            ) : (
              <div className="bg-muted/50 rounded-lg px-3 py-2">
                {msg.content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="my-1 leading-relaxed text-sm">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="my-1 ml-4 list-disc space-y-0.5 text-sm">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="my-1 ml-4 list-decimal space-y-0.5 text-sm">
                          {children}
                        </ol>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code className="bg-muted px-1 py-0.5 rounded text-xs">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  isLoading && (
                    <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse rounded-sm" />
                  )
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={messages.length === 0 && !input}
          className="shrink-0 text-muted-foreground hover:text-destructive"
          title={language === "ja" ? "リセット" : "Reset"}
        >
          <RiDeleteBinLine className="w-4 h-4" />
        </Button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          placeholder={t.conciergePlaceholder}
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px] max-h-[80px]"
          rows={1}
          disabled={isLoading}
        />
        {isLoading ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStop}
            className="shrink-0"
          >
            <RiStopCircleLine className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={handleSend}
            disabled={!input.trim()}
            className="shrink-0"
          >
            <RiSendPlane2Line className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
