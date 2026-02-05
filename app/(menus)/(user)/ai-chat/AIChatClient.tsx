"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RiAttachmentLine,
  RiBarChartBoxLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiFilePdfLine,
  RiRefreshLine,
  RiRobot2Line,
  RiSendPlane2Line,
  RiShieldLine,
  RiSparklingLine,
  RiStopCircleLine,
  RiUser3Line,
} from "react-icons/ri";
import ReactMarkdown from "react-markdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  checkSensitiveData,
  estimateMessagesTokens,
  estimateTokens,
  formatTokenCount,
  getContextWindowSize,
} from "@/lib/core-modules/ai";
import type {
  LlmCheckResult,
  SensitiveDataResult,
} from "@/lib/core-modules/ai";
import { aiChatTranslations } from "./translations";

// HTTPでも動作するようにUUID生成のフォールバック
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (HTTP)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface PdfAttachment {
  filename: string;
  pages: number;
  text: string;
  truncated?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tokenCount?: number; // 推定トークン数
  pdfFilename?: string; // 添付PDFのファイル名
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
  const [dlpEnabled, setDlpEnabled] = useState(false); // DLPモード
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
  const [pdfAttachment, setPdfAttachment] = useState<PdfAttachment | null>(
    null,
  );
  const [pdfUploading, setPdfUploading] = useState(false);
  const [sensitiveWarning, setSensitiveWarning] =
    useState<SensitiveDataResult | null>(null);
  const [llmCheckResult, setLlmCheckResult] = useState<LlmCheckResult | null>(
    null,
  );
  const [llmCheckLoading, setLlmCheckLoading] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<{
    text: string;
    suggestionText?: string;
    contentForAI: string;
    pdfFilename?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          // コンテキストウィンドウサイズを設定（サーバーから取得できればそちらを優先）
          const contextWindow =
            data.contextSize ||
            getContextWindowSize(data.providerName, data.modelName);
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

  const handlePdfUpload = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError(t.pdfInvalidType);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(t.pdfTooLarge);
        return;
      }

      setPdfUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/ai/chat/upload-pdf", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        setPdfAttachment({
          filename: data.filename,
          pages: data.pages,
          text: data.text,
          truncated: data.truncated,
        });
      } catch {
        setError(t.pdfExtractError);
      } finally {
        setPdfUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [t],
  );

  // コンテンツ組み立てロジック（handleSubmit と handleConfirmSend で共有）
  const buildContentForAI = useCallback(
    (text: string) => {
      let pdfText = pdfAttachment?.text || "";
      if (pdfAttachment && pdfText) {
        const existingTokens = estimateMessagesTokens(
          messages.map((m) => ({ role: m.role, content: m.content })),
        );
        const reserveForOutput = 2000;
        const availableTokens =
          tokenStats.contextWindow - existingTokens - reserveForOutput;
        const userTextTokens = estimateTokens(text);
        const maxPdfTokens = Math.max(
          availableTokens - userTextTokens - 50,
          500,
        );
        const currentPdfTokens = estimateTokens(pdfText);
        if (currentPdfTokens > maxPdfTokens) {
          const ratio = maxPdfTokens / currentPdfTokens;
          pdfText = pdfText.slice(0, Math.floor(pdfText.length * ratio));
          pdfText += "\n\n[... テキストが長いため省略されました]";
        }
      }
      return pdfAttachment
        ? `[添付PDF: ${pdfAttachment.filename}]\n${pdfText}\n\n${text}`
        : text;
    },
    [pdfAttachment, messages, tokenStats.contextWindow],
  );

  // 実際のAI送信処理（チェック後に呼び出す）
  const doActualSubmit = useCallback(
    async (contentForAI: string, pdfFilename?: string) => {
      const userMessage: Message = {
        id: generateUUID(),
        role: "user",
        content: contentForAI,
        timestamp: new Date(),
        tokenCount: estimateTokens(contentForAI),
        pdfFilename,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setPdfAttachment(null);
      setIsLoading(true);
      setError(null);
      setStreamingContent("");

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      try {
        abortControllerRef.current = new AbortController();

        const conversationHistory = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const inputTokens = estimateMessagesTokens(conversationHistory);
        const startTime = Date.now();

        setTokenStats((prev) => ({
          ...prev,
          inputTokens,
          outputTokens: 0,
          tokensPerSecond: 0,
          generationStartTime: startTime,
          lastOutputTokens: 0,
        }));

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

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let messageAdded = false;

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
                const outputTokens = estimateTokens(fullContent);
                setTokenStats((prev) => ({
                  ...prev,
                  outputTokens,
                }));
              }
              if (parsed.done && !messageAdded) {
                messageAdded = true;
                const outputTokens = estimateTokens(fullContent);
                const assistantMessage: Message = {
                  id: generateUUID(),
                  role: "assistant",
                  content: fullContent,
                  timestamp: new Date(),
                  tokenCount: outputTokens,
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setStreamingContent("");

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

        if (fullContent && !messageAdded) {
          messageAdded = true;
          const outputTokens = estimateTokens(fullContent);
          const assistantMessage: Message = {
            id: generateUUID(),
            role: "assistant",
            content: fullContent,
            timestamp: new Date(),
            tokenCount: outputTokens,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          if (streamingContent) {
            const outputTokens = estimateTokens(streamingContent);
            const assistantMessage: Message = {
              id: generateUUID(),
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
    },
    [messages, streamingContent, t.errorMessage],
  );

  const handleSubmit = async (e?: React.FormEvent, suggestionText?: string) => {
    e?.preventDefault();
    const text = suggestionText || input.trim();
    if (!text || isLoading) return;

    const contentForAI = buildContentForAI(text);

    // DLPモードがOFFの場合はチェックをスキップ
    if (!dlpEnabled) {
      await doActualSubmit(contentForAI, pdfAttachment?.filename);
      return;
    }

    // Stage 1: クライアントサイドのパターンマッチ
    const stage1Result = checkSensitiveData(contentForAI);

    if (stage1Result.detected) {
      // 機密情報が検出された → 警告ダイアログを表示
      setSensitiveWarning(stage1Result);
      setLlmCheckResult(null);
      setLlmCheckLoading(true);
      setPendingSubmit({
        text,
        suggestionText,
        contentForAI,
        pdfFilename: pdfAttachment?.filename,
      });

      // Stage 2: LLMチェックを非同期で開始
      fetch("/api/ai/chat/check-sensitive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: contentForAI, language }),
      })
        .then((res) => res.json())
        .then((data) => {
          setLlmCheckResult(data as LlmCheckResult);
        })
        .catch(() => {
          // グレースフルデグラデーション
          setLlmCheckResult({ detected: false, items: [] });
        })
        .finally(() => {
          setLlmCheckLoading(false);
        });

      return;
    }

    // 機密情報なし → そのまま送信
    await doActualSubmit(contentForAI, pdfAttachment?.filename);
  };

  // 警告ダイアログで「送信する」を押した場合
  const handleConfirmSend = useCallback(async () => {
    if (!pendingSubmit) return;
    const { contentForAI, pdfFilename } = pendingSubmit;
    setSensitiveWarning(null);
    setLlmCheckResult(null);
    setLlmCheckLoading(false);
    setPendingSubmit(null);
    await doActualSubmit(contentForAI, pdfFilename);
  }, [pendingSubmit, doActualSubmit]);

  // 警告ダイアログで「修正する」を押した場合
  const handleCancelSend = useCallback(() => {
    setSensitiveWarning(null);
    setLlmCheckResult(null);
    setLlmCheckLoading(false);
    setPendingSubmit(null);
  }, []);

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
      setPdfAttachment(null);
      setSensitiveWarning(null);
      setLlmCheckResult(null);
      setLlmCheckLoading(false);
      setPendingSubmit(null);
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
                  id: generateUUID(),
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
            id: generateUUID(),
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
              id: generateUUID(),
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

  // Loading state - Skeleton表示
  if (aiEnabled === null) {
    return (
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-hidden min-h-0">
        {/* Header skeleton */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>

        {/* Welcome area skeleton */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Skeleton className="w-16 h-16 rounded-full mb-6" />
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48 mb-8" />
          <div className="flex flex-wrap gap-2 justify-center max-w-lg">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-32 rounded-full" />
            ))}
          </div>
        </div>

        {/* Input area skeleton */}
        <div className="flex-shrink-0 border-t px-4 py-4">
          <div className="flex gap-2 items-center">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="flex-1 h-12 rounded-xl" />
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </div>
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
          {/* DLP mode toggle */}
          <div className="flex items-center gap-1.5">
            <RiShieldLine
              className={`w-4 h-4 ${dlpEnabled ? "text-primary" : "text-muted-foreground"}`}
            />
            <label
              htmlFor="dlp-toggle"
              className={`text-xs cursor-pointer select-none ${dlpEnabled ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              {t.dlp.label}
            </label>
            <Switch
              id="dlp-toggle"
              checked={dlpEnabled}
              onCheckedChange={setDlpEnabled}
            />
          </div>

          <div className="w-px h-4 bg-border" />

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
            {dlpEnabled ? (
              <>
                <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center">
                  <RiShieldLine className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">
                  {t.dlp.welcomeTitle}
                </h2>
                <p className="text-muted-foreground mb-6 text-left max-w-xl">
                  {t.dlp.welcomeDescription}
                </p>

                {/* DLP detection categories */}
                <div className="mb-6 w-full max-w-xl">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {t.dlp.detectsLabel}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.dlp.detectsItems.map((item, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* DLP sample prompts */}
                <p className="text-xs text-muted-foreground mb-3">
                  {t.dlp.tryLabel}
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                  {t.dlp.samples.map((sample, index) => (
                    <button
                      key={index}
                      onClick={() => handleSubmit(undefined, sample)}
                      className="px-4 py-2 text-sm border border-amber-500/30 rounded-full hover:bg-amber-500/10 transition-colors text-left"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <RiSparklingLine className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">
                  {t.welcomeTitle}
                </h2>
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
              </>
            )}
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
                        <>
                          {message.pdfFilename && (
                            <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1 bg-primary/10 rounded-md w-fit text-xs text-primary">
                              <RiFilePdfLine className="w-3.5 h-3.5" />
                              <span>{message.pdfFilename}</span>
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">
                            {message.pdfFilename
                              ? message.content.replace(
                                  /^\[添付PDF: .+?\]\n[\s\S]*?\n\n/,
                                  "",
                                )
                              : message.content}
                          </p>
                        </>
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

      {/* Sensitive Data Warning Dialog */}
      <AlertDialog
        open={sensitiveWarning !== null}
        onOpenChange={(open) => {
          if (!open) handleCancelSend();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="text-amber-500">&#9888;</span>
              {t.sensitiveData.warningTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.sensitiveData.warningDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Stage 1: パターンマッチ結果 */}
          {sensitiveWarning && sensitiveWarning.items.length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              {sensitiveWarning.items.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">
                    {t.sensitiveData.categories[
                      item.category as keyof typeof t.sensitiveData.categories
                    ] || item.category}
                  </span>
                  <span className="text-muted-foreground">
                    {item.matches.length}
                    {t.sensitiveData.itemsFound}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Stage 2: LLMチェック結果 */}
          <div className="rounded-lg border p-3">
            {llmCheckLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                {t.sensitiveData.llmChecking}
              </div>
            ) : llmCheckResult && llmCheckResult.detected ? (
              <div className="space-y-2">
                {llmCheckResult.items.map((item, idx) => (
                  <div
                    key={`${item.category}-${idx}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span
                      className={`mt-0.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                        item.severity === "high"
                          ? "bg-destructive"
                          : item.severity === "medium"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                      }`}
                    />
                    <div>
                      <span className="font-medium">
                        {t.sensitiveData.llmCategories[
                          item.category as keyof typeof t.sensitiveData.llmCategories
                        ] || item.category}
                      </span>
                      <span className="text-muted-foreground ml-1.5">
                        ({t.sensitiveData.severity[item.severity as keyof typeof t.sensitiveData.severity] || item.severity})
                      </span>
                      {item.description && (
                        <p className="text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : llmCheckResult ? (
              <p className="text-sm text-muted-foreground">
                &#10003;{" "}
                {language === "ja"
                  ? "機密ビジネス情報は検出されませんでした"
                  : "No confidential business information detected"}
              </p>
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSend}>
              {t.sensitiveData.cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>
              {t.sensitiveData.proceed}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Input area */}
      <div className="flex-shrink-0 border-t px-4 py-4">
        {/* PDF attachment preview */}
        {(pdfAttachment || pdfUploading) && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-sm">
            <RiFilePdfLine className="w-4 h-4 text-primary flex-shrink-0" />
            {pdfUploading ? (
              <span className="text-muted-foreground">{t.pdfUploading}</span>
            ) : pdfAttachment ? (
              <>
                <span className="font-medium truncate">
                  {pdfAttachment.filename}
                </span>
                <span className="text-muted-foreground text-xs">
                  ({pdfAttachment.pages} {t.pdfPages})
                </span>
                {pdfAttachment.truncated && (
                  <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                    {t.pdfTruncated}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setPdfAttachment(null)}
                  className="ml-auto p-0.5 rounded hover:bg-muted transition-colors"
                  title={t.pdfRemove}
                >
                  <RiCloseLine className="w-4 h-4 text-muted-foreground" />
                </button>
              </>
            ) : null}
          </div>
        )}

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

          {/* PDF upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePdfUpload(file);
            }}
          />
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-12 w-12 rounded-xl flex-shrink-0"
            title={t.attachPdf}
            disabled={isLoading || pdfUploading}
          >
            <RiAttachmentLine className="w-5 h-5" />
          </Button>

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
