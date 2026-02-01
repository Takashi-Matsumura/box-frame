"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Edit2,
  FileText,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { jobAnalysisDetailTranslations } from "./translations";

interface JobAnalysis {
  id: string;
  title: string;
  description: string | null;
  inputMaterials: string | null;
  jobDescriptionMd: string | null;
  chatHistory: ChatMessage[] | null;
  status: string;
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

interface JobAnalysisDetailClientProps {
  analysisId: string;
  language: "en" | "ja";
  userName: string;
}

type AnalysisStatus = "DRAFT" | "GENERATING" | "EDITING" | "COMPLETED";

const statusColors: Record<AnalysisStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  GENERATING:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  EDITING: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  COMPLETED:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export function JobAnalysisDetailClient({
  analysisId,
  language,
  userName: _userName,
}: JobAnalysisDetailClientProps) {
  const t = jobAnalysisDetailTranslations[language];
  const router = useRouter();

  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editMarkdown, setEditMarkdown] = useState("");

  // Draft generation
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  // AI Support panel
  const [showAISupport, setShowAISupport] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // AI formatting
  const [isFormatting, setIsFormatting] = useState(false);

  // Reference materials panel
  const [showMaterials, setShowMaterials] = useState(false);

  // Info panel toggle
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  // ============================================================
  // Update function
  // ============================================================
  const updateAnalysis = useCallback(
    async (data: Partial<JobAnalysis>) => {
      try {
        const response = await fetch(
          `/api/backoffice/job-analyses/${analysisId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );

        if (response.ok) {
          const updated = await response.json();
          setAnalysis(updated);
          return true;
        }
      } catch (error) {
        console.error("Failed to update analysis:", error);
      }
      return false;
    },
    [analysisId],
  );

  // ============================================================
  // Data fetch
  // ============================================================
  const fetchAnalysis = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/backoffice/job-analyses/${analysisId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
        if (data.chatHistory) {
          setChatMessages(data.chatHistory);
        }
      } else if (response.status === 404) {
        router.push("/backoffice/ai-analytics");
      }
    } catch (error) {
      console.error("Failed to fetch analysis:", error);
    } finally {
      setIsLoading(false);
    }
  }, [analysisId, router]);

  // ============================================================
  // Effects
  // ============================================================
  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Auto-generate on first load if DRAFT and no jobDescriptionMd
  const hasTriggeredAutoGenerate = useRef(false);
  useEffect(() => {
    if (
      analysis &&
      analysis.status === "DRAFT" &&
      !analysis.jobDescriptionMd &&
      !hasTriggeredAutoGenerate.current &&
      !isGeneratingDraft
    ) {
      hasTriggeredAutoGenerate.current = true;
      handleGenerateDraft();
    }
  }, [analysis]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      DRAFT: t.draft,
      GENERATING: t.generating,
      EDITING: t.editing,
      COMPLETED: t.completed,
    };
    return statusMap[status] || status;
  };

  const hasJobDescription = () => {
    return !!analysis?.jobDescriptionMd;
  };

  // Step progress
  type StepStatus = "completed" | "current" | "pending";

  const stepStatuses = useMemo((): StepStatus[] => {
    if (!analysis) return ["pending", "pending", "pending"];

    const hasJobDesc = !!analysis.jobDescriptionMd;
    const status = analysis.status;

    // Step 1: Draft generation
    let step1: StepStatus = "pending";
    if (hasJobDesc) {
      step1 = "completed";
    } else {
      step1 = "current";
    }

    // Step 2: Editing
    let step2: StepStatus = "pending";
    if (status === "COMPLETED") {
      step2 = "completed";
    } else if (hasJobDesc) {
      step2 = "current";
    }

    // Step 3: Complete
    let step3: StepStatus = "pending";
    if (status === "COMPLETED") {
      step3 = "completed";
    } else if (status === "EDITING" && hasJobDesc) {
      step3 = "current";
    }

    return [step1, step2, step3];
  }, [analysis]);

  const steps = useMemo(
    () => [
      {
        title: t.step1Title,
        desc: t.step1Desc,
        action: t.step1Action,
        icon: Sparkles,
      },
      {
        title: t.step2Title,
        desc: t.step2Desc,
        action: t.step2Action,
        icon: Edit2,
      },
      {
        title: t.step3Title,
        desc: t.step3Desc,
        action: t.step3Action,
        icon: CheckCircle2,
      },
    ],
    [t],
  );

  const currentStepIndex = useMemo(
    () => stepStatuses.indexOf("current"),
    [stepStatuses],
  );

  const handleStepAction = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        handleGenerateDraft();
        break;
      case 1:
        handleStartEditMode();
        break;
      case 2:
        updateAnalysis({ status: "COMPLETED" });
        break;
    }
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

  // ============================================================
  // AI Draft Generation
  // ============================================================
  const handleGenerateDraft = async () => {
    if (!analysis) return;

    setIsGeneratingDraft(true);
    try {
      await updateAnalysis({ status: "GENERATING" });

      const materialsSection = analysis.inputMaterials
        ? `\n\n## 参考資料\n${analysis.inputMaterials}`
        : "";

      const response = await fetch("/api/ai/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: `業務名: ${analysis.title}${analysis.description ? `\n説明: ${analysis.description}` : ""}${materialsSection}`,
          systemPrompt: `あなたは業務分掌を作成する専門家です。
与えられた業務名と参考資料から、実用的な業務分掌をマークダウン形式で作成してください。

## 重要
- 参考資料がある場合は、その内容を最大限に活用してください
- 参考資料がない場合は、業務名から一般的な内容で作成してください
- 各項目に具体的な内容を記載し、実務に使えるレベルにしてください

## 出力形式（マークダウン）

# ${analysis.title}

## 業務概要・目的
[業務の目的、背景、価値を記述]

## 責任範囲
- **担当部署**: [部署名]
- **責任者**: [責任者名/ロール]
- **権限**: [権限範囲]

## ステークホルダー
| 役割 | 担当 | 部署 |
|------|------|------|
| [役割] | [担当者/グループ] | [部署] |

## 業務フロー
1. [ステップ1]
2. [ステップ2]
...

## インプット/アウトプット
### インプット
- [入力1]

### アウトプット
- [成果物1]

## 使用システム・ツール
| システム名 | 用途 |
|------------|------|
| [システム] | [用途] |

## 必要なスキル/知識
| スキル/知識 | レベル | 備考 |
|-------------|--------|------|
| [スキル名] | [初級/中級/上級] | [補足] |

## リスク・課題
- **[リスク名]**: [説明と対策]`,
          temperature: 0.5,
          maxTokens: 4000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const draftContent = data.output;

        if (draftContent) {
          await updateAnalysis({
            jobDescriptionMd: draftContent,
            status: "EDITING",
          });
        } else {
          await updateAnalysis({ status: "DRAFT" });
        }
      } else {
        await updateAnalysis({ status: "DRAFT" });
      }
    } catch (error) {
      console.error("Failed to generate draft:", error);
      await updateAnalysis({ status: "DRAFT" });
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // ============================================================
  // AI Chat Support
  // ============================================================
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

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const systemPrompt = `あなたは業務分掌作成をサポートするアシスタントです。
ユーザーが編集中の業務分掌について、質問に答えたりアドバイスを提供します。

## 対象業務
業務名: ${analysis?.title || "不明"}
${analysis?.description ? `説明: ${analysis.description}` : ""}

## 現在の業務分掌
${analysis?.jobDescriptionMd || "（まだ作成されていません）"}

${analysis?.inputMaterials ? `## 参考資料\n${analysis.inputMaterials}` : ""}

## あなたの役割
- ユーザーの質問に簡潔に回答する
- 業務分掌の改善提案をする
- 不明点があれば確認する
- 参考資料に基づいてアドバイスする

## 回答ルール
- 簡潔に回答する（長くても3段落以内）
- 具体例を交えて説明する
- 修正が必要な場合は、どのように直すべきか明示する`;

      const apiMessages: { role: string; content: string }[] = [];
      for (const m of newMessages) {
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
          content:
            data.content ||
            data.message ||
            "申し訳ございません。応答を生成できませんでした。",
          timestamp: new Date().toISOString(),
        };
        const updatedMessages = [...newMessages, assistantMessage];
        setChatMessages(updatedMessages);
        await updateAnalysis({ chatHistory: updatedMessages });
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

  // ============================================================
  // AI Formatting
  // ============================================================
  const handleFormatWithAI = async () => {
    if (!analysis?.jobDescriptionMd) return;

    setIsFormatting(true);
    try {
      const response = await fetch("/api/ai/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: isEditMode ? editMarkdown : analysis.jobDescriptionMd,
          systemPrompt: `業務分掌を校正・整形してください。

## 業務名
${analysis.title}

## ルール
- 文章の整合性をチェックし、矛盾があれば修正
- 不完全な項目は補完（推測で埋める）
- マークダウン形式を整える
- 表形式が適切な箇所は表を使用
- 見出し構造を統一（## を使用）

## 出力
整形後の業務分掌全体（マークダウン形式）`,
          temperature: 0.3,
          maxTokens: 4000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.output) {
          await updateAnalysis({
            jobDescriptionMd: data.output,
            status: "EDITING",
          });
          setEditMarkdown(data.output);
        }
      }
    } catch (error) {
      console.error("Failed to format:", error);
    } finally {
      setIsFormatting(false);
    }
  };

  // ============================================================
  // Edit mode
  // ============================================================
  const handleStartEditMode = () => {
    if (!analysis) return;
    setEditMarkdown(analysis.jobDescriptionMd || "");
    setIsEditMode(true);
  };

  const handleCancelEditMode = () => {
    setIsEditMode(false);
    setEditMarkdown("");
  };

  const handleSaveEditMode = async () => {
    setIsSaving(true);
    try {
      const success = await updateAnalysis({ jobDescriptionMd: editMarkdown });
      if (success) {
        setIsEditMode(false);
        setEditMarkdown("");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestartChat = async () => {
    if (!confirm(t.clearConfirm)) return;
    setChatMessages([]);
    await updateAnalysis({ chatHistory: null });
  };

  // ============================================================
  // Render
  // ============================================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-128px)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t.backToList}
        </Button>
        <div className="flex items-center gap-3">
          {/* Inline status & step summary */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${statusColors[analysis.status as AnalysisStatus] || statusColors.DRAFT}`}
            >
              {getStatusLabel(analysis.status)}
            </span>
            <div className="flex -space-x-1">
              {stepStatuses.map((status, index) => (
                <div
                  key={index}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-background ${
                    status === "completed"
                      ? "bg-indigo-500 text-white"
                      : status === "current"
                        ? "bg-white dark:bg-gray-800 border-indigo-500 text-indigo-500"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                  }`}
                >
                  {status === "completed" ? (
                    <Check className="w-2.5 h-2.5" />
                  ) : (
                    index + 1
                  )}
                </div>
              ))}
            </div>
          </div>
          {analysis.status === "COMPLETED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateAnalysis({ status: "EDITING" })}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              {t.reopen}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInfoPanel(!showInfoPanel)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={`w-4 h-4 mr-1 transition-transform duration-200 ${showInfoPanel ? "rotate-180" : ""}`}
            />
            {showInfoPanel
              ? (language === "ja" ? "情報を隠す" : "Hide Info")
              : (language === "ja" ? "情報を表示" : "Show Info")}
          </Button>
        </div>
      </div>

      {/* Info Panel - toggle visibility */}
      {showInfoPanel && (
        <div className="bg-card rounded-xl border shadow-sm p-6 flex-shrink-0">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold mb-2">{analysis.title}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`text-sm px-3 py-1 rounded-full ${statusColors[analysis.status as AnalysisStatus] || statusColors.DRAFT}`}
              >
                {getStatusLabel(analysis.status)}
              </span>
              <span className="text-sm text-muted-foreground">
                {t.version} {analysis.version}
              </span>
              <span className="text-xs text-muted-foreground">
                {t.updatedAt}: {formatDate(analysis.updatedAt)}
              </span>
            </div>
          </div>

          {/* Description */}
          {(analysis.description || analysis.tags) && (
            <div className="mb-6 pb-6 border-b">
              <p className="text-muted-foreground text-sm">
                {analysis.description || t.noDescription}
              </p>
              {analysis.tags && (
                <div className="mt-2">
                  <span className="text-sm text-indigo-600 dark:text-indigo-400">
                    {analysis.tags}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Next Action Banner */}
          {currentStepIndex >= 0 && (
            <div className="flex items-center justify-end mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm">
                <span className="font-medium">{t.nextAction}:</span>
                <span>{steps[currentStepIndex].action}</span>
              </div>
            </div>
          )}

          {/* Step Progress - Desktop */}
          <div className="hidden md:block">
            <div className="flex items-start justify-between relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />
              <div
                className="absolute top-5 left-0 h-0.5 bg-indigo-500 transition-all duration-500"
                style={{
                  width: `${(stepStatuses.filter((s) => s === "completed").length / (steps.length - 1)) * 100}%`,
                }}
              />

              {steps.map((step, index) => {
                const status = stepStatuses[index];
                const StepIcon = step.icon;
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center relative z-10 flex-1"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        status === "completed"
                          ? "bg-indigo-500 border-indigo-500 text-white"
                          : status === "current"
                            ? "bg-white dark:bg-gray-800 border-indigo-500 text-indigo-500"
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400"
                      }`}
                    >
                      {status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>

                    <div className="mt-3 text-center px-2">
                      <p
                        className={`text-sm font-medium ${
                          status === "completed"
                            ? "text-indigo-600 dark:text-indigo-400"
                            : status === "current"
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[160px]">
                        {step.desc}
                      </p>

                      {status === "current" && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="mt-3"
                          onClick={() => handleStepAction(index)}
                          disabled={isSaving || isGeneratingDraft}
                        >
                          {(isSaving || isGeneratingDraft) && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          )}
                          {isGeneratingDraft && index === 0
                            ? t.generatingDraft
                            : step.action}
                        </Button>
                      )}

                      {status === "completed" && (
                        <span className="inline-block mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          {t.stepCompleted}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Progress - Mobile */}
          <div className="md:hidden space-y-4">
            {steps.map((step, index) => {
              const status = stepStatuses[index];
              const StepIcon = step.icon;
              const isLast = index === steps.length - 1;
              return (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                        status === "completed"
                          ? "bg-indigo-500 border-indigo-500 text-white"
                          : status === "current"
                            ? "bg-white dark:bg-gray-800 border-indigo-500 text-indigo-500"
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400"
                      }`}
                    >
                      {status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 min-h-[24px] ${
                          status === "completed"
                            ? "bg-indigo-500"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          status === "completed"
                            ? "text-indigo-600 dark:text-indigo-400"
                            : status === "current"
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {step.title}
                      </p>
                      {status === "completed" && (
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                          {t.stepCompleted}
                        </span>
                      )}
                      {status === "current" && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                          {t.stepCurrent}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.desc}
                    </p>

                    {status === "current" && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleStepAction(index)}
                        disabled={isSaving || isGeneratingDraft}
                      >
                        {(isSaving || isGeneratingDraft) && (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        )}
                        {isGeneratingDraft && index === 0
                          ? t.generatingDraft
                          : step.action}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Job Description Panel */}
      <div className="bg-card rounded-xl shadow-sm border flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold">{t.jobDescription}</h2>
            {isEditMode && (
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                {t.editMode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Reference materials toggle */}
            {analysis.inputMaterials && (
              <Button
                variant={showMaterials ? "primary" : "outline"}
                size="sm"
                onClick={() => setShowMaterials(!showMaterials)}
                className={
                  showMaterials
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                }
              >
                <FileText className="w-4 h-4 mr-1" />
                {t.inputMaterials}
              </Button>
            )}
            {hasJobDescription() && !isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEditMode}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                {t.editModeOn}
              </Button>
            )}
            {isEditMode && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEditMode}
                  disabled={isSaving}
                >
                  {t.cancelEdit}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveEditMode}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  {isSaving ? t.savingChanges : t.saveChanges}
                </Button>
              </>
            )}
            {/* AI Support toggle */}
            <Button
              variant={showAISupport ? "primary" : "outline"}
              size="sm"
              onClick={() => setShowAISupport(!showAISupport)}
              className={
                showAISupport
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              }
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              {t.aiSupportTitle}
              {chatMessages.length > 0 && (
                <span className="ml-1 text-xs">({chatMessages.length})</span>
              )}
            </Button>
          </div>
        </div>

        {/* Panel content */}
        <div
          className={`flex-1 min-h-0 flex ${showAISupport ? "flex-row" : "flex-col"} overflow-hidden`}
        >
          {/* Left: Job description */}
          <div
            className={`${showAISupport ? "w-1/2 border-r" : "w-full flex-1"} flex flex-col min-h-0 overflow-hidden`}
          >
            {/* Reference materials collapsible */}
            {showMaterials && analysis.inputMaterials && (
              <div className="p-4 border-b bg-indigo-50/50 dark:bg-indigo-900/10 max-h-[200px] overflow-y-auto">
                <h3 className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">
                  {t.inputMaterials}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {analysis.inputMaterials}
                </p>
              </div>
            )}

            {isEditMode && hasJobDescription() ? (
              /* Edit mode - split preview/editor */
              <div className="flex-1 min-h-0 flex">
                {/* Preview */}
                <div className="w-1/2 border-r overflow-y-auto p-4">
                  <div className="mb-2 pb-2 border-b">
                    <span className="text-xs text-muted-foreground font-medium">
                      {t.previewMode}
                    </span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {editMarkdown || ""}
                    </ReactMarkdown>
                  </div>
                </div>
                {/* Markdown editor */}
                <div className="w-1/2 p-4 flex flex-col">
                  <div className="mb-2 pb-2 border-b flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      {language === "ja" ? "マークダウン編集" : "Markdown Editor"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFormatWithAI}
                      disabled={isFormatting}
                      className="h-6 text-xs"
                    >
                      {isFormatting ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 mr-1" />
                      )}
                      {isFormatting ? t.formatting : t.formatWithAI}
                    </Button>
                  </div>
                  <textarea
                    className="flex-1 w-full p-3 border rounded-md text-sm bg-background resize-none font-mono"
                    value={editMarkdown}
                    onChange={(e) => setEditMarkdown(e.target.value)}
                    placeholder={
                      language === "ja"
                        ? "マークダウン形式で業務分掌を記述..."
                        : "Write job description in markdown..."
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col p-4 overflow-y-auto">
                {hasJobDescription() ? (
                  /* View mode - markdown preview */
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {analysis.jobDescriptionMd || ""}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    {isGeneratingDraft ? (
                      <>
                        <Loader2 className="w-12 h-12 mx-auto text-indigo-500 mb-4 animate-spin" />
                        <p className="text-muted-foreground font-medium">
                          {t.generatingDraft}
                        </p>
                      </>
                    ) : (
                      <>
                        <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          {t.noJobDescription}
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          className="mt-4"
                          onClick={handleGenerateDraft}
                          disabled={isGeneratingDraft}
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          {t.generateDraft}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          {t.generateDraftDesc}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: AI Support chat */}
          {showAISupport && (
            <div className="w-1/2 flex flex-col overflow-hidden bg-muted/30">
              {/* Chat header */}
              <div className="p-3 border-b bg-background flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium text-sm">
                    {t.aiSupportTitle}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {hasJobDescription() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFormatWithAI}
                      disabled={isFormatting}
                      className="h-7 text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      {isFormatting ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                      )}
                      {isFormatting ? t.formatting : t.formatWithAI}
                    </Button>
                  )}
                  {chatMessages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRestartChat}
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      {t.clearChat}
                    </Button>
                  )}
                </div>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8">
                    <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground text-center max-w-[200px]">
                      {t.aiSupportDesc}
                    </p>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((message, index) => (
                      <div
                        key={`${message.timestamp}-${index}`}
                        className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-2.5 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border"
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
                        <div className="bg-background border rounded-lg p-2.5">
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

              {/* Chat input */}
              <div className="p-3 border-t bg-background">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    placeholder={t.aiSupportPlaceholder}
                    className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[40px] max-h-[120px]"
                    rows={1}
                    disabled={isAiThinking}
                  />
                  <Button
                    variant="primary"
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isAiThinking}
                    className="h-10 w-10 rounded-lg flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
