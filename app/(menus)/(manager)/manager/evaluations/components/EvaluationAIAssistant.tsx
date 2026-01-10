"use client";

import {
  AlertCircle,
  Bot,
  ChevronRight,
  Database,
  File,
  Loader2,
  MessageSquare,
  Send,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface DocumentInfo {
  filename: string;
  file_type: string;
  chunk_count: number;
  upload_timestamp: string;
  total_chars: number;
}

interface DocumentContent {
  filename: string;
  total_chunks: number;
  chunks: {
    chunk_index: number;
    content: string;
    char_count: number;
  }[];
  original_content?: string;
}

interface EvaluationScores {
  score1: number;
  score2: number;
  score3: number;
  finalScore: number;
  finalGrade: string;
}

interface EvaluationAIAssistantProps {
  language: "en" | "ja";
  evaluationId?: string;
  employeeInfo?: string;
  evaluationScores?: EvaluationScores;
  onToggleExpand?: (expanded: boolean) => void;
}

const QUICK_ACTIONS = {
  ja: [
    { id: "evaluator_comment", label: "コメント作成" },
    { id: "evaluation_points", label: "評価のポイント" },
    { id: "feedback_examples", label: "フィードバック例" },
    { id: "growth_goals", label: "成長目標設定" },
  ],
  en: [
    { id: "evaluator_comment", label: "Write Comment" },
    { id: "evaluation_points", label: "Evaluation Points" },
    { id: "feedback_examples", label: "Feedback Examples" },
    { id: "growth_goals", label: "Growth Goals" },
  ],
};

const DEFAULT_SYSTEM_PROMPT = {
  ja: `あなたは人事評価の専門アシスタントです。評価者をサポートします。

【重要】回答は簡潔に。箇条書きで3〜5項目程度に収めてください。

あなたができること:
- 評価のポイントや基準の説明
- フィードバックの書き方アドバイス
- 成長目標の設定サポート
- 評価者コメントのサンプル作成

【評価者コメント作成について】
評価者コメントの作成を求められた場合は、以下を踏まえて作成してください:
- 提供された評価スコア・グレード情報を参考にする
- 高評価の場合: 具体的な称賛、今後への期待
- 標準評価の場合: 良い点を認めつつ、成長への期待
- 低評価の場合: 課題を指摘しつつ、改善への支援姿勢
- 50〜150字程度の簡潔なコメント例を提示`,
  en: `You are an HR evaluation assistant supporting evaluators.

【Important】Keep responses concise. Use bullet points, 3-5 items max.

What you can do:
- Explain evaluation points and criteria
- Advise on writing feedback
- Support goal setting
- Create sample evaluator comments

【About Evaluator Comments】
When asked to create evaluator comments:
- Reference the provided scores and grades
- High scores: specific praise, future expectations
- Average scores: acknowledge strengths, encourage growth
- Low scores: address issues, show support for improvement
- Provide a concise sample comment (2-4 sentences)`,
};

const SYSTEM_PROMPT_STORAGE_KEY = "evaluation-ai-system-prompt";

export function EvaluationAIAssistant({
  language,
  evaluationId: _evaluationId,
  employeeInfo,
  evaluationScores,
  onToggleExpand,
}: EvaluationAIAssistantProps) {
  const [ragEnabled, setRagEnabled] = useState(true);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [backendStatus, setBackendStatus] = useState<
    "unknown" | "healthy" | "unhealthy"
  >("unknown");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  // 最新のスコア情報を保持するref（クロージャー問題を回避）
  const evaluationScoresRef = useRef(evaluationScores);
  evaluationScoresRef.current = evaluationScores;

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<DocumentContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const quickActions = QUICK_ACTIONS[language];
  const t = {
    ja: {
      aiAssistant: "AIアシスタント",
      rag: "RAG",
      ragFiles: "ファイル",
      quickActions: "クイックアクション",
      placeholder: "評価について質問...",
      poweredBy: "Powered by",
      noMessages: "質問を入力するか、クイックアクションを選択してください",
      backendOffline: "RAGバックエンドに接続できません",
      knowledgeBase: "ナレッジベース",
      selectDocument: "ドキュメントを選択",
      noDocuments: "登録されているドキュメントがありません",
      close: "閉じる",
      preview: "プレビュー",
      source: "ソース",
      loading: "読み込み中...",
      chars: "文字",
      documentTitle: "ドキュメント名",
      uploadedAt: "登録日",
      back: "戻る",
    },
    en: {
      aiAssistant: "AI Assistant",
      rag: "RAG",
      ragFiles: "files",
      quickActions: "Quick Actions",
      placeholder: "Ask about evaluation...",
      poweredBy: "Powered by",
      noMessages: "Enter a question or select a quick action",
      backendOffline: "Cannot connect to RAG backend",
      knowledgeBase: "Knowledge Base",
      selectDocument: "Select Document",
      noDocuments: "No documents registered",
      close: "Close",
      preview: "Preview",
      source: "Source",
      loading: "Loading...",
      chars: "chars",
      documentTitle: "Document",
      uploadedAt: "Date",
      back: "Back",
    },
  }[language];

  // バックエンドステータスとドキュメント一覧を取得
  const fetchBackendStatus = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/rag-backend/documents/list?category=evaluation",
      );
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
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

  // localStorageからシステムプロンプトを読み込む
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SYSTEM_PROMPT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSystemPrompt({
          ja: parsed.ja || DEFAULT_SYSTEM_PROMPT.ja,
          en: parsed.en || DEFAULT_SYSTEM_PROMPT.en,
        });
      }
    } catch {
      // エラー時はデフォルトを使用
    }
  }, []);

  // メッセージが追加されたらスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCollapse = () => {
    onToggleExpand?.(false);
  };

  // ドキュメント内容を取得
  const fetchDocumentContent = async (filename: string) => {
    setSelectedDoc(filename);
    setLoadingContent(true);
    setDocContent(null);

    try {
      const res = await fetch(
        `/api/rag-backend/documents/content/${encodeURIComponent(filename)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setDocContent(data);
      }
    } catch (error) {
      console.error("Failed to fetch document content:", error);
    } finally {
      setLoadingContent(false);
    }
  };

  // ダイアログを開く
  const handleOpenDialog = () => {
    setDialogOpen(true);
    setSelectedDoc(null);
    setDocContent(null);
  };

  // ファイル名から表示名を取得
  const getDisplayName = (filename: string) => {
    return filename.replace(/\.md$/, "");
  };

  // 停止ボタンのハンドラー
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const sendMessage = async (question: string) => {
    if (!question.trim() || backendStatus === "unhealthy") return;

    // 前回のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // ユーザーメッセージを追加
    const userMessage: Message = { role: "user", content: question };
    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      // システムプロンプトを構築
      let systemContent = systemPrompt[language];
      if (employeeInfo) {
        systemContent += `\n\n${language === "ja" ? "【評価対象者情報】" : "【Employee Information】"}\n${employeeInfo}`;
      }
      // refから最新のスコア情報を取得
      const currentScores = evaluationScoresRef.current;
      if (currentScores) {
        const scoreInfo =
          language === "ja"
            ? `\n\n【現在の評価スコア】
結果評価: ${currentScores.score1.toFixed(1)}
プロセス評価: ${currentScores.score2.toFixed(1)}
成長評価: ${currentScores.score3.toFixed(1)}
最終スコア: ${currentScores.finalScore.toFixed(2)}
最終グレード: ${currentScores.finalGrade}`
            : `\n\n【Current Evaluation Scores】
Results: ${currentScores.score1.toFixed(1)}
Process: ${currentScores.score2.toFixed(1)}
Growth: ${currentScores.score3.toFixed(1)}
Final Score: ${currentScores.finalScore.toFixed(2)}
Final Grade: ${currentScores.finalGrade}`;
        systemContent += scoreInfo;
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
          category: "evaluation",
        }),
        signal: abortControllerRef.current.signal,
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
      // ユーザーによる停止の場合はエラーメッセージを表示しない
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

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
      abortControllerRef.current = null;
    }
  };

  const handleQuickAction = (actionId: string) => {
    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      let question: string;
      if (actionId === "evaluator_comment") {
        question =
          language === "ja"
            ? "この社員への評価者コメントのサンプルを作成してください。"
            : "Please create a sample evaluator comment for this employee.";
      } else {
        question =
          language === "ja"
            ? `${action.label}について教えてください。`
            : `Please tell me about ${action.label.toLowerCase()}.`;
      }
      sendMessage(question);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // 全チャンクを結合してコンテンツを取得
  const getFullContent = () => {
    if (!docContent) return "";
    // Use original_content if available (preserves formatting)
    return (
      docContent.original_content ||
      docContent.chunks
        .sort((a, b) => a.chunk_index - b.chunk_index)
        .map((chunk) => chunk.content)
        .join("\n")
    );
  };

  return (
    <>
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
              <Badge
                variant="outline"
                className="gap-1 text-xs cursor-pointer hover:bg-muted transition-colors"
                onClick={handleOpenDialog}
              >
                <Database className="h-3 w-3" />
                {t.rag} ({documents.length}
                {t.ragFiles})
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label
              htmlFor="rag-toggle"
              className="text-xs text-muted-foreground"
            >
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
            messages.map((message, index) => {
              const isStreaming =
                isLoading &&
                message.role === "assistant" &&
                index === messages.length - 1;

              return (
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
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <div className="markdown-content">
                        {message.content ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => (
                                <p className="my-1 leading-relaxed">
                                  {children}
                                </p>
                              ),
                              ul: ({ children }) => (
                                <ul className="my-2 ml-4 list-disc space-y-1">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="my-2 ml-4 list-decimal space-y-1">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="leading-relaxed">{children}</li>
                              ),
                              h1: ({ children }) => (
                                <h1 className="text-lg font-bold my-2">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-base font-bold my-2">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-bold my-1">
                                  {children}
                                </h3>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold">
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <em className="italic">{children}</em>
                              ),
                              code: ({ children }) => (
                                <code className="bg-background/50 px-1 py-0.5 rounded text-xs font-mono">
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className="bg-background/50 p-2 rounded my-2 overflow-x-auto text-xs">
                                  {children}
                                </pre>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-2 border-primary/50 pl-3 my-2 italic text-muted-foreground">
                                  {children}
                                </blockquote>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : isStreaming ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        {isStreaming && message.content && (
                          <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
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
            {isLoading ? (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={handleStop}
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || backendStatus === "unhealthy"}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
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

      {/* ナレッジベースダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!w-[60vw] !max-w-none h-[85vh] flex flex-col p-0 gap-0">
          {selectedDoc ? (
            /* プレビュー画面（フルサイズ） */
            <>
              {/* ヘッダー */}
              <div className="flex items-center gap-3 pl-4 pr-12 py-3 border-b bg-muted/30 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDoc(null);
                    setDocContent(null);
                  }}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
                  {t.back}
                </Button>
                <div className="h-4 w-px bg-border" />
                <File className="h-5 w-5 text-primary shrink-0" />
                <span className="font-medium">
                  {getDisplayName(selectedDoc)}
                </span>
              </div>

              {/* コンテンツ表示（フルサイズ） */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingContent ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-3 text-muted-foreground">
                      {t.loading}
                    </span>
                  </div>
                ) : docContent ? (
                  <div className="markdown-preview max-w-4xl mx-auto">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => (
                          <p className="my-3 leading-relaxed">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="my-3 ml-6 list-disc space-y-2">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="my-3 ml-6 list-decimal space-y-2">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="leading-relaxed">{children}</li>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-bold my-6 pb-2 border-b">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-bold my-5 pb-1 border-b">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-bold my-4">{children}</h3>
                        ),
                        h4: ({ children }) => (
                          <h4 className="text-base font-bold my-3">
                            {children}
                          </h4>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic">{children}</em>
                        ),
                        code: ({ children }) => (
                          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-muted p-4 rounded-lg my-4 overflow-x-auto text-sm">
                            {children}
                          </pre>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground">
                            {children}
                          </blockquote>
                        ),
                        hr: () => <hr className="my-6 border-border" />,
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            className="text-primary hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                        ),
                        table: ({ children }) => (
                          <div className="my-4 overflow-x-auto">
                            <table className="min-w-full border-collapse border border-border">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-muted/50">{children}</thead>
                        ),
                        tbody: ({ children }) => <tbody>{children}</tbody>,
                        tr: ({ children }) => (
                          <tr className="border-b border-border">{children}</tr>
                        ),
                        th: ({ children }) => (
                          <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-border px-4 py-2">
                            {children}
                          </td>
                        ),
                      }}
                    >
                      {getFullContent()}
                    </ReactMarkdown>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            /* ファイル選択画面 */
            <>
              <DialogHeader className="px-6 py-4 border-b shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  {t.knowledgeBase}
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto">
                {documents.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <File className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p>{t.noDocuments}</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="border-b">
                        <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                          {t.documentTitle}
                        </th>
                        <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground w-32">
                          {t.chars}
                        </th>
                        <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground w-40">
                          {t.uploadedAt}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr
                          key={doc.filename}
                          onClick={() => fetchDocumentContent(doc.filename)}
                          className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <File className="h-5 w-5 text-primary shrink-0" />
                              <span className="font-medium">
                                {getDisplayName(doc.filename)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-muted-foreground">
                            {doc.total_chars.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                            {doc.upload_timestamp
                              ? new Date(
                                  doc.upload_timestamp,
                                ).toLocaleDateString(
                                  language === "ja" ? "ja-JP" : "en-US",
                                )
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
