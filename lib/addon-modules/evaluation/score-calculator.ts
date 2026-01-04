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
 * 最終グレードの判定
 */
function determineGrade(score: number): string {
  if (score >= 4.5) return "S";
  if (score >= 3.5) return "A";
  if (score >= 2.5) return "B";
  if (score >= 1.5) return "C";
  return "D";
}

/**
 * 基準1: 結果評価スコアを計算
 * 達成率100% = 3.0を基準
 * スコア範囲: 1.0〜5.0
 */
export function calculateResultsScore(achievementRate: number): number {
  // 達成率(%)からスコアを計算
  // 100% = 3.0, 80% = 2.4, 120% = 3.6, 166.7% = 5.0
  const score = (achievementRate / 100) * 3.0;
  return Math.min(Math.max(score, 1.0), 5.0);
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
    include: { period: true },
  });

  if (!evaluation) return null;

  // 重みを取得
  const { getWeightsForGrade } = await import("./weight-helper");
  const weights = await getWeightsForGrade(
    evaluation.periodId,
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
 */
export async function syncResultsScoreFromOrganizationGoal(
  periodId: string,
  organizationType: string,
  organizationId: string
): Promise<number> {
  // 組織目標を取得
  const goal = await prisma.organizationGoal.findUnique({
    where: {
      periodId_organizationType_organizationId: {
        periodId,
        organizationType,
        organizationId,
      },
    },
  });

  if (!goal || goal.achievementRate === null) {
    return 0;
  }

  const score = calculateResultsScore(goal.achievementRate);

  // 該当組織に所属する社員の評価を更新
  const whereCondition: Record<string, string> = { periodId };

  if (organizationType === "DEPARTMENT") {
    whereCondition["employee"] = JSON.stringify({ departmentId: organizationId });
  } else if (organizationType === "SECTION") {
    whereCondition["employee"] = JSON.stringify({ sectionId: organizationId });
  } else if (organizationType === "COURSE") {
    whereCondition["employee"] = JSON.stringify({ courseId: organizationId });
  }

  // 評価レコードを取得して更新
  const evaluations = await prisma.evaluation.findMany({
    where: { periodId },
    include: { employee: true },
  });

  let updatedCount = 0;

  for (const evaluation of evaluations) {
    let shouldUpdate = false;

    if (organizationType === "DEPARTMENT" && evaluation.employee.departmentId === organizationId) {
      shouldUpdate = true;
    } else if (organizationType === "SECTION" && evaluation.employee.sectionId === organizationId) {
      shouldUpdate = true;
    } else if (organizationType === "COURSE" && evaluation.employee.courseId === organizationId) {
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      await prisma.evaluation.update({
        where: { id: evaluation.id },
        data: {
          score1: score,
          score1Comment: `達成率 ${goal.achievementRate}% に基づく自動計算`,
        },
      });
      updatedCount++;
    }
  }

  return updatedCount;
}
