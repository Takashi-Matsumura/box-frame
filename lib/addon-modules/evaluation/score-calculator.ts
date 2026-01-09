/**
 * スコア計算ロジック
 *
 * 3軸評価のスコア計算:
 * - 基準1: 結果評価（組織目標達成率）
 * - 基準2: プロセス評価（行動特性5項目）
 * - 基準3: 成長評価（カテゴリ × レベル × 係数）
 */

import { prisma } from "@/lib/prisma";
import type { WeightConfig } from "./weight-helper";

/**
 * T1〜T4のレベルからスコアへの変換マップ
 * T1 = 1.0（不十分）
 * T2 = 2.5（要改善）
 * T3 = 3.5（標準）
 * T4 = 5.0（優秀）
 */
const LEVEL_TO_SCORE: Record<number, number> = {
  1: 1.0,
  2: 2.5,
  3: 3.5,
  4: 5.0,
};

/**
 * スコア範囲の型定義
 */
export interface ScoreRange {
  min: number;
  max: number;
}

/**
 * ProcessCategoryとGrowthCategoryからスコア範囲を取得
 *
 * ProcessCategory: クラスA〜Dの T1〜T4 スコア
 * GrowthCategory: カテゴリごとの scoreT1〜T4 × 係数
 *
 * 両方の最大値・最小値を取得して統合
 */
export async function getEvaluationScoreRange(): Promise<ScoreRange> {
  // ProcessCategoryからスコアを取得
  const processCategories = await prisma.processCategory.findMany({
    where: { isActive: true },
    select: { scores: true },
  });

  // GrowthCategoryからスコアを取得
  const growthCategories = await prisma.growthCategory.findMany({
    where: { isActive: true },
    select: {
      scoreT1: true,
      scoreT2: true,
      scoreT3: true,
      scoreT4: true,
      coefficient: true,
    },
  });

  let minScore = Number.POSITIVE_INFINITY;
  let maxScore = Number.NEGATIVE_INFINITY;

  // ProcessCategoryのスコア範囲を計算
  for (const category of processCategories) {
    try {
      const scores = JSON.parse(category.scores) as Record<string, number>;
      for (const score of Object.values(scores)) {
        if (typeof score === "number" && !Number.isNaN(score)) {
          minScore = Math.min(minScore, score);
          maxScore = Math.max(maxScore, score);
        }
      }
    } catch {
      // パースエラーは無視
    }
  }

  // GrowthCategoryのスコア範囲を計算（係数適用後）
  for (const category of growthCategories) {
    const coefficient = category.coefficient ?? 1.0;
    const scores = [
      category.scoreT1 * coefficient,
      category.scoreT2 * coefficient,
      category.scoreT3 * coefficient,
      category.scoreT4 * coefficient,
    ];
    for (const score of scores) {
      if (!Number.isNaN(score)) {
        minScore = Math.min(minScore, score);
        maxScore = Math.max(maxScore, score);
      }
    }
  }

  // データがない場合はデフォルト値（ドキュメント記載のスケール）
  if (!Number.isFinite(minScore) || !Number.isFinite(maxScore)) {
    return { min: 50, max: 130 };
  }

  return { min: minScore, max: maxScore };
}

/**
 * 最終グレードの判定（固定閾値版）
 * @deprecated determineGradeWithRange を使用してください
 */
function determineGrade(score: number): string {
  if (score >= 4.5) return "S";
  if (score >= 3.5) return "A";
  if (score >= 2.5) return "B";
  if (score >= 1.5) return "C";
  return "D";
}

/**
 * 最終グレードの判定（スコア範囲考慮版）
 *
 * スコア範囲内での相対位置に基づいてグレードを判定:
 * - 90%以上 → S
 * - 70%以上 → A
 * - 50%以上 → B
 * - 30%以上 → C
 * - 30%未満 → D
 */
export function determineGradeWithRange(score: number, scoreRange: ScoreRange): string {
  const { min, max } = scoreRange;
  const range = max - min;

  if (range === 0) return "B"; // 範囲がない場合は中央

  // スコアの相対位置（0〜1）
  const relativePosition = (score - min) / range;

  if (relativePosition >= 0.9) return "S";
  if (relativePosition >= 0.7) return "A";
  if (relativePosition >= 0.5) return "B";
  if (relativePosition >= 0.3) return "C";
  return "D";
}

