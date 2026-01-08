"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";

interface GrowthCategory {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  coefficient: number;
  scoreT1: number;
  scoreT2: number;
  scoreT3: number;
  scoreT4: number;
}

// 達成度レベルのラベル定義（スコアはマスターデータから取得）
const achievementLevelLabels = [
  { level: "T4", labelJa: "卓越した水準", labelEn: "Exceptional" },
  { level: "T3", labelJa: "期待を超過", labelEn: "Exceeded" },
  { level: "T2", labelJa: "期待通り", labelEn: "As Expected" },
  { level: "T1", labelJa: "改善を要する", labelEn: "Needs Improvement" },
];

interface GrowthEvaluationSupportProps {
  language: "en" | "ja";
  categories: GrowthCategory[];
  onScoreCalculated: (score: number, categoryId: string, level: string) => void;
  initialCategoryId?: string;
  initialLevel?: string;
}

// カテゴリから達成度別スコアを取得
function getScoreForLevel(category: GrowthCategory, level: string): number {
  switch (level) {
    case "T4":
      return category.scoreT4;
    case "T3":
      return category.scoreT3;
    case "T2":
      return category.scoreT2;
    case "T1":
      return category.scoreT1;
    default:
      return category.scoreT2;
  }
}

export function GrowthEvaluationSupport({
  language,
  categories,
  onScoreCalculated,
  initialCategoryId = "",
  initialLevel = "T2",
}: GrowthEvaluationSupportProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId);
  const [selectedLevel, setSelectedLevel] = useState<string>(initialLevel);
  const [baseScore, setBaseScore] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);

  // スコア計算（マスターデータから取得、係数を適用）
  useEffect(() => {
    if (!selectedCategory || !selectedLevel) {
      setBaseScore(0);
      setFinalScore(0);
      return;
    }

    const category = categories.find((c) => c.id === selectedCategory);
    if (!category) {
      setBaseScore(0);
      setFinalScore(0);
      return;
    }

    const score = getScoreForLevel(category, selectedLevel);
    const coefficient = category.coefficient ?? 1.0;
    const calculatedFinalScore = Math.round(score * coefficient * 10) / 10;

    setBaseScore(score);
    setFinalScore(calculatedFinalScore);
    onScoreCalculated(calculatedFinalScore, selectedCategory, selectedLevel);
  }, [selectedCategory, selectedLevel, categories, onScoreCalculated]);

  const selectedCategoryData = categories.find((c) => c.id === selectedCategory);

  const getCategoryName = (cat: GrowthCategory) => {
    if (language === "en" && cat.nameEn) {
      return cat.nameEn;
    }
    return cat.name;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* カテゴリー選択（1行に収める） */}
          <div className="flex items-center gap-3">
            <span className="font-medium text-purple-600 dark:text-purple-400 whitespace-nowrap">
              {language === "ja" ? "成長カテゴリー:" : "Growth Category:"}
            </span>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="flex-1">
                <SelectValue
                  placeholder={
                    language === "ja"
                      ? "カテゴリーを選択"
                      : "Select category"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span>
                      {getCategoryName(category)}
                      {category.description && (
                        <span className="text-muted-foreground">（{category.description}）</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {/* 達成度選択 */}
          {selectedCategory && (
            <div>
              <span className="text-sm font-medium mb-3 block">
                {language === "ja" ? "達成度" : "Achievement Level"}
              </span>
              <div className="grid grid-cols-4 gap-2">
                {achievementLevelLabels.map((level) => {
                  const score = selectedCategoryData
                    ? getScoreForLevel(selectedCategoryData, level.level)
                    : 0;
                  const isSelected = selectedLevel === level.level;
                  return (
                    <button
                      key={level.level}
                      onClick={() => setSelectedLevel(level.level)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        isSelected
                          ? "border-purple-500 bg-purple-500/10 dark:border-purple-400 dark:bg-purple-400/10"
                          : "border-border hover:border-purple-500/50 hover:bg-muted/50"
                      }`}
                    >
                      <p className={`font-bold text-sm ${isSelected ? "text-purple-600 dark:text-purple-400" : ""}`}>
                        {level.level}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {language === "ja" ? level.labelJa : level.labelEn}
                      </p>
                      <p className={`text-sm font-medium mt-1 ${isSelected ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`}>
                        {score.toFixed(1)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 成長評価スコア（係数適用） */}
          {selectedCategoryData && (
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === "ja" ? "達成度スコア:" : "Achievement Score:"}
                </span>
                <span className="font-mono">{baseScore.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === "ja" ? "カテゴリ係数:" : "Category Coefficient:"}
                </span>
                <span className="font-mono">×{(selectedCategoryData.coefficient ?? 1.0).toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium">
                  {language === "ja" ? "成長スコア:" : "Growth Score:"}
                </span>
                <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {finalScore.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 最終スコア表示 */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-purple-500 dark:text-purple-400" />
          <span className="font-medium">
            {language === "ja" ? "成長評価最終スコア" : "Final Growth Evaluation Score"}
          </span>
          {selectedCategoryData && (
            <Badge variant="secondary" className="text-xs">
              {getCategoryName(selectedCategoryData)}
              {(selectedCategoryData.coefficient ?? 1.0) !== 1.0 && (
                <span className="ml-1">×{(selectedCategoryData.coefficient ?? 1.0).toFixed(1)}</span>
              )}
            </Badge>
          )}
        </div>
        <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {finalScore.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
