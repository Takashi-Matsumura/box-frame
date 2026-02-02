"use client";

import { Award, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { myEvaluationTranslations } from "../translations";

interface ProcessCategory {
  id: string;
  name: string;
  nameEn: string | null;
}

interface GrowthCategory {
  id: string;
  name: string;
  nameEn: string | null;
  coefficient: number;
}

interface MyEvaluation {
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
  evaluator: {
    lastName: string;
    firstName: string;
    lastNameEn: string | null;
    firstNameEn: string | null;
  } | null;
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

interface PreviousReviewSectionProps {
  language: "en" | "ja";
  evaluation: MyEvaluation | null;
  loading: boolean;
}

const LEVEL_TO_SCORE: Record<number, number> = {
  1: 1.0,
  2: 2.5,
  3: 3.5,
  4: 5.0,
};

export default function PreviousReviewSection({
  language,
  evaluation,
  loading,
}: PreviousReviewSectionProps) {
  const t = myEvaluationTranslations[language];

  const getCategoryName = (cat: { name: string; nameEn?: string | null }) => {
    if (language === "en" && cat.nameEn) {
      return cat.nameEn;
    }
    return cat.name;
  };

  const getLevelLabel = (level: number) => {
    const labels: Record<number, string> = {
      1: t.levelT1,
      2: t.levelT2,
      3: t.levelT3,
      4: t.levelT4,
    };
    return labels[level] || "-";
  };

  const getGradeBadge = (grade: string | null) => {
    if (!grade) return "-";
    const styles: Record<string, string> = {
      S: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      A: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      B: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      D: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return (
      <Badge className={`text-lg px-3 py-1 ${styles[grade]}`}>{grade}</Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
    );
  }

  if (!evaluation) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t.noPreviousReview}
      </div>
    );
  }

  const isEvaluated =
    evaluation.status === "COMPLETED" || evaluation.status === "CONFIRMED";

  if (!isEvaluated) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t.noPreviousReview}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score Summary */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="py-3">
          <CardTitle className="text-base">{t.scoreSummary}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">{t.score1}</p>
              <p className="text-xl font-bold text-blue-600">
                {evaluation.score1?.toFixed(1) || "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                x{evaluation.weights.resultsWeight}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.score2}</p>
              <p className="text-xl font-bold text-green-600">
                {evaluation.score2?.toFixed(2) || "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                x{evaluation.weights.processWeight}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.score3}</p>
              <p className="text-xl font-bold text-purple-600">
                {evaluation.score3?.toFixed(2) || "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                x{evaluation.weights.growthWeight}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.finalScore}</p>
              <p className="text-xl font-bold">
                {evaluation.finalScore?.toFixed(2) || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.finalGrade}</p>
              {getGradeBadge(evaluation.finalGrade)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evaluator Comments */}
      {evaluation.evaluatorComment && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{t.evaluatorComment}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded">
              {evaluation.evaluatorComment}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results detail */}
      {evaluation.organizationGoal && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              {t.resultsEvaluation}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t.targetValue}</span>
                <p className="font-mono">
                  {evaluation.organizationGoal.targetValue.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t.actualValue}</span>
                <p className="font-mono">
                  {evaluation.organizationGoal.actualValue?.toLocaleString() ||
                    "-"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t.achievementRate}
                </span>
                <p className="font-mono">
                  {evaluation.organizationGoal.achievementRate
                    ? `${evaluation.organizationGoal.achievementRate.toFixed(1)}%`
                    : "-"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t.resultsScore}</span>
                <p className="font-mono font-bold text-blue-600">
                  {evaluation.score1?.toFixed(1) || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process detail */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            {t.processEvaluation}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {evaluation.processCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between py-1.5 border-b border-border last:border-0 text-sm"
              >
                <span>{getCategoryName(category)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {evaluation.processScores?.[category.id]
                      ? getLevelLabel(evaluation.processScores[category.id])
                      : "-"}
                  </span>
                  <span className="font-mono w-10 text-right">
                    {evaluation.processScores?.[category.id]
                      ? LEVEL_TO_SCORE[
                          evaluation.processScores[category.id]
                        ]?.toFixed(1)
                      : "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t.processScore}</span>
            <span className="font-mono font-bold text-green-600">
              {evaluation.score2?.toFixed(2) || "-"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Growth detail */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-500" />
            {t.growthEvaluation}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t.growthCategory}</span>
              <p>
                {evaluation.growthCategoryId
                  ? getCategoryName(
                      evaluation.growthCategories.find(
                        (c) => c.id === evaluation.growthCategoryId,
                      ) || { name: "-" },
                    )
                  : "-"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t.growthLevel}</span>
              <p>
                {evaluation.growthLevel
                  ? getLevelLabel(evaluation.growthLevel)
                  : "-"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t.growthScore}</span>
              <p className="font-mono font-bold text-purple-600">
                {evaluation.score3?.toFixed(2) || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
