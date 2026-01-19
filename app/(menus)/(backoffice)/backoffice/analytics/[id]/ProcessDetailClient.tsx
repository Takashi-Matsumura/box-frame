"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardList,
  Edit2,
  GitBranch,
  Loader2,
  MessageCircle,
  MessageSquare,
  PlayCircle,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import {
  CollapsiblePanel,
  CollapsiblePanelContent,
  CollapsiblePanelDescription,
  CollapsiblePanelHeader,
  CollapsiblePanelSummary,
  CollapsiblePanelTitle,
} from "@/components/ui/collapsible-panel";
import { FloatingWindow } from "@/components/ui/floating-window";
import { DiagramEditorWithAI } from "@/lib/addon-modules/backoffice/components/DiagramEditorWithAI";
import { wrapWithMxFile } from "@/lib/addon-modules/backoffice/utils/diagram-utils";
import { useFloatingWindowStore } from "@/lib/stores/floating-window-store";
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
  // 業務分掌（マークダウン形式）
  jobDescriptionMd: string | null;
  // 業務分掌9項目（レガシー）
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

// 業務分掌項目のレビュー結果
interface ItemReviewResult {
  itemKey: string;
  status: "complete" | "needs_attention" | "incomplete";
  comment: string;
}

// 深掘りモードの対象項目
type DeepDiveItemKey =
  | "purpose"
  | "responsibility"
  | "stakeholders"
  | "businessFlow"
  | "inputOutput"
  | "systemsTools"
  | "kpis"
  | "risksIssues"
  | "improvements";

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
  userName: _userName,
}: ProcessDetailClientProps) {
  const t = processDetailTranslations[language];
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { open: openFloatingWindow } = useFloatingWindowStore();

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

  // 深掘りモード
  const [deepDiveItem, setDeepDiveItem] = useState<DeepDiveItemKey | null>(
    null,
  );
  const [deepDiveMessages, setDeepDiveMessages] = useState<ChatMessage[]>([]);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);

  // AIレビュー
  const [reviewResults, setReviewResults] = useState<ItemReviewResult[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);

  // 編集モード（マークダウン編集）
  const [isEditMode, setIsEditMode] = useState(false);
  const [editMarkdown, setEditMarkdown] = useState("");

  // ============================================================
  // プロセス更新関数（useEffectより先に定義が必要）
  // ============================================================
  const updateProcess = useCallback(
    async (data: Partial<BusinessProcess>) => {
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
    },
    [processId],
  );

  // ============================================================
  // ヒアリング初期化メッセージの生成（重複コード防止のヘルパー）
  // ============================================================
  const createInitialHearingMessage = useCallback(
    (title: string): ChatMessage => {
      return {
        role: "assistant",
        content:
          language === "ja"
            ? `「${title}」について業務分掌のヒアリングを始めます。\n\n9つの項目について順番に質問していきます。各項目1回ずつ、テンポよく進めましょう。\n\n**【項目1/9: 業務概要・目的】**\nこの業務の目的・背景を教えてください。なぜこの業務が必要ですか？`
            : `Let's start the job description hearing for "${title}".\n\nI'll ask about 9 items, one question each. Let's move through them efficiently.\n\n**[Item 1/9: Purpose]**\nWhat is the purpose and background of this business process?`,
        timestamp: new Date().toISOString(),
      };
    },
    [language],
  );

  // ============================================================
  // データ取得
  // ============================================================
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

  // ============================================================
  // useEffect群
  // ============================================================
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

  // ステータス自動修正: 業務分掌があるのにINTERVIEWのままの場合はDIAGRAMMINGに更新
  useEffect(() => {
    if (process?.jobDescriptionMd && process.status === "INTERVIEW") {
      updateProcess({ status: "DIAGRAMMING" });
    }
  }, [process?.jobDescriptionMd, process?.status, updateProcess]);

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
    // 新しいマークダウン形式またはレガシー形式をチェック
    return !!(
      process.jobDescriptionMd ||
      process.purpose ||
      process.responsibleDepartment ||
      process.stakeholders?.length
    );
  };

  // Step progress calculation
  type StepStatus = "completed" | "current" | "pending";

  const stepStatuses = useMemo((): StepStatus[] => {
    if (!process)
      return ["pending", "pending", "pending", "pending", "pending"];

    const hasStartedHearing = chatMessages.length > 0;
    const hasJobDesc = hasJobDescription();
    const hasDiagram = !!process.diagramXml;
    const status = process.status;

    // Step 1: AI Hearing - 8メッセージ以上で十分なヒアリングとみなす
    const hasEnoughMessages = chatMessages.length >= 8;
    let step1: StepStatus = "pending";
    if (
      status === "PUBLISHED" ||
      status === "REVIEW" ||
      status === "DIAGRAMMING" ||
      hasJobDesc ||
      hasEnoughMessages
    ) {
      step1 = "completed";
    } else if (hasStartedHearing || status === "INTERVIEW") {
      step1 = "current";
    }

    // Step 2: Job Description (業務分掌整理)
    // hasJobDescがあれば完了（ステータスに依存しない）
    let step2: StepStatus = "pending";
    if (hasJobDesc) {
      step2 = "completed";
    } else if (hasEnoughMessages || status === "INTERVIEW") {
      step2 = "current";
    }

    // Step 3: Business Flow Diagram - 図が保存されたら完了
    // hasJobDescがあれば図作成可能（ステータスに依存しない）
    let step3: StepStatus = "pending";
    if (hasDiagram) {
      step3 = "completed";
    } else if (hasJobDesc) {
      step3 = "current";
    }

    // Step 4: Review - 図が完成したらレビュー開始可能、REVIEWステータスなら完了
    let step4: StepStatus = "pending";
    if (status === "PUBLISHED" || status === "REVIEW") {
      step4 = "completed";
    } else if (hasDiagram) {
      step4 = "current";
    }

    // Step 5: Publish - REVIEWのときにcurrentになる
    let step5: StepStatus = "pending";
    if (status === "PUBLISHED") {
      step5 = "completed";
    } else if (status === "REVIEW") {
      step5 = "current";
    }

    return [step1, step2, step3, step4, step5];
  }, [process, chatMessages.length]);

  const steps = useMemo(
    () => [
      {
        title: t.step1Title,
        desc: t.step1Desc,
        action: t.step1Action,
        icon: MessageSquare,
      },
      {
        title: t.step2Title,
        desc: t.step2Desc,
        action: t.step2Action,
        icon: ClipboardList,
      },
      {
        title: t.step3Title,
        desc: t.step3Desc,
        action: t.step3Action,
        icon: GitBranch,
      },
      {
        title: t.step4Title,
        desc: t.step4Desc,
        action: t.step4Action,
        icon: PlayCircle,
      },
      {
        title: t.step5Title,
        desc: t.step5Desc,
        action: t.step5Action,
        icon: Upload,
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
      case 0: // Start hearing
        if (chatMessages.length === 0 && process?.title) {
          const initialMessage = createInitialHearingMessage(process.title);
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
      // 会話数から現在の進捗を推定
      const messageCount = newMessages.filter((m) => m.role === "user").length;
      const estimatedItem = Math.min(Math.floor(messageCount) + 1, 9);

      const systemPrompt = `あなたは業務分掌のヒアリングを行うインタビュアーです。
効率的にヒアリングを進め、**各項目は1回の回答で次に進みます**。

## ヒアリング対象
業務名: ${process?.title || "不明"}
${process?.description ? `説明: ${process.description}` : ""}

## 現在の進捗
ユーザーの回答数: ${messageCount}回
推定進捗: 約${estimatedItem}/9項目

## 業務分掌9項目（テンポよく順番にヒアリング）

1. **業務概要・目的** - 目的、背景、価値
2. **責任範囲** - 担当部署、責任者、権限
3. **ステークホルダー** - 関係者（業務フロー図のアクターになる重要項目）
4. **業務フロー** - 開始条件、主要ステップ、完了条件
5. **インプット/アウトプット** - 入力情報と成果物
6. **使用システム・ツール** - システムやツール
7. **KPI/成果指標** - 評価基準、目標値
8. **リスク・課題** - 問題点、ボトルネック
9. **改善提案** - 改善の余地

## 重要なルール（厳守）
- **各項目は1回の回答で次の項目に進む**（深掘りしすぎない）
- ユーザーが回答したら「ありがとうございます。（簡潔な確認）」→ 即座に次の項目の質問
- 質問の冒頭に **【項目N/9】** を付けて進捗を明示する
- 9項目すべて聞き終わったら「ヒアリング完了です。『業務分掌を整理』ボタンを押してください」と伝える
- 1つの質問は2文以内で簡潔に
- 同じ項目で2回以上質問しない

## 回答フォーマット例
「ありがとうございます。責任範囲について理解しました。

**【項目3/9: ステークホルダー】**
この業務に関わる部署や役割を教えてください。」`;

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

  // 業務分掌を整理する（マークダウン形式で生成）
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
          systemPrompt: `会話から業務分掌をマークダウン形式で整理してください。

## 出力形式（マークダウン）

# [業務名]

## 業務概要・目的
[業務の目的、背景、価値を記述]

## 責任範囲
- **担当部署**: [部署名]
- **責任者**: [責任者名]
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
- [入力2]

### アウトプット
- [成果物1]
- [成果物2]

## 使用システム・ツール
- [システム1]: [用途]
- [システム2]: [用途]

## KPI/成果指標
| 指標 | 目標値 |
|------|--------|
| [KPI名] | [目標] |

## リスク・課題
- [リスク/課題1]
- [リスク/課題2]

## 改善提案
- [改善案1]
- [改善案2]

ルール:
- 会話から読み取れない項目は「（未定義）」と記載
- 表形式が適切な場合は表を使用
- 箇条書きは「-」を使用
- 見出しは「##」を使用`,
          temperature: 0.3,
          maxTokens: 4000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const markdown = data.output || "";

        if (markdown.trim()) {
          await updateProcess({
            jobDescriptionMd: markdown,
            status: "DIAGRAMMING",
          });
        } else {
          alert(
            language === "ja"
              ? "業務分掌の整理に失敗しました。もう一度お試しください。"
              : "Failed to organize job description. Please try again.",
          );
        }
      }
    } catch (error) {
      console.error("Failed to organize job description:", error);
      alert(
        language === "ja"
          ? "エラーが発生しました。もう一度お試しください。"
          : "An error occurred. Please try again.",
      );
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleOpenDiagramEditor = () => {
    const xml = diagramXml ? wrapWithMxFile(diagramXml) : "";

    // 業務フロー図用のアクター情報を渡す
    const actorsForDiagram =
      process?.actors ||
      process?.stakeholders?.map((s, i) => ({
        id: `actor${i + 1}`,
        name: s.name,
        department: s.department || "",
      })) ||
      [];

    // 保存コールバック（XMLを受け取って保存）
    const handleSaveInEditor = async (xmlToSave: string): Promise<boolean> => {
      const success = await updateProcess({ diagramXml: xmlToSave });
      return success;
    };

    openFloatingWindow({
      title: "Business Flow Editor",
      titleJa: t.diagramEditor,
      initialSize: { width: 1200, height: 700 },
      initialPosition: { x: 50, y: 50 },
      content: (
        <DiagramEditorWithAI
          xml={xml}
          flowDescription={
            process?.jobDescriptionMd ||
            process?.businessFlow ||
            process?.flowDescription ||
            undefined
          }
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
    // AIヒアリングのコンテキストのみをクリア（業務分掌データは保持）
    await updateProcess({
      interviewHistory: null,
    });
  };

  // Note: setContentはフローティングウィンドウを開く時のみ呼び出す
  // diagramXmlの変更でsetContentを再呼び出しすると、エディタが再マウントされてしまうため削除

  // ====================================================================
  // 編集モード機能（マークダウン編集）
  // ====================================================================
  const handleStartEditMode = () => {
    if (!process) return;
    setEditMarkdown(process.jobDescriptionMd || "");
    setIsEditMode(true);
  };

  const handleCancelEditMode = () => {
    setIsEditMode(false);
    setEditMarkdown("");
  };

  const handleSaveEditMode = async () => {
    setIsSaving(true);
    try {
      const success = await updateProcess({ jobDescriptionMd: editMarkdown });
      if (success) {
        setIsEditMode(false);
        setEditMarkdown("");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ====================================================================
  // AIレビュー機能（マークダウン対応）
  // ====================================================================
  const [showReviewResults, setShowReviewResults] = useState(false);

  const handleReviewJobDescription = async () => {
    if (!process || !hasJobDescription()) return;

    setIsReviewing(true);
    try {
      // マークダウン形式の業務分掌をレビュー
      const jobDescriptionText = process.jobDescriptionMd || "";

      const response = await fetch("/api/ai/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: `業務名: ${process.title}\n\n${jobDescriptionText}`,
          systemPrompt: `あなたは業務分掌のレビュアーです。以下の業務分掌（マークダウン形式）を分析し、各項目の品質を評価してください。

## 評価基準
各項目について以下を判定してください：
- complete: 十分な情報があり、明確に記述されている
- needs_attention: 情報はあるが、曖昧な点や不明点がある
- incomplete: 情報が不足している、または未設定

## 出力形式（厳守）
以下のJSON配列のみを出力してください。説明文は不要です。

[
  {"itemKey": "purpose", "status": "complete|needs_attention|incomplete", "comment": "具体的な問題点や改善提案（日本語）"},
  {"itemKey": "responsibility", "status": "...", "comment": "..."},
  {"itemKey": "stakeholders", "status": "...", "comment": "..."},
  {"itemKey": "businessFlow", "status": "...", "comment": "..."},
  {"itemKey": "inputOutput", "status": "...", "comment": "..."},
  {"itemKey": "systemsTools", "status": "...", "comment": "..."},
  {"itemKey": "kpis", "status": "...", "comment": "..."},
  {"itemKey": "risksIssues", "status": "...", "comment": "..."},
  {"itemKey": "improvements", "status": "...", "comment": "..."}
]

## レビュー観点
- 各項目が具体的で実行可能な内容か
- 項目間の整合性（例：ステークホルダーが業務フローに登場するか）
- 曖昧な表現や抽象的な記述がないか
- 測定可能なKPIが設定されているか
- リスクに対する対策が明記されているか`,
          temperature: 0.3,
          maxTokens: 2000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const output = data.output || "";

        // JSON配列を抽出
        const jsonMatch = output.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const results = JSON.parse(jsonMatch[0]) as ItemReviewResult[];
            setReviewResults(results);
            setShowReviewResults(true);
          } catch (parseError) {
            console.error("Failed to parse review results:", parseError);
          }
        }
      }
    } catch (error) {
      console.error("Failed to review job description:", error);
    } finally {
      setIsReviewing(false);
    }
  };

  // レビュー結果に基づいてAIヒアリングを開始
  const [reviewDeepDiveItem, setReviewDeepDiveItem] = useState<string | null>(
    null,
  );
  const [isUpdatingMarkdown, setIsUpdatingMarkdown] = useState(false);

  const handleReviewChat = (itemKey: string) => {
    const result = reviewResults.find((r) => r.itemKey === itemKey);
    if (!result) return;

    const itemTitle = itemKeyToTitle[itemKey as DeepDiveItemKey] || itemKey;
    const message: ChatMessage = {
      role: "assistant",
      content: `【${itemTitle}のレビュー結果】\n\n${result.comment}\n\nこの点について詳しく教えていただけますか？追加情報があれば、業務分掌を改善できます。`,
      timestamp: new Date().toISOString(),
    };

    setChatMessages([...chatMessages, message]);
    setReviewDeepDiveItem(itemKey);
    setShowReviewResults(false);
  };

  // レビュー深掘り後にマークダウンを更新
  const handleUpdateMarkdownFromChat = async () => {
    if (!process || !reviewDeepDiveItem) return;

    setIsUpdatingMarkdown(true);
    try {
      const itemTitle =
        itemKeyToTitle[reviewDeepDiveItem as DeepDiveItemKey] ||
        reviewDeepDiveItem;

      // 直近のチャット内容を取得（レビュー開始後のメッセージ）
      const recentMessages = chatMessages.slice(-10);
      const conversationText = recentMessages
        .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
        .join("\n\n");

      const response = await fetch("/api/ai/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: `## 現在の業務分掌\n${process.jobDescriptionMd}\n\n## 「${itemTitle}」に関する追加情報\n${conversationText}`,
          systemPrompt: `既存の業務分掌マークダウンに、チャットで得られた追加情報を反映してください。

## ルール
1. 既存のマークダウン構造は維持する
2. 「${itemTitle}」セクションを中心に、関連する部分を更新・拡充する
3. 追加情報で得られた具体的な内容（数値、計画、優先度など）を反映する
4. 他のセクションへの影響があれば、整合性を保つように調整する
5. マークダウン形式で出力する（説明文は不要、マークダウンのみ）`,
          temperature: 0.3,
          maxTokens: 4000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedMarkdown = data.output || "";

        if (updatedMarkdown.trim()) {
          await updateProcess({ jobDescriptionMd: updatedMarkdown });
          setReviewDeepDiveItem(null);
          // レビュー結果をクリア（更新されたので再レビューが必要）
          setReviewResults([]);
          alert(
            language === "ja"
              ? "業務分掌を更新しました"
              : "Job description updated",
          );
        }
      }
    } catch (error) {
      console.error("Failed to update markdown:", error);
      alert(language === "ja" ? "更新に失敗しました" : "Failed to update");
    } finally {
      setIsUpdatingMarkdown(false);
    }
  };

  // レビュー結果を取得
  const getReviewResult = (itemKey: string): ItemReviewResult | undefined => {
    return reviewResults.find((r) => r.itemKey === itemKey);
  };

  // ====================================================================
  // 深掘りモード
  // ====================================================================
  const itemKeyToTitle: Record<DeepDiveItemKey, string> = {
    purpose: t.itemPurpose,
    responsibility: t.itemResponsibility,
    stakeholders: t.itemStakeholders,
    businessFlow: t.itemBusinessFlow,
    inputOutput: t.itemInputOutput,
    systemsTools: t.itemSystemsTools,
    kpis: t.itemKPIs,
    risksIssues: t.itemRisksIssues,
    improvements: t.itemImprovements,
  };

  // Note: Deep dive機能の開始関数（将来の拡張用に保持）
  const _handleStartDeepDive = (itemKey: DeepDiveItemKey) => {
    setDeepDiveItem(itemKey);
    // 深掘り開始メッセージ
    const itemTitle = itemKeyToTitle[itemKey];
    const currentValue = getItemValue(itemKey);
    const initialMessage: ChatMessage = {
      role: "assistant",
      content:
        language === "ja"
          ? `「${itemTitle}」についてさらに詳しくヒアリングします。\n\n**現在の内容:**\n${currentValue || "未設定"}\n\n${getDeepDiveQuestion(itemKey)}`
          : `Let's discuss "${itemTitle}" in more detail.\n\n**Current content:**\n${currentValue || "Not set"}\n\n${getDeepDiveQuestion(itemKey)}`,
      timestamp: new Date().toISOString(),
    };
    setDeepDiveMessages([initialMessage]);
  };

  const getItemValue = (itemKey: DeepDiveItemKey): string => {
    if (!process) return "";
    switch (itemKey) {
      case "purpose":
        return process.purpose || "";
      case "responsibility":
        return [
          process.responsibleDepartment &&
            `担当部署: ${process.responsibleDepartment}`,
          process.responsiblePerson && `責任者: ${process.responsiblePerson}`,
          process.authority && `権限: ${process.authority}`,
        ]
          .filter(Boolean)
          .join("\n");
      case "stakeholders":
        return (
          process.stakeholders
            ?.map((s) => `- ${s.name}: ${s.role}`)
            .join("\n") || ""
        );
      case "businessFlow":
        return process.businessFlow || "";
      case "inputOutput": {
        const inputs =
          process.inputs?.map((i) => `[入力] ${i.name}`).join("\n") || "";
        const outputs =
          process.outputs?.map((o) => `[出力] ${o.name}`).join("\n") || "";
        return [inputs, outputs].filter(Boolean).join("\n");
      }
      case "systemsTools":
        return (
          process.systemsAndTools
            ?.map((s) => `- ${s.name}: ${s.purpose || ""}`)
            .join("\n") || ""
        );
      case "kpis":
        return (
          process.kpis
            ?.map((k) => `- ${k.name}: ${k.target || ""}${k.unit || ""}`)
            .join("\n") || ""
        );
      case "risksIssues":
        return (
          process.risksAndIssues
            ?.map((r) => `- ${r.type}: ${r.description}`)
            .join("\n") || ""
        );
      case "improvements":
        return (
          process.improvements
            ?.map((i) => `- ${i.title}: ${i.description}`)
            .join("\n") || ""
        );
      default:
        return "";
    }
  };

  const getDeepDiveQuestion = (itemKey: DeepDiveItemKey): string => {
    const reviewResult = getReviewResult(itemKey);
    const aiComment = reviewResult?.comment;

    if (aiComment) {
      return language === "ja"
        ? `**AIレビューコメント:** ${aiComment}\n\nこの点について詳しく教えていただけますか？`
        : `**AI Review Comment:** ${aiComment}\n\nCould you tell me more about this?`;
    }

    const questions: Record<DeepDiveItemKey, { ja: string; en: string }> = {
      purpose: {
        ja: "この業務の目的や背景について、もう少し具体的に教えていただけますか？特に、なぜこの業務が必要なのか、組織にどのような価値を提供しているかを知りたいです。",
        en: "Could you tell me more specifically about the purpose and background of this business? I'd like to know why this business is necessary and what value it provides to the organization.",
      },
      responsibility: {
        ja: "責任範囲についてもう少し詳しく教えてください。誰がどこまでの権限を持っているか、承認フローはどうなっていますか？",
        en: "Could you tell me more about the responsibility scope? Who has what authority, and what is the approval flow?",
      },
      stakeholders: {
        ja: "関係者について補足をお願いします。他に関わる部署や外部の関係者はいますか？それぞれどのような役割を担っていますか？",
        en: "Could you elaborate on the stakeholders? Are there other departments or external parties involved? What roles do they play?",
      },
      businessFlow: {
        ja: "業務フローについてもう少し詳しく教えてください。各ステップで誰が何をするのか、例外的なケースの処理はどうなっていますか？",
        en: "Could you tell me more about the business flow? What does each person do at each step, and how are exceptional cases handled?",
      },
      inputOutput: {
        ja: "インプット/アウトプットについて補足をお願いします。データの形式や品質要件、期限などはありますか？",
        en: "Could you elaborate on the inputs/outputs? Are there any format requirements, quality standards, or deadlines?",
      },
      systemsTools: {
        ja: "使用しているシステムやツールについてもう少し詳しく教えてください。どのような場面で使い、どんな課題がありますか？",
        en: "Could you tell me more about the systems and tools used? In what situations are they used, and what challenges exist?",
      },
      kpis: {
        ja: "KPIや成果指標について補足をお願いします。現在の達成状況や、測定方法、改善の取り組みはありますか？",
        en: "Could you elaborate on the KPIs and metrics? What is the current achievement status, how are they measured, and are there any improvement efforts?",
      },
      risksIssues: {
        ja: "リスクや課題についてもう少し詳しく教えてください。過去に問題が発生したことはありますか？対策は十分ですか？",
        en: "Could you tell me more about the risks and issues? Have there been problems in the past? Are the countermeasures sufficient?",
      },
      improvements: {
        ja: "改善提案について、優先度や実現可能性を含めてもう少し詳しく教えていただけますか？",
        en: "Could you elaborate on the improvements, including priority and feasibility?",
      },
    };

    return questions[itemKey][language];
  };

  const handleExitDeepDive = () => {
    setDeepDiveItem(null);
    setDeepDiveMessages([]);
  };

  const handleSendDeepDiveMessage = async () => {
    if (!inputMessage.trim() || isAiThinking || !deepDiveItem) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...deepDiveMessages, userMessage];
    setDeepDiveMessages(newMessages);
    setInputMessage("");
    setIsAiThinking(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const itemTitle = itemKeyToTitle[deepDiveItem];
      const currentJobDescription = `
業務名: ${process?.title}
業務概要・目的: ${process?.purpose || "未設定"}
担当部署: ${process?.responsibleDepartment || "未設定"}
責任者: ${process?.responsiblePerson || "未設定"}
権限: ${process?.authority || "未設定"}
ステークホルダー: ${process?.stakeholders?.map((s) => `${s.name}(${s.role})`).join(", ") || "未設定"}
業務フロー: ${process?.businessFlow || "未設定"}
インプット: ${process?.inputs?.map((i) => i.name).join(", ") || "未設定"}
アウトプット: ${process?.outputs?.map((o) => o.name).join(", ") || "未設定"}
使用システム・ツール: ${process?.systemsAndTools?.map((s) => s.name).join(", ") || "未設定"}
KPI: ${process?.kpis?.map((k) => k.name).join(", ") || "未設定"}
リスク・課題: ${process?.risksAndIssues?.map((r) => r.description).join(", ") || "未設定"}
改善提案: ${process?.improvements?.map((i) => i.title).join(", ") || "未設定"}
`.trim();

      const systemPrompt = `あなたは業務分掌の深掘りインタビュアーです。
現在「${itemTitle}」について深掘りヒアリングを行っています。

## 現在の業務分掌（コンテキスト）
${currentJobDescription}

## 深掘り対象
${itemTitle}: ${getItemValue(deepDiveItem) || "未設定"}

## ルール
- ユーザーの回答を受けて、さらに深掘りの質問をしてください
- 一度に1つの質問のみ
- 具体的な例や数値を引き出す質問を心がける
- 3-4回のやり取りで十分な情報が得られたら、「この内容で${itemTitle}を更新しましょうか？」と確認する
- 「はい」と言われたら、更新内容をJSON形式で提示する`;

      const apiMessages = newMessages
        .filter((_, i) => i > 0) // 最初のAIメッセージは除く
        .map((m) => ({ role: m.role, content: m.content }));

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
        setDeepDiveMessages([...newMessages, assistantMessage]);
      }
    } catch (error) {
      console.error("Failed to get AI response:", error);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleApplyDeepDiveChanges = async () => {
    if (!deepDiveItem || deepDiveMessages.length < 2) return;

    setIsUpdatingItem(true);
    try {
      const conversationText = deepDiveMessages
        .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
        .join("\n");

      const updatePrompt = getUpdatePromptForItem(deepDiveItem);

      const response = await fetch("/api/ai/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: conversationText,
          systemPrompt: updatePrompt,
          temperature: 0.3,
          maxTokens: 2000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const output = data.output || "";

        // JSONを抽出
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const updateData = JSON.parse(jsonMatch[0]);
            await updateProcess(updateData);
            handleExitDeepDive();
            // レビュー結果をクリア（再レビューが必要）
            setReviewResults([]);
          } catch (parseError) {
            console.error("Failed to parse update data:", parseError);
          }
        }
      }
    } catch (error) {
      console.error("Failed to apply changes:", error);
    } finally {
      setIsUpdatingItem(false);
    }
  };

  const getUpdatePromptForItem = (itemKey: DeepDiveItemKey): string => {
    const basePrompt = `以下の会話から、業務分掌の更新データを抽出してJSON形式で出力してください。
説明文は不要で、JSONのみを出力してください。`;

    const itemPrompts: Record<DeepDiveItemKey, string> = {
      purpose: `${basePrompt}\n\n出力形式: {"purpose": "更新された業務概要・目的"}`,
      responsibility: `${basePrompt}\n\n出力形式: {"responsibleDepartment": "担当部署", "responsiblePerson": "責任者", "authority": "権限範囲"}`,
      stakeholders: `${basePrompt}\n\n出力形式: {"stakeholders": [{"name": "名前", "role": "役割", "department": "所属"}], "actors": [{"id": "actor1", "name": "名前", "department": "所属"}]}`,
      businessFlow: `${basePrompt}\n\n出力形式: {"businessFlow": "更新された業務フロー（マークダウン形式）"}`,
      inputOutput: `${basePrompt}\n\n出力形式: {"inputs": [{"name": "入力名", "description": "説明", "source": "入力元"}], "outputs": [{"name": "出力名", "description": "説明", "destination": "出力先"}]}`,
      systemsTools: `${basePrompt}\n\n出力形式: {"systemsAndTools": [{"name": "システム名", "purpose": "用途", "url": "URL"}]}`,
      kpis: `${basePrompt}\n\n出力形式: {"kpis": [{"name": "KPI名", "target": "目標値", "unit": "単位", "frequency": "測定頻度"}]}`,
      risksIssues: `${basePrompt}\n\n出力形式: {"risksAndIssues": [{"type": "種類", "description": "説明", "impact": "影響", "mitigation": "対策"}]}`,
      improvements: `${basePrompt}\n\n出力形式: {"improvements": [{"title": "タイトル", "description": "説明", "priority": "優先度", "expectedBenefit": "期待効果"}]}`,
    };

    return itemPrompts[itemKey];
  };

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

      {/* Process Info Card with Step Progress - Collapsible */}
      <CollapsiblePanel defaultOpen={true}>
        <CollapsiblePanelHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CollapsiblePanelTitle className="text-2xl mb-2">
                {process.title}
              </CollapsiblePanelTitle>
              <CollapsiblePanelDescription className="flex items-center gap-3 flex-wrap mt-0">
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
              </CollapsiblePanelDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
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
        </CollapsiblePanelHeader>

        {/* Summary shown when collapsed */}
        <CollapsiblePanelSummary>
          <div className="flex items-center justify-between gap-4 px-6 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {stepStatuses.map((status, index) => (
                    <div
                      key={index}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 border-background ${
                        status === "completed"
                          ? "bg-amber-500 text-white"
                          : status === "current"
                            ? "bg-white dark:bg-gray-800 border-amber-500 text-amber-500"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                      }`}
                    >
                      {status === "completed" ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        index + 1
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {stepStatuses.filter((s) => s === "completed").length}/
                  {steps.length} {t.stepCompleted}
                </span>
              </div>
            </div>
            {currentStepIndex >= 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm">
                <span className="font-medium">{t.nextAction}:</span>
                <span>{steps[currentStepIndex].action}</span>
              </div>
            )}
          </div>
        </CollapsiblePanelSummary>

        <CollapsiblePanelContent>
          {/* Next Action Banner */}
          {currentStepIndex >= 0 && (
            <div className="flex items-center justify-end mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm">
                <span className="font-medium">{t.nextAction}:</span>
                <span>{steps[currentStepIndex].action}</span>
              </div>
            </div>
          )}

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
                  <div
                    key={index}
                    className="flex flex-col items-center relative z-10 flex-1"
                  >
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
                          {isSaving || isOrganizing ? (
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.desc}
                    </p>

                    {status === "current" && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleStepAction(index)}
                        disabled={isSaving || isOrganizing}
                      >
                        {isSaving || isOrganizing ? (
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
        </CollapsiblePanelContent>
      </CollapsiblePanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Hearing Chat / Deep Dive Mode */}
        <div
          className={`bg-card rounded-xl shadow-sm border flex flex-col h-[500px] ${deepDiveItem ? "ring-2 ring-amber-500" : ""}`}
        >
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              {deepDiveItem ? (
                <>
                  <Search className="w-5 h-5 text-amber-600" />
                  <h2 className="font-semibold">{t.deepDiveMode}</h2>
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    {itemKeyToTitle[deepDiveItem]}
                  </span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                  <h2 className="font-semibold">{t.aiHearing}</h2>
                </>
              )}
            </div>
            {deepDiveItem ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExitDeepDive}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                {t.exitDeepDive}
              </Button>
            ) : (
              chatMessages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRestartHearing}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {t.restartHearing}
                </Button>
              )
            )}
          </div>

          {/* Deep Dive Mode Content */}
          {deepDiveItem ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {deepDiveMessages.map((message, index) => (
                  <div
                    key={`deep-${message.timestamp}-${index}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-amber-600 text-white"
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
              </div>
              <div className="p-4 border-t">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !isComposing) {
                          e.preventDefault();
                          handleSendDeepDiveMessage();
                        }
                      }}
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
                    onClick={handleSendDeepDiveMessage}
                    disabled={!inputMessage.trim() || isAiThinking}
                    className="h-12 w-12 rounded-xl flex-shrink-0 bg-amber-600 hover:bg-amber-700"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                {deepDiveMessages.length >= 4 && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleExitDeepDive}
                    >
                      {t.discardChanges}
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                      onClick={handleApplyDeepDiveChanges}
                      disabled={isUpdatingItem}
                    >
                      {isUpdatingItem ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-1" />
                      )}
                      {isUpdatingItem ? t.updatingItem : t.applyChanges}
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Normal AI Hearing Mode */
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {t.hearingDescription}
                    </p>
                    <Button
                      variant="primary"
                      className="mt-4"
                      onClick={() => {
                        const initialMessage = createInitialHearingMessage(
                          process.title,
                        );
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
                  {(chatMessages.length >= 8 ||
                    chatMessages.some((m) =>
                      m.content.includes("ヒアリング完了"),
                    )) &&
                    !hasJobDescription() && (
                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={handleOrganizeJobDescription}
                        disabled={isOrganizing}
                      >
                        {isOrganizing ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : null}
                        {isOrganizing
                          ? t.organizingJobDescription
                          : t.organizeJobDescription}
                      </Button>
                    )}
                  {/* レビュー深掘り後の更新ボタン */}
                  {reviewDeepDiveItem && hasJobDescription() && (
                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                        {language === "ja"
                          ? `「${itemKeyToTitle[reviewDeepDiveItem as DeepDiveItemKey] || reviewDeepDiveItem}」の追加情報を業務分掌に反映しますか？`
                          : `Apply the additional information about "${itemKeyToTitle[reviewDeepDiveItem as DeepDiveItemKey] || reviewDeepDiveItem}" to the job description?`}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={handleUpdateMarkdownFromChat}
                          disabled={isUpdatingMarkdown}
                        >
                          {isUpdatingMarkdown ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 mr-1" />
                          )}
                          {language === "ja"
                            ? "業務分掌を更新"
                            : "Update Job Description"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReviewDeepDiveItem(null)}
                          disabled={isUpdatingMarkdown}
                        >
                          {language === "ja" ? "キャンセル" : "Cancel"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Job Description (業務分掌) */}
        <div className="bg-card rounded-xl shadow-sm border flex flex-col h-[500px]">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold">{t.jobDescription}</h2>
              {/* 編集モードインジケーター */}
              {isEditMode && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  {t.editMode}
                </span>
              )}
              {/* レビュー結果サマリー（クリックで表示切替） */}
              {!isEditMode && reviewResults.length > 0 && (
                <button
                  onClick={() => setShowReviewResults(!showReviewResults)}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  ({reviewResults.filter((r) => r.status !== "complete").length}{" "}
                  {t.issuesFound})
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasJobDescription() && !isEditMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEditMode}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    {t.editModeOn}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReviewJobDescription}
                    disabled={isReviewing}
                  >
                    {isReviewing ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-1" />
                    )}
                    {isReviewing ? t.reviewing : t.reviewJobDescription}
                  </Button>
                </>
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
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {hasJobDescription() ? (
              isEditMode ? (
                /* 編集モード（マークダウン） */
                <textarea
                  className="w-full h-full p-3 border rounded-md text-sm bg-background resize-none font-mono"
                  value={editMarkdown}
                  onChange={(e) => setEditMarkdown(e.target.value)}
                  placeholder={
                    language === "ja"
                      ? "マークダウン形式で業務分掌を記述..."
                      : "Write job description in markdown..."
                  }
                />
              ) : showReviewResults && reviewResults.length > 0 ? (
                /* レビュー結果表示 */
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">
                      {language === "ja" ? "レビュー結果" : "Review Results"}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReviewResults(false)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      {language === "ja" ? "閉じる" : "Close"}
                    </Button>
                  </div>
                  {reviewResults.map((result) => {
                    const itemTitle =
                      itemKeyToTitle[result.itemKey as DeepDiveItemKey] ||
                      result.itemKey;
                    const statusConfig = {
                      complete: {
                        icon: CheckCircle2,
                        color: "text-green-600 dark:text-green-400",
                        bg: "bg-green-50 dark:bg-green-900/20",
                        label: language === "ja" ? "完了" : "Complete",
                      },
                      needs_attention: {
                        icon: AlertCircle,
                        color: "text-yellow-600 dark:text-yellow-400",
                        bg: "bg-yellow-50 dark:bg-yellow-900/20",
                        label: language === "ja" ? "要確認" : "Needs Attention",
                      },
                      incomplete: {
                        icon: XCircle,
                        color: "text-red-600 dark:text-red-400",
                        bg: "bg-red-50 dark:bg-red-900/20",
                        label: language === "ja" ? "不足" : "Incomplete",
                      },
                    };
                    const config =
                      statusConfig[result.status] ||
                      statusConfig.needs_attention;
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={result.itemKey}
                        className={`p-3 rounded-lg border ${config.bg}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <StatusIcon
                              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {itemTitle}
                                </span>
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${config.color} ${config.bg}`}
                                >
                                  {config.label}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {result.comment}
                              </p>
                            </div>
                          </div>
                          {result.status !== "complete" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0"
                              onClick={() => handleReviewChat(result.itemKey)}
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1" />
                              <span className="text-xs">
                                {language === "ja" ? "深掘り" : "Discuss"}
                              </span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 表示モード（マークダウン） */
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {process.jobDescriptionMd || ""}
                  </ReactMarkdown>
                </div>
              )
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
