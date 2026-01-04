"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Calendar, ClipboardCheck } from "lucide-react";
import { evaluationsTranslations } from "./translations";
import EvaluationForm from "./components/EvaluationForm";

interface Period {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface Employee {
  id: string;
  employeeNumber: string;
  lastName: string;
  firstName: string;
  lastNameEn: string | null;
  firstNameEn: string | null;
  department: { name: string } | null;
  section: { name: string } | null;
  course: { name: string } | null;
  position: string | null;
  qualificationGrade: string | null;
}

interface Evaluation {
  id: string;
  status: string;
  score1: number | null;
  score2: number | null;
  score3: number | null;
  finalScore: number | null;
  finalGrade: string | null;
  employee: Employee;
}

interface EvaluationsClientProps {
  language: "en" | "ja";
  userId: string;
}

export default function EvaluationsClient({
  language,
  userId,
}: EvaluationsClientProps) {
  const t = evaluationsTranslations[language];
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);

  // Fetch active periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await fetch("/api/evaluation/periods");
        if (res.ok) {
          const data = await res.json();
          // ACTIVE, REVIEWステータスの期間のみ表示
          const activePeriods = data.filter(
            (p: Period) => p.status === "ACTIVE" || p.status === "REVIEW"
          );
          setPeriods(activePeriods);
          if (activePeriods.length > 0) {
            setSelectedPeriodId(activePeriods[0].id);
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

  // Fetch evaluatees for the selected period
  const fetchEvaluatees = useCallback(async () => {
    if (!selectedPeriodId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/evaluation/evaluatees?periodId=${selectedPeriodId}`);
      if (res.ok) {
        const data = await res.json();
        setEvaluations(data);
      }
    } catch (error) {
      console.error("Failed to fetch evaluatees:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    fetchEvaluatees();
  }, [fetchEvaluatees]);

  const getEmployeeName = (employee: Employee) => {
    if (language === "en" && employee.lastNameEn && employee.firstNameEn) {
      return `${employee.firstNameEn} ${employee.lastNameEn}`;
    }
    return `${employee.lastName} ${employee.firstName}`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-muted text-muted-foreground",
      IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };
    const labels: Record<string, string> = {
      PENDING: t.evalPending,
      IN_PROGRESS: t.evalInProgress,
      COMPLETED: t.evalCompleted,
      CONFIRMED: t.evalConfirmed,
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
    return <Badge className={styles[grade]}>{grade}</Badge>;
  };

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  // 評価フォーム表示中
  if (selectedEvaluationId) {
    return (
      <EvaluationForm
        language={language}
        evaluationId={selectedEvaluationId}
        periodId={selectedPeriodId}
        onBack={() => {
          setSelectedEvaluationId(null);
          fetchEvaluatees();
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <Card>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold text-foreground">{t.title}</h2>
                <p className="text-sm text-muted-foreground">{t.description}</p>
              </div>
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

          {/* Period Info */}
          {selectedPeriod && (
            <Card className="mb-6 bg-muted/30">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t.periodInfo}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t.periodStatus}: </span>
                    <Badge
                      className={
                        selectedPeriod.status === "ACTIVE"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }
                    >
                      {selectedPeriod.status === "ACTIVE" ? t.statusActive : t.statusReview}
                    </Badge>
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
              </CardContent>
            </Card>
          )}

          {/* Evaluatees Summary */}
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            {t.evaluatees}: {evaluations.length} {t.evaluateeCount}
          </div>

          {/* Evaluatees Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
          ) : periods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t.noPeriods}</div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t.noEvaluatees}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.employeeNumber}</TableHead>
                  <TableHead>{t.employeeInfo}</TableHead>
                  <TableHead>{t.department}</TableHead>
                  <TableHead>{t.position}</TableHead>
                  <TableHead>{t.grade}</TableHead>
                  <TableHead>{t.periodStatus}</TableHead>
                  <TableHead>{t.finalGrade}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((evaluation) => (
                  <TableRow key={evaluation.id}>
                    <TableCell className="font-mono text-sm">
                      {evaluation.employee.employeeNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getEmployeeName(evaluation.employee)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {evaluation.employee.department?.name || "-"}
                      {evaluation.employee.section && ` / ${evaluation.employee.section.name}`}
                      {evaluation.employee.course && ` / ${evaluation.employee.course.name}`}
                    </TableCell>
                    <TableCell>{evaluation.employee.position || "-"}</TableCell>
                    <TableCell>{evaluation.employee.qualificationGrade || "-"}</TableCell>
                    <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
                    <TableCell>{getGradeBadge(evaluation.finalGrade)}</TableCell>
                    <TableCell>
                      <Button
                        variant={evaluation.status === "PENDING" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedEvaluationId(evaluation.id)}
                      >
                        {evaluation.status === "COMPLETED" || evaluation.status === "CONFIRMED"
                          ? t.viewButton
                          : t.evaluateButton}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
