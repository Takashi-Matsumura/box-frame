"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Edit2,
  GitBranch,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingWindow } from "@/components/ui/floating-window";
import { useFloatingWindowStore } from "@/lib/stores/floating-window-store";
import { DiagramEditor } from "@/lib/addon-modules/backoffice/components/DiagramEditor";
import { wrapWithMxFile } from "@/lib/addon-modules/backoffice/utils/diagram-utils";
import { processDetailTranslations } from "./translations";

interface BusinessProcess {
  id: string;
  title: string;
  description: string | null;
  status: string;
  flowDescription: string | null;
  interviewHistory: ChatMessage[] | null;
  diagramXml: string | null;
  tags: string | null;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ProcessDetailClientProps {
  processId: string;
  language: "en" | "ja";
  userName: string;
}

type ProcessStatus =
  | "DRAFT"
  | "INTERVIEW"
  | "DIAGRAMMING"
  | "REVIEW"
  | "PUBLISHED"
  | "ARCHIVED";

const statusColors: Record<ProcessStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  INTERVIEW: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  DIAGRAMMING:
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  REVIEW:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  PUBLISHED:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  ARCHIVED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export function ProcessDetailClient({
  processId,
  language,
  userName,
}: ProcessDetailClientProps) {
  const t = processDetailTranslations[language];
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { open: openFloatingWindow, setContent } = useFloatingWindowStore();

  const [process, setProcess] = useState<BusinessProcess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isComposing, setIsComposing] = useState(false); // IME変換中かどうか
  const [isEditingFlow, setIsEditingFlow] = useState(false);
  const [editedFlowDescription, setEditedFlowDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [diagramXml, setDiagramXml] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchProcess = useCallback(async () => {
    try {
      const response = await fetch(`/api/backoffice/processes/${processId}`);
      if (response.ok) {
        const data = await response.json();
        setProcess(data);
        if (data.interviewHistory) {
          setChatMessages(data.interviewHistory);
        }
        if (data.diagramXml) {
          setDiagramXml(data.diagramXml);
        }
      } else if (response.status === 404) {
        router.push("/backoffice/analytics");
      }
    } catch (error) {
      console.error("Failed to fetch process:", error);
    } finally {
      setIsLoading(false);
    }
  }, [processId, router]);

  useEffect(() => {
    fetchProcess();
  }, [fetchProcess]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // IME変換中はEnterキーでメッセージを送信しない
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      DRAFT: t.draft,
      INTERVIEW: t.interview,
      DIAGRAMMING: t.diagramming,
      REVIEW: t.review,
      PUBLISHED: t.published,
      ARCHIVED: t.archived,
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isAiThinking) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setInputMessage("");
    setIsAiThinking(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Update status to INTERVIEW if it's DRAFT
    if (process?.status === "DRAFT") {
      await updateProcess({ status: "INTERVIEW" });
    }

    try {
      // Call AI API for hearing
      const systemPrompt = `あなたは業務プロセスのヒアリングを行うインタビュアーです。
ユーザーの業務フローを深く理解するために、**一度に1つだけ質問**してください。

## ヒアリング対象
業務名: ${process?.title || "不明"}
${process?.description ? `説明: ${process.description}` : ""}

## ヒアリングの進め方

### フェーズ1: 基本情報の収集（順番に1つずつ質問）
ユーザーの回答を受けて、次の観点を順番にヒアリングしてください：
1. 業務の開始トリガー（何がきっかけで業務が始まるか）
2. 主要なステップ（どのような作業を行うか）
3. 各ステップの担当者（誰が行うか）
4. 判断ポイント（分岐条件があるか）
5. 使用するシステムやツール
6. 業務の完了条件
7. 例外処理やエラー時の対応

### フェーズ2: 深掘りと確認
基本情報が揃ったら：
- 回答されたフローの詳細を深掘り
- 曖昧な点や不明点を確認
- 一般的な同業務のベストプラクティスと比較して気になる点を指摘

### フェーズ3: 全体確認
十分な情報が集まったら：
- これまでの会話から業務フロー全体を整理して提示
- 漏れている可能性のあるステップを指摘
- 最終確認の質問

## 回答ルール
- **必ず1つの質問だけ**をしてください（複数の質問を一度にしない）
- 質問は簡潔に（1-2文程度）
- ユーザーの回答を受け止めてから次の質問へ進む
- 「はい/いいえ」で答えられる質問より、具体的な回答を引き出す質問を心がける`;

      // ローカルLLMはuser/assistant交互を要求するため、メッセージを整形
      // 最初のassistant挨拶を除外し、user→assistant→user...の順にする
      const apiMessages: { role: string; content: string }[] = [];
      for (const m of newMessages) {
        // 最初のメッセージがassistantの場合はスキップ（システムプロンプトで代替）
        if (apiMessages.length === 0 && m.role === "assistant") {
          continue;
        }
        apiMessages.push({ role: m.role, content: m.content });
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: apiMessages,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.content || data.message || "申し訳ございません。応答を生成できませんでした。",
          timestamp: new Date().toISOString(),
        };
        const updatedMessages = [...newMessages, assistantMessage];
        setChatMessages(updatedMessages);

        // Save interview history
        await updateProcess({ interviewHistory: updatedMessages });
      }
    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content:
          language === "ja"
            ? "申し訳ございません。エラーが発生しました。もう一度お試しください。"
            : "Sorry, an error occurred. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setChatMessages([...newMessages, errorMessage]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const updateProcess = async (data: Partial<BusinessProcess>) => {
    try {
      const response = await fetch(`/api/backoffice/processes/${processId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updated = await response.json();
        setProcess(updated);
        return true;
      }
    } catch (error) {
      console.error("Failed to update process:", error);
    }
    return false;
  };

  const handleSaveFlowDescription = async () => {
    setIsSaving(true);
    const success = await updateProcess({
      flowDescription: editedFlowDescription,
      status: "DIAGRAMMING",
    });
    if (success) {
      setIsEditingFlow(false);
    }
    setIsSaving(false);
  };

  const handleGenerateFlowDescription = async () => {
    if (chatMessages.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/ai/services/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: chatMessages
            .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
            .join("\n"),
          length: "long",
          language: "ja",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const flowDescription = data.summary;
        await updateProcess({
          flowDescription,
          status: "DIAGRAMMING",
        });
      }
    } catch (error) {
      console.error("Failed to generate flow description:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDiagramEditor = () => {
    const xml = diagramXml ? wrapWithMxFile(diagramXml) : "";
    openFloatingWindow({
      title: "Diagram Editor",
      titleJa: t.diagramEditor,
      initialSize: { width: 900, height: 700 },
      initialPosition: { x: 100, y: 50 },
      content: (
        <DiagramEditor
          xml={xml}
          onChange={(newXml) => {
            setDiagramXml(newXml);
          }}
          className="w-full h-full"
        />
      ),
    });
  };

  const handleSaveDiagram = async () => {
    setIsSaving(true);
    const success = await updateProcess({ diagramXml });
    if (success) {
      alert(t.diagramSaved);
    }
    setIsSaving(false);
  };

  const handleRestartHearing = async () => {
    if (!confirm(t.restartConfirm)) return;

    setChatMessages([]);
    await updateProcess({
      interviewHistory: null,
      status: "DRAFT",
    });
  };

  // Update floating window content when diagramXml changes
  useEffect(() => {
    if (diagramXml) {
      const xml = wrapWithMxFile(diagramXml);
      setContent(
        <DiagramEditor
          xml={xml}
          onChange={(newXml) => {
            setDiagramXml(newXml);
          }}
          className="w-full h-full"
        />,
      );
    }
  }, [diagramXml, setContent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!process) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t.backToList}
        </Button>
      </div>

      {/* Process Info Card */}
      <div className="bg-card rounded-xl p-6 shadow-sm border">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">{process.title}</h1>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm px-3 py-1 rounded-full ${statusColors[process.status as ProcessStatus] || statusColors.DRAFT}`}
              >
                {getStatusLabel(process.status)}
              </span>
              <span className="text-sm text-muted-foreground">
                {t.version} {process.version}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDiagramEditor}
            >
              <GitBranch className="w-4 h-4 mr-1" />
              {t.openDiagram}
            </Button>
            {diagramXml && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveDiagram}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t.saveDiagram
                )}
              </Button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground">
          {process.description || t.noDescription}
        </p>
        {process.tags && (
          <div className="mt-2">
            <span className="text-sm text-amber-600 dark:text-amber-400">
              {process.tags}
            </span>
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span>
            {t.createdAt}: {formatDate(process.createdAt)}
          </span>
          <span>
            {t.updatedAt}: {formatDate(process.updatedAt)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Hearing Chat */}
        <div className="bg-card rounded-xl shadow-sm border flex flex-col h-[500px]">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold">{t.aiHearing}</h2>
            </div>
            {chatMessages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestartHearing}
                className="text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                {t.restartHearing}
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t.hearingDescription}</p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => {
                    const initialMessage: ChatMessage = {
                      role: "assistant",
                      content:
                        language === "ja"
                          ? `「${process.title}」についてヒアリングを始めます。\n\n一問一答形式で業務フローを詳しくお聞きしていきます。回答いただいた内容を元に、次の質問をしていきますので、分かる範囲でお答えください。\n\nでは最初の質問です。\n**この業務はどのようなきっかけ（トリガー）で開始されますか？**`
                          : `Let's start the hearing about "${process.title}".\n\nI'll ask you questions one at a time to understand your business process in detail. Please answer as best you can.\n\nFirst question:\n**What triggers this business process to start?**`,
                      timestamp: new Date().toISOString(),
                    };
                    setChatMessages([initialMessage]);
                    updateProcess({
                      interviewHistory: [initialMessage],
                      status: "INTERVIEW",
                    });
                  }}
                >
                  {t.startHearing}
                </Button>
              </div>
            ) : (
              <>
                {chatMessages.map((message, index) => (
                  <div
                    key={`${message.timestamp}-${index}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                {isAiThinking && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          {t.aiThinking}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>
          {chatMessages.length > 0 && (
            <div className="p-4 border-t">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    placeholder={t.inputPlaceholder}
                    className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[48px] max-h-[200px]"
                    rows={1}
                    disabled={isAiThinking}
                  />
                </div>
                <Button
                  variant="primary"
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isAiThinking}
                  className="h-12 w-12 rounded-xl flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              {chatMessages.length >= 4 && !process.flowDescription && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={handleGenerateFlowDescription}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  {t.generateDiagram}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Flow Description */}
        <div className="bg-card rounded-xl shadow-sm border flex flex-col h-[500px]">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold">{t.flowDescription}</h2>
            </div>
            {process.flowDescription && !isEditingFlow && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditedFlowDescription(process.flowDescription || "");
                  setIsEditingFlow(true);
                }}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {isEditingFlow ? (
              <div className="h-full flex flex-col">
                <textarea
                  value={editedFlowDescription}
                  onChange={(e) => setEditedFlowDescription(e.target.value)}
                  className="flex-1 w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingFlow(false)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    {t.cancelEdit}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveFlowDescription}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-1" />
                    )}
                    {t.saveFlowDescription}
                  </Button>
                </div>
              </div>
            ) : process.flowDescription ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{process.flowDescription}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t.noFlowDescription}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Window for Diagram Editor */}
      <FloatingWindow language={language} />
    </div>
  );
}
