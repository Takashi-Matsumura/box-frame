"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Calendar,
  Target,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";
import { myEvaluationTranslations } from "./translations";
import GoalSettingSection from "./components/GoalSettingSection";

interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

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

interface MyEvaluationClientProps {
  language: "en" | "ja";
  userId: string;
}

const LEVEL_TO_SCORE: Record<number, number> = {
  1: 1.0,
  2: 2.5,
  3: 3.5,
  4: 5.0,
};

export default function MyEvaluationClient({
  language,
  userId,
}: MyEvaluationClientProps) {
  const t = myEvaluationTranslations[language];
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "current";
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [evaluation, setEvaluation] = useState<MyEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [historyEvaluations, setHistoryEvaluations] = useState<(MyEvaluation & { periodName: string })[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Fetch periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await fetch("/api/evaluation/periods");
        if (res.ok) {
          const data = await res.json();
          // ACTIVE, REVIEW, CLOSEDステータスの期間を表示
          const visiblePeriods = data.filter(
            (p: Period & { status: string }) =>
              p.status === "ACTIVE" || p.status === "REVIEW" || p.status === "CLOSED"
          );
          setPeriods(visiblePeriods);
          if (visiblePeriods.length > 0) {
            setSelectedPeriodId(visiblePeriods[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch periods:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPeriods();
  }, []);

  // Fetch my evaluation
  const fetchMyEvaluation = useCallback(async () => {
    if (!selectedPeriodId) return;

    setEvaluationLoading(true);
    try {
      const res = await fetch(`/api/evaluation/my-evaluation?periodId=${selectedPeriodId}`);
      if (res.ok) {
        const data = await res.json();
        setEvaluation(data);
      } else if (res.status === 404) {
        setEvaluation(null);
      }
    } catch (error) {
      console.error("Failed to fetch my evaluation:", error);
      setEvaluation(null);
    } finally {
      setEvaluationLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    fetchMyEvaluation();
  }, [fetchMyEvaluation]);

  // Fetch evaluation history (all past periods)
  const fetchEvaluationHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/evaluation/my-evaluation/history");
      if (res.ok) {
        const data = await res.json();
        setHistoryEvaluations(data);
      }
    } catch (error) {
      console.error("Failed to fetch evaluation history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Fetch history when tab changes to history
  useEffect(() => {
    if (activeTab === "history" && historyEvaluations.length === 0) {
      fetchEvaluationHistory();
    }
  }, [activeTab, historyEvaluations.length, fetchEvaluationHistory]);

  const getEmployeeName = (emp: { lastName: string; firstName: string; lastNameEn?: string | null; firstNameEn?: string | null }) => {
    if (language === "en" && emp.lastNameEn && emp.firstNameEn) {
      return `${emp.firstNameEn} ${emp.lastNameEn}`;
    }
    return `${emp.lastName} ${emp.firstName}`;
  };

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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-muted text-muted-foreground",
      IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };
    const labels: Record<string, string> = {
      PENDING: t.statusPending,
      IN_PROGRESS: t.statusInProgress,
      COMPLETED: t.statusCompleted,
      CONFIRMED: t.statusConfirmed,
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
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
    return <Badge className={`text-lg px-3 py-1 ${styles[grade]}`}>{grade}</Badge>;
  };

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);
  const isEvaluated = evaluation && (evaluation.status === "COMPLETED" || evaluation.status === "CONFIRMED");

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pt-12">
        <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pt-12 space-y-6">
      {/* Current Period Tab Content */}
      {activeTab === "current" && (
        <>
          {/* Period Selector */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t.periodInfo}</span>
                </div>
                <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder={t.selectPeriod} />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPeriod && (
                <div className="flex items-center gap-6 text-sm mt-3 pt-3 border-t">
                  <div>
                    <span className="text-muted-foreground">{t.periodName}: </span>
                    <strong>{selectedPeriod.name}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.startDate}: </span>
                    {new Date(selectedPeriod.startDate).toLocaleDateString(language)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.endDate}: </span>
                    {new Date(selectedPeriod.endDate).toLocaleDateString(language)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loading / No Data states */}
          {evaluationLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
          ) : !selectedPeriodId ? (
            <div className="text-center py-12 text-muted-foreground">{t.noPeriods}</div>
          ) : !evaluation ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">{t.noEvaluation}</p>
              </CardContent>
            </Card>
          ) : (
            <>
          {/* Evaluation Status Banner */}
          <Card className={isEvaluated ? "border-green-200 dark:border-green-800" : "border-yellow-200 dark:border-yellow-800"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {isEvaluated ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.evaluationStatus}:</span>
                    {getStatusBadge(evaluation.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isEvaluated ? t.evaluationCompleted : t.pendingEvaluation}
                  </p>
                </div>
                {evaluation.evaluator && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t.evaluator}: </span>
                    <span className="font-medium">{getEmployeeName(evaluation.evaluator)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
                  <span className="text-muted-foreground">{t.department}</span>
                  <p>
                    {evaluation.employee.department?.name || "-"}
                    {evaluation.employee.section && ` / ${evaluation.employee.section.name}`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.position}</span>
                  <p>{evaluation.employee.position || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.grade}</span>
                  <p>{evaluation.employee.qualificationGrade || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Show details only if evaluated */}
          {isEvaluated && (
            <>
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
                          {evaluation.score1?.toFixed(1) || "-"}
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
                  <div className="space-y-3">
                    {evaluation.processCategories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="font-medium">{getCategoryName(category)}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {evaluation.processScores?.[category.id]
                              ? getLevelLabel(evaluation.processScores[category.id])
                              : "-"}
                          </span>
                          <span className="font-mono text-sm w-12 text-right">
                            {evaluation.processScores?.[category.id]
                              ? LEVEL_TO_SCORE[evaluation.processScores[category.id]]?.toFixed(1)
                              : "-"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t.processScore}</span>
                    <span className="font-mono text-lg font-bold text-green-600">
                      {evaluation.score2?.toFixed(2) || "-"}
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
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t.growthCategory}</span>
                      <p className="font-medium">
                        {evaluation.growthCategoryId
                          ? getCategoryName(
                              evaluation.growthCategories.find((c) => c.id === evaluation.growthCategoryId) || { name: "-" }
                            )
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.growthLevel}</span>
                      <p>{evaluation.growthLevel ? getLevelLabel(evaluation.growthLevel) : "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.growthScore}</span>
                      <p className="font-mono text-lg font-bold text-purple-600">
                        {evaluation.score3?.toFixed(2) || "-"}
                      </p>
                    </div>
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
                        {evaluation.score1?.toFixed(1) || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">×{evaluation.weights.resultsWeight}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.score2}</p>
                      <p className="text-2xl font-bold text-green-600">
                        {evaluation.score2?.toFixed(2) || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">×{evaluation.weights.processWeight}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.score3}</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {evaluation.score3?.toFixed(2) || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">×{evaluation.weights.growthWeight}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.finalScore}</p>
                      <p className="text-2xl font-bold">{evaluation.finalScore?.toFixed(2) || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.finalGrade}</p>
                      {getGradeBadge(evaluation.finalGrade)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Evaluator Comments */}
              {evaluation.evaluatorComment && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t.evaluatorComment}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{evaluation.evaluatorComment}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </>
  )}

      {/* Goals Tab Content */}
      {activeTab === "goals" && (
        <GoalSettingSection
          language={language}
          periodId={selectedPeriodId}
        />
      )}

      {/* History Tab Content */}
      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {t.historyTitle}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t.historyDescription}</p>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
            ) : historyEvaluations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t.noHistory}</div>
            ) : (
              <div className="space-y-4">
                {historyEvaluations.map((historyEval) => (
                  <Card key={historyEval.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{historyEval.periodName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(historyEval.status)}
                              {historyEval.finalGrade && (
                                <span className="text-sm">
                                  {t.finalGrade}: {getGradeBadge(historyEval.finalGrade)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {historyEval.finalScore && (
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">{t.finalScore}</p>
                              <p className="text-xl font-bold">{historyEval.finalScore.toFixed(2)}</p>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedHistoryId(
                              expandedHistoryId === historyEval.id ? null : historyEval.id
                            )}
                          >
                            {expandedHistoryId === historyEval.id ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                {t.hideDetails}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                {t.viewDetails}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedHistoryId === historyEval.id && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          {/* Score Summary */}
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground">{t.score1}</p>
                              <p className="text-lg font-bold text-blue-600">
                                {historyEval.score1?.toFixed(1) || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t.score2}</p>
                              <p className="text-lg font-bold text-green-600">
                                {historyEval.score2?.toFixed(2) || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t.score3}</p>
                              <p className="text-lg font-bold text-purple-600">
                                {historyEval.score3?.toFixed(2) || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t.finalScore}</p>
                              <p className="text-lg font-bold">
                                {historyEval.finalScore?.toFixed(2) || "-"}
                              </p>
                            </div>
                          </div>

                          {/* Evaluator Comment */}
                          {historyEval.evaluatorComment && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">{t.evaluatorComment}</p>
                              <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded">
                                {historyEval.evaluatorComment}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