/**
 * 基準1: 結果評価スコアを計算
 *
 * 達成率を指定されたスコア範囲にマッピング:
 * - 達成率 80% 未満 → 最小スコア
 * - 達成率 80% → 最小スコア + (範囲の25%)
 * - 達成率 100% → 中央値（min + max の中間）
 * - 達成率 120% → 最大スコア - (範囲の25%)
 * - 達成率 120% 以上 → 最大スコア
 *
 * @param achievementRate 達成率（%）
 * @param scoreRange スコア範囲（min/max）。指定しない場合は50〜130
 */
export function calculateResultsScore(
  achievementRate: number,
  scoreRange?: ScoreRange
): number {
  const min = scoreRange?.min ?? 50;
  const max = scoreRange?.max ?? 130;
  const range = max - min;

  // 達成率に応じたスコアを計算
  // 80%未満 → min
  // 80% → min + range * 0.25
  // 100% → min + range * 0.5 (中央値)
  // 120% → min + range * 0.75
  // 120%以上 → max
  let normalizedScore: number;

  if (achievementRate < 80) {
    // 80%未満は最低スコア付近
    // 0% → min, 80% → min + range * 0.25
    normalizedScore = min + (achievementRate / 80) * (range * 0.25);
  } else if (achievementRate < 100) {
    // 80%〜100%: min + 0.25*range → min + 0.5*range
    const ratio = (achievementRate - 80) / 20; // 0 to 1
    normalizedScore = min + range * 0.25 + ratio * (range * 0.25);
  } else if (achievementRate < 120) {
    // 100%〜120%: min + 0.5*range → min + 0.75*range
    const ratio = (achievementRate - 100) / 20; // 0 to 1
    normalizedScore = min + range * 0.5 + ratio * (range * 0.25);
  } else {
    // 120%以上: min + 0.75*range → max
    // 120% → 0.75, 160%以上 → 1.0
    const ratio = Math.min((achievementRate - 120) / 40, 1); // 0 to 1
    normalizedScore = min + range * 0.75 + ratio * (range * 0.25);
  }

  // 範囲内に収める
  return Math.round(Math.min(Math.max(normalizedScore, min), max) * 10) / 10;
}

/**
 * 基準1: 結果評価スコアを非同期で計算（DB からスコア範囲を取得）
 */
export async function calculateResultsScoreAsync(
  achievementRate: number
): Promise<number> {
  const scoreRange = await getEvaluationScoreRange();
  return calculateResultsScore(achievementRate, scoreRange);
}

/**
 * 基準2: プロセス評価スコアを計算
 * 各項目(T1-T4)の平均スコア
 */
