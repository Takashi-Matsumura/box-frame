"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Target, TrendingUp, Award, Save, Check } from "lucide-react";
import { evaluationsTranslations } from "../translations";

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

const LEVEL_TO_SCORE: Record<number, number> = {
  1: 1.0,
  2: 2.5,
  3: 3.5,
  4: 5.0,
};

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

  // Form state
  const [processScores, setProcessScores] = useState<Record<string, number>>({});
  const [growthCategoryId, setGrowthCategoryId] = useState<string>("");
  const [growthLevel, setGrowthLevel] = useState<number>(2);
  const [evaluatorComment, setEvaluatorComment] = useState("");

  const fetchEvaluation = useCallback(async () => {
    try {
      const res = await fetch(`/api/evaluation/${evaluationId}`);
      if (res.ok) {
        const data: EvaluationData = await res.json();
        setEvaluation(data);

        // Initialize form state
        if (data.processScores) {
          setProcessScores(data.processScores);
        } else {
          // Initialize with default values
          const initial: Record<string, number> = {};
          data.processCategories.forEach((cat) => {
            initial[cat.id] = 2; // Default to T2
          });
          setProcessScores(initial);
        }

        if (data.growthCategoryId) {
          setGrowthCategoryId(data.growthCategoryId);
        } else if (data.growthCategories.length > 0) {
          setGrowthCategoryId(data.growthCategories[0].id);
        }

        if (data.growthLevel) {
          setGrowthLevel(data.growthLevel);
        }

        if (data.evaluatorComment) {
          setEvaluatorComment(data.evaluatorComment);
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

  const getCategoryName = (cat: ProcessCategory | GrowthCategory) => {
    if (language === "en" && cat.nameEn) {
      return cat.nameEn;
    }
    return cat.name;
  };

  // Calculate scores
  const calculateResultsScore = () => {
    if (!evaluation?.organizationGoal?.achievementRate) return 0;
    const rate = evaluation.organizationGoal.achievementRate;
    if (rate >= 120) return 5.0;
    if (rate >= 100) return 3.5;
    if (rate >= 80) return 2.5;
    return 1.0;
  };

  const calculateProcessScore = () => {
    const values = Object.values(processScores);
    if (values.length === 0) return 0;
    const scores = values.map((level) => LEVEL_TO_SCORE[level] || 2.5);
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  };

  const calculateGrowthScore = () => {
    const category = evaluation?.growthCategories.find((c) => c.id === growthCategoryId);
    if (!category) return 0;
    const baseScore = LEVEL_TO_SCORE[growthLevel] || 2.5;
    return Math.min(5.0, baseScore * category.coefficient);
  };

  const calculateFinalScore = () => {
    if (!evaluation) return { finalScore: 0, finalGrade: "B" };

    const score1 = calculateResultsScore();
    const score2 = calculateProcessScore();
    const score3 = calculateGrowthScore();

    const { resultsWeight, processWeight, growthWeight } = evaluation.weights;

    const finalScore =
      (score1 * resultsWeight + score2 * processWeight + score3 * growthWeight) / 100;

    let finalGrade = "B";
    if (finalScore >= 4.5) finalGrade = "S";
    else if (finalScore >= 3.5) finalGrade = "A";
    else if (finalScore >= 2.5) finalGrade = "B";
    else if (finalScore >= 1.5) finalGrade = "C";
    else finalGrade = "D";

    return { finalScore: Math.round(finalScore * 100) / 100, finalGrade };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { finalScore, finalGrade } = calculateFinalScore();

      const res = await fetch(`/api/evaluation/${evaluationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score1: calculateResultsScore(),
          score2: calculateProcessScore(),
          score3: calculateGrowthScore(),
          processScores,
          growthCategoryId,
          growthLevel,
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

    // Validate all fields
    const allProcessFilled = Object.keys(processScores).length === (evaluation?.processCategories.length || 0);
    if (!allProcessFilled || !growthCategoryId || !growthLevel) {
      alert(t.allFieldsRequired);
      return;
    }

    setCompleting(true);
    try {
      const { finalScore, finalGrade } = calculateFinalScore();

      const res = await fetch(`/api/evaluation/${evaluationId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score1: calculateResultsScore(),
          score2: calculateProcessScore(),
          score3: calculateGrowthScore(),
          processScores,
          growthCategoryId,
          growthLevel,
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
      <div className="max-w-4xl mx-auto mt-8">
        <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
      </div>
    );
  }

  const isReadOnly = evaluation.status === "COMPLETED" || evaluation.status === "CONFIRMED";
  const { finalScore, finalGrade } = calculateFinalScore();

  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t.back}
      </Button>

      {/* Employee Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t.employeeInfo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t.employeeNumber}</span>
              <p className="font-mono">{evaluation.employee.employeeNumber}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t.employeeInfo}</span>
              <p className="font-medium">{getEmployeeName(evaluation.employee)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t.department}</span>
              <p>
                {evaluation.employee.department?.name || "-"}
                {evaluation.employee.section && ` / ${evaluation.employee.section.name}`}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t.grade}</span>
              <p>{evaluation.employee.qualificationGrade || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weights Info */}
      <Card className="bg-muted/30">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">{t.weights}</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex gap-6 text-sm">
            <span>
              {t.resultsWeight}: <strong>{evaluation.weights.resultsWeight}%</strong>
            </span>
            <span>
              {t.processWeight}: <strong>{evaluation.weights.processWeight}%</strong>
            </span>
            <span>
              {t.growthWeight}: <strong>{evaluation.weights.growthWeight}%</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Results Evaluation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            {t.resultsEvaluation}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{t.resultsDescription}</p>
          {evaluation.organizationGoal ? (
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t.targetValue}</span>
                <p className="font-mono text-lg">
                  {evaluation.organizationGoal.targetValue.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t.actualValue}</span>
                <p className="font-mono text-lg">
                  {evaluation.organizationGoal.actualValue?.toLocaleString() || "-"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t.achievementRate}</span>
                <p className="font-mono text-lg">
                  {evaluation.organizationGoal.achievementRate
                    ? `${evaluation.organizationGoal.achievementRate.toFixed(1)}%`
                    : "-"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t.resultsScore}</span>
                <p className="font-mono text-lg font-bold text-blue-600">
                  {calculateResultsScore().toFixed(1)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">{t.noData}</p>
          )}
        </CardContent>
      </Card>

      {/* Process Evaluation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            {t.processEvaluation}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{t.processDescription}</p>
          <div className="space-y-4">
            {evaluation.processCategories.map((category) => (
              <div key={category.id} className="flex items-center gap-4">
                <div className="w-48">
                  <Label className="font-medium">{getCategoryName(category)}</Label>
                  {category.description && (
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  )}
                </div>
                <Select
                  value={String(processScores[category.id] || 2)}
                  onValueChange={(value) =>
                    setProcessScores({ ...processScores, [category.id]: parseInt(value) })
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t.levelT1}</SelectItem>
                    <SelectItem value="2">{t.levelT2}</SelectItem>
                    <SelectItem value="3">{t.levelT3}</SelectItem>
                    <SelectItem value="4">{t.levelT4}</SelectItem>
                  </SelectContent>
                </Select>
                <span className="font-mono text-sm">
                  → {LEVEL_TO_SCORE[processScores[category.id] || 2]?.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t.processScore}:</span>
            <span className="font-mono text-lg font-bold text-green-600">
              {calculateProcessScore().toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Growth Evaluation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-500" />
            {t.growthEvaluation}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{t.growthDescription}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.growthCategory}</Label>
              <Select
                value={growthCategoryId}
                onValueChange={setGrowthCategoryId}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.growthCategory} />
                </SelectTrigger>
                <SelectContent>
                  {evaluation.growthCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {getCategoryName(cat)} (×{cat.coefficient.toFixed(1)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.growthLevel}</Label>
              <Select
                value={String(growthLevel)}
                onValueChange={(value) => setGrowthLevel(parseInt(value))}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t.levelT1}</SelectItem>
                  <SelectItem value="2">{t.levelT2}</SelectItem>
                  <SelectItem value="3">{t.levelT3}</SelectItem>
                  <SelectItem value="4">{t.levelT4}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">{t.growthScore}:</span>
            <span className="font-mono text-lg font-bold text-purple-600">
              {calculateGrowthScore().toFixed(2)}
            </span>
            {growthCategoryId && (
              <span className="text-xs text-muted-foreground">
                ({LEVEL_TO_SCORE[growthLevel]?.toFixed(1)} × {evaluation.growthCategories.find(c => c.id === growthCategoryId)?.coefficient.toFixed(1)})
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Score Summary */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle>{t.scoreSummary}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">{t.score1}</p>
              <p className="text-2xl font-bold text-blue-600">
                {calculateResultsScore().toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">×{evaluation.weights.resultsWeight}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.score2}</p>
              <p className="text-2xl font-bold text-green-600">
                {calculateProcessScore().toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">×{evaluation.weights.processWeight}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.score3}</p>
              <p className="text-2xl font-bold text-purple-600">
                {calculateGrowthScore().toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">×{evaluation.weights.growthWeight}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.finalScore}</p>
              <p className="text-2xl font-bold">{finalScore.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.finalGrade}</p>
              <Badge
                className={`text-xl px-4 py-1 ${
                  finalGrade === "S"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                    : finalGrade === "A"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    : finalGrade === "B"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : finalGrade === "C"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}
              >
                {finalGrade}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle>{t.evaluatorComment}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={evaluatorComment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEvaluatorComment(e.target.value)}
            placeholder={t.commentPlaceholder}
            rows={4}
            disabled={isReadOnly}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? t.saving : t.save}
          </Button>
          <Button onClick={handleComplete} disabled={completing}>
            <Check className="w-4 h-4 mr-2" />
            {completing ? t.completing : t.complete}
          </Button>
        </div>
      )}
    </div>
  );
}
