"use client";

import { useState, useEffect } from "react";
import { FaCheckCircle, FaStar, FaChartLine } from "react-icons/fa";

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
    color: "bg-purple-100 border-purple-600 text-purple-700",
  },
  {
    level: "T3",
    score: 3.5,
    labelJa: "期待を超過",
    labelEn: "Exceeded",
    descJa: "目標を上回る成果を達成し、高い付加価値を創出した",
    descEn: "Exceeded targets and created high added value",
    color: "bg-blue-100 border-blue-600 text-blue-700",
  },
  {
    level: "T2",
    score: 2.5,
    labelJa: "期待通り",
    labelEn: "As Expected",
    descJa: "計画通り目標を概ね達成し、標準的な成果を示した",
    descEn: "Met targets as planned with standard results",
    color: "bg-green-100 border-green-600 text-green-700",
  },
  {
    level: "T1",
    score: 1.0,
    labelJa: "改善を要する",
    labelEn: "Needs Improvement",
    descJa: "目標達成に至らず、改善策の検討・実行が必要である",
    descEn: "Did not meet targets; improvement needed",
    color: "bg-orange-100 border-orange-600 text-orange-700",
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
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <FaChartLine className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-bold text-gray-900">
            {language === "ja" ? "成長カテゴリー" : "Growth Category"}
          </span>
        </div>
        <div className="bg-white rounded-lg p-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white cursor-pointer"
          >
            <option value="">
              {language === "ja"
                ? "カテゴリーを選択してください"
                : "Please select a category"}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {getCategoryName(category)} ({category.coefficient}x)
                {category.description && ` - ${category.description}`}
              </option>
            ))}
          </select>
        </div>

        {/* 選択中カテゴリの詳細 */}
        {selectedCategoryData && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {getCategoryName(selectedCategoryData)}
                </p>
                {selectedCategoryData.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedCategoryData.description}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500">
                  {language === "ja" ? "係数" : "Coefficient"}
                </span>
                <p className="text-xl font-bold text-purple-700">
                  ×{selectedCategoryData.coefficient.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 達成度選択 */}
      {selectedCategory && (
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <FaStar className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-bold text-gray-900">
              {language === "ja" ? "達成度" : "Achievement Level"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {achievementLevels.map((level) => {
              const scoreWithCoef = selectedCategoryData
                ? Math.min(5.0, Math.round(level.score * selectedCategoryData.coefficient * 10) / 10)
                : level.score;

              return (
                <button
                  key={level.level}
                  onClick={() => setSelectedLevel(level.level)}
                  className={`py-3 px-4 rounded-lg border-2 text-left transition-all ${
                    selectedLevel === level.level
                      ? `${level.color} border-current shadow-md`
                      : "border-gray-300 bg-white hover:border-purple-400 hover:bg-purple-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-base">
                      {level.level}
                    </span>
                    <span className="font-bold text-lg">
                      {scoreWithCoef.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {language === "ja" ? level.labelJa : level.labelEn}
                  </p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {language === "ja" ? level.descJa : level.descEn}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 計算式表示 */}
      {selectedCategoryData && selectedLevelData && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            {language === "ja" ? "計算式:" : "Formula:"}{" "}
            <span className="font-mono">
              {selectedLevelData.score.toFixed(1)} × {selectedCategoryData.coefficient.toFixed(1)} ={" "}
              <strong className="text-purple-700">{finalScore.toFixed(1)}</strong>
            </span>
          </p>
        </div>
      )}

      {/* 最終スコア表示 */}
      <div className="bg-gradient-to-r from-purple-100 to-violet-100 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-bold text-gray-900">
              {language === "ja" ? "成長評価最終スコア" : "Final Growth Evaluation Score"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {selectedCategoryData && (
              <span className="text-sm text-gray-600">
                {getCategoryName(selectedCategoryData)}
              </span>
            )}
            <span className="text-3xl font-bold text-purple-700">
              {finalScore.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
