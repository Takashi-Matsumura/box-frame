"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Boxes,
  Check,
  CheckCircle2,
  ClipboardList,
  Edit2,
  FileInput,
  FileOutput,
  FileText,
  GitBranch,
  Lightbulb,
  Loader2,
  MessageSquare,
  Monitor,
  PlayCircle,
  RotateCcw,
  Send,
  Target,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingWindow } from "@/components/ui/floating-window";
import { useFloatingWindowStore } from "@/lib/stores/floating-window-store";
import { DiagramEditorWithAI } from "@/lib/addon-modules/backoffice/components/DiagramEditorWithAI";
import { wrapWithMxFile } from "@/lib/addon-modules/backoffice/utils/diagram-utils";
import { processDetailTranslations } from "./translations";

// 業務分掌データの型定義
interface Stakeholder {
  name: string;
  role: string;
  department?: string;
}

interface Actor {
  id: string;
  name: string;
  department?: string;
}

interface InputOutput {
  name: string;
  description?: string;
  source?: string;
  destination?: string;
}

interface SystemTool {
  name: string;
  purpose?: string;
  url?: string;
}

interface KPI {
  name: string;
  target?: string;
  unit?: string;
  frequency?: string;
}

interface RiskIssue {
  type: string;
  description: string;
  impact?: string;
  mitigation?: string;
}

