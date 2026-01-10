"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Merge,
  Plus,
  RefreshCw,
  Save,
  Split,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { evaluationMasterTranslations } from "../translations";

interface Weight {
  id: string;
  positionCode: string;
  positionName: string | null;
  gradeCode: string;
  resultsWeight: number;
  processWeight: number;
  growthWeight: number;
  employeeCount: number;
  employeeNames?: string[];
}

interface PositionStat {
  positionCode: string;
  positionName: string;
  grades: Array<{ gradeCode: string; employeeCount: number }>;
  totalEmployees: number;
}

interface DetectionResult {
  allCombinations: Array<{
    positionCode: string;
    positionName: string;
    gradeCode: string;
    employeeCount: number;
  }>;
  configuredCombinations: Array<{ positionCode: string; gradeCode: string }>;
  missingCombinations: Array<{
    positionCode: string;
    positionName: string;
    gradeCode: string;
    employeeCount: number;
  }>;
  positionStats: PositionStat[];
  totalEmployees: number;
}

interface Period {
  id: string;
  name: string;
}

interface PositionGroup {
  id: string;
  name: string;
  nameEn: string | null;
  displayOrder: number;
  positionCodes: string[];
}

interface WeightsSectionProps {
  language: "en" | "ja";
  selectedPeriodId: string | null;
}

// 役職ごとにグループ化
interface GroupedWeights {
  positionCode: string;
  positionName: string | null;
  grades: Weight[];
  totalEmployees: number;
}

// 表示用のグループ（結合された役職グループ）
interface DisplayGroup {
  id: string;
  name: string;
  positionCodes: string[];
  positions: GroupedWeights[];
  totalEmployees: number;
  totalSettings: number;
  displayOrder: number;
}