export function calculateProcessScore(
  processScores: Record<string, number>
): number {
  const values = Object.values(processScores);
  if (values.length === 0) return 0;

  const scores = values.map((level) => LEVEL_TO_SCORE[level] || 2.5);
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

/**
 * 基準3: 成長評価スコアを計算
 * レベルスコア × カテゴリ係数
 */
export async function calculateGrowthScore(
  growthCategoryId: string,
  growthLevel: number
): Promise<number> {
  const category = await prisma.growthCategory.findUnique({
    where: { id: growthCategoryId },
  });

  const levelScore = LEVEL_TO_SCORE[growthLevel] || 2.5;
  const coefficient = category?.coefficient || 1.0;

  // 係数を適用し、上限5.0
  return Math.min(Math.round(levelScore * coefficient * 100) / 100, 5.0);
}

/**
 * 成長評価スコアを同期的に計算（係数を渡す場合）
 */
export function calculateGrowthScoreSync(
  growthLevel: number,
  coefficient: number
): number {
  const levelScore = LEVEL_TO_SCORE[growthLevel] || 2.5;
  return Math.min(Math.round(levelScore * coefficient * 100) / 100, 5.0);
}

export interface ScoreResult {
  score1: number;           // 結果評価スコア
  score2: number;           // プロセス評価スコア
  score3: number;           // 成長評価スコア
  weightedScore1: number;   // 加重後スコア1
  weightedScore2: number;   // 加重後スコア2
  weightedScore3: number;   // 加重後スコア3
  finalScore: number;       // 最終スコア
  finalGrade: string;       // 最終グレード
}

/**
 * 最終スコアを計算
 */
export function calculateFinalScore(
  score1: number,
  score2: number,
  score3: number,
  weights: WeightConfig
): ScoreResult {
  // 加重スコアを計算
  const weightedScore1 = Math.round((score1 * weights.resultsWeight / 100) * 100) / 100;
  const weightedScore2 = Math.round((score2 * weights.processWeight / 100) * 100) / 100;
  const weightedScore3 = Math.round((score3 * weights.growthWeight / 100) * 100) / 100;

  // 最終スコア
  const finalScore = Math.round((weightedScore1 + weightedScore2 + weightedScore3) * 100) / 100;

  // グレード判定
  const finalGrade = determineGrade(finalScore);

  return {
    score1,
    score2,
    score3,
    weightedScore1,
    weightedScore2,
    weightedScore3,
    finalScore,
    finalGrade,
  };
}

/**
 * 評価データを更新してスコアを再計算
 */
export async function recalculateEvaluationScore(
  evaluationId: string
): Promise<ScoreResult | null> {
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: { period: true, employee: true },
  });

  if (!evaluation) return null;

  // 重みを取得（役職×等級で検索）
  const { getWeightsForPositionGrade } = await import("./weight-helper");
  const weights = await getWeightsForPositionGrade(
    evaluation.periodId,
    evaluation.employee.positionCode,
    evaluation.gradeCode || null
  );

  // スコアを取得（null の場合は0として扱う）
  const score1 = evaluation.score1 || 0;
  const score2 = evaluation.score2 || 0;
  const score3 = evaluation.score3 || 0;

  // 最終スコアを計算
  const result = calculateFinalScore(score1, score2, score3, weights);

  // データベースを更新
  await prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      weightedScore1: result.weightedScore1,
      weightedScore2: result.weightedScore2,
      weightedScore3: result.weightedScore3,
      finalScore: result.finalScore,
      finalGrade: result.finalGrade,
    },
  });

  return result;
}

/**
 * 組織の達成率から社員の結果評価スコアを更新
 * @deprecated sync-scores APIを使用してください
 */
export async function syncResultsScoreFromCriteria1(
  periodId: string,
  organizationLevel: "DEPARTMENT" | "SECTION" | "COURSE",
  organizationId: string
): Promise<number> {
  // Criteria1Resultを取得
  const result = await prisma.criteria1Result.findUnique({
    where: {
      periodId_organizationLevel_organizationId: {
        periodId,
        organizationLevel,
        organizationId,
      },
    },
  });

  if (!result || result.achievementRate === null || !result.isActive) {
    return 0;
  }

  // スコア範囲を取得して結果評価スコアを計算
  const scoreRange = await getEvaluationScoreRange();
  const score = calculateResultsScore(result.achievementRate, scoreRange);

  // 評価レコードを取得して更新
  const evaluations = await prisma.evaluation.findMany({
    where: { periodId },
    include: { employee: true },
  });

  let updatedCount = 0;

  for (const evaluation of evaluations) {
    let shouldUpdate = false;

    if (organizationLevel === "DEPARTMENT" && evaluation.employee.departmentId === organizationId) {
      shouldUpdate = true;
    } else if (organizationLevel === "SECTION" && evaluation.employee.sectionId === organizationId) {
      shouldUpdate = true;
    } else if (organizationLevel === "COURSE" && evaluation.employee.courseId === organizationId) {
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      await prisma.evaluation.update({
        where: { id: evaluation.id },
        data: {
          score1: score,
          score1Comment: `達成率 ${result.achievementRate.toFixed(1)}% に基づく自動計算`,
        },
      });
      updatedCount++;
    }
  }

  return updatedCount;
}

// 後方互換性のためのエイリアス
export const syncResultsScoreFromOrganizationGoal = syncResultsScoreFromCriteria1;
