"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Target,
  TrendingUp,
  Award,
  Trophy,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { evaluationsTranslations } from "../translations";
import { ProcessEvaluationSupport } from "./ProcessEvaluationSupport";
import { GrowthEvaluationSupport } from "./GrowthEvaluationSupport";

interface ProcessCategory {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
}

interface GrowthCategory {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  coefficient: number;
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

interface Project {
  id: string;
  name: string;
  checks: Record<string, boolean>;
  achievement: string;
}

// カラースキーム定義
const colorSchemes = {
  blue: {
    border: "border-blue-500",
    bg: "bg-blue-50",
    icon: "text-blue-600",
    score: "text-blue-700",
  },
  green: {
    border: "border-green-500",
    bg: "bg-green-50",
    icon: "text-green-600",
    score: "text-green-700",
  },
  purple: {
    border: "border-purple-500",
    bg: "bg-purple-50",
    icon: "text-purple-600",
    score: "text-purple-700",
  },
};

// スコアカードコンポーネント
function ScoreCard({
  title,
  weight,
  score,
  weightedScore,
  isActive,
  onClick,
  color,
  icon: Icon,
  isComplete,
}: {
  title: string;
  weight: number;
  score: number;
  weightedScore: number;
  isActive: boolean;
  onClick: () => void;
  color: "blue" | "green" | "purple";
  icon: React.ComponentType<{ className?: string }>;
  isComplete: boolean;
}) {
  const scheme = colorSchemes[color];

  return (
    <button
      onClick={onClick}
      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
        isActive
          ? `${scheme.border} ${scheme.bg} shadow-lg`
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${scheme.icon}`} />
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        {isComplete ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        )}
      </div>
      <div className="text-center">
        <p className={`text-2xl font-bold ${scheme.score}`}>
          {score > 0 ? score.toFixed(1) : "-"}
        </p>
        <p className="text-xs text-gray-500">
          ×{weight}% = <span className="font-medium">{weightedScore.toFixed(2)}</span>
        </p>
      </div>
      <div className="mt-2 flex items-center justify-center">
        {isActive ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>
    </button>
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
  const getGradeColor = (g: string) => {
    switch (g) {
      case "S":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "A":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "B":
        return "bg-green-100 text-green-800 border-green-300";
      case "C":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "D":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <button
      onClick={onClick}
      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
        isActive
          ? "border-amber-500 bg-amber-50 shadow-lg"
          : "border-gray-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:border-amber-300 hover:shadow"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-600" />
          <span className="text-sm font-medium text-gray-700">
            {language === "ja" ? "最終スコア" : "Final Score"}
          </span>
        </div>
        {isAllComplete ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        )}
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-amber-700">
          {score > 0 ? score.toFixed(2) : "-"}
        </p>
        <Badge className={`mt-1 ${getGradeColor(grade)}`}>{grade || "-"}</Badge>
      </div>
      <div className="mt-2 flex items-center justify-center">
        {isActive ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>
    </button>
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
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  // Form state
  const [score1, setScore1] = useState<number>(0);
  const [score2, setScore2] = useState<number>(0);
  const [score3, setScore3] = useState<number>(0);
  const [processProjects, setProcessProjects] = useState<Project[]>([]);
  const [growthCategoryId, setGrowthCategoryId] = useState<string>("");
  const [growthLevel, setGrowthLevel] = useState<string>("T2");
  const [evaluatorComment, setEvaluatorComment] = useState("");

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
          // Convert numeric level to T-level string
          const levelMap: Record<number, string> = { 1: "T1", 2: "T2", 3: "T3", 4: "T4" };
          setGrowthLevel(levelMap[data.growthLevel] || "T2");
        }
        if (data.evaluatorComment) setEvaluatorComment(data.evaluatorComment);

        // Calculate results score if not saved
        if (!data.score1 && data.organizationGoal?.achievementRate) {
          const rate = data.organizationGoal.achievementRate;
          let calculatedScore = 1.0;
          if (rate >= 120) calculatedScore = 5.0;
          else if (rate >= 100) calculatedScore = 3.5;
          else if (rate >= 80) calculatedScore = 2.5;
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
    if (finalScore >= 4.5) return "S";
    if (finalScore >= 3.5) return "A";
    if (finalScore >= 2.5) return "B";
    if (finalScore >= 1.5) return "C";
    return "D";
  }, [finalScore]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert T-level to numeric
      const levelMap: Record<string, number> = { T1: 1, T2: 2, T3: 3, T4: 4 };
      const numericLevel = levelMap[growthLevel] || 2;

      const res = await fetch(`/api/evaluation/${evaluationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score1,
          score2,
          score3,
          growthCategoryId,
          growthLevel: numericLevel,
          finalScore,
          finalGrade,
          evaluatorComment,
          status: "IN_PROGRESS",
        }),
      });

      if (res.ok) {
        alert(t.saveSuccess);
        fetchEvaluation();
      } else {
        alert(t.saveError);
      }
    } catch (error) {
      console.error("Failed to save evaluation:", error);
      alert(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm(t.confirmComplete)) return;

    if (!isAllComplete) {
      alert(t.allFieldsRequired);
      return;
    }

    setCompleting(true);
    try {
      const levelMap: Record<string, number> = { T1: 1, T2: 2, T3: 3, T4: 4 };
      const numericLevel = levelMap[growthLevel] || 2;

      const res = await fetch(`/api/evaluation/${evaluationId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score1,
          score2,
          score3,
          growthCategoryId,
          growthLevel: numericLevel,
          finalScore,
          finalGrade,
          evaluatorComment,
        }),
      });

      if (res.ok) {
        alert(t.completeSuccess);
        onBack();
      } else {
        alert(t.completeError);
      }
    } catch (error) {
      console.error("Failed to complete evaluation:", error);
      alert(t.completeError);
    } finally {
      setCompleting(false);
    }
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
    <div className="max-w-5xl mx-auto mt-4 space-y-4">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t.back}
      </Button>

      {/* Employee Info Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{getEmployeeName(evaluation.employee)}</h2>
            <p className="text-slate-300 text-sm mt-1">
              {evaluation.employee.position && `${evaluation.employee.position} / `}
              {evaluation.employee.department?.name || "-"}
              {evaluation.employee.section && ` / ${evaluation.employee.section.name}`}
              {evaluation.employee.course && ` / ${evaluation.employee.course.name}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-300">{t.employeeNumber}</p>
            <p className="font-mono">{evaluation.employee.employeeNumber}</p>
          </div>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-4 gap-3">
        <ScoreCard
          title={language === "ja" ? "結果評価" : "Results"}
          weight={evaluation.weights.resultsWeight}
          score={score1}
          weightedScore={weightedScore1}
          isActive={activePanel === "results"}
          onClick={() => handlePanelClick("results")}
          color="blue"
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
          color="green"
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
          color="purple"
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
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 animate-in slide-in-from-top-2">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            {language === "ja" ? "結果評価の算定根拠" : "Results Evaluation Details"}
          </h3>

          {evaluation.organizationGoal ? (
            <div className="space-y-4">
              {/* 目標と実績 */}
              <div className="grid grid-cols-3 gap-4 bg-white rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {language === "ja" ? "組織目標" : "Target"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {evaluation.organizationGoal.targetValue.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {language === "ja" ? "実績" : "Actual"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {evaluation.organizationGoal.actualValue?.toLocaleString() || "-"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {language === "ja" ? "達成率" : "Achievement Rate"}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {evaluation.organizationGoal.achievementRate
                      ? `${evaluation.organizationGoal.achievementRate.toFixed(1)}%`
                      : "-"}
                  </p>
                </div>
              </div>

              {/* スコア変換テーブル */}
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  {language === "ja" ? "スコア変換テーブル" : "Score Conversion Table"}
                </p>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  {[
                    { rate: "120%+", score: 5.0, active: (evaluation.organizationGoal?.achievementRate ?? 0) >= 120 },
                    { rate: "100%+", score: 3.5, active: (evaluation.organizationGoal?.achievementRate ?? 0) >= 100 && (evaluation.organizationGoal?.achievementRate ?? 0) < 120 },
                    { rate: "80%+", score: 2.5, active: (evaluation.organizationGoal?.achievementRate ?? 0) >= 80 && (evaluation.organizationGoal?.achievementRate ?? 0) < 100 },
                    { rate: "<80%", score: 1.0, active: (evaluation.organizationGoal?.achievementRate ?? 0) < 80 },
                  ].map((item) => (
                    <div
                      key={item.rate}
                      className={`p-2 rounded text-center ${
                        item.active
                          ? "bg-blue-100 border-2 border-blue-500"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <p className="text-gray-600">{item.rate}</p>
                      <p className={`font-bold ${item.active ? "text-blue-700" : "text-gray-500"}`}>
                        → {item.score.toFixed(1)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 結果スコア */}
              <div className="bg-gradient-to-r from-blue-100 to-sky-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">
                    {language === "ja" ? "結果評価スコア" : "Results Score"}
                  </span>
                  <span className="text-3xl font-bold text-blue-700">{score1.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">{t.noData}</p>
          )}
        </div>
      )}

      {activePanel === "process" && !isReadOnly && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200 animate-in slide-in-from-top-2">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            {language === "ja" ? "プロセス評価の算定根拠" : "Process Evaluation Details"}
          </h3>
          <ProcessEvaluationSupport
            language={language}
            onScoreCalculated={handleProcessScoreCalculated}
            initialProjects={processProjects.length > 0 ? processProjects : undefined}
          />
        </div>
      )}

      {activePanel === "growth" && !isReadOnly && (
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 animate-in slide-in-from-top-2">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            {language === "ja" ? "成長評価の算定根拠" : "Growth Evaluation Details"}
          </h3>
          <GrowthEvaluationSupport
            language={language}
            categories={evaluation.growthCategories}
            onScoreCalculated={handleGrowthScoreCalculated}
            initialCategoryId={growthCategoryId}
            initialLevel={growthLevel}
          />
        </div>
      )}

      {activePanel === "final" && (
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 animate-in slide-in-from-top-2">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600" />
            {language === "ja" ? "最終スコア計算" : "Final Score Calculation"}
          </h3>

          <div className="space-y-4">
            {/* スコア内訳 */}
            <div className="bg-white rounded-lg p-4">
              <table className="w-full">
                <thead>
                  <tr className="text-sm text-gray-600">
                    <th className="text-left py-2">
                      {language === "ja" ? "評価軸" : "Axis"}
                    </th>
                    <th className="text-center py-2">
                      {language === "ja" ? "スコア" : "Score"}
                    </th>
                    <th className="text-center py-2">
                      {language === "ja" ? "重み" : "Weight"}
                    </th>
                    <th className="text-right py-2">
                      {language === "ja" ? "加重スコア" : "Weighted"}
                    </th>
                    <th className="text-center py-2">
                      {language === "ja" ? "状態" : "Status"}
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-t">
                    <td className="py-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      {language === "ja" ? "結果評価" : "Results"}
                    </td>
                    <td className="text-center font-mono">{score1.toFixed(1)}</td>
                    <td className="text-center">{evaluation.weights.resultsWeight}%</td>
                    <td className="text-right font-mono font-bold">{weightedScore1.toFixed(2)}</td>
                    <td className="text-center">
                      {isScore1Complete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      {language === "ja" ? "プロセス評価" : "Process"}
                    </td>
                    <td className="text-center font-mono">{score2.toFixed(1)}</td>
                    <td className="text-center">{evaluation.weights.processWeight}%</td>
                    <td className="text-right font-mono font-bold">{weightedScore2.toFixed(2)}</td>
                    <td className="text-center">
                      {isScore2Complete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-600" />
                      {language === "ja" ? "成長評価" : "Growth"}
                    </td>
                    <td className="text-center font-mono">{score3.toFixed(1)}</td>
                    <td className="text-center">{evaluation.weights.growthWeight}%</td>
                    <td className="text-right font-mono font-bold">{weightedScore3.toFixed(2)}</td>
                    <td className="text-center">
                      {isScore3Complete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={3} className="py-3 font-bold text-right">
                      {language === "ja" ? "合計" : "Total"}
                    </td>
                    <td className="text-right font-mono text-lg font-bold text-amber-700">
                      {finalScore.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 最終グレード */}
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900">
                    {language === "ja" ? "最終グレード" : "Final Grade"}
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    {finalScore >= 4.5 && (language === "ja" ? "卓越" : "Excellent")}
                    {finalScore >= 3.5 && finalScore < 4.5 && (language === "ja" ? "優秀" : "Good")}
                    {finalScore >= 2.5 && finalScore < 3.5 && (language === "ja" ? "標準" : "Standard")}
                    {finalScore >= 1.5 && finalScore < 2.5 && (language === "ja" ? "改善が必要" : "Needs Improvement")}
                    {finalScore < 1.5 && (language === "ja" ? "要改善" : "Poor")}
                  </p>
                </div>
                <Badge
                  className={`text-3xl px-6 py-2 ${
                    finalGrade === "S"
                      ? "bg-purple-100 text-purple-800"
                      : finalGrade === "A"
                      ? "bg-blue-100 text-blue-800"
                      : finalGrade === "B"
                      ? "bg-green-100 text-green-800"
                      : finalGrade === "C"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {finalGrade}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-bold text-gray-900 mb-3">{t.evaluatorComment}</h3>
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
      </div>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex justify-end gap-4 pb-8">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? t.saving : t.save}
          </Button>
          <Button onClick={handleComplete} disabled={completing || !isAllComplete}>
            <Check className="w-4 h-4 mr-2" />
            {completing ? t.completing : t.complete}
          </Button>
        </div>
      )}
    </div>
  );
}