interface Improvement {
  title: string;
  description: string;
  priority?: string;
  expectedBenefit?: string;
}

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
  // 業務分掌9項目
  purpose: string | null;
  responsibleDepartment: string | null;
  responsiblePerson: string | null;
  authority: string | null;
  stakeholders: Stakeholder[] | null;
  businessFlow: string | null;
  actors: Actor[] | null;
  inputs: InputOutput[] | null;
  outputs: InputOutput[] | null;
  systemsAndTools: SystemTool[] | null;
  kpis: KPI[] | null;
  risksAndIssues: RiskIssue[] | null;
  improvements: Improvement[] | null;
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
  const [isComposing, setIsComposing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [diagramXml, setDiagramXml] = useState<string>("");
  const [isOrganizing, setIsOrganizing] = useState(false);
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
      INTERVIEW: t.interview,
      DIAGRAMMING: t.diagramming,
      REVIEW: t.review,
      PUBLISHED: t.published,
      ARCHIVED: t.archived,
    };
    return statusMap[status] || status;
  };

  // 業務分掌が整理済みかどうかを判定
  const hasJobDescription = () => {
    if (!process) return false;
    return !!(
      process.purpose ||
      process.responsibleDepartment ||
      process.stakeholders?.length ||
      process.businessFlow ||
      process.inputs?.length ||
      process.outputs?.length ||
      process.systemsAndTools?.length ||
      process.kpis?.length ||
      process.risksAndIssues?.length ||
      process.improvements?.length
    );
  };

  // Step progress calculation
  type StepStatus = "completed" | "current" | "pending";

  const getStepStatuses = (): StepStatus[] => {
    if (!process) return ["pending", "pending", "pending", "pending", "pending"];

    const hasStartedHearing = chatMessages.length > 0;
    const hasJobDesc = hasJobDescription();
    const hasDiagram = !!process.diagramXml;
    const status = process.status;

    // Step 1: AI Hearing - 8メッセージ以上で十分なヒアリングとみなす
    const hasEnoughMessages = chatMessages.length >= 8;
    let step1: StepStatus = "pending";
    if (status === "PUBLISHED" || status === "REVIEW" || status === "DIAGRAMMING" || hasJobDesc || hasEnoughMessages) {
      step1 = "completed";
    } else if (hasStartedHearing || status === "INTERVIEW") {
      step1 = "current";
    }

    // Step 2: Job Description (業務分掌整理)
    let step2: StepStatus = "pending";
    if (hasJobDesc && (status === "DIAGRAMMING" || status === "REVIEW" || status === "PUBLISHED" || hasDiagram)) {
      step2 = "completed";
    } else if (hasEnoughMessages && !hasJobDesc) {
      step2 = "current";
    }

    // Step 3: Sequence Diagram - 図が保存されたら完了
    let step3: StepStatus = "pending";
    if (hasDiagram) {
      step3 = "completed";
    } else if (status === "DIAGRAMMING" || (hasJobDesc && step2 === "completed")) {
      step3 = "current";
    }

    // Step 4: Review - 図が完成したらレビュー開始可能
    let step4: StepStatus = "pending";
    if (status === "PUBLISHED") {
      step4 = "completed";
    } else if (status === "REVIEW" || (hasDiagram && step3 === "completed")) {
      step4 = "current";
    }

    // Step 5: Publish
    let step5: StepStatus = "pending";
    if (status === "PUBLISHED") {
      step5 = "completed";
    }

    return [step1, step2, step3, step4, step5];
  };

  const stepStatuses = getStepStatuses();

  const steps = [
    { title: t.step1Title, desc: t.step1Desc, action: t.step1Action, icon: MessageSquare },
    { title: t.step2Title, desc: t.step2Desc, action: t.step2Action, icon: ClipboardList },
    { title: t.step3Title, desc: t.step3Desc, action: t.step3Action, icon: GitBranch },
    { title: t.step4Title, desc: t.step4Desc, action: t.step4Action, icon: PlayCircle },
    { title: t.step5Title, desc: t.step5Desc, action: t.step5Action, icon: Upload },
  ];

  const currentStepIndex = stepStatuses.findIndex((s) => s === "current");

  const handleStepAction = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: // Start hearing
        if (chatMessages.length === 0) {
          const initialMessage: ChatMessage = {
            role: "assistant",
            content:
              language === "ja"
                ? `「${process?.title}」について業務分掌のヒアリングを始めます。\n\n9つの項目について順番に質問していきます。分かる範囲でお答えください。\n\nまず最初の質問です。\n**この業務の目的・背景を教えてください。なぜこの業務が必要なのでしょうか？**`
                : `Let's start the job description hearing for "${process?.title}".\n\nI'll ask you about 9 items in order. Please answer as best you can.\n\nFirst question:\n**What is the purpose and background of this business process? Why is it necessary?**`,
            timestamp: new Date().toISOString(),
          };
          setChatMessages([initialMessage]);
          updateProcess({
            interviewHistory: [initialMessage],
            status: "INTERVIEW",
          });
        }
        break;
      case 1: // Organize job description
        handleOrganizeJobDescription();
        break;
      case 2: // Open diagram editor
        handleOpenDiagramEditor();
        break;
      case 3: // Start review
        updateProcess({ status: "REVIEW" });
        break;
      case 4: // Publish
        updateProcess({ status: "PUBLISHED" });
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

    if (process?.status === "DRAFT") {
      await updateProcess({ status: "INTERVIEW" });
    }

    try {
      // 業務分掌9項目に対応したAIヒアリングプロンプト
      const systemPrompt = `あなたは業務分掌のヒアリングを行うインタビュアーです。
ユーザーの業務について深く理解するために、**一度に1つだけ質問**してください。

## ヒアリング対象
業務名: ${process?.title || "不明"}
${process?.description ? `説明: ${process.description}` : ""}

## 業務分掌9項目（順番にヒアリング）

### フェーズ1: 基本情報の収集
以下の9項目を順番にヒアリングしてください：

1. **業務概要・目的** - 目的、背景、この業務が組織に提供する価値
2. **責任範囲** - 担当部署、責任者、権限の範囲
3. **ステークホルダー** - 関係する部署・役割・外部関係者（後でシーケンス図のアクターになります）
4. **業務フロー** - 業務の開始条件、主要なステップ、各ステップの担当者、完了条件
5. **インプット/アウトプット** - 必要な入力情報と成果物
6. **使用システム・ツール** - 業務で使用するシステムやツール
7. **KPI/成果指標** - 業務の評価基準、目標値
8. **リスク・課題** - 現在の問題点、ボトルネック、リスク
9. **改善提案** - ヒアリング内容から見える改善の余地

### フェーズ2: 深掘りと確認
基本情報が揃ったら：
- 回答されたフローの詳細を深掘り
- 曖昧な点や不明点を確認
- ステークホルダー間の相互作用を明確化

### フェーズ3: 全体確認
十分な情報が集まったら：
- これまでの会話から業務分掌全体を整理して提示
- 漏れている可能性のある項目を指摘
- 最終確認の質問

## 回答ルール
- **必ず1つの質問だけ**をしてください（複数の質問を一度にしない）
- 質問は簡潔に（1-2文程度）
- ユーザーの回答を受け止めてから次の質問へ進む
- 「はい/いいえ」で答えられる質問より、具体的な回答を引き出す質問を心がける
- ステークホルダーについては特に詳しく聞いてください（シーケンス図作成に重要）`;

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
          content: data.content || data.message || "申し訳ございません。応答を生成できませんでした。",
          timestamp: new Date().toISOString(),
        };
        const updatedMessages = [...newMessages, assistantMessage];
        setChatMessages(updatedMessages);
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
        // diagramXmlが更新された場合は、ローカルステートも更新
        if (data.diagramXml !== undefined) {
          setDiagramXml(updated.diagramXml || "");
        }
        return true;
      }
    } catch (error) {
      console.error("Failed to update process:", error);
    }
    return false;
  };

  // 業務分掌を整理する
  const handleOrganizeJobDescription = async () => {
    if (chatMessages.length === 0) return;

    setIsOrganizing(true);
    try {
      const conversationText = chatMessages
        .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
        .join("\n");

      const response = await fetch("/api/ai/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: conversationText,
          systemPrompt: `以下の会話から業務分掌9項目を抽出し、JSON形式で出力してください。

## 出力形式（厳守）
以下のJSON形式のみを出力してください。説明文は不要です。

{
  "purpose": "業務の目的・背景・価値（文字列）",
  "responsibleDepartment": "担当部署名（文字列）",
  "responsiblePerson": "責任者名（文字列）",
  "authority": "権限範囲の説明（文字列）",
  "stakeholders": [
    {"name": "部署/役割名", "role": "役割の説明", "department": "所属部署"}
  ],
  "businessFlow": "業務フローの説明（マークダウン形式）",
  "actors": [
    {"id": "actor1", "name": "アクター名", "department": "所属部署"}
  ],
  "inputs": [
    {"name": "入力名", "description": "説明", "source": "入力元"}
  ],
  "outputs": [
    {"name": "成果物名", "description": "説明", "destination": "出力先"}
  ],
  "systemsAndTools": [
    {"name": "システム名", "purpose": "用途", "url": "URL（あれば）"}
  ],
  "kpis": [
    {"name": "KPI名", "target": "目標値", "unit": "単位", "frequency": "測定頻度"}
  ],
  "risksAndIssues": [
    {"type": "リスク/課題", "description": "説明", "impact": "影響", "mitigation": "対策"}
  ],
  "improvements": [
    {"title": "改善提案タイトル", "description": "説明", "priority": "優先度", "expectedBenefit": "期待効果"}
  ]
}

## ルール
- 会話から読み取れない項目はnullまたは空配列にする
- actorsはステークホルダーから主要なアクターを抽出（シーケンス図で使用）
- businessFlowはマークダウン形式で、ステップごとに番号付きリストで記述
- 改善提案(improvements)は会話内容から見える潜在的な改善点をAIが提案`,
          temperature: 0.3,
          maxTokens: 4000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const output = data.output || "";

        // JSONを抽出
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const jobDescription = JSON.parse(jsonMatch[0]);
            await updateProcess({
              ...jobDescription,
              status: "DIAGRAMMING",
            });
          } catch (parseError) {
            console.error("Failed to parse job description JSON:", parseError);
          }
        }
      }
    } catch (error) {
      console.error("Failed to organize job description:", error);
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleOpenDiagramEditor = () => {
    const xml = diagramXml ? wrapWithMxFile(diagramXml) : "";

    // シーケンス図用のアクター情報を渡す
    const actorsForDiagram = process?.actors || process?.stakeholders?.map((s, i) => ({
      id: `actor${i + 1}`,
      name: s.name,
      department: s.department || "",
    })) || [];

    // 保存コールバック（XMLを受け取って保存）
    const handleSaveInEditor = async (xmlToSave: string): Promise<boolean> => {
      const success = await updateProcess({ diagramXml: xmlToSave });
      return success;
    };

    openFloatingWindow({
      title: "Sequence Diagram Editor",
      titleJa: t.diagramEditor,
      initialSize: { width: 1200, height: 700 },
      initialPosition: { x: 50, y: 50 },
      content: (
        <DiagramEditorWithAI
          xml={xml}
          flowDescription={process?.businessFlow || process?.flowDescription || undefined}
          actors={actorsForDiagram}
          onChange={(newXml) => {
            setDiagramXml(newXml);
          }}
          onSave={handleSaveInEditor}
          language={language}
          className="w-full h-full"
        />
      ),
    });
  };

  const handleRestartHearing = async () => {
    if (!confirm(t.restartConfirm)) return;

    setChatMessages([]);
    await updateProcess({
      interviewHistory: null,
      status: "DRAFT",
      // 業務分掌もリセット
      purpose: null,
      responsibleDepartment: null,
      responsiblePerson: null,
      authority: null,
      stakeholders: null,
      businessFlow: null,
      actors: null,
      inputs: null,
      outputs: null,
      systemsAndTools: null,
      kpis: null,
      risksAndIssues: null,
      improvements: null,
    });
  };

  // Note: setContentはフローティングウィンドウを開く時のみ呼び出す
  // diagramXmlの変更でsetContentを再呼び出しすると、エディタが再マウントされてしまうため削除

  // 業務分掌カードコンポーネント
  const JobDescriptionCard = ({
    icon: Icon,
    title,
    description,
    children,
    isEmpty,
  }: {
    icon: React.ElementType;
    title: string;
    description: string;
    children: React.ReactNode;
    isEmpty?: boolean;
  }) => (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-start gap-3 mb-2">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className={`mt-3 text-sm ${isEmpty ? "text-muted-foreground italic" : ""}`}>
        {children}
      </div>
    </div>
  );

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

      {/* Process Info Card with Step Progress */}
      <div className="bg-card rounded-xl p-6 shadow-sm border">
        {/* Header: Title, Status, Actions */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">{process.title}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`text-sm px-3 py-1 rounded-full ${statusColors[process.status as ProcessStatus] || statusColors.DRAFT}`}
              >
                {getStatusLabel(process.status)}
              </span>
              <span className="text-sm text-muted-foreground">
                {t.version} {process.version}
              </span>
              <span className="text-xs text-muted-foreground">
                {t.updatedAt}: {formatDate(process.updatedAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentStepIndex >= 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm">
                <span className="font-medium">{t.nextAction}:</span>
                <span>{steps[currentStepIndex].action}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDiagramEditor}
            >
              <GitBranch className="w-4 h-4 mr-1" />
              {t.openDiagram}
            </Button>
            {process.diagramXml && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t.diagramSavedIndicator}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {(process.description || process.tags) && (
          <div className="mb-6 pb-6 border-b">
            <p className="text-muted-foreground text-sm">
              {process.description || t.noDescription}
            </p>
            {process.tags && (
              <div className="mt-2">
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  {process.tags}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step Progress Indicator */}
        {/* Desktop: Horizontal stepper */}
        <div className="hidden md:block">
          <div className="flex items-start justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-amber-500 transition-all duration-500"
              style={{
                width: `${(stepStatuses.filter((s) => s === "completed").length / (steps.length - 1)) * 100}%`,
              }}
            />

            {steps.map((step, index) => {
              const status = stepStatuses[index];
              const StepIcon = step.icon;
              return (
                <div key={index} className="flex flex-col items-center relative z-10 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      status === "completed"
                        ? "bg-amber-500 border-amber-500 text-white"
                        : status === "current"
                          ? "bg-white dark:bg-gray-800 border-amber-500 text-amber-500"
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
                          ? "text-amber-600 dark:text-amber-400"
                          : status === "current"
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[120px]">
                      {step.desc}
                    </p>

                    {status === "current" && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-3"
                        onClick={() => handleStepAction(index)}
                        disabled={isSaving || isOrganizing}
                      >
                        {(isSaving || isOrganizing) ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : null}
                        {step.action}
                      </Button>
                    )}

                    {status === "completed" && (
                      <span className="inline-block mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        {t.stepCompleted}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Vertical stepper */}
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
                        ? "bg-amber-500 border-amber-500 text-white"
                        : status === "current"
                          ? "bg-white dark:bg-gray-800 border-amber-500 text-amber-500"
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
                          ? "bg-amber-500"
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
                          ? "text-amber-600 dark:text-amber-400"
                          : status === "current"
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </p>
                    {status === "completed" && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                        {t.stepCompleted}
                      </span>
                    )}
                    {status === "current" && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                        {t.stepCurrent}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>

                  {status === "current" && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleStepAction(index)}
                      disabled={isSaving || isOrganizing}
                    >
                      {(isSaving || isOrganizing) ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : null}
                      {step.action}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
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
                          ? `「${process.title}」について業務分掌のヒアリングを始めます。\n\n9つの項目について順番に質問していきます。分かる範囲でお答えください。\n\nまず最初の質問です。\n**この業務の目的・背景を教えてください。なぜこの業務が必要なのでしょうか？**`
                          : `Let's start the job description hearing for "${process.title}".\n\nI'll ask you about 9 items in order. Please answer as best you can.\n\nFirst question:\n**What is the purpose and background of this business process? Why is it necessary?**`,
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
              {chatMessages.length >= 8 && !hasJobDescription() && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={handleOrganizeJobDescription}
                  disabled={isOrganizing}
                >
                  {isOrganizing ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  {isOrganizing ? t.organizingJobDescription : t.organizeJobDescription}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Job Description (業務分掌) */}
        <div className="bg-card rounded-xl shadow-sm border flex flex-col h-[500px]">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold">{t.jobDescription}</h2>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {hasJobDescription() ? (
              <div className="grid grid-cols-1 gap-3">
                {/* 1. 業務概要・目的 */}
                <JobDescriptionCard
                  icon={Target}
                  title={t.itemPurpose}
                  description={t.itemPurposeDesc}
                  isEmpty={!process.purpose}
                >
                  {process.purpose || t.notSet}
                </JobDescriptionCard>

                {/* 2. 責任範囲 */}
                <JobDescriptionCard
                  icon={Users}
                  title={t.itemResponsibility}
                  description={t.itemResponsibilityDesc}
                  isEmpty={!process.responsibleDepartment && !process.responsiblePerson}
                >
                  {(process.responsibleDepartment || process.responsiblePerson || process.authority) ? (
                    <div className="space-y-1">
                      {process.responsibleDepartment && (
                        <p><span className="text-muted-foreground">{t.department}:</span> {process.responsibleDepartment}</p>
                      )}
                      {process.responsiblePerson && (
                        <p><span className="text-muted-foreground">{t.person}:</span> {process.responsiblePerson}</p>
                      )}
                      {process.authority && (
                        <p><span className="text-muted-foreground">{t.authority}:</span> {process.authority}</p>
                      )}
                    </div>
                  ) : t.notSet}
                </JobDescriptionCard>

                {/* 3. ステークホルダー */}
                <JobDescriptionCard
                  icon={Boxes}
                  title={t.itemStakeholders}
                  description={t.itemStakeholdersDesc}
                  isEmpty={!process.stakeholders?.length}
                >
                  {process.stakeholders?.length ? (
                    <ul className="space-y-1">
                      {process.stakeholders.map((s, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>{s.name}</span>
                          {s.role && <span className="text-muted-foreground">- {s.role}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : t.notSet}
                </JobDescriptionCard>

                {/* 4. 業務フロー */}
                <JobDescriptionCard
                  icon={GitBranch}
                  title={t.itemBusinessFlow}
                  description={t.itemBusinessFlowDesc}
                  isEmpty={!process.businessFlow}
                >
                  {process.businessFlow ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{process.businessFlow}</p>
                    </div>
                  ) : t.notSet}
                </JobDescriptionCard>

                {/* 5. インプット/アウトプット */}
                <JobDescriptionCard
                  icon={FileInput}
                  title={t.itemInputOutput}
                  description={t.itemInputOutputDesc}
                  isEmpty={!process.inputs?.length && !process.outputs?.length}
                >
                  {(process.inputs?.length || process.outputs?.length) ? (
                    <div className="space-y-2">
                      {process.inputs?.length ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Input</p>
                          <ul className="space-y-1">
                            {process.inputs.map((item, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <FileInput className="w-3 h-3 text-blue-500" />
                                <span>{item.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {process.outputs?.length ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                          <ul className="space-y-1">
                            {process.outputs.map((item, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <FileOutput className="w-3 h-3 text-green-500" />
                                <span>{item.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : t.notSet}
                </JobDescriptionCard>

                {/* 6. 使用システム・ツール */}
                <JobDescriptionCard
                  icon={Monitor}
                  title={t.itemSystemsTools}
                  description={t.itemSystemsToolsDesc}
                  isEmpty={!process.systemsAndTools?.length}
                >
                  {process.systemsAndTools?.length ? (
                    <ul className="space-y-1">
                      {process.systemsAndTools.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Monitor className="w-3 h-3 text-purple-500" />
                          <span>{item.name}</span>
                          {item.purpose && <span className="text-muted-foreground">- {item.purpose}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : t.notSet}
                </JobDescriptionCard>

                {/* 7. KPI/成果指標 */}
                <JobDescriptionCard
                  icon={BarChart3}
                  title={t.itemKPIs}
                  description={t.itemKPIsDesc}
                  isEmpty={!process.kpis?.length}
                >
                  {process.kpis?.length ? (
                    <ul className="space-y-1">
                      {process.kpis.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <BarChart3 className="w-3 h-3 text-cyan-500" />
                          <span>{item.name}</span>
                          {item.target && <span className="text-muted-foreground">({item.target}{item.unit})</span>}
                        </li>
                      ))}
                    </ul>
                  ) : t.notSet}
                </JobDescriptionCard>

                {/* 8. リスク・課題 */}
                <JobDescriptionCard
                  icon={AlertTriangle}
                  title={t.itemRisksIssues}
                  description={t.itemRisksIssuesDesc}
                  isEmpty={!process.risksAndIssues?.length}
                >
                  {process.risksAndIssues?.length ? (
                    <ul className="space-y-1">
                      {process.risksAndIssues.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 text-orange-500 mt-1" />
                          <div>
                            <span className="font-medium">{item.type}</span>
                            <p className="text-muted-foreground text-xs">{item.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : t.notSet}
                </JobDescriptionCard>

                {/* 9. 改善提案 */}
                <JobDescriptionCard
                  icon={Lightbulb}
                  title={t.itemImprovements}
                  description={t.itemImprovementsDesc}
                  isEmpty={!process.improvements?.length}
                >
                  {process.improvements?.length ? (
                    <ul className="space-y-2">
                      {process.improvements.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Lightbulb className="w-3 h-3 text-yellow-500 mt-1" />
                          <div>
                            <span className="font-medium">{item.title}</span>
                            <p className="text-muted-foreground text-xs">{item.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : t.notSet}
                </JobDescriptionCard>
              </div>
            ) : (
              <div className="text-center py-8">
                <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t.noJobDescription}</p>
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
