"use client";

import { Calendar, ChevronDown, ChevronUp, History } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import EvaluationCycleStepper from "./components/EvaluationCycleStepper";
import { useGoalData } from "./hooks/useGoalData";
import { myEvaluationTranslations } from "./translations";

interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
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

export default function MyEvaluationClient({
  language,
}: MyEvaluationClientProps) {
  const t = myEvaluationTranslations[language];
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "cycle";

  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Previous evaluation (for review phase)
  const [previousEvaluation, setPreviousEvaluation] =
    useState<MyEvaluation | null>(null);
  const [previousEvaluationLoading, setPreviousEvaluationLoading] =
    useState(false);

  // History tab
  const [historyEvaluations, setHistoryEvaluations] = useState<
    (MyEvaluation & { periodName: string })[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(
    null,
  );

  // Goal data hook
  const goalData = useGoalData(selectedPeriodId);

  // Selected period info
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  // Fetch periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await fetch("/api/evaluation/periods");
        if (res.ok) {
          const data = await res.json();
          const visiblePeriods = data.filter(
            (p: Period) =>
              p.status === "ACTIVE" ||
              p.status === "REVIEW" ||
              p.status === "CLOSED",
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

  // Fetch previous period evaluation (for review phase)
  const fetchPreviousEvaluation = useCallback(async () => {
    if (!selectedPeriodId || periods.length === 0) return;

    // Find the previous period (the one before the selected one)
    const currentIndex = periods.findIndex((p) => p.id === selectedPeriodId);
    const previousPeriod =
      currentIndex < periods.length - 1 ? periods[currentIndex + 1] : null;

    if (!previousPeriod) {
      setPreviousEvaluation(null);
      return;
    }

    setPreviousEvaluationLoading(true);
    try {
      const res = await fetch(
        `/api/evaluation/my-evaluation?periodId=${previousPeriod.id}`,
      );
      if (res.ok) {
        const data = await res.json();
        setPreviousEvaluation(data);
      } else {
        setPreviousEvaluation(null);
      }
    } catch {
      setPreviousEvaluation(null);
    } finally {
      setPreviousEvaluationLoading(false);
    }
  }, [selectedPeriodId, periods]);

  useEffect(() => {
    fetchPreviousEvaluation();
  }, [fetchPreviousEvaluation]);

  // Fetch evaluation history
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

  useEffect(() => {
    if (activeTab === "career" && historyEvaluations.length === 0) {
      fetchEvaluationHistory();
    }
  }, [activeTab, historyEvaluations.length, fetchEvaluationHistory]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-muted text-muted-foreground",
      IN_PROGRESS:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      COMPLETED:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      CONFIRMED:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
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
    return (
      <Badge className={`text-lg px-3 py-1 ${styles[grade]}`}>{grade}</Badge>
    );
  };

  // 初期ローディング - Skeleton表示
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pt-12 space-y-6">
        {/* Period Selector skeleton */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-10 w-[250px]" />
            </div>
            <div className="flex items-center gap-6 mt-3 pt-3 border-t">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>

        {/* Stepper skeleton */}
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center w-8">
                <Skeleton className="h-8 w-8 rounded-full" />
                {i < 3 && <Skeleton className="w-0.5 flex-1 min-h-8 mt-1" />}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pt-12 space-y-6">
      {/* Period Selector (shared across both tabs) */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t.periodInfo}
              </span>
            </div>
            <Select
              value={selectedPeriodId}
              onValueChange={setSelectedPeriodId}
            >
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
                {new Date(selectedPeriod.startDate).toLocaleDateString(
                  language,
                )}
              </div>
              <div>
                <span className="text-muted-foreground">{t.endDate}: </span>
                {new Date(selectedPeriod.endDate).toLocaleDateString(language)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cycle Tab Content */}
      {activeTab === "cycle" && selectedPeriodId && (
        <EvaluationCycleStepper
          language={language}
          periodStatus={selectedPeriod?.status || "ACTIVE"}
          goalData={goalData}
          previousEvaluation={previousEvaluation}
          previousEvaluationLoading={previousEvaluationLoading}
        />
      )}

      {activeTab === "cycle" && !selectedPeriodId && (
        <div className="text-center py-12 text-muted-foreground">
          {t.noPeriods}
        </div>
      )}

      {/* Career Tab Content */}
      {activeTab === "career" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {t.historyTitle}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t.historyDescription}
            </p>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-5 w-16 rounded-full" />
                              <Skeleton className="h-5 w-20" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right space-y-1">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-6 w-16" />
                          </div>
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : historyEvaluations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t.noHistory}
              </div>
            ) : (
              <div className="space-y-4">
                {historyEvaluations.map((historyEval) => (
                  <Card key={historyEval.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">
                              {historyEval.periodName}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(historyEval.status)}
                              {historyEval.finalGrade && (
                                <span className="text-sm">
                                  {t.finalGrade}:{" "}
                                  {getGradeBadge(historyEval.finalGrade)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {historyEval.finalScore && (
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                {t.finalScore}
                              </p>
                              <p className="text-xl font-bold">
                                {historyEval.finalScore.toFixed(2)}
                              </p>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedHistoryId(
                                expandedHistoryId === historyEval.id
                                  ? null
                                  : historyEval.id,
                              )
                            }
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
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t.score1}
                              </p>
                              <p className="text-lg font-bold text-blue-600">
                                {historyEval.score1?.toFixed(1) || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t.score2}
                              </p>
                              <p className="text-lg font-bold text-green-600">
                                {historyEval.score2?.toFixed(2) || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t.score3}
                              </p>
                              <p className="text-lg font-bold text-purple-600">
                                {historyEval.score3?.toFixed(2) || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t.finalScore}
                              </p>
                              <p className="text-lg font-bold">
                                {historyEval.finalScore?.toFixed(2) || "-"}
                              </p>
                            </div>
                          </div>

                          {historyEval.evaluatorComment && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">
                                {t.evaluatorComment}
                              </p>
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
