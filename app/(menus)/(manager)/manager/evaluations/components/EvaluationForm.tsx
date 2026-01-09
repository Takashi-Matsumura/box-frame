"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Target,
  TrendingUp,
  Award,
  Trophy,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  User,
  Loader2,
  Cloud,
  CloudOff,
  Bot,
  ChevronLeft,
} from "lucide-react";
import { evaluationsTranslations } from "../translations";
import { ProcessEvaluationSupport } from "./ProcessEvaluationSupport";
import { GrowthEvaluationSupport } from "./GrowthEvaluationSupport";
import { EvaluationAIAssistant } from "./EvaluationAIAssistant";

interface ProcessCategory {
  id: string;
  name: string;
  nameEn: string | null;
  categoryCode: string;
  description: string | null;
  minItemCount: number;
  scores: string;
}

interface GrowthCategory {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  coefficient: number;
  scoreT1: number;
  scoreT2: number;
  scoreT3: number;
  scoreT4: number;
}

interface EvaluationData {
  id: string;
  status: string;
  score1: number | null;
  score2: number | null;
  score3: number | null;
  processScores: Record<string, number> | null;
  growthCategoryId: string | null;
  growthLevel: number | null;
  finalScore: number | null;
  finalGrade: string | null;
  evaluatorComment: string | null;
  employee: {
    id: string;
    employeeNumber: string;
    lastName: string;
    firstName: string;
    lastNameEn: string | null;
    firstNameEn: string | null;
    position: string | null;
    qualificationGrade: string | null;
    department: { name: string } | null;
    section: { name: string } | null;
    course: { name: string } | null;
    birthDate: string | null;
    joinDate: string | null;
  };
  weights: {
    resultsWeight: number;
    processWeight: number;
    growthWeight: number;
  };
  organizationGoal: {
    targetValue: number;
    actualValue: number | null;
    achievementRate: number | null;
    linkedOrganizationName?: string;
  } | null;
  processCategories: ProcessCategory[];
  growthCategories: GrowthCategory[];
}

interface EvaluationFormProps {
  language: "en" | "ja";
  evaluationId: string;
  periodId: string;
  onBack: () => void;
}

type ActivePanel = "results" | "process" | "growth" | "final" | null;

// 年齢計算ヘルパー
function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// 勤続年数計算ヘルパー
function calculateTenure(joinDate: string | null, language: "en" | "ja"): string | null {
  if (!joinDate) return null;
  const join = new Date(joinDate);
  const today = new Date();
  const years = today.getFullYear() - join.getFullYear();
  const months = today.getMonth() - join.getMonth();
  const totalMonths = years * 12 + months;
  const finalYears = Math.floor(totalMonths / 12);
  const finalMonths = totalMonths % 12;

  if (language === "ja") {
    if (finalYears > 0 && finalMonths > 0) return `${finalYears}年${finalMonths}ヶ月`;
    if (finalYears > 0) return `${finalYears}年`;
    return `${finalMonths}ヶ月`;
  } else {
    if (finalYears > 0 && finalMonths > 0) return `${finalYears}y ${finalMonths}m`;
    if (finalYears > 0) return `${finalYears}y`;
    return `${finalMonths}m`;
  }
}

// スコア範囲の型
interface ScoreRange {
  min: number;
  max: number;
}

