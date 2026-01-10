"use client";

import { CheckCircle2, ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";

// プロセスカテゴリ（マスターデータ）
interface ProcessCategoryMaster {
  id: string;
  name: string;
  nameEn: string | null;
  categoryCode: string;
  description: string | null;
  minItemCount: number;
  scores: string; // JSON: { T4: number, T3: number, T2: number, T1: number }
}

// プロセス難易度チェック項目（クラス判定用）
const difficultyChecks = [
  {
    id: "cross_dept",
    labelJa: "横断的課題",
    labelEn: "Cross-functional",
    descJa: "部門を横断した調整・連携が必要",
    descEn: "Requires coordination across departments",
    exampleJa: "3部門以上が関わり、各部門の承認や協力なしには進められない",
    exampleEn:
      "Involves 3+ departments and cannot proceed without their approval",
  },
  {
    id: "innovation",
    labelJa: "革新性",
    labelEn: "Innovation",
    descJa: "新しいアプローチや手法の導入",
    descEn: "Introducing new approaches or methods",
    exampleJa: "社内初の試みや新技術の導入など、前例のない創意工夫が必要",
    exampleEn: "First-of-its-kind initiative or new technology adoption",
  },
  {
    id: "economic",
    labelJa: "経済効果",
    labelEn: "Economic Impact",
    descJa: "重要な予算責任または収益への影響",
    descEn: "Significant budget responsibility or revenue impact",
    exampleJa: "年間1,000万円以上のコスト削減や売上増加が見込める",
    exampleEn: "Expected annual cost savings or revenue increase of ¥10M+",
  },
  {
    id: "urgency",
    labelJa: "緊急性",
    labelEn: "Urgency",
    descJa: "迅速な対応が求められる課題",
    descEn: "Issues requiring quick response",
    exampleJa: "法改正・契約期限等の外部要因で3ヶ月以内に成果が必要",
    exampleEn: "Must deliver results within 3 months due to external factors",
  },
  {
    id: "importance",
    labelJa: "重要度",
    labelEn: "Importance",
    descJa: "戦略的・組織的な重要度が高い",
    descEn: "High strategic or organizational importance",
    exampleJa: "未達成の場合、事業計画や顧客関係に重大な影響を及ぼす",
    exampleEn:
      "Failure would significantly impact business plans or customer relations",
  },
];

interface Process {
  id: string;
  name: string;
  checks: Record<string, boolean>;
  achievement: string;
}

interface ProcessEvaluationSupportProps {
  language: "en" | "ja";
  processCategories: ProcessCategoryMaster[];
  onScoreCalculated: (score: number, processes: Process[]) => void;
  initialProcesses?: Process[];
}

// カテゴリコードからスコア情報を取得
function getCategoryByCheckedCount(
  categories: ProcessCategoryMaster[],
  checkedCount: number,
): ProcessCategoryMaster | null {
  // minItemCount以上の最も高いクラスを返す（A > B > C > D）
  const sortedCategories = [...categories].sort((a, b) => {
    const order: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    return order[a.categoryCode] - order[b.categoryCode];
  });

  for (const cat of sortedCategories) {
    if (checkedCount >= cat.minItemCount) {
      return cat;
    }
  }

  // どれにも該当しない場合は最後のカテゴリ
  return sortedCategories[sortedCategories.length - 1] || null;
}

// スコアをパース
function parseScores(scoresJson: string): Record<string, number> {
  try {
    return JSON.parse(scoresJson);
  } catch {
    return { T4: 5.0, T3: 3.5, T2: 2.5, T1: 1.0 };
  }
}

// 達成度レベル定義
const achievementLevels = [
  { level: "T4", labelJa: "卓越した水準", labelEn: "Exceptional" },
  { level: "T3", labelJa: "期待を超過", labelEn: "Exceeded" },
  { level: "T2", labelJa: "期待通り", labelEn: "As Expected" },
  { level: "T1", labelJa: "改善を要する", labelEn: "Needs Improvement" },
];

export function ProcessEvaluationSupport({
  language,
  processCategories,
  onScoreCalculated,
  initialProcesses,
}: ProcessEvaluationSupportProps) {
  // デフォルトのプロセス1は「通常業務」として固定
  const defaultProcessName = language === "ja" ? "通常業務" : "Regular Work";

  const [processes, setProcesses] = useState<Process[]>(
    initialProcesses || [
      {
        id: "1",
        name: defaultProcessName,
        checks: {},
        achievement: "T2",
      },
    ],
  );
  const [expandedChecks, setExpandedChecks] = useState<Record<string, boolean>>(
    {},
  );

  // 平均スコアを計算
  const averageScore = useMemo(() => {
    const validProcesses = processes.filter(
      (p) => p.name.trim() && p.achievement,
    );
    if (validProcesses.length === 0) return 0;

    const totalScore = validProcesses.reduce((sum, p) => {
      const checkedCount = Object.values(p.checks).filter(Boolean).length;
      const category = getCategoryByCheckedCount(
        processCategories,
        checkedCount,
      );
      if (!category) return sum + 2.5;

      const scores = parseScores(category.scores);
      return sum + (scores[p.achievement] || 2.5);
    }, 0);

    return Math.round((totalScore / validProcesses.length) * 10) / 10;
  }, [processes, processCategories]);

  // スコアが変更されたら親に通知
  useEffect(() => {
    onScoreCalculated(averageScore, processes);
  }, [averageScore, processes, onScoreCalculated]);

  const addProcess = () => {
    if (processes.length >= 3) return;
    setProcesses([
      ...processes,
      {
        id: String(Date.now()),
        name: "",
        checks: {},
        achievement: "T2",
      },
    ]);
  };

  const removeProcess = (id: string) => {
    if (processes.length <= 1) return;
    setProcesses(processes.filter((p) => p.id !== id));
  };

  const updateProcess = (id: string, updates: Partial<Process>) => {
    setProcesses(
      processes.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
  };

  const toggleCheck = (processId: string, checkId: string) => {
    const process = processes.find((p) => p.id === processId);
    if (!process) return;

    updateProcess(processId, {
      checks: {
        ...process.checks,
        [checkId]: !process.checks[checkId],
      },
    });
  };

  const toggleExpanded = (processId: string) => {
    setExpandedChecks((prev) => ({
      ...prev,
      [processId]: !prev[processId],
    }));
  };

  return (
    <div className="space-y-4">
      {/* プロセス一覧 */}
      {processes.map((process, index) => {
        const checkedCount = Object.values(process.checks).filter(
          Boolean,
        ).length;
        const category = getCategoryByCheckedCount(
          processCategories,
          checkedCount,
        );
        const scores = category
          ? parseScores(category.scores)
          : { T4: 5.0, T3: 3.5, T2: 2.5, T1: 1.0 };
        const processScore = scores[process.achievement] || 2.5;
        const isExpanded = expandedChecks[process.id] ?? false;

        return (
          <Card key={process.id}>
            <CardContent className="p-4 space-y-4">
              {/* プロセスヘッダー（1行にまとめる） */}
              <div className="flex items-center gap-3">
                <span className="font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                  {language === "ja"
                    ? `プロセス ${index + 1}:`
                    : `Process ${index + 1}:`}
                </span>
                {index === 0 ? (
                  // プロセス1は「通常業務」として固定（編集不可）
                  <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-medium">
                    {defaultProcessName}
                  </div>
                ) : (
                  // プロセス2以降は編集可能
                  <Input
                    value={process.name}
                    onChange={(e) =>
                      updateProcess(process.id, { name: e.target.value })
                    }
                    placeholder={
                      language === "ja"
                        ? "プロセス名を入力"
                        : "Enter process name"
                    }
                    className="flex-1"
                  />
                )}
                {/* プロセス1以外は削除可能 */}
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProcess(process.id)}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* 難易度チェックリスト（折り畳み可能） */}
              <Collapsible
                open={isExpanded}
                onOpenChange={() => toggleExpanded(process.id)}
              >
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span>
                      {language === "ja"
                        ? "難易度チェックリスト"
                        : "Difficulty Checklist"}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {checkedCount}/5
                    </Badge>
                    {category && (
                      <Badge
                        variant={
                          category.categoryCode === "A"
                            ? "default"
                            : category.categoryCode === "B"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {language === "ja"
                          ? `クラス${category.categoryCode}`
                          : `Class ${category.categoryCode}`}
                      </Badge>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground mb-2">
                      {language === "ja"
                        ? "該当する項目にチェックを入れると、プロセスの難易度クラスが決まります"
                        : "Check applicable items to determine the process difficulty class"}
                    </p>
                    {difficultyChecks.map((check) => (
                      <label
                        key={check.id}
                        className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 px-2 py-1.5 rounded-md transition-colors"
                      >
                        <Checkbox
                          checked={process.checks[check.id] || false}
                          onCheckedChange={() =>
                            toggleCheck(process.id, check.id)
                          }
                        />
                        <span className="text-sm">
                          <span className="font-medium">
                            {language === "ja" ? check.labelJa : check.labelEn}
                          </span>
                          <span className="text-muted-foreground">
                            ：{language === "ja" ? check.descJa : check.descEn}
                            （{language === "ja" ? "例：" : "e.g. "}
                            {language === "ja"
                              ? check.exampleJa
                              : check.exampleEn}
                            ）
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 達成度選択 */}
              <div>
                <span className="text-sm font-medium mb-3 block">
                  {language === "ja" ? "達成度" : "Achievement Level"}
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {achievementLevels.map((level) => {
                    const score = scores[level.level] || 0;
                    const isSelected = process.achievement === level.level;
                    return (
                      <button
                        key={level.level}
                        onClick={() =>
                          updateProcess(process.id, {
                            achievement: level.level,
                          })
                        }
                        className={`p-3 rounded-lg border text-center transition-all ${
                          isSelected
                            ? "border-green-500 bg-green-500/10 dark:border-green-400 dark:bg-green-400/10"
                            : "border-border hover:border-green-500/50 hover:bg-muted/50"
                        }`}
                      >
                        <p
                          className={`font-bold text-sm ${isSelected ? "text-green-600 dark:text-green-400" : ""}`}
                        >
                          {level.level}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {language === "ja" ? level.labelJa : level.labelEn}
                        </p>
                        <p
                          className={`text-sm font-medium mt-1 ${isSelected ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
                        >
                          {score.toFixed(1)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* プロセススコア */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">
                  {language === "ja" ? "プロセススコア:" : "Process Score:"}
                </span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {processScore.toFixed(1)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* プロセス追加ボタン */}
      {processes.length < 3 && (
        <Button variant="outline" onClick={addProcess} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          {language === "ja" ? "プロセスを追加" : "Add Process"}
        </Button>
      )}

      {/* 最終スコア表示 */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
          <span className="font-medium">
            {language === "ja"
              ? "プロセス評価最終スコア"
              : "Final Process Evaluation Score"}
          </span>
          <span className="text-sm text-muted-foreground">
            ({processes.filter((p) => p.name.trim()).length}{" "}
            {language === "ja" ? "プロセスの平均" : "process(es) average"})
          </span>
        </div>
        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
          {averageScore.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
