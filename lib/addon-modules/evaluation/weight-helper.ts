/**
 * 重み取得ユーティリティ
 *
 * 資格等級別の重み設定を取得する
 */

import { prisma } from "@/lib/prisma";

export interface WeightConfig {
  resultsWeight: number;  // 結果評価の重み (%)
  processWeight: number;  // プロセス評価の重み (%)
  growthWeight: number;   // 成長評価の重み (%)
}

/**
 * デフォルトの重み設定
 */
const DEFAULT_WEIGHTS: WeightConfig = {
  resultsWeight: 30,
  processWeight: 40,
  growthWeight: 30,
};

/**
 * 資格等級に応じた重みを取得
 *
 * 取得順序:
 * 1. 資格等級別の重み（periodId + gradeCode）
 * 2. デフォルトの重み（periodId + "DEFAULT"）
 * 3. ハードコーディングされたデフォルト値
 */
export async function getWeightsForGrade(
  periodId: string,
  gradeCode: string | null
): Promise<WeightConfig> {
  // 1. 資格等級別の重みを検索
  if (gradeCode) {
    const gradeWeight = await prisma.evaluationWeight.findUnique({
      where: {
        periodId_gradeCode: { periodId, gradeCode },
      },
    });

    if (gradeWeight) {
      return {
        resultsWeight: gradeWeight.resultsWeight,
        processWeight: gradeWeight.processWeight,
        growthWeight: gradeWeight.growthWeight,
      };
    }
  }

  // 2. デフォルトの重みを検索
  const defaultWeight = await prisma.evaluationWeight.findUnique({
    where: {
      periodId_gradeCode: { periodId, gradeCode: "DEFAULT" },
    },
  });

  if (defaultWeight) {
    return {
      resultsWeight: defaultWeight.resultsWeight,
      processWeight: defaultWeight.processWeight,
      growthWeight: defaultWeight.growthWeight,
    };
  }

  // 3. ハードコーディングされたデフォルト
  return DEFAULT_WEIGHTS;
}

/**
 * 評価期間の全重み設定を取得
 */
export async function getAllWeightsForPeriod(
  periodId: string
): Promise<Array<{ gradeCode: string } & WeightConfig>> {
  const weights = await prisma.evaluationWeight.findMany({
    where: { periodId },
    orderBy: { gradeCode: "asc" },
  });

  return weights.map((w) => ({
    gradeCode: w.gradeCode,
    resultsWeight: w.resultsWeight,
    processWeight: w.processWeight,
    growthWeight: w.growthWeight,
  }));
}

/**
 * 重み設定を作成・更新
 */
export async function upsertWeight(
  periodId: string,
  gradeCode: string,
  weights: WeightConfig
): Promise<void> {
  // 合計が100%になることを確認
  const total = weights.resultsWeight + weights.processWeight + weights.growthWeight;
  if (total !== 100) {
    throw new Error(`Weight total must be 100%, got ${total}%`);
  }

  await prisma.evaluationWeight.upsert({
    where: {
      periodId_gradeCode: { periodId, gradeCode },
    },
    update: {
      resultsWeight: weights.resultsWeight,
      processWeight: weights.processWeight,
      growthWeight: weights.growthWeight,
    },
    create: {
      periodId,
      gradeCode,
      resultsWeight: weights.resultsWeight,
      processWeight: weights.processWeight,
      growthWeight: weights.growthWeight,
    },
  });
}

/**
 * デフォルトの重み設定を初期化
 * 新しい評価期間を作成した際に呼び出す
 */
export async function initializeDefaultWeights(periodId: string): Promise<void> {
  const defaultGrades = [
    // 一般社員
    { gradeCode: "G1", resultsWeight: 20, processWeight: 40, growthWeight: 40 },
    { gradeCode: "G2", resultsWeight: 20, processWeight: 40, growthWeight: 40 },
    // 主任級
    { gradeCode: "G3", resultsWeight: 30, processWeight: 40, growthWeight: 30 },
    { gradeCode: "G4", resultsWeight: 30, processWeight: 40, growthWeight: 30 },
    // 管理職
    { gradeCode: "G5", resultsWeight: 40, processWeight: 35, growthWeight: 25 },
    { gradeCode: "G6", resultsWeight: 40, processWeight: 35, growthWeight: 25 },
    // 上級管理職
    { gradeCode: "G7", resultsWeight: 50, processWeight: 30, growthWeight: 20 },
    // デフォルト
    { gradeCode: "DEFAULT", resultsWeight: 30, processWeight: 40, growthWeight: 30 },
  ];

  for (const grade of defaultGrades) {
    await prisma.evaluationWeight.upsert({
      where: {
        periodId_gradeCode: { periodId, gradeCode: grade.gradeCode },
      },
      update: {
        resultsWeight: grade.resultsWeight,
        processWeight: grade.processWeight,
        growthWeight: grade.growthWeight,
      },
      create: {
        periodId,
        gradeCode: grade.gradeCode,
        resultsWeight: grade.resultsWeight,
        processWeight: grade.processWeight,
        growthWeight: grade.growthWeight,
      },
    });
  }
}

/**
 * 重み設定を削除
 */
export async function deleteWeight(
  periodId: string,
  gradeCode: string
): Promise<void> {
  if (gradeCode === "DEFAULT") {
    throw new Error("Cannot delete DEFAULT weight");
  }

  await prisma.evaluationWeight.delete({
    where: {
      periodId_gradeCode: { periodId, gradeCode },
    },
  });
}
