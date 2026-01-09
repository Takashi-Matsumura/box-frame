"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Search, UserCheck, X, AlertTriangle, UserX } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { evaluatorSettingsTranslations } from "./translations";
import { useIsTabletOrMobile } from "@/hooks/use-mobile";

interface DefaultManager {
  id: string;
  name: string;
  position: string | null;
}

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  position: string | null;
  positionCode: string | null;
  departmentId: string | null;
  sectionId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  sectionCode: string | null;
  sectionName: string | null;
  courseCode: string | null;
  courseName: string | null;
  defaultManager: DefaultManager | null;
}

interface Department {
  id: string;
  name: string;
  code: string | null;
  hasIncompleteEvaluators: boolean;
}

interface Evaluator {
  id: string;
  employeeId: string;
  name: string;
  position: string | null;
  positionCode: string | null;
  departmentId: string | null;
  departmentName: string | null;
  sectionId: string | null;
  sectionName: string | null;
  courseId: string | null;
  courseName: string | null;
  isDepartmentManager: boolean;
  isSectionManager: boolean;
  isCourseManager: boolean;
}

interface CustomEvaluator {
  id: string;
  employeeId: string;
  evaluatorId: string;
  periodId: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  evaluator: Employee;
}

interface Period {
  id: string;
  name: string;
}

type ExclusionReason =
  | "MATERNITY_LEAVE"
  | "SICK_LEAVE"
  | "RESIGNATION"
  | "SECONDMENT"
  | "PROBATION"
  | "OTHER";

interface Exclusion {
  id: string;
  employeeId: string;
  periodId: string | null;
  reason: ExclusionReason;
  note: string | null;
}

interface EvaluatorSettingsClientProps {
  language: "en" | "ja";
  userId: string;
  userRole: "MANAGER" | "EXECUTIVE" | "ADMIN";
  userDepartmentId: string | null;
  userSectionId: string | null;
}

