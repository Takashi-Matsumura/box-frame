"use client";

import {
  AlertCircle,
  Bot,
  ChevronRight,
  Database,
  Loader2,
  MessageSquare,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface EvaluationAIAssistantProps {
  language: "en" | "ja";
  evaluationId?: string;
  employeeInfo?: string;
  onToggleExpand?: (expanded: boolean) => void;
}

const QUICK_ACTIONS = {
  ja: [
    { id: "evaluation_points", label: "評価のポイント" },
    { id: "feedback_examples", label: "フィードバック例" },
    { id: "growth_goals", label: "成長目標設定" },
  ],
  en: [
    { id: "evaluation_points", label: "Evaluation Points" },
    { id: "feedback_examples", label: "Feedback Examples" },
    { id: "growth_goals", label: "Growth Goals" },
  ],
};

const SYSTEM_PROMPT = {
  ja: `あなたは人事評価の専門アシスタントです。評価者が適切な評価を行えるようサポートします。
回答は具体的かつ実践的なアドバイスを心がけてください。
- 評価のポイントや基準について説明できます
- フィードバックの書き方をアドバイスできます
- 成長目標の設定をサポートできます
回答は日本語で簡潔に行ってください。`,
  en: `You are a professional HR evaluation assistant. You help evaluators conduct appropriate evaluations.
Please provide specific and practical advice.
- You can explain evaluation points and criteria
- You can advise on how to write feedback
- You can support setting growth goals
Please respond in English concisely.`,
};

export function EvaluationAIAssistant({
  language,
  evaluationId: _evaluationId,
  employeeInfo,
  onToggleExpand,
}: EvaluationAIAssistantProps) {
  const [ragEnabled, setRagEnabled] = useState(true);
  const [ragDocCount, setRagDocCount] = useState(0);
  const [backendStatus, setBackendStatus] = useState<
    "unknown" | "healthy" | "unhealthy"
  >("unknown");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickActions = QUICK_ACTIONS[language];
  const t = {
    ja: {
      aiAssistant: "AIアシスタント",
      rag: "RAG",
      ragDocs: "件",
      quickActions: "クイックアクション",
      placeholder: "評価について質問...",
      poweredBy: "Powered by",
      noMessages: "質問を入力するか、クイックアクションを選択してください",
      backendOffline: "RAGバックエンドに接続できません",
    },
    en: {
      aiAssistant: "AI Assistant",
      rag: "RAG",
      ragDocs: "docs",
      quickActions: "Quick Actions",
      placeholder: "Ask about evaluation...",
      poweredBy: "Powered by",
      noMessages: "Enter a question or select a quick action",
      backendOffline: "Cannot connect to RAG backend",
    },
  }[language];

  // バックエンドステータスとRAGドキュメント数を取得
  const fetchBackendStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/rag-backend/documents/count");
      if (res.ok) {
        const data = await res.json();
        setRagDocCount(data.total_chunks || 0);
        setBackendStatus("healthy");
      } else {
        setBackendStatus("unhealthy");
      }
    } catch {
      console.warn("Failed to connect to RAG backend");
      setBackendStatus("unhealthy");
    }
  }, []);

  useEffect(() => {
    fetchBackendStatus();
  }, [fetchBackendStatus]);

  // メッセージが追加されたらスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCollapse = () => {
    onToggleExpand?.(false);
  };

  const sendMessage = async (question: string) => {
    if (!question.trim() || backendStatus === "unhealthy") return;

    // ユーザーメッセージを追加
    const userMessage: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // システムプロンプトを構築
      let systemContent = SYSTEM_PROMPT[language];
      if (employeeInfo) {
        systemContent += `\n\n${language === "ja" ? "【評価対象者情報】" : "【Employee Information】"}\n${employeeInfo}`;
      }

      // メッセージ履歴を構築（最新10件まで）
      const recentMessages = messages.slice(-10);
      const chatMessages: Message[] = [
        { role: "system", content: systemContent },
        ...recentMessages,
        userMessage,
      ];

      const res = await fetch("/api/rag-backend/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          use_rag: ragEnabled,
          top_k: 5,
          stream: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // SSEストリーミングレスポンスを処理
      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let assistantContent = "";

      // アシスタントメッセージのプレースホルダーを追加
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                // リアルタイムで更新
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return newMessages;
                });
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // JSON解析エラーは無視（不完全なチャンク）
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } catch (error) {
      const errorContent =
        language === "ja"
          ? `エラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`
          : `An error occurred: ${error instanceof Error ? error.message : "Unknown error"}`;

      setMessages((prev) => {
        // 最後のメッセージがアシスタントの空メッセージなら置き換え
        if (
          prev.length > 0 &&
          prev[prev.length - 1].role === "assistant" &&
          prev[prev.length - 1].content === ""
        ) {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: errorContent,
          };
          return newMessages;
        }
        return [...prev, { role: "assistant", content: errorContent }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionId: string) => {
    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      const question =
        language === "ja"
          ? `${action.label}について教えてください。`
          : `Please tell me about ${action.label.toLowerCase()}.`;
      sendMessage(question);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-full border-l bg-card overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">{t.aiAssistant}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleCollapse}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* RAGステータス */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          {backendStatus === "unhealthy" ? (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertCircle className="h-3 w-3" />
              {t.backendOffline}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs">
              <Database className="h-3 w-3" />
              {t.rag} ({ragDocCount}
              {t.ragDocs})
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="rag-toggle" className="text-xs text-muted-foreground">
            {t.rag}
          </Label>
          <Switch
            id="rag-toggle"
            checked={ragEnabled}
            onCheckedChange={setRagEnabled}
            disabled={backendStatus === "unhealthy"}
            className="scale-75"
          />
        </div>
      </div>

      {/* クイックアクション */}
      <div className="p-3 border-b shrink-0">
        <p className="text-xs text-muted-foreground mb-2">{t.quickActions}</p>
        <div className="flex flex-wrap gap-1">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action.id)}
              disabled={isLoading || backendStatus === "unhealthy"}
              className="text-xs h-7"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-2 opacity-30" />
            <p className="text-xs text-center">{t.noMessages}</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <form onSubmit={handleSubmit} className="p-3 border-t shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              backendStatus === "unhealthy" ? t.backendOffline : t.placeholder
            }
            disabled={isLoading || backendStatus === "unhealthy"}
            className="text-sm"
          />
          <Button
            type="submit"
            size="icon"
            disabled={
              isLoading || !input.trim() || backendStatus === "unhealthy"
            }
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* フッター */}
      <div className="px-3 py-2 border-t bg-muted/20 text-xs text-muted-foreground text-center shrink-0">
        <span>
          {t.poweredBy} Local LLM
          {ragEnabled && backendStatus === "healthy" && ` • ${t.rag}`}
        </span>
      </div>
    </div>
  );
}