// ProcessCategoryとGrowthCategoryからスコア範囲を計算
function calculateScoreRange(
  processCategories: ProcessCategory[],
  growthCategories: GrowthCategory[]
): ScoreRange {
  let minScore = Number.POSITIVE_INFINITY;
  let maxScore = Number.NEGATIVE_INFINITY;

  // ProcessCategoryのスコア範囲を計算
  for (const category of processCategories) {
    try {
      const scores = JSON.parse(category.scores) as Record<string, number>;
      for (const score of Object.values(scores)) {
        if (typeof score === "number" && !Number.isNaN(score)) {
          minScore = Math.min(minScore, score);
          maxScore = Math.max(maxScore, score);
        }
      }
    } catch {
      // パースエラーは無視
    }
  }

  // GrowthCategoryのスコア範囲を計算（係数は適用しない）
  // 係数は成長評価の個別スコア計算時のみ使用し、スコア範囲には影響させない
  for (const category of growthCategories) {
    const scores = [
      category.scoreT1,
      category.scoreT2,
      category.scoreT3,
      category.scoreT4,
    ];
    for (const score of scores) {
      if (!Number.isNaN(score)) {
        minScore = Math.min(minScore, score);
        maxScore = Math.max(maxScore, score);
      }
    }
  }

  // データがない場合はデフォルト値（ドキュメント記載のスケール）
  if (!Number.isFinite(minScore) || !Number.isFinite(maxScore)) {
    return { min: 50, max: 130 };
  }

  return { min: minScore, max: maxScore };
}

// 達成率から結果評価スコアを計算
function calculateResultsScore(achievementRate: number, scoreRange: ScoreRange): number {
  const { min, max } = scoreRange;
  const range = max - min;

  let normalizedScore: number;

  if (achievementRate < 80) {
    normalizedScore = min + (achievementRate / 80) * (range * 0.25);
  } else if (achievementRate < 100) {
    const ratio = (achievementRate - 80) / 20;
    normalizedScore = min + range * 0.25 + ratio * (range * 0.25);
  } else if (achievementRate < 120) {
    const ratio = (achievementRate - 100) / 20;
    normalizedScore = min + range * 0.5 + ratio * (range * 0.25);
  } else {
    const ratio = Math.min((achievementRate - 120) / 40, 1);
    normalizedScore = min + range * 0.75 + ratio * (range * 0.25);
  }

  return Math.round(Math.min(Math.max(normalizedScore, min), max) * 10) / 10;
}

// スコア範囲を考慮したグレード判定
function determineGradeWithRange(score: number, scoreRange: ScoreRange): string {
  const { min, max } = scoreRange;
  const range = max - min;

  if (range === 0) return "B";

  const relativePosition = (score - min) / range;

  if (relativePosition >= 0.9) return "S";
  if (relativePosition >= 0.7) return "A";
  if (relativePosition >= 0.5) return "B";
  if (relativePosition >= 0.3) return "C";
  return "D";
}

// スコア変換テーブルを生成（範囲表示）
function generateScoreConversionTable(scoreRange: ScoreRange): Array<{ rate: string; score: string }> {
  const { min, max } = scoreRange;
  const range = max - min;

  const score160 = Math.round(max * 10) / 10;
  const score120 = Math.round((min + range * 0.75) * 10) / 10;
  const score100 = Math.round((min + range * 0.5) * 10) / 10;
  const score80 = Math.round((min + range * 0.25) * 10) / 10;
  const scoreMin = Math.round(min * 10) / 10;

  return [
    { rate: "160%〜", score: `${score160}` },
    { rate: "120%〜159%", score: `${score120}〜${score160 - 0.1}` },
    { rate: "100%〜119%", score: `${score100}〜${score120 - 0.1}` },
    { rate: "80%〜99%", score: `${score80}〜${score100 - 0.1}` },
    { rate: "〜79%", score: `${scoreMin}〜${score80 - 0.1}` },
  ];
}

interface Project {
  id: string;
  name: string;
  checks: Record<string, boolean>;
  achievement: string;
}