export default function EvaluatorSettingsClient({
  language,
  userRole,
  userDepartmentId,
  userSectionId,
}: EvaluatorSettingsClientProps) {
  const t = evaluatorSettingsTranslations[language];
  const isTabletOrMobile = useIsTabletOrMobile();
  const [loading, setLoading] = useState(true);
  const [subordinates, setSubordinates] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Evaluator[]>([]);
  const [customEvaluators, setCustomEvaluators] = useState<CustomEvaluator[]>(
    []
  );
  const [periods, setPeriods] = useState<Period[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("__all__");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [isExclusionDialogOpen, setIsExclusionDialogOpen] = useState(false);
  const [exclusionFormData, setExclusionFormData] = useState<{
    reason: ExclusionReason;
    note: string;
    periodId: string;
  }>({
    reason: "OTHER",
    note: "",
    periodId: "__all__",
  });

  const [formData, setFormData] = useState({
    evaluatorId: "",
    periodId: "__all__",
    effectiveFrom: "",
    effectiveTo: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subordinatesRes, managersRes, customRes, periodsRes, exclusionsRes] =
        await Promise.all([
          fetch("/api/evaluation/subordinates"),
          fetch("/api/evaluation/available-evaluators"),
          fetch("/api/evaluation/custom-evaluators"),
          fetch("/api/evaluation/periods"),
          fetch("/api/evaluation/exclusions"),
        ]);

      if (subordinatesRes.ok) {
        const data: Employee[] = await subordinatesRes.json();
        setSubordinates(data);

        // カスタム評価者データも取得して評価者未設定をチェック
        let customEvalData: CustomEvaluator[] = [];
        if (customRes.ok) {
          customEvalData = await customRes.json();
          setCustomEvaluators(customEvalData);
        }

        // 部門一覧を抽出（重複を除去して部署コード順にソート）
        // 各部門について評価者未設定の社員がいるかチェック
        const deptMap = new Map<string, Department>();
        const customEvalEmployeeIds = new Set(customEvalData.map((ce) => ce.employeeId));

        data.forEach((emp) => {
          if (emp.departmentId && emp.departmentName) {
            const existing = deptMap.get(emp.departmentId);
            // 評価者未設定: デフォルトマネージャーがいない AND カスタム評価者もいない
            const hasNoEvaluator = !emp.defaultManager && !customEvalEmployeeIds.has(emp.id);

            if (existing) {
              // 既存の部門に評価者未設定の社員がいれば更新
              if (hasNoEvaluator) {
                existing.hasIncompleteEvaluators = true;
              }
            } else {
              deptMap.set(emp.departmentId, {
                id: emp.departmentId,
                name: emp.departmentName,
                code: emp.departmentCode,
                hasIncompleteEvaluators: hasNoEvaluator,
              });
            }
          }
        });
        const deptList = Array.from(deptMap.values()).sort((a, b) => {
          // 部署コード順でソート（コードがない場合は末尾に）
          const codeA = a.code || "zzzzzz";
          const codeB = b.code || "zzzzzz";
          return codeA.localeCompare(codeB);
        });
        setDepartments(deptList);
      }

      if (managersRes.ok) {
        const data = await managersRes.json();
        setManagers(data);
      }

      // customRes は subordinatesRes.ok 内で既に処理済み

      if (periodsRes.ok) {
        const data = await periodsRes.json();
        setPeriods(data);
      }

      if (exclusionsRes.ok) {
        const data = await exclusionsRes.json();
        setExclusions(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getCustomEvaluator = (employeeId: string): CustomEvaluator | null => {
    return (
      customEvaluators.find((ce) => ce.employeeId === employeeId) || null
    );
  };

  const getExclusion = (employeeId: string): Exclusion | null => {
    return exclusions.find((e) => e.employeeId === employeeId) || null;
  };

  const isExcluded = (employeeId: string): boolean => {
    return exclusions.some((e) => e.employeeId === employeeId);
  };

  // 編集権限のチェック
  // ADMIN/EXECUTIVE: 全社員を編集可能
  // MANAGER: 同じ部門/課の社員のみ編集可能
  const canEditEmployee = (employee: Employee): boolean => {
    if (userRole === "ADMIN" || userRole === "EXECUTIVE") {
      return true;
    }
    // MANAGERの場合、同じ部門または課の社員のみ編集可能
    if (userDepartmentId && employee.departmentId === userDepartmentId) {
      return true;
    }
    if (userSectionId && employee.sectionId === userSectionId) {
      return true;
    }
    return false;
  };

  const handleOpenDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    const existing = getCustomEvaluator(employee.id);
    if (existing) {
      setFormData({
        evaluatorId: existing.evaluatorId,
        periodId: existing.periodId || "__all__",
        effectiveFrom: existing.effectiveFrom || "",
        effectiveTo: existing.effectiveTo || "",
      });
    } else {
      setFormData({
        evaluatorId: "",
        periodId: "__all__",
        effectiveFrom: "",
        effectiveTo: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedEmployee || !formData.evaluatorId) return;

    setSaving(true);
    try {
      const res = await fetch("/api/evaluation/custom-evaluators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          evaluatorId: formData.evaluatorId,
          periodId:
            formData.periodId === "__all__" ? null : formData.periodId || null,
          effectiveFrom: formData.effectiveFrom || null,
          effectiveTo: formData.effectiveTo || null,
        }),
      });

      if (res.ok) {
        setIsDialogOpen(false);
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || t.saveError);
      }
    } catch (error) {
      console.error("Failed to save:", error);
      alert(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCustomEvaluator = async (customEvaluatorId: string) => {
    if (!confirm(t.confirmRemove)) return;

    try {
      const res = await fetch(
        `/api/evaluation/custom-evaluators/${customEvaluatorId}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || t.saveError);
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  // 評価対象外ダイアログを開く
  const handleOpenExclusionDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    const existing = getExclusion(employee.id);
    if (existing) {
      setExclusionFormData({
        reason: existing.reason,
        note: existing.note || "",
        periodId: existing.periodId || "__all__",
      });
    } else {
      setExclusionFormData({
        reason: "OTHER",
        note: "",
        periodId: "__all__",
      });
    }
    setIsExclusionDialogOpen(true);
  };

  // 評価対象外を設定
  const handleSaveExclusion = async () => {
    if (!selectedEmployee) return;

    setSaving(true);
    try {
      const res = await fetch("/api/evaluation/exclusions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          reason: exclusionFormData.reason,
          note: exclusionFormData.note || null,
          periodId: exclusionFormData.periodId === "__all__" ? null : exclusionFormData.periodId,
        }),
      });

      if (res.ok) {
        setIsExclusionDialogOpen(false);
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || t.exclusionError);
      }
    } catch (error) {
      console.error("Failed to save exclusion:", error);
      alert(t.exclusionError);
    } finally {
      setSaving(false);
    }
  };

  // 評価対象外を解除
  const handleRemoveExclusion = async (exclusionId: string) => {
    if (!confirm(t.confirmRemoveExclusion)) return;

    try {
      const res = await fetch(`/api/evaluation/exclusions/${exclusionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || t.removeExclusionError);
      }
    } catch (error) {
      console.error("Failed to remove exclusion:", error);
    }
  };

  // 評価対象外トグル
  const handleToggleExclusion = async (employee: Employee, currentlyExcluded: boolean) => {
    if (currentlyExcluded) {
      // 解除
      const exclusion = getExclusion(employee.id);
      if (exclusion) {
        try {
          const res = await fetch(`/api/evaluation/exclusions/${exclusion.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            fetchData();
          }
        } catch (error) {
          console.error("Failed to remove exclusion:", error);
        }
      }
    } else {
      // 設定（デフォルト理由: OTHER）
      try {
        const res = await fetch("/api/evaluation/exclusions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: employee.id,
            reason: "OTHER",
            note: null,
            periodId: null,
          }),
        });
        if (res.ok) {
          fetchData();
        }
      } catch (error) {
        console.error("Failed to save exclusion:", error);
      }
    }
  };

  const filteredSubordinates = subordinates.filter((emp) => {
    // 部門フィルタ
    if (selectedDepartmentId !== "__all__" && emp.departmentId !== selectedDepartmentId) {
      return false;
    }
    // 検索フィルタ
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.name.toLowerCase().includes(searchLower) ||
      emp.employeeId.toLowerCase().includes(searchLower)
    );
  });

  // 所属先を取得（レスポンシブ対応: 小画面では最下位の所属のみ）
  const getDepartmentDisplay = (employee: Employee) => {
    if (isTabletOrMobile) {
      // 課 → 部 → 本部 の優先順で1つだけ表示
      return employee.courseName || employee.sectionName || employee.departmentName || "-";
    }
    // デスクトップ: フル表示
    const parts = [
      employee.departmentName,
      employee.sectionName,
      employee.courseName,
    ].filter(Boolean);
    return parts.join(" / ") || "-";
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto mt-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12 text-muted-foreground">
              {t.loading}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <Card>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {userRole === "ADMIN" || userRole === "EXECUTIVE"
                    ? t.allEmployees
                    : t.subordinates}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {userRole === "ADMIN" || userRole === "EXECUTIVE"
                    ? t.descriptionAdmin
                    : t.descriptionManager}
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {t.totalEmployees}: {filteredSubordinates.length}
              {selectedDepartmentId !== "__all__" || searchTerm
                ? ` / ${subordinates.length}`
                : ""}
              {t.people}
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t.searchEmployee}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedDepartmentId}
              onValueChange={setSelectedDepartmentId}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder={t.selectDepartment} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">
                  <span className="flex items-center gap-2">
                    {t.allDepartments}
                    {departments.some((d) => d.hasIncompleteEvaluators) && (
                      <>
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="text-xs text-orange-500">
                          ({departments.filter((d) => d.hasIncompleteEvaluators).length}{t.departmentsWithIssues})
                        </span>
                      </>
                    )}
                  </span>
                </SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    <span className="flex items-center gap-2">
                      {dept.name}
                      {dept.hasIncompleteEvaluators && (
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subordinates list */}
          {filteredSubordinates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t.noEmployees}</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-320px)]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>{t.currentEvaluator}</TableHead>
                    <TableHead>{t.employeeNumber}</TableHead>
                    <TableHead>{t.employeeName}</TableHead>
                    <TableHead>{t.position}</TableHead>
                    <TableHead>{t.department}</TableHead>
                    <TableHead className="text-center">{t.exclusionColumn}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubordinates.map((employee) => {
                    const customEval = getCustomEvaluator(employee.id);
                    const exclusion = getExclusion(employee.id);
                    const excluded = !!exclusion;
                    return (
                      <TableRow
                        key={employee.id}
                        className={excluded ? "opacity-60" : ""}
                      >
                        <TableCell>
                          {excluded ? (
                            <span className="text-muted-foreground">-</span>
                          ) : customEval ? (
                            <Badge
                              className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800"
                              onClick={() => canEditEmployee(employee) && handleOpenDialog(employee)}
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              {customEval.evaluator.name}
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className={canEditEmployee(employee) ? "cursor-pointer hover:bg-muted" : ""}
                              onClick={() => canEditEmployee(employee) && handleOpenDialog(employee)}
                            >
                              {employee.defaultManager
                                ? employee.defaultManager.name
                                : t.defaultEvaluator}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {employee.employeeId}
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${excluded ? "text-muted-foreground" : ""}`}>
                            {employee.name}
                          </span>
                        </TableCell>
                        <TableCell>{employee.position || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getDepartmentDisplay(employee)}
                        </TableCell>
                        <TableCell className="text-center">
                          {canEditEmployee(employee) && (
                            <Switch
                              checked={excluded}
                              onCheckedChange={() => handleToggleExclusion(employee, excluded)}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change evaluator dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t.changeEvaluator}</DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-4 mt-4">
              {/* Selected employee info */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">
                  {t.employee}
                </div>
                <div className="font-medium">{selectedEmployee.name}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedEmployee.employeeId}
                </div>
              </div>

              {/* Evaluator selection */}
              <div className="space-y-2">
                <Label>{t.selectEvaluator}</Label>
                <Select
                  value={formData.evaluatorId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, evaluatorId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectEvaluator} />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {(() => {
                      // 役職コードでソート（低い値が上位職、ただし"000"は最後）
                      const sortByPosition = (a: Evaluator, b: Evaluator) => {
                        const codeA = a.positionCode || "999";
                        const codeB = b.positionCode || "999";
                        // "000"（一般社員）は最後に
                        if (codeA === "000" && codeB !== "000") return 1;
                        if (codeA !== "000" && codeB === "000") return -1;
                        return codeA.localeCompare(codeB);
                      };

                      // 自部門の責任者をフィルタリング（役職順にソート）
                      const sameDeptManagers = managers
                        .filter(
                          (m) =>
                            m.id !== selectedEmployee.id &&
                            m.departmentId === selectedEmployee.departmentId &&
                            (m.isDepartmentManager || m.isSectionManager || m.isCourseManager)
                        )
                        .sort(sortByPosition);

                      // その他の評価者候補（部門ごとにグループ化）
                      const otherManagers = managers.filter(
                        (m) =>
                          m.id !== selectedEmployee.id &&
                          !sameDeptManagers.some((s) => s.id === m.id)
                      );

                      // 部門ごとにグループ化して、各グループ内で役職順にソート
                      const otherByDept = new Map<string, Evaluator[]>();
                      otherManagers.forEach((m) => {
                        const deptName = m.departmentName || "その他";
                        if (!otherByDept.has(deptName)) {
                          otherByDept.set(deptName, []);
                        }
                        otherByDept.get(deptName)!.push(m);
                      });
                      // 各部門内で役職順にソート
                      otherByDept.forEach((list) => list.sort(sortByPosition));

                      return (
                        <>
                          {sameDeptManagers.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-primary font-semibold">
                                {t.sameDepartmentManagers}
                              </SelectLabel>
                              {sameDeptManagers.map((manager) => (
                                <SelectItem key={manager.id} value={manager.id}>
                                  {manager.employeeId} - {manager.name}
                                  {manager.position && ` (${manager.position})`}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                          {Array.from(otherByDept.entries()).map(([deptName, deptManagers]) => (
                            <SelectGroup key={deptName}>
                              <SelectLabel className="text-muted-foreground">
                                {deptName}
                              </SelectLabel>
                              {deptManagers.map((manager) => (
                                <SelectItem key={manager.id} value={manager.id}>
                                  {manager.employeeId} - {manager.name}
                                  {manager.position && ` (${manager.position})`}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </>
                      );
                    })()}
                  </SelectContent>
                </Select>
              </div>

              {/* Period selection */}
              <div className="space-y-2">
                <Label>{t.period}</Label>
                <Select
                  value={formData.periodId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, periodId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.allPeriods} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t.allPeriods}</SelectItem>
                    {periods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.effectiveFrom}</Label>
                  <Input
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, effectiveFrom: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.effectiveTo}</Label>
                  <Input
                    type="date"
                    value={formData.effectiveTo}
                    onChange={(e) =>
                      setFormData({ ...formData, effectiveTo: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t.cancel}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.evaluatorId}
                >
                  {saving ? t.loading : t.save}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exclusion dialog */}
      <Dialog open={isExclusionDialogOpen} onOpenChange={setIsExclusionDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t.excludeFromEvaluation}</DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-4 mt-4">
              {/* Selected employee info */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">
                  {t.employee}
                </div>
                <div className="font-medium">{selectedEmployee.name}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedEmployee.employeeId}
                </div>
              </div>

              {/* Reason selection */}
              <div className="space-y-2">
                <Label>{t.exclusionReason}</Label>
                <Select
                  value={exclusionFormData.reason}
                  onValueChange={(value) =>
                    setExclusionFormData({
                      ...exclusionFormData,
                      reason: value as ExclusionReason,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MATERNITY_LEAVE">
                      {t.exclusionReasons.MATERNITY_LEAVE}
                    </SelectItem>
                    <SelectItem value="SICK_LEAVE">
                      {t.exclusionReasons.SICK_LEAVE}
                    </SelectItem>
                    <SelectItem value="RESIGNATION">
                      {t.exclusionReasons.RESIGNATION}
                    </SelectItem>
                    <SelectItem value="SECONDMENT">
                      {t.exclusionReasons.SECONDMENT}
                    </SelectItem>
                    <SelectItem value="PROBATION">
                      {t.exclusionReasons.PROBATION}
                    </SelectItem>
                    <SelectItem value="OTHER">
                      {t.exclusionReasons.OTHER}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Period selection */}
              <div className="space-y-2">
                <Label>{t.period}</Label>
                <Select
                  value={exclusionFormData.periodId}
                  onValueChange={(value) =>
                    setExclusionFormData({ ...exclusionFormData, periodId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.allPeriods} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t.allPeriods}</SelectItem>
                    {periods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label>{t.exclusionNote}</Label>
                <Textarea
                  value={exclusionFormData.note}
                  onChange={(e) =>
                    setExclusionFormData({
                      ...exclusionFormData,
                      note: e.target.value,
                    })
                  }
                  placeholder=""
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsExclusionDialogOpen(false)}
                >
                  {t.cancel}
                </Button>
                <Button
                  onClick={handleSaveExclusion}
                  disabled={saving}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {saving ? t.loading : t.save}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