export default function WeightsSection({
  language,
  selectedPeriodId,
}: WeightsSectionProps) {
  const t = evaluationMasterTranslations[language];
  const [periods, setPeriods] = useState<Period[]>([]);
  const [weights, setWeights] = useState<Weight[]>([]);
  const [groupedWeights, setGroupedWeights] = useState<GroupedWeights[]>([]);
  const [positionGroups, setPositionGroups] = useState<PositionGroup[]>([]);
  const [displayGroups, setDisplayGroups] = useState<DisplayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodId, setPeriodId] = useState<string>(selectedPeriodId || "");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Weight | null>(null);
  const [detectionResult, setDetectionResult] =
    useState<DetectionResult | null>(null);
  const [isDetectDialogOpen, setIsDetectDialogOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(
    new Set(),
  );

  // 結合ダイアログの状態
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [mergeSelectedPositions, setMergeSelectedPositions] = useState<
    string[]
  >([]);
  const [mergeGroupName, setMergeGroupName] = useState("");

  // 分離ダイアログの状態
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  const [splitTargetGroup, setSplitTargetGroup] = useState<DisplayGroup | null>(
    null,
  );
  const [splitSelectedPositions, setSplitSelectedPositions] = useState<
    string[]
  >([]);

  // グループ削除の状態
  const [deleteGroupTarget, setDeleteGroupTarget] =
    useState<DisplayGroup | null>(null);

  // グループのデフォルト重み値（結合グループ用）
  const [groupDefaultWeights, setGroupDefaultWeights] = useState<
    Record<
      string,
      { resultsWeight: number; processWeight: number; growthWeight: number }
    >
  >({});

  const [formData, setFormData] = useState({
    positionCode: "",
    positionName: "",
    gradeCode: "",
    resultsWeight: 30,
    processWeight: 40,
    growthWeight: 30,
  });

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

  // Fetch position groups
  const fetchPositionGroups = useCallback(async () => {
    if (!periodId) return;
    try {
      const res = await fetch(
        `/api/evaluation/position-groups?periodId=${periodId}`,
      );
      if (res.ok) {
        const data: PositionGroup[] = await res.json();
        setPositionGroups(data);
      }
    } catch (error) {
      console.error("Failed to fetch position groups:", error);
    }
  }, [periodId]);

  const fetchWeights = useCallback(async () => {
    if (!periodId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/evaluation/weights?periodId=${periodId}&includeNames=true`,
      );
      if (res.ok) {
        const data: Weight[] = await res.json();
        setWeights(data);

        // 役職ごとにグループ化
        const grouped = new Map<string, GroupedWeights>();
        for (const w of data) {
          const key = w.positionCode;
          if (!grouped.has(key)) {
            grouped.set(key, {
              positionCode: w.positionCode,
              positionName: w.positionName,
              grades: [],
              totalEmployees: 0,
            });
          }
          const group = grouped.get(key)!;
          group.grades.push(w);
          group.totalEmployees += w.employeeCount;
        }

        // 配列に変換
        const groupedArray = Array.from(grouped.values());
        setGroupedWeights(groupedArray);
      }
    } catch (error) {
      console.error("Failed to fetch weights:", error);
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  // 表示用グループの構築
  useEffect(() => {
    if (groupedWeights.length === 0) {
      setDisplayGroups([]);
      return;
    }

    if (positionGroups.length === 0) {
      // グループが未設定の場合は役職コード順で単一役職グループとして表示
      const sorted = [...groupedWeights].sort((a, b) =>
        a.positionCode.localeCompare(b.positionCode),
      );
      const groups: DisplayGroup[] = sorted.map((g, index) => ({
        id: `temp-${g.positionCode}`,
        name: g.positionName || g.positionCode,
        positionCodes: [g.positionCode],
        positions: [g],
        totalEmployees: g.totalEmployees,
        totalSettings: g.grades.length,
        displayOrder: index,
      }));
      setDisplayGroups(groups);
      return;
    }

    // グループ設定がある場合
    const groups: DisplayGroup[] = positionGroups.map((pg) => {
      const positions = groupedWeights.filter((gw) =>
        pg.positionCodes.includes(gw.positionCode),
      );
      return {
        id: pg.id,
        name: pg.name,
        positionCodes: pg.positionCodes,
        positions,
        totalEmployees: positions.reduce((sum, p) => sum + p.totalEmployees, 0),
        totalSettings: positions.reduce((sum, p) => sum + p.grades.length, 0),
        displayOrder: pg.displayOrder,
      };
    });

    // グループに含まれていない役職があれば追加
    const groupedCodes = new Set(
      positionGroups.flatMap((pg) => pg.positionCodes),
    );
    const ungrouped = groupedWeights.filter(
      (gw) => !groupedCodes.has(gw.positionCode),
    );
    const maxOrder = Math.max(...groups.map((g) => g.displayOrder), -1);

    ungrouped.forEach((g, index) => {
      groups.push({
        id: `ungrouped-${g.positionCode}`,
        name: g.positionName || g.positionCode,
        positionCodes: [g.positionCode],
        positions: [g],
        totalEmployees: g.totalEmployees,
        totalSettings: g.grades.length,
        displayOrder: maxOrder + index + 1,
      });
    });

    // displayOrder順でソート
    groups.sort((a, b) => a.displayOrder - b.displayOrder);
    setDisplayGroups(groups);
  }, [groupedWeights, positionGroups]);

  useEffect(() => {
    fetchWeights();
    fetchPositionGroups();
  }, [fetchWeights, fetchPositionGroups]);

  useEffect(() => {
    if (selectedPeriodId) {
      setPeriodId(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const handleSave = async () => {
    const total =
      formData.resultsWeight + formData.processWeight + formData.growthWeight;
    if (total !== 100) {
      alert(t.weightError);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/evaluation/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId,
          ...formData,
        }),
      });

      if (res.ok) {
        setIsAddOpen(false);
        setFormData({
          positionCode: "",
          positionName: "",
          gradeCode: "",
          resultsWeight: 30,
          processWeight: 40,
          growthWeight: 30,
        });
        fetchWeights();
      }
    } catch (error) {
      console.error("Failed to save weight:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (weight: Weight) => {
    const total =
      weight.resultsWeight + weight.processWeight + weight.growthWeight;
    if (total !== 100) {
      alert(t.weightError);
      return;
    }

    try {
      await fetch("/api/evaluation/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId,
          positionCode: weight.positionCode,
          positionName: weight.positionName,
          gradeCode: weight.gradeCode,
          resultsWeight: weight.resultsWeight,
          processWeight: weight.processWeight,
          growthWeight: weight.growthWeight,
        }),
      });
      fetchWeights();
    } catch (error) {
      console.error("Failed to update weight:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await fetch("/api/evaluation/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          periodId,
          positionCode: deleteTarget.positionCode,
          gradeCode: deleteTarget.gradeCode,
        }),
      });
      setDeleteTarget(null);
      fetchWeights();
    } catch (error) {
      console.error("Failed to delete weight:", error);
    }
  };

  const handleDetectCombinations = async () => {
    setDetecting(true);
    try {
      const res = await fetch(
        `/api/evaluation/weights?action=detect-combinations&periodId=${periodId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setDetectionResult(data);
        setIsDetectDialogOpen(true);
      }
    } catch (error) {
      console.error("Failed to detect combinations:", error);
    } finally {
      setDetecting(false);
    }
  };

  const handleAddMissingCombinations = async () => {
    if (!detectionResult?.missingCombinations.length) return;

    setSaving(true);
    try {
      const res = await fetch("/api/evaluation/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-missing",
          periodId,
          combinations: detectionResult.missingCombinations,
        }),
      });

      if (res.ok) {
        // 役職グループの初期化（存在しない場合）
        if (
          positionGroups.length === 0 &&
          detectionResult.positionStats.length > 0
        ) {
          await initializePositionGroups(detectionResult.positionStats);
        }
        setIsDetectDialogOpen(false);
        setDetectionResult(null);
        fetchWeights();
        fetchPositionGroups();
      }
    } catch (error) {
      console.error("Failed to add missing combinations:", error);
    } finally {
      setSaving(false);
    }
  };

  // 役職グループの初期化
  const initializePositionGroups = async (positionStats: PositionStat[]) => {
    const groups = positionStats.map((stat) => ({
      name: stat.positionName || stat.positionCode,
      positionCodes: [stat.positionCode],
    }));

    try {
      await fetch("/api/evaluation/position-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initialize",
          periodId,
          groups,
        }),
      });
    } catch (error) {
      console.error("Failed to initialize position groups:", error);
    }
  };

  const handleWeightChange = (
    positionCode: string,
    gradeCode: string,
    field: "resultsWeight" | "processWeight" | "growthWeight",
    value: number,
  ) => {
    setWeights((prev) =>
      prev.map((w) =>
        w.positionCode === positionCode && w.gradeCode === gradeCode
          ? { ...w, [field]: value }
          : w,
      ),
    );
    // 同時にグループ化データも更新
    setGroupedWeights((prev) =>
      prev.map((g) => ({
        ...g,
        grades: g.grades.map((w) =>
          w.positionCode === positionCode && w.gradeCode === gradeCode
            ? { ...w, [field]: value }
            : w,
        ),
      })),
    );
  };

  const getTotal = (weight: Weight) => {
    return weight.resultsWeight + weight.processWeight + weight.growthWeight;
  };

  const getTotalEmployees = () => {
    return weights.reduce((sum, w) => sum + w.employeeCount, 0);
  };

  // 順序変更ハンドラー
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;

    const newGroups = [...displayGroups];
    // displayOrderを入れ替え
    const temp = newGroups[index].displayOrder;
    newGroups[index].displayOrder = newGroups[index - 1].displayOrder;
    newGroups[index - 1].displayOrder = temp;
    // 配列内の位置も入れ替え
    [newGroups[index], newGroups[index - 1]] = [
      newGroups[index - 1],
      newGroups[index],
    ];

    setDisplayGroups(newGroups);
    await saveAllGroupOrders(newGroups);
  };

  const handleMoveDown = async (index: number) => {
    if (index >= displayGroups.length - 1) return;

    const newGroups = [...displayGroups];
    // displayOrderを入れ替え
    const temp = newGroups[index].displayOrder;
    newGroups[index].displayOrder = newGroups[index + 1].displayOrder;
    newGroups[index + 1].displayOrder = temp;
    // 配列内の位置も入れ替え
    [newGroups[index], newGroups[index + 1]] = [
      newGroups[index + 1],
      newGroups[index],
    ];

    setDisplayGroups(newGroups);
    await saveAllGroupOrders(newGroups);
  };

  const saveAllGroupOrders = async (groups: DisplayGroup[]) => {
    try {
      // 全グループを保存（ungroupedも含めて新規作成・更新）
      const groupsToSave = groups.map((g, index) => ({
        id:
          g.id.startsWith("temp-") || g.id.startsWith("ungrouped-")
            ? null
            : g.id,
        name: g.name,
        positionCodes: g.positionCodes,
        displayOrder: index,
      }));

      await fetch("/api/evaluation/position-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-all",
          periodId,
          groups: groupsToSave,
        }),
      });

      // グループを再取得してIDを更新
      fetchPositionGroups();
    } catch (error) {
      console.error("Failed to save group order:", error);
    }
  };

  // 結合ハンドラー
  const handleMerge = async () => {
    if (mergeSelectedPositions.length < 2 || !mergeGroupName.trim()) return;

    setSaving(true);
    try {
      await fetch("/api/evaluation/position-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge",
          periodId,
          positionCodes: mergeSelectedPositions,
          name: mergeGroupName,
        }),
      });

      setIsMergeDialogOpen(false);
      setMergeSelectedPositions([]);
      setMergeGroupName("");
      fetchPositionGroups();
    } catch (error) {
      console.error("Failed to merge positions:", error);
    } finally {
      setSaving(false);
    }
  };

  // 分離ハンドラー
  const handleSplit = async () => {
    if (!splitTargetGroup || splitSelectedPositions.length === 0) return;

    setSaving(true);
    try {
      await fetch("/api/evaluation/position-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "split",
          id: splitTargetGroup.id,
          positionCodes: splitSelectedPositions,
        }),
      });

      setIsSplitDialogOpen(false);
      setSplitTargetGroup(null);
      setSplitSelectedPositions([]);
      fetchPositionGroups();
    } catch (error) {
      console.error("Failed to split positions:", error);
    } finally {
      setSaving(false);
    }
  };

  // 結合ダイアログを開く
  const openMergeDialog = () => {
    setMergeSelectedPositions([]);
    setMergeGroupName("");
    setIsMergeDialogOpen(true);
  };

  // 分離ダイアログを開く
  const openSplitDialog = (group: DisplayGroup) => {
    setSplitTargetGroup(group);
    setSplitSelectedPositions([]);
    setIsSplitDialogOpen(true);
  };

  // 空のグループを削除
  const handleDeleteGroup = async () => {
    if (!deleteGroupTarget) return;

    // temp- または ungrouped- で始まるIDは未保存なので削除不要
    if (
      deleteGroupTarget.id.startsWith("temp-") ||
      deleteGroupTarget.id.startsWith("ungrouped-")
    ) {
      setDeleteGroupTarget(null);
      return;
    }

    setSaving(true);
    try {
      await fetch(
        `/api/evaluation/position-groups?id=${deleteGroupTarget.id}`,
        {
          method: "DELETE",
        },
      );

      setDeleteGroupTarget(null);
      fetchPositionGroups();
      fetchWeights();
    } catch (error) {
      console.error("Failed to delete position group:", error);
    } finally {
      setSaving(false);
    }
  };

  // グループのデフォルト重み値を取得（グループ内の最初の設定値を使用）
  const getGroupDefaultWeight = (group: DisplayGroup) => {
    // groupDefaultWeightsにあればそれを使用
    if (groupDefaultWeights[group.id]) {
      return groupDefaultWeights[group.id];
    }
    // なければグループ内の最初の設定値を使用
    const firstWeight = group.positions[0]?.grades[0];
    if (firstWeight) {
      return {
        resultsWeight: firstWeight.resultsWeight,
        processWeight: firstWeight.processWeight,
        growthWeight: firstWeight.growthWeight,
      };
    }
    return { resultsWeight: 30, processWeight: 40, growthWeight: 30 };
  };

  // グループのデフォルト重み値を変更
  const handleGroupDefaultWeightChange = (
    groupId: string,
    field: "resultsWeight" | "processWeight" | "growthWeight",
    value: number,
  ) => {
    setGroupDefaultWeights((prev) => ({
      ...prev,
      [groupId]: {
        ...getGroupDefaultWeight(displayGroups.find((g) => g.id === groupId)!),
        [field]: value,
      },
    }));
  };

  // グループ内の全重みを一括更新
  const handleApplyGroupDefaultWeights = async (group: DisplayGroup) => {
    const defaultWeight = groupDefaultWeights[group.id];
    if (!defaultWeight) return;

    const total =
      defaultWeight.resultsWeight +
      defaultWeight.processWeight +
      defaultWeight.growthWeight;
    if (total !== 100) {
      alert(t.weightError);
      return;
    }

    setSaving(true);
    try {
      // グループ内の全ての重みを更新
      const updates = group.positions.flatMap((position) =>
        position.grades.map((weight) => ({
          positionCode: weight.positionCode,
          positionName: weight.positionName,
          gradeCode: weight.gradeCode,
          resultsWeight: defaultWeight.resultsWeight,
          processWeight: defaultWeight.processWeight,
          growthWeight: defaultWeight.growthWeight,
        })),
      );

      await fetch("/api/evaluation/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk-update",
          periodId,
          weights: updates,
        }),
      });

      // ローカルステートも更新
      setWeights((prev) =>
        prev.map((w) => {
          const isInGroup = group.positionCodes.includes(w.positionCode);
          if (isInGroup) {
            return {
              ...w,
              resultsWeight: defaultWeight.resultsWeight,
              processWeight: defaultWeight.processWeight,
              growthWeight: defaultWeight.growthWeight,
            };
          }
          return w;
        }),
      );

      setGroupedWeights((prev) =>
        prev.map((g) => {
          const isInGroup = group.positionCodes.includes(g.positionCode);
          if (isInGroup) {
            return {
              ...g,
              grades: g.grades.map((w) => ({
                ...w,
                resultsWeight: defaultWeight.resultsWeight,
                processWeight: defaultWeight.processWeight,
                growthWeight: defaultWeight.growthWeight,
              })),
            };
          }
          return g;
        }),
      );

      // デフォルト値をクリア（適用済みのため）
      setGroupDefaultWeights((prev) => {
        const next = { ...prev };
        delete next[group.id];
        return next;
      });
    } catch (error) {
      console.error("Failed to apply group default weights:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {t.weightsTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.weightsDescription}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={periodId} onValueChange={setPeriodId}>
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

          <Button
            variant="outline"
            onClick={handleDetectCombinations}
            disabled={!periodId || detecting}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${detecting ? "animate-spin" : ""}`}
            />
            {t.detectCombinations || "組み合わせ検出"}
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button disabled={!periodId}>
                <Plus className="w-4 h-4 mr-2" />
                {t.addWeight}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.addWeight}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.positionCode || "役職コード"}</Label>
                    <Input
                      value={formData.positionCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          positionCode: e.target.value,
                        })
                      }
                      placeholder="000, 200, 300..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.positionName || "役職名"}</Label>
                    <Input
                      value={formData.positionName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          positionName: e.target.value,
                        })
                      }
                      placeholder="一般, 部長..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.gradeCode}</Label>
                  <Input
                    value={formData.gradeCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gradeCode: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="E3, C1, ALL..."
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.gradeCodeHint ||
                      "ALLを指定すると、この役職の全等級に適用されます"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t.resultsWeight} (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.resultsWeight}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          resultsWeight: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.processWeight} (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.processWeight}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          processWeight: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.growthWeight} (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.growthWeight}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          growthWeight: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {t.total}:{" "}
                  <span
                    className={
                      formData.resultsWeight +
                        formData.processWeight +
                        formData.growthWeight !==
                      100
                        ? "text-red-500 font-bold"
                        : ""
                    }
                  >
                    {formData.resultsWeight +
                      formData.processWeight +
                      formData.growthWeight}
                    %
                  </span>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                    {t.cancel}
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? t.loading : t.save}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            {t.loading}
          </div>
        ) : !periodId ? (
          <div className="text-center py-12 text-muted-foreground">
            {t.selectPeriod}
          </div>
        ) : weights.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t.noData}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-card z-10 py-2">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t.totalEmployees}: {getTotalEmployees()}
                {t.people}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={openMergeDialog}
                disabled={displayGroups.length < 2}
              >
                <Merge className="w-4 h-4 mr-2" />
                {t.mergePositions}
              </Button>
            </div>

            {/* 役職グループ表示 */}
            <div className="space-y-2">
              {displayGroups.map((group, index) => (
                <Collapsible
                  key={group.id}
                  open={group.positionCodes.some((code) =>
                    expandedPositions.has(code),
                  )}
                  onOpenChange={() => {
                    // グループ内の全役職を展開/折りたたみ
                    const isExpanded = group.positionCodes.some((code) =>
                      expandedPositions.has(code),
                    );
                    setExpandedPositions((prev) => {
                      const next = new Set(prev);
                      if (isExpanded) {
                        group.positionCodes.forEach((code) =>
                          next.delete(code),
                        );
                      } else {
                        group.positionCodes.forEach((code) => next.add(code));
                      }
                      return next;
                    });
                  }}
                >
                  <div className="border rounded-lg">
                    {/* 1段目: グループ名、バッジ、操作ボタン */}
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-3 cursor-pointer flex-1">
                          {group.positionCodes.some((code) =>
                            expandedPositions.has(code),
                          ) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <div>
                            <span className="font-medium">
                              {group.positions.length > 1
                                ? group.name
                                : group.positions[0]?.positionName ||
                                  group.name}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              ({group.positionCodes.join(", ")})
                            </span>
                            {group.positions.length > 1 && (
                              <Badge variant="secondary" className="ml-2">
                                {group.positions.length}役職結合
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-2">
                        {/* 設定数バッジ - 固定幅 */}
                        <div className="w-20 text-right">
                          <Badge variant="outline">
                            {group.totalSettings} {t.settings || "設定"}
                          </Badge>
                        </div>
                        {/* 人数バッジ - 固定幅 */}
                        <div className="w-16 text-right">
                          <Badge>
                            {group.totalEmployees}
                            {t.people}
                          </Badge>
                        </div>
                        {/* 順序変更ボタン */}
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            title={t.moveUp}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === displayGroups.length - 1}
                            title={t.moveDown}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        {/* 分離ボタン - 固定幅で常にスペース確保 */}
                        <div className="w-9">
                          {group.positions.length > 1 &&
                            !group.id.startsWith("temp-") &&
                            !group.id.startsWith("ungrouped-") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openSplitDialog(group)}
                                title={t.splitPosition}
                              >
                                <Split className="w-4 h-4" />
                              </Button>
                            )}
                        </div>
                        {/* 空グループ削除ボタン - 0設定の場合のみ表示 */}
                        <div className="w-9">
                          {group.totalSettings === 0 &&
                            !group.id.startsWith("temp-") &&
                            !group.id.startsWith("ungrouped-") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteGroupTarget(group);
                                }}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                title={t.deleteGroup || "グループを削除"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                        </div>
                      </div>
                    </div>
                    {/* 2段目: 結合グループの場合は一括設定UI */}
                    {group.positions.length > 1 && (
                      <div className="px-4 pb-3 pt-0">
                        <div className="flex items-center gap-3 bg-muted/30 rounded-lg px-4 py-2 border border-dashed">
                          <span className="text-sm font-medium text-muted-foreground">
                            {language === "ja" ? "一括設定" : "Bulk Update"}
                          </span>
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground w-16">
                                {t.resultsWeight}
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                className="w-16 h-8 text-center"
                                value={
                                  getGroupDefaultWeight(group).resultsWeight
                                }
                                onChange={(e) =>
                                  handleGroupDefaultWeightChange(
                                    group.id,
                                    "resultsWeight",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-xs text-muted-foreground">
                                %
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground w-20">
                                {t.processWeight}
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                className="w-16 h-8 text-center"
                                value={
                                  getGroupDefaultWeight(group).processWeight
                                }
                                onChange={(e) =>
                                  handleGroupDefaultWeightChange(
                                    group.id,
                                    "processWeight",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-xs text-muted-foreground">
                                %
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground w-16">
                                {t.growthWeight}
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                className="w-16 h-8 text-center"
                                value={
                                  getGroupDefaultWeight(group).growthWeight
                                }
                                onChange={(e) =>
                                  handleGroupDefaultWeightChange(
                                    group.id,
                                    "growthWeight",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-xs text-muted-foreground">
                                %
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium px-2 py-1 rounded ${
                                getGroupDefaultWeight(group).resultsWeight +
                                  getGroupDefaultWeight(group).processWeight +
                                  getGroupDefaultWeight(group).growthWeight !==
                                100
                                  ? "text-red-500 bg-red-50 dark:bg-red-950/30"
                                  : "text-green-600 bg-green-50 dark:bg-green-950/30"
                              }`}
                            >
                              {t.total}:{" "}
                              {getGroupDefaultWeight(group).resultsWeight +
                                getGroupDefaultWeight(group).processWeight +
                                getGroupDefaultWeight(group).growthWeight}
                              %
                            </span>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyGroupDefaultWeights(group);
                              }}
                              disabled={
                                saving ||
                                !groupDefaultWeights[group.id] ||
                                getGroupDefaultWeight(group).resultsWeight +
                                  getGroupDefaultWeight(group).processWeight +
                                  getGroupDefaultWeight(group).growthWeight !==
                                  100
                              }
                            >
                              <Save className="w-4 h-4 mr-1" />
                              {language === "ja" ? "全て適用" : "Apply All"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    <CollapsibleContent>
                      <div className="border-t">
                        {group.positions.map((position) => (
                          <div key={position.positionCode}>
                            {group.positions.length > 1 && (
                              <div className="px-4 py-2 bg-muted/30 border-b">
                                <span className="font-medium text-sm">
                                  {position.positionName ||
                                    position.positionCode}
                                </span>
                                <span className="text-muted-foreground text-sm ml-2">
                                  ({position.positionCode})
                                </span>
                              </div>
                            )}
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[150px]">
                                    {t.gradeCode}
                                  </TableHead>
                                  <TableHead className="w-[100px] text-center">
                                    {t.employeeCount}
                                  </TableHead>
                                  <TableHead className="w-[120px]">
                                    {t.resultsWeight} (%)
                                  </TableHead>
                                  <TableHead className="w-[120px]">
                                    {t.processWeight} (%)
                                  </TableHead>
                                  <TableHead className="w-[120px]">
                                    {t.growthWeight} (%)
                                  </TableHead>
                                  <TableHead className="w-[80px] text-center">
                                    {t.total}
                                  </TableHead>
                                  <TableHead className="w-[100px]">
                                    {t.actions}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {position.grades.map((weight) => {
                                  const total = getTotal(weight);
                                  const isValid = total === 100;
                                  return (
                                    <TableRow
                                      key={`${weight.positionCode}-${weight.gradeCode}`}
                                      className={
                                        !isValid
                                          ? "bg-red-50 dark:bg-red-950/20"
                                          : ""
                                      }
                                    >
                                      <TableCell className="font-medium">
                                        {weight.gradeCode === "ALL" ? (
                                          <Badge variant="secondary">
                                            {t.allGrades || "全等級"}
                                          </Badge>
                                        ) : (
                                          weight.gradeCode
                                        )}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {weight.employeeCount > 0 &&
                                        weight.employeeNames &&
                                        weight.employeeNames.length > 0 ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Badge
                                                variant="default"
                                                className="cursor-pointer"
                                              >
                                                {weight.employeeCount}
                                                {t.people}
                                              </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent
                                              side="right"
                                              className="max-w-xs max-h-64 overflow-y-auto"
                                            >
                                              <div className="text-sm">
                                                {weight.employeeNames
                                                  .slice(0, 20)
                                                  .map((name, idx) => (
                                                    <div key={idx}>{name}</div>
                                                  ))}
                                                {weight.employeeNames.length >
                                                  20 && (
                                                  <div className="text-muted-foreground mt-1">
                                                    ...
                                                    {language === "ja"
                                                      ? "他"
                                                      : "and"}{" "}
                                                    {weight.employeeNames
                                                      .length - 20}{" "}
                                                    {t.people}
                                                  </div>
                                                )}
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <Badge
                                            variant="outline"
                                            className="text-muted-foreground"
                                          >
                                            {weight.employeeCount}
                                            {t.people}
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          className="w-20"
                                          value={weight.resultsWeight}
                                          onChange={(e) =>
                                            handleWeightChange(
                                              weight.positionCode,
                                              weight.gradeCode,
                                              "resultsWeight",
                                              parseInt(e.target.value) || 0,
                                            )
                                          }
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          className="w-20"
                                          value={weight.processWeight}
                                          onChange={(e) =>
                                            handleWeightChange(
                                              weight.positionCode,
                                              weight.gradeCode,
                                              "processWeight",
                                              parseInt(e.target.value) || 0,
                                            )
                                          }
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          className="w-20"
                                          value={weight.growthWeight}
                                          onChange={(e) =>
                                            handleWeightChange(
                                              weight.positionCode,
                                              weight.gradeCode,
                                              "growthWeight",
                                              parseInt(e.target.value) || 0,
                                            )
                                          }
                                        />
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <span
                                          className={`font-medium ${
                                            !isValid
                                              ? "text-red-500"
                                              : "text-green-600 dark:text-green-400"
                                          }`}
                                        >
                                          {total}%
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleUpdate(weight)}
                                            disabled={!isValid}
                                          >
                                            <Save className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              setDeleteTarget(weight)
                                            }
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.confirmDeleteWeight?.replace(
                "{code}",
                deleteTarget
                  ? `${deleteTarget.positionName || deleteTarget.positionCode} - ${deleteTarget.gradeCode}`
                  : "",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete position group confirmation dialog */}
      <AlertDialog
        open={!!deleteGroupTarget}
        onOpenChange={() => setDeleteGroupTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ja"
                ? `「${deleteGroupTarget?.name}」グループを削除しますか？`
                : `Delete the "${deleteGroupTarget?.name}" group?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-red-500 hover:bg-red-600"
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Combination detection dialog */}
      <Dialog open={isDetectDialogOpen} onOpenChange={setIsDetectDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t.detectCombinationsResult || "役職×等級 検出結果"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {detectionResult && (
              <>
                {detectionResult.missingCombinations.length > 0 ? (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">
                        {t.missingCombinations || "未設定の組み合わせ"} (
                        {detectionResult.missingCombinations.length})
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {detectionResult.missingCombinations.map((combo) => (
                          <Badge
                            key={`${combo.positionCode}-${combo.gradeCode}`}
                            variant="outline"
                            className="bg-orange-100 dark:bg-orange-900"
                          >
                            {combo.positionName} ({combo.gradeCode}) -{" "}
                            {combo.employeeCount}
                            {t.people}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <Check className="w-4 h-4" />
                      <span className="font-medium">
                        {t.allCombinationsConfigured ||
                          "全ての組み合わせが設定済みです"}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">
                    {t.positionStatistics || "役職別統計"}
                  </h4>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {t.positionCode || "役職コード"}
                          </TableHead>
                          <TableHead>{t.positionName || "役職名"}</TableHead>
                          <TableHead className="text-center">
                            {t.gradeCount || "等級数"}
                          </TableHead>
                          <TableHead className="text-center">
                            {t.employeeCount}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detectionResult.positionStats.map((stat) => (
                          <TableRow key={stat.positionCode}>
                            <TableCell className="font-mono">
                              {stat.positionCode}
                            </TableCell>
                            <TableCell>{stat.positionName}</TableCell>
                            <TableCell className="text-center">
                              {stat.grades.length}
                            </TableCell>
                            <TableCell className="text-center">
                              {stat.totalEmployees}
                              {t.people}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsDetectDialogOpen(false)}
                  >
                    {t.close}
                  </Button>
                  {detectionResult.missingCombinations.length > 0 && (
                    <Button
                      onClick={handleAddMissingCombinations}
                      disabled={saving}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {saving
                        ? t.loading
                        : t.addMissingCombinations || "未設定を一括追加"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge positions dialog */}
      <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t.mergeDialogTitle}</DialogTitle>
            <DialogDescription>{t.mergeDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t.groupName}</Label>
              <Input
                value={mergeGroupName}
                onChange={(e) => setMergeGroupName(e.target.value)}
                placeholder="上級管理職, 部長級..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t.selectPositions}</Label>
              <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2">
                {displayGroups.map((group) => (
                  <div key={group.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`merge-${group.id}`}
                      checked={group.positionCodes.some((code) =>
                        mergeSelectedPositions.includes(code),
                      )}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setMergeSelectedPositions([
                            ...mergeSelectedPositions,
                            ...group.positionCodes,
                          ]);
                        } else {
                          setMergeSelectedPositions(
                            mergeSelectedPositions.filter(
                              (code) => !group.positionCodes.includes(code),
                            ),
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={`merge-${group.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {group.positions.length > 1
                        ? group.name
                        : group.positions[0]?.positionName || group.name}
                      <span className="text-muted-foreground ml-1">
                        ({group.positionCodes.join(", ")})
                      </span>
                      <Badge variant="outline" className="ml-2">
                        {group.totalEmployees}
                        {t.people}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsMergeDialogOpen(false)}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleMerge}
                disabled={
                  mergeSelectedPositions.length < 2 ||
                  !mergeGroupName.trim() ||
                  saving
                }
              >
                <Merge className="w-4 h-4 mr-2" />
                {saving ? t.loading : t.merge}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Split positions dialog */}
      <Dialog open={isSplitDialogOpen} onOpenChange={setIsSplitDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t.splitDialogTitle}</DialogTitle>
            <DialogDescription>{t.splitDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {splitTargetGroup && (
              <>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="font-medium">{splitTargetGroup.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {splitTargetGroup.positionCodes.join(", ")}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.selectPositions}</Label>
                  <div className="border rounded-lg p-2 space-y-2">
                    {splitTargetGroup.positions.map((position) => (
                      <div
                        key={position.positionCode}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={`split-${position.positionCode}`}
                          checked={splitSelectedPositions.includes(
                            position.positionCode,
                          )}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSplitSelectedPositions([
                                ...splitSelectedPositions,
                                position.positionCode,
                              ]);
                            } else {
                              setSplitSelectedPositions(
                                splitSelectedPositions.filter(
                                  (code) => code !== position.positionCode,
                                ),
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={`split-${position.positionCode}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {position.positionName || position.positionCode}
                          <span className="text-muted-foreground ml-1">
                            ({position.positionCode})
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {position.totalEmployees}
                            {t.people}
                          </Badge>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsSplitDialogOpen(false)}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleSplit}
                disabled={splitSelectedPositions.length === 0 || saving}
              >
                <Split className="w-4 h-4 mr-2" />
                {saving ? t.loading : t.split}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
