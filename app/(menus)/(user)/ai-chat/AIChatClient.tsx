"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RiBarChartBoxLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiRefreshLine,
  RiRobot2Line,
  RiSendPlane2Line,
  RiSparklingLine,
  RiStopCircleLine,
  RiUser3Line,
} from "react-icons/ri";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import {
  estimateMessagesTokens,
  estimateTokens,
  formatTokenCount,
  getContextWindowSize,
} from "@/lib/core-modules/ai";
import { aiChatTranslations } from "./translations";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tokenCount?: number; // 推定トークン数
}

interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  contextWindow: number;
  tokensPerSecond: number;
  generationStartTime: number | null;
  lastOutputTokens: number;
}

interface AIChatClientProps {
  language: "en" | "ja";
  userName: string;
}

export function AIChatClient({ language, userName }: AIChatClientProps) {
  const t = aiChatTranslations[language];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [providerInfo, setProviderInfo] = useState<{
    providerName: string;
    modelName: string;
  } | null>(null);
  const [isComposing, setIsComposing] = useState(false); // IME変換中かどうか
  const [streamingContent, setStreamingContent] = useState(""); // ストリーミング中のコンテンツ
  const [showStats, setShowStats] = useState(true); // 統計表示
  const [tokenStats, setTokenStats] = useState<TokenStats>({
    inputTokens: 0,
    outputTokens: 0,
    contextWindow: 4096,
    tokensPerSecond: 0,
    generationStartTime: null,
    lastOutputTokens: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if AI is enabled and get provider info
  useEffect(() => {
    fetch("/api/ai/chat")
      .then((res) => res.json())
      .then((data) => {
        setAiEnabled(data.available);
        if (data.providerName && data.modelName) {
          setProviderInfo({
            providerName: data.providerName,
            modelName: data.modelName,
          });
          // コンテキストウィンドウサイズを設定
          const contextWindow = getContextWindowSize(
            data.providerName,
            data.modelName,
          );
          setTokenStats((prev) => ({ ...prev, contextWindow }));
        }
      })
      .catch(() => {
        setAiEnabled(false);
      });
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e?: React.FormEvent, suggestionText?: string) => {
    e?.preventDefault();
    const text = suggestionText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
      tokenCount: estimateTokens(text),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);
    setStreamingContent("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      abortControllerRef.current = new AbortController();

      // Build conversation history for context
      const conversationHistory = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 入力トークン数を計算
      const inputTokens = estimateMessagesTokens(conversationHistory);
      const startTime = Date.now();

      // トークン統計を初期化
      setTokenStats((prev) => ({
        ...prev,
        inputTokens,
        outputTokens: 0,
        tokensPerSecond: 0,
        generationStartTime: startTime,
        lastOutputTokens: 0,
      }));

      // トークン/秒を定期的に更新するインターバル
      statsIntervalRef.current = setInterval(() => {
        setTokenStats((prev) => {
          if (!prev.generationStartTime) return prev;
          const elapsed = (Date.now() - prev.generationStartTime) / 1000;
          if (elapsed > 0 && prev.outputTokens > 0) {
            return {
              ...prev,
              tokensPerSecond: Math.round(prev.outputTokens / elapsed),
            };
          }
          return prev;
        });
      }, 200);

      const response = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationHistory,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // ストリーミングレスポンスを処理
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let messageAdded = false; // 重複防止フラグ

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
            if (parsed.content) {
              fullContent += parsed.content;
              setStreamingContent(fullContent);
              // 出力トークン数を更新
              const outputTokens = estimateTokens(fullContent);
              setTokenStats((prev) => ({
                ...prev,
                outputTokens,
              }));
            }
            if (parsed.done && !messageAdded) {
              // ストリーミング完了
              messageAdded = true;
              const outputTokens = estimateTokens(fullContent);
              const assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: fullContent,
                timestamp: new Date(),
                tokenCount: outputTokens,
              };
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamingContent("");

              // 最終的なトークン/秒を計算
              const elapsed = (Date.now() - startTime) / 1000;
              setTokenStats((prev) => ({
                ...prev,
                outputTokens,
                tokensPerSecond:
                  elapsed > 0 ? Math.round(outputTokens / elapsed) : 0,
                generationStartTime: null,
              }));
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (parseError) {
            // JSON以外のデータは無視
            if (
              parseError instanceof Error &&
              parseError.message !== "Unexpected end of JSON input"
            ) {
              if (data !== "[DONE]") {
                console.error("Parse error:", parseError);
              }
            }
          }
        }
      }

      // バッファに残ったデータを処理（doneイベントが来なかった場合のフォールバック）
      if (fullContent && !messageAdded) {
        messageAdded = true;
        const outputTokens = estimateTokens(fullContent);
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: fullContent,
          timestamp: new Date(),
          tokenCount: outputTokens,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled - 途中までのコンテンツがあれば保存
        if (streamingContent) {
          const outputTokens = estimateTokens(streamingContent);
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: streamingContent,
            timestamp: new Date(),
            tokenCount: outputTokens,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
        setStreamingContent("");
        return;
      }
      setError(err instanceof Error ? err.message : t.errorMessage);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      abortControllerRef.current = null;
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      setTokenStats((prev) => ({ ...prev, generationStartTime: null }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // IME変換中はEnterキーでメッセージを送信しない
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClearChat = () => {
    if (window.confirm(t.clearConfirm)) {
      setMessages([]);
      setError(null);
      // トークン統計をリセット
      setTokenStats((prev) => ({
        ...prev,
        inputTokens: 0,
        outputTokens: 0,
        tokensPerSecond: 0,
        generationStartTime: null,
      }));
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  };

  const handleRegenerate = async () => {
    if (messages.length < 2) return;

    // Remove last assistant message
    const newMessages = messages.slice(0, -1);
    setMessages(newMessages);

    // Get the last user message
    const lastUserMessage = newMessages[newMessages.length - 1];
    if (lastUserMessage?.role === "user") {
      setIsLoading(true);
      setError(null);
      setStreamingContent("");

      try {
        abortControllerRef.current = new AbortController();

        const conversationHistory = newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // 入力トークン数を計算
        const inputTokens = estimateMessagesTokens(conversationHistory);
        const startTime = Date.now();

        // トークン統計を初期化
        setTokenStats((prev) => ({
          ...prev,
          inputTokens,
          outputTokens: 0,
          tokensPerSecond: 0,
          generationStartTime: startTime,
          lastOutputTokens: 0,
        }));

        // トークン/秒を定期的に更新するインターバル
        statsIntervalRef.current = setInterval(() => {
          setTokenStats((prev) => {
            if (!prev.generationStartTime) return prev;
            const elapsed = (Date.now() - prev.generationStartTime) / 1000;
            if (elapsed > 0 && prev.outputTokens > 0) {
              return {
                ...prev,
                tokensPerSecond: Math.round(prev.outputTokens / elapsed),
              };
            }
            return prev;
          });
        }, 200);

        const response = await fetch("/api/ai/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: conversationHistory,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        // ストリーミングレスポンスを処理
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let messageAdded = false; // 重複防止フラグ

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
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
                // 出力トークン数を更新
                const outputTokens = estimateTokens(fullContent);
                setTokenStats((prev) => ({
                  ...prev,
                  outputTokens,
                }));
              }
              if (parsed.done && !messageAdded) {
                // ストリーミング完了
                messageAdded = true;
                const outputTokens = estimateTokens(fullContent);
                const assistantMessage: Message = {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: fullContent,
                  timestamp: new Date(),
                  tokenCount: outputTokens,
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setStreamingContent("");

                // 最終的なトークン/秒を計算
                const elapsed = (Date.now() - startTime) / 1000;
                setTokenStats((prev) => ({
                  ...prev,
                  outputTokens,
                  tokensPerSecond:
                    elapsed > 0 ? Math.round(outputTokens / elapsed) : 0,
                  generationStartTime: null,
                }));
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (parseError) {
              // JSON以外のデータは無視
              if (
                parseError instanceof Error &&
                parseError.message !== "Unexpected end of JSON input"
              ) {
                if (data !== "[DONE]") {
                  console.error("Parse error:", parseError);
                }
              }
            }
          }
        }

        // バッファに残ったデータを処理（doneイベントが来なかった場合のフォールバック）
        if (fullContent && !messageAdded) {
          messageAdded = true;
          const outputTokens = estimateTokens(fullContent);
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: fullContent,
            timestamp: new Date(),
            tokenCount: outputTokens,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled - 途中までのコンテンツがあれば保存
          if (streamingContent) {
            const outputTokens = estimateTokens(streamingContent);
            const assistantMessage: Message = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: streamingContent,
              timestamp: new Date(),
              tokenCount: outputTokens,
            };
            setMessages((prev) => [...prev, assistantMessage]);
          }
          setStreamingContent("");
          return;
        }
        setError(err instanceof Error ? err.message : t.errorMessage);
      } finally {
        setIsLoading(false);
        setStreamingContent("");
        abortControllerRef.current = null;
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
          statsIntervalRef.current = null;
        }
        setTokenStats((prev) => ({ ...prev, generationStartTime: null }));
      }
    }
  };

  // AI disabled state
  if (aiEnabled === false) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <RiRobot2Line className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{t.aiDisabled}</h2>
          <p className="text-muted-foreground">{t.aiDisabledHint}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (aiEnabled === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // コンテキスト使用率を計算
  const contextUsagePercent = Math.min(
    ((tokenStats.inputTokens + tokenStats.outputTokens) /
      tokenStats.contextWindow) *
      100,
    100,
  );

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <RiSparklingLine className="w-5 h-5 text-primary" />
            <h1 className="font-semibold">{t.title}</h1>
          </div>
          {providerInfo && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-full text-xs text-muted-foreground">
              <span className="font-medium">{providerInfo.providerName}</span>
              <span className="text-muted-foreground/60">/</span>
              <span>{providerInfo.modelName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Stats toggle button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className={`text-muted-foreground ${showStats ? "bg-muted" : ""}`}
            title={t.stats.contextUsage}
          >
            <RiBarChartBoxLine className="w-4 h-4" />
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              className="text-muted-foreground hover:text-destructive"
            >
              <RiDeleteBinLine className="w-4 h-4 mr-1" />
              {t.clearChat}
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
        {messages.length === 0 ? (
          // Empty state with welcome message
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <RiSparklingLine className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">{t.welcomeTitle}</h2>
            <p className="text-muted-foreground mb-8">{t.welcomeHint}</p>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {t.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSubmit(undefined, suggestion)}
                  className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Chat messages
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className="group">
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-gradient-to-br from-primary/20 to-primary/10"
                    }`}
                  >
                    {message.role === "user" ? (
                      <RiUser3Line className="w-4 h-4" />
                    ) : (
                      <RiSparklingLine className="w-4 h-4 text-primary" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {message.role === "user" ? userName : t.ai}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString(
                          language === "ja" ? "ja-JP" : "en-US",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {message.role === "assistant" ? (
                        <ReactMarkdown
                          components={{
                            // リンクを新しいタブで開く
                            a: ({ children, href }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {children}
                              </a>
                            ),
                            // コードブロックのスタイル
                            code: ({ className, children }) => {
                              const isInline = !className;
                              return isInline ? (
                                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                                  {children}
                                </code>
                              ) : (
                                <code className={className}>{children}</code>
                              );
                            },
                            // preタグのスタイル
                            pre: ({ children }) => (
                              <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
                                {children}
                              </pre>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>

                    {/* Actions */}
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            handleCopy(message.content, message.id)
                          }
                        >
                          {copiedId === message.id ? (
                            <>
                              <RiCheckLine className="w-3 h-3 mr-1" />
                              {t.copied}
                            </>
                          ) : (
                            <>
                              <RiFileCopyLine className="w-3 h-3 mr-1" />
                              {t.copy}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming / Loading indicator */}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                  <RiSparklingLine className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{t.ai}</span>
                  </div>
                  {streamingContent ? (
                    // ストリーミング中のコンテンツを表示
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          a: ({ children, href }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {children}
                            </a>
                          ),
                          code: ({ className, children }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                                {children}
                              </code>
                            ) : (
                              <code className={className}>{children}</code>
                            );
                          },
                          pre: ({ children }) => (
                            <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
                              {children}
                            </pre>
                          ),
                        }}
                      >
                        {streamingContent}
                      </ReactMarkdown>
                      <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />
                    </div>
                  ) : (
                    // まだコンテンツがない場合は読み込み中表示
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                      </div>
                      <span className="text-sm">{t.thinking}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive font-medium">
                  {t.errorTitle}
                </p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Stats Panel */}
      {showStats &&
        (tokenStats.inputTokens > 0 ||
          tokenStats.outputTokens > 0 ||
          isLoading) && (
          <div className="flex-shrink-0 px-4 py-2 border-t bg-muted/30">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              {/* Context Usage Bar */}
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <span className="text-muted-foreground whitespace-nowrap">
                  {t.stats.contextUsage}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      contextUsagePercent > 90
                        ? "bg-destructive"
                        : contextUsagePercent > 70
                          ? "bg-amber-500"
                          : "bg-primary"
                    }`}
                    style={{ width: `${Math.max(contextUsagePercent, 1)}%` }}
                  />
                </div>
                <span className="font-mono text-muted-foreground whitespace-nowrap">
                  {formatTokenCount(
                    tokenStats.inputTokens + tokenStats.outputTokens,
                  )}
                  /{formatTokenCount(tokenStats.contextWindow)}
                </span>
              </div>

              {/* Token Counts */}
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {t.stats.inputTokens}:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {formatTokenCount(tokenStats.inputTokens)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  {t.stats.outputTokens}:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {formatTokenCount(tokenStats.outputTokens)}
                  </span>
                </span>
              </div>

              {/* Tokens per second */}
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">
                  {t.stats.tokensPerSecond}:
                </span>
                <span
                  className={`font-mono font-medium ${isLoading ? "text-primary animate-pulse" : "text-foreground"}`}
                >
                  {tokenStats.tokensPerSecond > 0
                    ? `${tokenStats.tokensPerSecond} ${t.stats.tpsUnit}`
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        )}

      {/* Input area */}
      <div className="flex-shrink-0 border-t px-4 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          {/* Regenerate button - left side */}
          {messages.length > 0 && !isLoading && (
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={handleRegenerate}
              className="h-12 w-12 rounded-xl flex-shrink-0"
              title={t.regenerate}
            >
              <RiRefreshLine className="w-5 h-5" />
            </Button>
          )}

          {/* Stop button - left side (when loading) */}
          {isLoading && (
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={handleStop}
              className="h-12 w-12 rounded-xl flex-shrink-0"
              title={t.stopGenerating}
            >
              <RiStopCircleLine className="w-5 h-5" />
            </Button>
          )}

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={t.placeholder}
              className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[48px] max-h-[200px]"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 rounded-xl flex-shrink-0"
          >
            <RiSendPlane2Line className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
