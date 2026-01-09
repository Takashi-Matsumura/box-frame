"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RefreshCw, ChevronDown, ChevronUp, Database, Zap } from "lucide-react";
import { evaluationMasterTranslations } from "../translations";

interface Criteria1SectionProps {
  language: "en" | "ja";
  selectedPeriodId: string | null;
}

interface Period {
  id: string;
  name: string;
  year: number;
  term: string;
  status: string;
}

interface Criteria1Result {
  id: string;
  periodId: string;
  organizationLevel: string;
  organizationId: string;
  organizationName: string;
  targetProfit: number | null;
  actualProfit: number | null;
  achievementRate: number | null;
  departmentType: "DIRECT" | "INDIRECT";
  linkedOrganizationLevel?: string | null;
  linkedOrganizationId?: string | null;
  linkedOrganizationName?: string | null;
  employeeCount?: number;
  managerName?: string | null;
  employees?: {
    id: string;
    name: string;
    position: string;
    qualificationGradeCode: string | null;
  }[];
  organizationCode?: string | null;
  sortNumber?: number;
  departmentName?: string | null;
  sectionName?: string | null;
  courseName?: string | null;
}

export default function Criteria1Section({
  language,
  selectedPeriodId,
}: Criteria1SectionProps) {
  const t = evaluationMasterTranslations[language];
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState<string>(selectedPeriodId || "");
  const [results, setResults] = useState<Criteria1Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{
    id: string;
    field: "targetProfit" | "actualProfit";
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // フィルター関連
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  // 予実表示モード（ON: 予算・実績・達成率を表示、OFF: 部門タイプ・社員数・紐付け先を表示）
  const [showBudgetColumns, setShowBudgetColumns] = useState(false);

  // Fetch periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await fetch("/api/evaluation/periods");
        if (res.ok) {
          const data = await res.json();
          setPeriods(data);
          if (data.length > 0 && !periodId) {
            setPeriodId(data[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch periods:", error);
      }
    };
    fetchPeriods();
  }, [periodId]);

  const fetchResults = useCallback(async () => {
    if (!periodId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/evaluation/criteria1?periodId=${periodId}`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Failed to fetch results:", error);
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    if (periodId) {
      fetchResults();
    }
  }, [periodId, fetchResults]);

  const handleDepartmentTypeChange = async (
    result: Criteria1Result,
    newType: "DIRECT" | "INDIRECT"
  ) => {
    try {
      const response = await fetch("/api/evaluation/criteria1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: result.id,
          periodId: result.periodId,
          organizationLevel: result.organizationLevel,
          organizationId: result.organizationId,
          organizationName: result.organizationName,
          targetProfit: result.targetProfit,
          actualProfit: result.actualProfit,
          departmentType: newType,
          linkedOrganizationLevel:
            newType === "INDIRECT" ? result.linkedOrganizationLevel : null,
          linkedOrganizationId:
            newType === "INDIRECT" ? result.linkedOrganizationId : null,
          linkedOrganizationName:
            newType === "INDIRECT" ? result.linkedOrganizationName : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      await fetchResults();
    } catch (error) {
      console.error("Failed to update department type:", error);
      alert(
        language === "ja"
          ? "部門タイプの更新に失敗しました"
          : "Failed to update department type"
      );
    }
  };

  const handleLinkedOrganizationChange = async (
    result: Criteria1Result,
    linkedOrgKey: string
  ) => {
    if (!linkedOrgKey || linkedOrgKey === "none") {
      // 紐付けを解除
      try {
        const response = await fetch("/api/evaluation/criteria1", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: result.id,
            periodId: result.periodId,
            organizationLevel: result.organizationLevel,
            organizationId: result.organizationId,
            organizationName: result.organizationName,
            targetProfit: result.targetProfit,
            actualProfit: result.actualProfit,
            departmentType: result.departmentType,
            linkedOrganizationLevel: null,
            linkedOrganizationId: null,
            linkedOrganizationName: null,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update");
        }

        await fetchResults();
      } catch (error) {
        console.error("Failed to update linked organization:", error);
        alert(
          language === "ja"
            ? "紐付け解除に失敗しました"
            : "Failed to unlink organization"
        );
      }
      return;
    }

    // linkedOrgKey format: "LEVEL:ID:NAME"
    const [level, id, name] = linkedOrgKey.split(":");

    try {
      const response = await fetch("/api/evaluation/criteria1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: result.id,
          periodId: result.periodId,
          organizationLevel: result.organizationLevel,
          organizationId: result.organizationId,
          organizationName: result.organizationName,
          targetProfit: result.targetProfit,
          actualProfit: result.actualProfit,
          departmentType: result.departmentType,
          linkedOrganizationLevel: level,
          linkedOrganizationId: id,
          linkedOrganizationName: name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      await fetchResults();
    } catch (error) {
      console.error("Failed to update linked organization:", error);
      alert(
        language === "ja"
          ? "紐付けの更新に失敗しました"
          : "Failed to update linked organization"
      );
    }
  };

  const handleInitialize = async () => {
    if (!periodId) return;

    if (
      !confirm(
        language === "ja"
          ? "組織図データから結果評価テーブルを初期化しますか？\n既存のデータには影響しません（新規データのみ追加されます）"
          : "Initialize Results Evaluation table from organization data?\nExisting data will not be affected (only new records will be added)"
      )
    ) {
      return;
    }

    setInitializing(true);
    try {
      const response = await fetch("/api/evaluation/criteria1/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId }),
      });

      if (!response.ok) {
        throw new Error("Failed to initialize");
      }

      const result = await response.json();
      alert(result.message);
      await fetchResults();
    } catch (error) {
      console.error("Failed to initialize:", error);
      alert(
        language === "ja" ? "初期化に失敗しました" : "Failed to initialize"
      );
    } finally {
      setInitializing(false);
    }
  };

  const handleSyncScores = async () => {
    if (!periodId) return;

    if (
      !confirm(
        language === "ja"
          ? "結果評価の達成率を全社員の評価スコア（score1）に反映しますか？\n既存のscore1は上書きされます。"
          : "Sync achievement rates to all employees' evaluation scores (score1)?\nExisting score1 values will be overwritten."
      )
    ) {
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch("/api/evaluation/criteria1/sync-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync scores");
      }

      const result = await response.json();
      const { statistics } = result;

      const message =
        language === "ja"
          ? `評価スコアの自動反映が完了しました。\n\n更新: ${statistics.updated}件\nスキップ: ${statistics.skipped}件\nエラー: ${statistics.errors}件`
          : `Score sync completed.\n\nUpdated: ${statistics.updated}\nSkipped: ${statistics.skipped}\nErrors: ${statistics.errors}`;

      alert(message);
    } catch (error) {
      console.error("Failed to sync scores:", error);
      alert(
        language === "ja"
          ? "評価スコアの反映に失敗しました"
          : "Failed to sync scores"
      );
    } finally {
      setSyncing(false);
    }
  };

  const toggleExpandRow = (resultId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const formatCurrencyWithUnit = (value: number | null) => {
    if (value === null) return "-";
    return `${new Intl.NumberFormat("ja-JP").format(value)} ${language === "ja" ? "千円" : "K"}`;
  };

  const handleStartEdit = (
    resultId: string,
    field: "targetProfit" | "actualProfit",
    currentValue: number | null
  ) => {
    setEditingField({ id: resultId, field });
    setEditingValue(currentValue ? currentValue.toString() : "");
  };

  const handleSaveInlineEdit = async (result: Criteria1Result) => {
    if (!editingField) return;

    try {
      const value = editingValue
        ? parseInt(editingValue.replace(/,/g, ""), 10)
        : null;

      const response = await fetch("/api/evaluation/criteria1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: result.id,
          periodId: result.periodId,
          organizationLevel: result.organizationLevel,
          organizationId: result.organizationId,
          organizationName: result.organizationName,
          targetProfit:
            editingField.field === "targetProfit" ? value : result.targetProfit,
          actualProfit:
            editingField.field === "actualProfit" ? value : result.actualProfit,
          departmentType: result.departmentType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      setEditingField(null);
      setEditingValue("");
      await fetchResults();
    } catch (error) {
      console.error("Failed to update profit:", error);
      alert(language === "ja" ? "更新に失敗しました" : "Failed to update");
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditingValue("");
  };

  const calculateAchievementRate = (
    targetProfit: number | null,
    actualProfit: number | null
  ): number | null => {
    if (!targetProfit || !actualProfit || targetProfit <= 0) {
      return null;
    }
    return (actualProfit / targetProfit) * 100;
  };

  const formatPercentage = (value: number | null) => {
    if (value === null) return "-";
    return `${value.toFixed(1)}%`;
  };

  // 管理者バッジのスタイルを役職レベルで取得
  const getManagerBadgeStyle = (level: string) => {
    switch (level) {
      case "DEPARTMENT":
        return "bg-purple-100 text-purple-800 border border-purple-200";
      case "SECTION":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "COURSE":
        return "bg-green-100 text-green-800 border border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  // 管理者の役職名を取得
  const getManagerTitle = (level: string) => {
    switch (level) {
      case "DEPARTMENT":
        return language === "ja" ? "本部長" : "Dept Head";
      case "SECTION":
        return language === "ja" ? "部長" : "Section Head";
      case "COURSE":
        return language === "ja" ? "課長" : "Course Head";
      default:
        return "";
    }
  };

  // フィルター処理
  const filteredResults = results.filter((result) => {
    if (selectedDepartment === "all") return true;
    return result.departmentName === selectedDepartment;
  });

  // 部門リストの取得（重複なし、コード順でソート）
  const departmentList = Array.from(
    new Map(
      results
        .filter((r) => r.organizationLevel === "DEPARTMENT")
        .map((r) => [
          r.departmentName,
          {
            name: r.departmentName,
            code: r.organizationCode,
            sortNumber: r.sortNumber,
          },
        ])
    ).values()
  )
    .filter((d) => d.name)
    .sort((a, b) => (a.sortNumber || 0) - (b.sortNumber || 0))
    .map((d) => d.name as string);

  // 直接部門のリストを取得（紐付け先候補）
  // displayNameは最終組織名のみ表示（課があれば課、部があれば部、本部のみなら本部）
  const directOrganizations = results
    .filter((r) => r.departmentType === "DIRECT")
    .map((r) => ({
      key: `${r.organizationLevel}:${r.organizationId}:${r.organizationName}`,
      level: r.organizationLevel,
      id: r.organizationId,
      name: r.organizationName,
      departmentName: r.departmentName,
      sectionName: r.sectionName,
      courseName: r.courseName,
      // 最終組織名のみを表示
      displayName:
        r.organizationLevel === "COURSE"
          ? r.courseName || r.organizationName
          : r.organizationLevel === "SECTION"
            ? r.sectionName || r.organizationName
            : r.departmentName || r.organizationName,
    }));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // 評価期間が設定されていない場合
  if (periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center max-w-md">
          <div className="mb-4 text-gray-400">
            <Database className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {language === "ja"
              ? "評価期間が設定されていません"
              : "No Evaluation Period Set"}
          </h3>
          <p className="text-sm text-gray-500">
            {language === "ja"
              ? "「評価期間」タブで評価期間を作成してください。"
              : "Please create an evaluation period in the 'Periods' tab."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t.goalsTitle}</h2>
          <p className="text-sm text-gray-500">{t.goalsDescription}</p>
        </div>

        {/* 評価期間選択 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{t.selectPeriod}:</span>
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="w-[200px]">
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
      </div>

      {/* フィルターとアクションボタン */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4 flex-shrink-0">
        <div className="flex gap-3 flex-wrap items-center">
          {/* 部門フィルター */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {t.filterByDepartment}:
            </span>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder={t.allDepartments} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allDepartments}</SelectItem>
                {departmentList.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 予実表示トグル */}
          <div className="flex items-center gap-2">
            <Switch
              id="show-budget-columns"
              checked={showBudgetColumns}
              onCheckedChange={setShowBudgetColumns}
            />
            <Label htmlFor="show-budget-columns" className="text-sm text-gray-600 cursor-pointer">
              {language === "ja" ? "予実表示" : "Show Budget"}
            </Label>
          </div>

          {/* 件数表示 */}
          <div className="text-sm text-gray-600">
            {language === "ja"
              ? `${filteredResults.length}件を表示`
              : `Showing ${filteredResults.length} items`}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSyncScores}
            disabled={syncing || !periodId || results.length === 0}
            size="sm"
          >
            <Zap className="w-4 h-4 mr-2" />
            {syncing
              ? language === "ja"
                ? "反映中..."
                : "Syncing..."
              : t.syncScores}
          </Button>
          <Button
            onClick={handleInitialize}
            disabled={initializing || !periodId}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${initializing ? "animate-spin" : ""}`} />
            {initializing
              ? language === "ja"
                ? "初期化中..."
                : "Initializing..."
              : t.initializeFromOrg}
          </Button>
        </div>
      </div>

      {/* メインコンテンツ（スクロール領域） */}
      <div className="flex-1 overflow-y-auto">
        {/* 初期化が必要な場合 */}
        {results.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-12 px-4 border rounded-lg bg-gray-50">
          <div className="text-center max-w-md">
            <div className="mb-4 text-gray-400">
              <Database className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {language === "ja"
                ? "評価データが初期化されていません"
                : "Evaluation Data Not Initialized"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {language === "ja"
                ? "「組織図から初期化」ボタンをクリックして、評価データを作成してください。"
                : "Click the 'Initialize from Org Chart' button to create evaluation data."}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* データテーブル */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.typeDepartment}</TableHead>
                  <TableHead>{t.typeSection}</TableHead>
                  <TableHead>{t.typeCourse}</TableHead>
                  {!showBudgetColumns && (
                    <TableHead className="text-center">{t.departmentType}</TableHead>
                  )}
                  {!showBudgetColumns && (
                    <TableHead className="text-center">{t.employeeCount}</TableHead>
                  )}
                  {!showBudgetColumns && (
                    <TableHead>{t.linkedTo}</TableHead>
                  )}
                  {showBudgetColumns && (
                    <TableHead className="text-right">{language === "ja" ? "予算" : "Budget"}</TableHead>
                  )}
                  {showBudgetColumns && (
                    <TableHead className="text-right">{t.actualProfit}</TableHead>
                  )}
                  {showBudgetColumns && (
                    <TableHead className="text-right">{t.achievementRate}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => (
                  <TableRow
                    key={result.id}
                    className={
                      result.departmentType === "DIRECT"
                        ? "bg-emerald-50 hover:bg-emerald-100"
                        : ""
                    }
                  >
                    <TableCell>
                      {result.organizationLevel === "COMPANY" ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-blue-900">
                            {t.levelCompany}
                          </span>
                        </div>
                      ) : result.departmentName ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-gray-900">
                            {result.departmentName}
                          </span>
                          {result.organizationLevel === "DEPARTMENT" &&
                            result.managerName && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${getManagerBadgeStyle(result.organizationLevel)}`}
                              >
                                <span className="mr-1">
                                  {getManagerTitle(result.organizationLevel)}:
                                </span>
                                <span className="font-semibold">
                                  {result.managerName}
                                </span>
                              </span>
                            )}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {result.sectionName && (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-gray-900">
                            {result.sectionName}
                          </span>
                          {result.organizationLevel === "SECTION" &&
                            result.managerName && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${getManagerBadgeStyle(result.organizationLevel)}`}
                              >
                                <span className="mr-1">
                                  {getManagerTitle(result.organizationLevel)}:
                                </span>
                                <span className="font-semibold">
                                  {result.managerName}
                                </span>
                              </span>
                            )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.courseName && (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-gray-900">
                            {result.courseName}
                          </span>
                          {result.organizationLevel === "COURSE" &&
                            result.managerName && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${getManagerBadgeStyle(result.organizationLevel)}`}
                              >
                                <span className="mr-1">
                                  {getManagerTitle(result.organizationLevel)}:
                                </span>
                                <span className="font-semibold">
                                  {result.managerName}
                                </span>
                              </span>
                            )}
                        </div>
                      )}
                    </TableCell>
                    {!showBudgetColumns && (
                      <TableCell className="text-center">
                        <Select
                          value={result.departmentType}
                          onValueChange={(value) =>
                            handleDepartmentTypeChange(
                              result,
                              value as "DIRECT" | "INDIRECT"
                            )
                          }
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INDIRECT">
                              {t.departmentTypeIndirect}
                            </SelectItem>
                            <SelectItem value="DIRECT">
                              {t.departmentTypeDirect}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    {!showBudgetColumns && (
                    <TableCell className="text-center">
                      {result.employeeCount !== undefined &&
                      result.employeeCount > 0 ? (
                        <div className="flex flex-col items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpandRow(result.id)}
                            className="gap-1"
                          >
                            <Badge variant="secondary">{result.employeeCount}</Badge>
                            {expandedRows.has(result.id) ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </Button>
                          {/* 展開された社員リスト */}
                          {expandedRows.has(result.id) && (
                            <div className="mt-2 w-full max-w-md bg-gray-50 rounded-md p-2 border text-left">
                              <div className="text-xs font-semibold text-gray-700 mb-1 pb-1 border-b">
                                {language === "ja"
                                  ? "所属社員一覧"
                                  : "Employee List"}
                              </div>
                              <div className="max-h-32 overflow-y-auto text-xs">
                                {result.employees?.map((emp, idx) => (
                                  <div
                                    key={emp.id}
                                    className="py-1 hover:bg-gray-100 px-1 rounded flex items-center justify-between gap-2"
                                  >
                                    <span className="text-gray-900">
                                      {idx + 1}. {emp.name}
                                    </span>
                                    <span className="text-gray-500 text-xs flex-shrink-0">
                                      {emp.position ||
                                        emp.qualificationGradeCode ||
                                        "-"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </TableCell>
                    )}
                    {!showBudgetColumns && (
                      <TableCell>
                        {result.departmentType === "INDIRECT" ? (
                          <Select
                            value={
                              result.linkedOrganizationId
                                ? `${result.linkedOrganizationLevel}:${result.linkedOrganizationId}:${result.linkedOrganizationName}`
                                : "none"
                            }
                            onValueChange={(value) =>
                              handleLinkedOrganizationChange(result, value)
                            }
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder={t.selectLinkedOrg} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t.notLinked}</SelectItem>
                              {directOrganizations.map((org) => (
                                <SelectItem key={org.key} value={org.key}>
                                  {org.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>
                    )}
                    {showBudgetColumns && (
                    <TableCell className="text-right">
                      {result.departmentType === "DIRECT" ? (
                        editingField?.id === result.id &&
                        editingField?.field === "targetProfit" ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="text"
                              value={editingValue}
                              onChange={(e) => {
                                const value = e.target.value.replace(
                                  /[^0-9]/g,
                                  ""
                                );
                                setEditingValue(value);
                              }}
                              onBlur={() => handleSaveInlineEdit(result)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveInlineEdit(result);
                                } else if (e.key === "Escape") {
                                  handleCancelEdit();
                                }
                              }}
                              className="w-28 text-right"
                              placeholder="0"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleStartEdit(
                                result.id,
                                "targetProfit",
                                result.targetProfit
                              )
                            }
                            className="font-mono"
                          >
                            {formatCurrencyWithUnit(result.targetProfit)}
                          </Button>
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    )}
                    {showBudgetColumns && (
                    <TableCell className="text-right">
                      {result.departmentType === "DIRECT" ? (
                        editingField?.id === result.id &&
                        editingField?.field === "actualProfit" ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="text"
                              value={editingValue}
                              onChange={(e) => {
                                const value = e.target.value.replace(
                                  /[^0-9]/g,
                                  ""
                                );
                                setEditingValue(value);
                              }}
                              onBlur={() => handleSaveInlineEdit(result)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveInlineEdit(result);
                                } else if (e.key === "Escape") {
                                  handleCancelEdit();
                                }
                              }}
                              className="w-28 text-right"
                              placeholder="0"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleStartEdit(
                                result.id,
                                "actualProfit",
                                result.actualProfit
                              )
                            }
                            className="font-mono"
                          >
                            {formatCurrencyWithUnit(result.actualProfit)}
                          </Button>
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    )}
                    {showBudgetColumns && (
                    <TableCell className="text-right">
                      {(() => {
                        if (result.departmentType !== "DIRECT") {
                          // 間接部門: 紐付け先の達成率を表示
                          if (!result.linkedOrganizationId) {
                            return <span className="text-gray-400">-</span>;
                          }

                          const rate = result.achievementRate;
                          if (rate === null) {
                            return <span className="text-gray-400">-</span>;
                          }

                          return (
                            <Badge
                              variant={
                                rate >= 100
                                  ? "default"
                                  : rate >= 80
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {formatPercentage(rate)}
                            </Badge>
                          );
                        }

                        // 直接部門: 計算した達成率を表示
                        const rate = calculateAchievementRate(
                          result.targetProfit,
                          result.actualProfit
                        );

                        if (rate === null) {
                          return <span className="text-gray-400">-</span>;
                        }

                        return (
                          <Badge
                            variant={
                              rate >= 100
                                ? "default"
                                : rate >= 80
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {formatPercentage(rate)}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    )}
                  </TableRow>
                ))}
                {filteredResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {selectedDepartment === "all"
                        ? t.noDataFound
                        : language === "ja"
                          ? "選択した部門にデータがありません"
                          : "No data found for selected department"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

        </>
      )}
      </div>
    </div>
  );
}
