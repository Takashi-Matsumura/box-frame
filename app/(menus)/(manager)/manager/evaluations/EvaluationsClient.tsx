"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Users, Search, X } from "lucide-react";
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
  employeeId: string;
  name: string;
  nameKana: string | null;
  department: { code: string; name: string } | null;
  section: { code: string; name: string } | null;
  course: { code: string; name: string } | null;
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
  userRole: string;
}

export default function EvaluationsClient({
  language,
  userId,
  userRole,
}: EvaluationsClientProps) {
  const t = evaluationsTranslations[language];
  const isAdmin = userRole === "ADMIN";
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);

  // ADMIN用フィルター状態
  const [searchName, setSearchName] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // 本部変更時に部・課をリセット
  const handleDepartmentChange = useCallback((value: string) => {
    setSelectedDepartment(value);
    setSelectedSection("all");
    setSelectedCourse("all");
  }, []);

  // 部変更時に課をリセット
  const handleSectionChange = useCallback((value: string) => {
    setSelectedSection(value);
    setSelectedCourse("all");
  }, []);

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
    return employee.name;
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

  // ADMIN用: 本部リストを抽出（コード順）
  const departments = useMemo(() => {
    const deptMap = new Map<string, { code: string; name: string }>();
    evaluations.forEach((e) => {
      if (e.employee.department?.name && e.employee.department?.code) {
        deptMap.set(e.employee.department.name, {
          code: e.employee.department.code,
          name: e.employee.department.name,
        });
      }
    });
    return Array.from(deptMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [evaluations]);

  // ADMIN用: 部リストを抽出（選択した本部に応じてフィルタ、コード順）
  const sections = useMemo(() => {
    if (selectedDepartment === "all") return [];
    const secMap = new Map<string, { code: string; name: string }>();
    evaluations.forEach((e) => {
      if (
        e.employee.department?.name === selectedDepartment &&
        e.employee.section?.name &&
        e.employee.section?.code
      ) {
        secMap.set(e.employee.section.name, {
          code: e.employee.section.code,
          name: e.employee.section.name,
        });
      }
    });
    return Array.from(secMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [evaluations, selectedDepartment]);

  // ADMIN用: 課リストを抽出（選択した部に応じてフィルタ、コード順）
  const courses = useMemo(() => {
    if (selectedSection === "all") return [];
    const courseMap = new Map<string, { code: string; name: string }>();
    evaluations.forEach((e) => {
      if (
        e.employee.department?.name === selectedDepartment &&
        e.employee.section?.name === selectedSection &&
        e.employee.course?.name &&
        e.employee.course?.code
      ) {
        courseMap.set(e.employee.course.name, {
          code: e.employee.course.code,
          name: e.employee.course.name,
        });
      }
    });
    return Array.from(courseMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [evaluations, selectedDepartment, selectedSection]);

  // ADMIN用: フィルタリング済み評価リスト
  const filteredEvaluations = useMemo(() => {
    if (!isAdmin) return evaluations;

    return evaluations.filter((e) => {
      // 社員名検索
      if (searchName) {
        const search = searchName.toLowerCase();
        const nameMatch = e.employee.name?.toLowerCase().includes(search);
        const kanaMatch = e.employee.nameKana?.toLowerCase().includes(search);
        const idMatch = e.employee.employeeId?.toLowerCase().includes(search);
        if (!nameMatch && !kanaMatch && !idMatch) return false;
      }

      // 本部フィルター
      if (selectedDepartment !== "all") {
        if (e.employee.department?.name !== selectedDepartment) return false;
      }

      // 部フィルター
      if (selectedSection !== "all") {
        if (e.employee.section?.name !== selectedSection) return false;
      }

      // 課フィルター
      if (selectedCourse !== "all") {
        if (e.employee.course?.name !== selectedCourse) return false;
      }

      // ステータスフィルター
      if (selectedStatus === "incomplete") {
        // 未完了 = PENDING または IN_PROGRESS
        if (e.status !== "PENDING" && e.status !== "IN_PROGRESS") return false;
      } else if (selectedStatus !== "all") {
        if (e.status !== selectedStatus) return false;
      }

      return true;
    });
  }, [isAdmin, evaluations, searchName, selectedDepartment, selectedSection, selectedCourse, selectedStatus]);

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
    <div className="max-w-7xl mx-auto mt-4">
      <Card>
        <CardContent className="p-4">
          {/* Period Info - Compact */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b">
            <div className="flex items-center gap-4 text-sm">
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="w-[180px] h-8">
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
              {selectedPeriod && (
                <>
                  <Badge
                    className={
                      selectedPeriod.status === "ACTIVE"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }
                  >
                    {selectedPeriod.status === "ACTIVE" ? t.statusActive : t.statusReview}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(selectedPeriod.startDate).toLocaleDateString(language)} 〜 {new Date(selectedPeriod.endDate).toLocaleDateString(language)}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              {t.evaluatees}: {isAdmin && filteredEvaluations.length !== evaluations.length
                ? `${filteredEvaluations.length} / ${evaluations.length} ${t.evaluateeCount}`
                : `${evaluations.length} ${t.evaluateeCount}`}
            </div>
          </div>

          {/* ADMIN Filter UI */}
          {isAdmin && evaluations.length > 0 && (
            <div className="flex items-center gap-3 mb-3 pb-3 border-b flex-wrap">
              <div className="relative flex-1 max-w-xs min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t.searchPlaceholder}
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-8 h-8"
                />
                {searchName && (
                  <button
                    onClick={() => setSearchName("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* 本部フィルター */}
              <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue placeholder={t.allDepartments} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allDepartments}</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.code} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* 部フィルター（本部選択時のみ表示） */}
              {selectedDepartment !== "all" && sections.length > 0 && (
                <Select value={selectedSection} onValueChange={handleSectionChange}>
                  <SelectTrigger className="w-[160px] h-8">
                    <SelectValue placeholder={t.allSections} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allSections}</SelectItem>
                    {sections.map((sec) => (
                      <SelectItem key={sec.code} value={sec.name}>
                        {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* 課フィルター（部選択時のみ表示） */}
              {selectedSection !== "all" && courses.length > 0 && (
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="w-[160px] h-8">
                    <SelectValue placeholder={t.allCourses} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allCourses}</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.code} value={course.name}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* ステータスフィルター */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue placeholder={t.allStatuses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allStatuses}</SelectItem>
                  <SelectItem value="incomplete">{t.incompleteOnly}</SelectItem>
                  <SelectItem value="PENDING">{t.evalPending}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t.evalInProgress}</SelectItem>
                  <SelectItem value="COMPLETED">{t.evalCompleted}</SelectItem>
                  <SelectItem value="CONFIRMED">{t.evalConfirmed}</SelectItem>
                </SelectContent>
              </Select>
              {(searchName || selectedDepartment !== "all" || selectedStatus !== "all") && (
                <button
                  onClick={() => {
                    setSearchName("");
                    handleDepartmentChange("all");
                    setSelectedStatus("all");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  {t.clearFilter}
                </button>
              )}
            </div>
          )}

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvaluations.map((evaluation) => (
                  <TableRow
                    key={evaluation.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedEvaluationId(evaluation.id)}
                  >
                    <TableCell className="font-mono text-sm">
                      {evaluation.employee.employeeId}
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
