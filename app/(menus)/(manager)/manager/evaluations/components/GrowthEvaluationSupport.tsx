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
import { TrendingUp, Star, CheckCircle2 } from "lucide-react";

interface GrowthCategory {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  coefficient: number;
}

// 達成度レベル定義（スコアマッピング）
const achievementLevels = [
  {
    level: "T4",
    score: 5.0,
    labelJa: "卓越した水準",
    labelEn: "Exceptional",
    descJa: "期待を大幅に上回る成果を上げ、組織の優位性に顕著なインパクトを与えた",
    descEn: "Far exceeded expectations with significant organizational impact",
  },
  {
    level: "T3",
    score: 3.5,
    labelJa: "期待を超過",
    labelEn: "Exceeded",
    descJa: "目標を上回る成果を達成し、高い付加価値を創出した",
    descEn: "Exceeded targets and created high added value",
  },
  {
    level: "T2",
    score: 2.5,
    labelJa: "期待通り",
    labelEn: "As Expected",
    descJa: "計画通り目標を概ね達成し、標準的な成果を示した",
    descEn: "Met targets as planned with standard results",
  },
  {
    level: "T1",
    score: 1.0,
    labelJa: "改善を要する",
    labelEn: "Needs Improvement",
    descJa: "目標達成に至らず、改善策の検討・実行が必要である",
    descEn: "Did not meet targets; improvement needed",
  },
];

interface GrowthEvaluationSupportProps {
  language: "en" | "ja";
  categories: GrowthCategory[];
  onScoreCalculated: (score: number, categoryId: string, level: string) => void;
  initialCategoryId?: string;
  initialLevel?: string;
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
  const [finalScore, setFinalScore] = useState<number>(0);

  // スコア計算
  useEffect(() => {
    if (!selectedCategory || !selectedLevel) {
      setFinalScore(0);
      return;
    }

    const category = categories.find((c) => c.id === selectedCategory);
    if (!category) {
      setFinalScore(0);
      return;
    }

    const levelData = achievementLevels.find((l) => l.level === selectedLevel);
    if (!levelData) {
      setFinalScore(0);
      return;
    }

    const calculatedScore = Math.min(5.0, Math.round(levelData.score * category.coefficient * 10) / 10);
    setFinalScore(calculatedScore);
    onScoreCalculated(calculatedScore, selectedCategory, selectedLevel);
  }, [selectedCategory, selectedLevel, categories, onScoreCalculated]);

  const selectedCategoryData = categories.find((c) => c.id === selectedCategory);
  const selectedLevelData = achievementLevels.find((l) => l.level === selectedLevel);

  const getCategoryName = (cat: GrowthCategory) => {
    if (language === "en" && cat.nameEn) {
      return cat.nameEn;
    }
    return cat.name;
  };

  return (
    <div className="space-y-4">
      {/* カテゴリー選択 */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            <span className="font-medium">
              {language === "ja" ? "成長カテゴリー" : "Growth Category"}
            </span>
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  language === "ja"
                    ? "カテゴリーを選択してください"
                    : "Please select a category"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {getCategoryName(category)} ({category.coefficient}x)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 選択中カテゴリの詳細 */}
          {selectedCategoryData && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {getCategoryName(selectedCategoryData)}
                  </p>
                  {selectedCategoryData.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedCategoryData.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">
                    {language === "ja" ? "係数" : "Coefficient"}
                  </span>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    ×{selectedCategoryData.coefficient.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 達成度選択 */}
      {selectedCategory && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              <span className="font-medium">
                {language === "ja" ? "達成度" : "Achievement Level"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {achievementLevels.map((level) => {
                const scoreWithCoef = selectedCategoryData
                  ? Math.min(5.0, Math.round(level.score * selectedCategoryData.coefficient * 10) / 10)
                  : level.score;
                const isSelected = selectedLevel === level.level;

                return (
                  <button
                    key={level.level}
                    onClick={() => setSelectedLevel(level.level)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/10 dark:border-purple-400 dark:bg-purple-400/10"
                        : "border-border hover:border-purple-500/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold text-base ${isSelected ? "text-purple-600 dark:text-purple-400" : ""}`}>
                        {level.level}
                      </span>
                      <span className={`font-bold text-lg ${isSelected ? "text-purple-600 dark:text-purple-400" : ""}`}>
                        {scoreWithCoef.toFixed(1)}
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${isSelected ? "text-purple-600 dark:text-purple-400" : ""}`}>
                      {language === "ja" ? level.labelJa : level.labelEn}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {language === "ja" ? level.descJa : level.descEn}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 計算式表示 */}
      {selectedCategoryData && selectedLevelData && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground text-center">
            {language === "ja" ? "計算式:" : "Formula:"}{" "}
            <span className="font-mono">
              {selectedLevelData.score.toFixed(1)} × {selectedCategoryData.coefficient.toFixed(1)} ={" "}
              <strong className="text-purple-600 dark:text-purple-400">{finalScore.toFixed(1)}</strong>
            </span>
          </p>
        </div>
      )}

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