// スコアカードコンポーネント
function ScoreCard({
  title,
  weight,
  score,
  weightedScore,
  isActive,
  onClick,
  variant,
  icon: Icon,
  isComplete,
}: {
  title: string;
  weight: number;
  score: number;
  weightedScore: number;
  isActive: boolean;
  onClick: () => void;
  variant: "blue" | "green" | "purple";
  icon: React.ComponentType<{ className?: string }>;
  isComplete: boolean;
}) {
  const variantStyles = {
    blue: {
      icon: "text-blue-500 dark:text-blue-400",
      score: "text-blue-600 dark:text-blue-400",
      activeBorder: "ring-2 ring-blue-500 dark:ring-blue-400",
    },
    green: {
      icon: "text-green-500 dark:text-green-400",
      score: "text-green-600 dark:text-green-400",
      activeBorder: "ring-2 ring-green-500 dark:ring-green-400",
    },
    purple: {
      icon: "text-purple-500 dark:text-purple-400",
      score: "text-purple-600 dark:text-purple-400",
      activeBorder: "ring-2 ring-purple-500 dark:ring-purple-400",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isActive ? `${styles.activeBorder} shadow-md` : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${styles.icon}`} />
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
          </div>
          {isComplete ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-yellow-500" />
          )}
        </div>
        <div className="text-center py-2">
          <p className={`text-2xl font-bold ${styles.score}`}>
            {score > 0 ? score.toFixed(1) : "-"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ×{weight}% = <span className="font-medium">{weightedScore.toFixed(2)}</span>
          </p>
        </div>
        <div className="flex items-center justify-center">
          {isActive ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 最終スコアカード
function FinalScoreCard({
  score,
  grade,
  isActive,
  onClick,
  isAllComplete,
  language,
}: {
  score: number;
  grade: string;
  isActive: boolean;
  onClick: () => void;
  isAllComplete: boolean;
  language: "en" | "ja";
}) {
  const getGradeVariant = (g: string) => {
    switch (g) {
      case "S":
        return "default";
      case "A":
        return "default";
      case "B":
        return "secondary";
      case "C":
        return "outline";
      case "D":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isActive ? "ring-2 ring-amber-500 dark:ring-amber-400 shadow-md" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="text-sm font-medium text-muted-foreground">
              {language === "ja" ? "最終スコア" : "Final Score"}
            </span>
          </div>
          {isAllComplete ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-yellow-500" />
          )}
        </div>
        <div className="text-center py-2">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {score > 0 ? score.toFixed(2) : "-"}
          </p>
          <Badge variant={getGradeVariant(grade)} className="mt-2">
            {grade || "-"}
          </Badge>
        </div>
        <div className="flex items-center justify-center">
          {isActive ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EvaluationForm({
  language,
  evaluationId,
  periodId,
  onBack,
}: EvaluationFormProps) {
  const t = evaluationsTranslations[language];
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  // オートセーブ用state
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Form state
  const [score1, setScore1] = useState<number>(0);
  const [score2, setScore2] = useState<number>(0);
  const [score3, setScore3] = useState<number>(0);
  const [processProjects, setProcessProjects] = useState<Project[]>([]);
  const [growthCategoryId, setGrowthCategoryId] = useState<string>("");
  const [growthLevel, setGrowthLevel] = useState<string>("T2");
  const [evaluatorComment, setEvaluatorComment] = useState("");

  // AIアシスタント用state（デフォルトは折りたたみ）
  const [aiAssistantExpanded, setAiAssistantExpanded] = useState(false);

  const fetchEvaluation = useCallback(async () => {
    try {
      const res = await fetch(`/api/evaluation/${evaluationId}`);
      if (res.ok) {
        const data: EvaluationData = await res.json();
        setEvaluation(data);

        // Initialize form state from saved data
        if (data.score1) setScore1(data.score1);
        if (data.score2) setScore2(data.score2);
        if (data.score3) setScore3(data.score3);
        if (data.growthCategoryId) setGrowthCategoryId(data.growthCategoryId);
        if (data.growthLevel) {
          const levelMap: Record<number, string> = { 1: "T1", 2: "T2", 3: "T3", 4: "T4" };
          setGrowthLevel(levelMap[data.growthLevel] || "T2");
        }
        if (data.evaluatorComment) setEvaluatorComment(data.evaluatorComment);

        // プロセス評価データを復元
        if (data.processScores && typeof data.processScores === "object") {
          // processScoresがProcess[]形式で保存されている場合
          const savedProcesses = data.processScores as unknown;
          if (Array.isArray(savedProcesses) && savedProcesses.length > 0) {
            setProcessProjects(savedProcesses as Project[]);
          }
        }

        // Calculate results score if not saved
        if (!data.score1 && data.organizationGoal?.achievementRate) {
          const rate = data.organizationGoal.achievementRate;
          const range = calculateScoreRange(data.processCategories, data.growthCategories);
          const calculatedScore = calculateResultsScore(rate, range);
          setScore1(calculatedScore);
        }
      }
    } catch (error) {
      console.error("Failed to fetch evaluation:", error);
    } finally {
      setLoading(false);
    }
  }, [evaluationId]);

  useEffect(() => {
    fetchEvaluation();
  }, [fetchEvaluation]);

  const getEmployeeName = (employee: EvaluationData["employee"]) => {
    if (language === "en" && employee.lastNameEn && employee.firstNameEn) {
      return `${employee.firstNameEn} ${employee.lastNameEn}`;
    }
    return `${employee.lastName} ${employee.firstName}`;
  };

  // スコア範囲を計算（ProcessCategory/GrowthCategoryから）
  const scoreRange = useMemo(() => {
    if (!evaluation) return { min: 50, max: 130 };
    return calculateScoreRange(evaluation.processCategories, evaluation.growthCategories);
  }, [evaluation]);

  // スコア変換テーブル
  const scoreConversionTable = useMemo(() => {
    return generateScoreConversionTable(scoreRange);
  }, [scoreRange]);

  // Calculate weighted scores
  const weightedScore1 = useMemo(() => {
    if (!evaluation) return 0;
    return (score1 * evaluation.weights.resultsWeight) / 100;
  }, [score1, evaluation]);

  const weightedScore2 = useMemo(() => {
    if (!evaluation) return 0;
    return (score2 * evaluation.weights.processWeight) / 100;
  }, [score2, evaluation]);

  const weightedScore3 = useMemo(() => {
    if (!evaluation) return 0;
    return (score3 * evaluation.weights.growthWeight) / 100;
  }, [score3, evaluation]);

  const finalScore = useMemo(() => {
    return weightedScore1 + weightedScore2 + weightedScore3;
  }, [weightedScore1, weightedScore2, weightedScore3]);

  const finalGrade = useMemo(() => {
    return determineGradeWithRange(finalScore, scoreRange);
  }, [finalScore, scoreRange]);

  // Completion status
  const isScore1Complete = score1 > 0;
  const isScore2Complete = score2 > 0;
  const isScore3Complete = score3 > 0 && growthCategoryId !== "";
  const isAllComplete = isScore1Complete && isScore2Complete && isScore3Complete;

  const handlePanelClick = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const handleProcessScoreCalculated = useCallback(
    (score: number, projects: Project[]) => {
      setScore2(score);
      setProcessProjects(projects);
    },
    []
  );

  const handleGrowthScoreCalculated = useCallback(
    (score: number, categoryId: string, level: string) => {
      setScore3(score);
      setGrowthCategoryId(categoryId);
      setGrowthLevel(level);
    },
    []
  );

  // オートセーブ実行関数
  const performAutoSave = useCallback(async () => {
    if (!evaluation || evaluation.status === "COMPLETED" || evaluation.status === "CONFIRMED") {
      return;
    }

    setAutoSaveStatus("saving");
    try {
      const levelMap: Record<string, number> = { T1: 1, T2: 2, T3: 3, T4: 4 };
      const numericLevel = levelMap[growthLevel] || 2;

      const res = await fetch(`/api/evaluation/${evaluationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score1,
          score2,
          score3,
          processScores: processProjects, // プロセス詳細データを保存
          growthCategoryId,
          growthLevel: numericLevel,
          finalScore,
          finalGrade,
          evaluatorComment,
          status: "IN_PROGRESS",
        }),
      });

      if (res.ok) {
        setAutoSaveStatus("saved");
        // 3秒後にステータスをリセット
        setTimeout(() => setAutoSaveStatus("idle"), 3000);
      } else {
        setAutoSaveStatus("error");
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
      setAutoSaveStatus("error");
    }
  }, [evaluation, evaluationId, score1, score2, score3, processProjects, growthCategoryId, growthLevel, finalScore, finalGrade, evaluatorComment]);

  // デバウンス付きオートセーブトリガー
  const triggerAutoSave = useCallback(() => {
    if (!isInitializedRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 2000); // 2秒後に保存
  }, [performAutoSave]);

  // データ変更時にオートセーブをトリガー
  useEffect(() => {
    if (isInitializedRef.current) {
      triggerAutoSave();
    }
  }, [score1, score2, score3, processProjects, growthCategoryId, growthLevel, evaluatorComment, triggerAutoSave]);

  // 初期化完了をマーク（初回ロード時のオートセーブを防ぐ）
  useEffect(() => {
    if (evaluation && !isInitializedRef.current) {
      // 少し遅延させて初期化完了をマーク
      const timer = setTimeout(() => {
        isInitializedRef.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [evaluation]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // AIアシスタント用の社員情報を構築
  const buildEmployeeInfo = () => {
    if (!evaluation) return "";
    const emp = evaluation.employee;
    const lines = [];
    lines.push(`${language === "ja" ? "氏名" : "Name"}: ${getEmployeeName(emp)}`);
    if (emp.position) lines.push(`${language === "ja" ? "役職" : "Position"}: ${emp.position}`);
    if (emp.qualificationGrade) lines.push(`${language === "ja" ? "等級" : "Grade"}: ${emp.qualificationGrade}`);
    if (emp.department) lines.push(`${language === "ja" ? "所属" : "Department"}: ${emp.department.name}`);
    return lines.join("\n");
  };

  if (loading || !evaluation) {
    return (
      <div className="max-w-5xl mx-auto mt-8">
        <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
      </div>
    );
  }

  const isReadOnly = evaluation.status === "COMPLETED" || evaluation.status === "CONFIRMED";

  return (
    <div className="relative h-[calc(100vh-8rem)]">
      {/* 評価フォーム（常にフル幅） */}
      <div className="h-full overflow-y-auto pr-2 max-w-5xl mx-auto">
        <div className="space-y-4 py-4 px-0.5">
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.back}
        </Button>

      {/* Employee Info Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{getEmployeeName(evaluation.employee)}</h2>
              <p className="text-sm text-muted-foreground">
                {evaluation.employee.position && `${evaluation.employee.position} / `}
                {evaluation.employee.department?.name || "-"}
                {evaluation.employee.section && ` / ${evaluation.employee.section.name}`}
                {evaluation.employee.course && ` / ${evaluation.employee.course.name}`}
              </p>
            </div>
            <div className="flex items-center gap-6">
              {/* 年齢・勤続年数 */}
              {(evaluation.employee.birthDate || evaluation.employee.joinDate) && (
                <div className="flex items-center gap-4 text-sm">
                  {evaluation.employee.birthDate && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">{language === "ja" ? "年齢" : "Age"}</p>
                      <p className="font-medium">{calculateAge(evaluation.employee.birthDate)}{language === "ja" ? "歳" : ""}</p>
                    </div>
                  )}
                  {evaluation.employee.joinDate && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">{language === "ja" ? "勤続" : "Tenure"}</p>
                      <p className="font-medium">{calculateTenure(evaluation.employee.joinDate, language)}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t.employeeNumber}</p>
                <p className="font-mono text-sm">{evaluation.employee.employeeNumber}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Cards */}
      <div className="grid grid-cols-4 gap-3">
        <ScoreCard
          title={language === "ja" ? "結果評価" : "Results"}
          weight={evaluation.weights.resultsWeight}
          score={score1}
          weightedScore={weightedScore1}
          isActive={activePanel === "results"}
          onClick={() => handlePanelClick("results")}
          variant="blue"
          icon={Target}
          isComplete={isScore1Complete}
        />
        <ScoreCard
          title={language === "ja" ? "プロセス評価" : "Process"}
          weight={evaluation.weights.processWeight}
          score={score2}
          weightedScore={weightedScore2}
          isActive={activePanel === "process"}
          onClick={() => handlePanelClick("process")}
          variant="green"
          icon={TrendingUp}
          isComplete={isScore2Complete}
        />
        <ScoreCard
          title={language === "ja" ? "成長評価" : "Growth"}
          weight={evaluation.weights.growthWeight}
          score={score3}
          weightedScore={weightedScore3}
          isActive={activePanel === "growth"}
          onClick={() => handlePanelClick("growth")}
          variant="purple"
          icon={Award}
          isComplete={isScore3Complete}
        />
        <FinalScoreCard
          score={finalScore}
          grade={finalGrade}
          isActive={activePanel === "final"}
          onClick={() => handlePanelClick("final")}
          isAllComplete={isAllComplete}
          language={language}
        />
      </div>

      {/* Expandable Panels */}
      {activePanel === "results" && (
        <Card className="animate-in slide-in-from-top-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              {language === "ja" ? "結果評価の算定根拠" : "Results Evaluation Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 説明文 */}
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {language === "ja"
                ? "結果評価は、評価期間終了後に実績が確定した段階で、期末時点の達成率が管理者によってシステムに登録されます。評価者が個別に入力する必要はありません。"
                : "Results evaluation is determined by the achievement rate at the end of the period, which is registered in the system by administrators after the actual results are finalized."}
            </p>
            {evaluation.organizationGoal ? (
              <>
                {/* 紐付け先表示（間接部門の場合） */}
                {evaluation.organizationGoal.linkedOrganizationName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span>{language === "ja" ? "紐付け先:" : "Linked to:"}</span>
                    <span className="font-medium text-foreground">
                      {evaluation.organizationGoal.linkedOrganizationName}
                    </span>
                  </div>
                )}
                {/* 目標と実績 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? "目標" : "Target"}
                    </p>
                    <p className="text-2xl font-bold">
                      {evaluation.organizationGoal.targetValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? "実績" : "Actual"}
                    </p>
                    <p className="text-2xl font-bold">
                      {evaluation.organizationGoal.actualValue?.toLocaleString() || "-"}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? "達成率" : "Achievement Rate"}
                    </p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {evaluation.organizationGoal.achievementRate
                        ? `${evaluation.organizationGoal.achievementRate.toFixed(1)}%`
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* スコア変換テーブル */}
                <div>
                  <p className="text-sm font-medium mb-3">
                    {language === "ja" ? "スコア変換テーブル" : "Score Conversion Table"}
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {scoreConversionTable.map((item, index) => {
                      const achievementRate = evaluation.organizationGoal?.achievementRate ?? 0;
                      const isActive =
                        index === 0 ? achievementRate >= 160 :
                        index === 1 ? achievementRate >= 120 && achievementRate < 160 :
                        index === 2 ? achievementRate >= 100 && achievementRate < 120 :
                        index === 3 ? achievementRate >= 80 && achievementRate < 100 :
                        achievementRate < 80;
                      return (
                        <div
                          key={item.rate}
                          className={`p-2 rounded-lg text-center text-xs border ${
                            isActive
                              ? "border-blue-500 bg-blue-500/10 dark:border-blue-400 dark:bg-blue-400/10"
                              : "border-border bg-muted/30"
                          }`}
                        >
                          <p className="text-muted-foreground">{item.rate}</p>
                          <p className={`font-bold ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`}>
                            → {item.score}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 結果スコア */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <span className="font-medium">
                    {language === "ja" ? "結果評価スコア" : "Results Score"}
                  </span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {score1.toFixed(1)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">{t.noData}</p>
            )}
          </CardContent>
        </Card>
      )}

      {activePanel === "process" && !isReadOnly && (
        <Card className="animate-in slide-in-from-top-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400" />
              {language === "ja" ? "プロセス評価の算定根拠" : "Process Evaluation Details"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProcessEvaluationSupport
              language={language}
              processCategories={evaluation.processCategories}
              onScoreCalculated={handleProcessScoreCalculated}
              initialProcesses={processProjects.length > 0 ? processProjects : undefined}
            />
          </CardContent>
        </Card>
      )}

      {activePanel === "growth" && !isReadOnly && (
        <Card className="animate-in slide-in-from-top-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              {language === "ja" ? "成長評価の算定根拠" : "Growth Evaluation Details"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthEvaluationSupport
              language={language}
              categories={evaluation.growthCategories}
              onScoreCalculated={handleGrowthScoreCalculated}
              initialCategoryId={growthCategoryId}
              initialLevel={growthLevel}
            />
          </CardContent>
        </Card>
      )}

      {activePanel === "final" && (
        <Card className="animate-in slide-in-from-top-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              {language === "ja" ? "総合評価の計算方法" : "Final Score Calculation Method"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 計算式の説明 */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">
                {language === "ja" ? "計算式" : "Formula"}
              </p>
              <p className="font-mono text-sm bg-background p-2 rounded border">
                {language === "ja"
                  ? "最終スコア = (結果×結果重み) + (プロセス×プロセス重み) + (成長×成長重み)"
                  : "Final = (Results×Weight) + (Process×Weight) + (Growth×Weight)"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "ja"
                  ? `重み設定の出典: ${evaluation.employee.position || "役職"} / ${evaluation.employee.qualificationGrade || "等級"} に基づく評価マスター設定`
                  : `Weight source: Evaluation master settings based on ${evaluation.employee.position || "Position"} / ${evaluation.employee.qualificationGrade || "Grade"}`}
              </p>
            </div>

            {/* 未入力警告 */}
            {!isAllComplete && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-600 dark:text-yellow-400">
                    {language === "ja" ? "未入力の評価項目があります" : "Some evaluation items are incomplete"}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {language === "ja"
                      ? "すべての評価項目を入力すると、正確な最終スコアが算出されます。"
                      : "Enter all evaluation items to calculate the accurate final score."}
                  </p>
                </div>
              </div>
            )}

            {/* スコア内訳 */}
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="text-sm text-muted-foreground border-b">
                    <th className="text-left py-3 px-4">
                      {language === "ja" ? "評価軸" : "Axis"}
                    </th>
                    <th className="text-center py-3 px-4">
                      {language === "ja" ? "スコア" : "Score"}
                    </th>
                    <th className="text-center py-3 px-4">
                      {language === "ja" ? "重み" : "Weight"}
                    </th>
                    <th className="text-right py-3 px-4">
                      {language === "ja" ? "加重スコア" : "Weighted"}
                    </th>
                    <th className="text-center py-3 px-4">
                      {language === "ja" ? "状態" : "Status"}
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      {language === "ja" ? "結果評価" : "Results"}
                    </td>
                    <td className="text-center font-mono py-3 px-4">{score1.toFixed(1)}</td>
                    <td className="text-center py-3 px-4">{evaluation.weights.resultsWeight}%</td>
                    <td className="text-right font-mono font-bold py-3 px-4">{weightedScore1.toFixed(2)}</td>
                    <td className="text-center py-3 px-4">
                      {isScore1Complete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />
                      {language === "ja" ? "プロセス評価" : "Process"}
                    </td>
                    <td className="text-center font-mono py-3 px-4">{score2.toFixed(1)}</td>
                    <td className="text-center py-3 px-4">{evaluation.weights.processWeight}%</td>
                    <td className="text-right font-mono font-bold py-3 px-4">{weightedScore2.toFixed(2)}</td>
                    <td className="text-center py-3 px-4">
                      {isScore2Complete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                      {language === "ja" ? "成長評価" : "Growth"}
                    </td>
                    <td className="text-center font-mono py-3 px-4">{score3.toFixed(1)}</td>
                    <td className="text-center py-3 px-4">{evaluation.weights.growthWeight}%</td>
                    <td className="text-right font-mono font-bold py-3 px-4">{weightedScore3.toFixed(2)}</td>
                    <td className="text-center py-3 px-4">
                      {isScore3Complete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50">
                    <td colSpan={3} className="py-3 px-4 font-bold text-right">
                      {language === "ja" ? "合計" : "Total"}
                    </td>
                    <td className="text-right font-mono text-lg font-bold text-amber-600 dark:text-amber-400 py-3 px-4">
                      {finalScore.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 最終グレード */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <span className="font-medium">
                  {language === "ja" ? "最終グレード" : "Final Grade"}
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {finalScore >= 4.5 && (language === "ja" ? "卓越" : "Excellent")}
                  {finalScore >= 3.5 && finalScore < 4.5 && (language === "ja" ? "優秀" : "Good")}
                  {finalScore >= 2.5 && finalScore < 3.5 && (language === "ja" ? "標準" : "Standard")}
                  {finalScore >= 1.5 && finalScore < 2.5 && (language === "ja" ? "改善が必要" : "Needs Improvement")}
                  {finalScore < 1.5 && (language === "ja" ? "要改善" : "Poor")}
                </p>
              </div>
              <Badge
                variant={
                  finalGrade === "S" || finalGrade === "A"
                    ? "default"
                    : finalGrade === "B"
                    ? "secondary"
                    : finalGrade === "D"
                    ? "destructive"
                    : "outline"
                }
                className="text-2xl px-4 py-1"
              >
                {finalGrade}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments - 最終スコアパネルでのみ表示 */}
      {activePanel === "final" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.evaluatorComment}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={evaluatorComment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setEvaluatorComment(e.target.value)
              }
              placeholder={t.commentPlaceholder}
              rows={4}
              disabled={isReadOnly}
              className="resize-none"
            />
          </CardContent>
        </Card>
      )}

      {/* オートセーブステータス表示 */}
      {!isReadOnly && (
        <div className="flex justify-end items-center gap-2 pb-8 text-sm text-muted-foreground">
          {autoSaveStatus === "saving" && (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{language === "ja" ? "保存中..." : "Saving..."}</span>
            </>
          )}
          {autoSaveStatus === "saved" && (
            <>
              <Cloud className="w-4 h-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400">
                {language === "ja" ? "保存しました" : "Saved"}
              </span>
            </>
          )}
          {autoSaveStatus === "error" && (
            <>
              <CloudOff className="w-4 h-4 text-destructive" />
              <span className="text-destructive">
                {language === "ja" ? "保存に失敗しました" : "Save failed"}
              </span>
            </>
          )}
          {autoSaveStatus === "idle" && (
            <>
              <Cloud className="w-4 h-4" />
              <span>{language === "ja" ? "自動保存" : "Auto-save"}</span>
            </>
          )}
        </div>
      )}
        </div>
      </div>

      {/* AIアシスタント（オーバーレイ） */}
      {aiAssistantExpanded ? (
        <>
          {/* オーバーレイ背景 */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setAiAssistantExpanded(false)}
          />
          {/* AIアシスタントパネル */}
          <div className="fixed right-0 top-0 h-full w-1/2 z-50 shadow-xl animate-in slide-in-from-right duration-300">
            <EvaluationAIAssistant
              language={language}
              evaluationId={evaluationId}
              employeeInfo={buildEmployeeInfo()}
              evaluationScores={{
                score1,
                score2,
                score3,
                finalScore,
                finalGrade,
              }}
              onToggleExpand={setAiAssistantExpanded}
            />
          </div>
        </>
      ) : (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAiAssistantExpanded(true)}
            className="h-12 w-12 rounded-full shadow-lg bg-card hover:bg-accent"
            title={language === "ja" ? "AIアシスタントを開く" : "Open AI Assistant"}
          >
            <div className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" />
              <Bot className="h-5 w-5 text-primary" />
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}
