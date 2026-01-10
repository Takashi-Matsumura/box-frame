/**
 * 重み設定サービス
 *
 * 役職×等級別の重み設定を取得・管理する
 */

import { prisma } from "@/lib/prisma";
import { DEFAULT_WEIGHTS } from "../constants";
import type { WeightConfig } from "../types";

/**
 * 役職×等級に応じた重みを取得
 *
 * 取得順序（フォールバック）:
 * 1. 役職×等級別の重み（periodId + positionCode + gradeCode）
 * 2. 役職のデフォルト（periodId + positionCode + "ALL"）
 * 3. 等級のデフォルト（periodId + "DEFAULT" + gradeCode）
 * 4. グローバルデフォルト（periodId + "DEFAULT" + "ALL"）
 * 5. ハードコーディングされたデフォルト値
 */
export async function getWeightsForPositionGrade(
  periodId: string,
  positionCode: string | null,
  gradeCode: string | null,
): Promise<WeightConfig> {
  // 1. 役職×等級別の重みを検索
  if (positionCode && gradeCode) {
    const specificWeight = await prisma.evaluationWeight.findUnique({
      where: {
        periodId_positionCode_gradeCode: { periodId, positionCode, gradeCode },
      },
    });

    if (specificWeight) {
      return {
        resultsWeight: specificWeight.resultsWeight,
        processWeight: specificWeight.processWeight,
        growthWeight: specificWeight.growthWeight,
      };
    }
  }

  // 2. 役職のデフォルト（全等級共通）を検索
  if (positionCode) {
    const positionDefault = await prisma.evaluationWeight.findUnique({
      where: {
        periodId_positionCode_gradeCode: {
          periodId,
          positionCode,
          gradeCode: "ALL",
        },
      },
    });

    if (positionDefault) {
      return {
        resultsWeight: positionDefault.resultsWeight,
        processWeight: positionDefault.processWeight,
        growthWeight: positionDefault.growthWeight,
      };
    }
  }

  // 3. 等級のデフォルト（全役職共通）を検索
  if (gradeCode) {
    const gradeDefault = await prisma.evaluationWeight.findUnique({
      where: {
        periodId_positionCode_gradeCode: {
          periodId,
          positionCode: "DEFAULT",
          gradeCode,
        },
      },
    });

    if (gradeDefault) {
      return {
        resultsWeight: gradeDefault.resultsWeight,
        processWeight: gradeDefault.processWeight,
        growthWeight: gradeDefault.growthWeight,
      };
    }
  }

  // 4. グローバルデフォルトを検索
  const globalDefault = await prisma.evaluationWeight.findUnique({
    where: {
      periodId_positionCode_gradeCode: {
        periodId,
        positionCode: "DEFAULT",
        gradeCode: "ALL",
      },
    },
  });

  if (globalDefault) {
    return {
      resultsWeight: globalDefault.resultsWeight,
      processWeight: globalDefault.processWeight,
      growthWeight: globalDefault.growthWeight,
    };
  }

  // 5. ハードコーディングされたデフォルト
  return DEFAULT_WEIGHTS;
}

/**
 * 後方互換性のため、等級のみでの取得もサポート
 * @deprecated getWeightsForPositionGrade を使用してください
 */
export async function getWeightsForGrade(
  periodId: string,
  gradeCode: string | null,
): Promise<WeightConfig> {
  return getWeightsForPositionGrade(periodId, null, gradeCode);
}

/**
 * 評価期間の全重み設定を取得
 */
export async function getAllWeightsForPeriod(
  periodId: string,
): Promise<
  Array<
    {
      positionCode: string;
      positionName: string | null;
      gradeCode: string;
    } & WeightConfig
  >
> {
  const weights = await prisma.evaluationWeight.findMany({
    where: { periodId },
    orderBy: [{ positionCode: "asc" }, { gradeCode: "asc" }],
  });

  return weights.map((w) => ({
    positionCode: w.positionCode,
    positionName: w.positionName,
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
  positionCode: string,
  gradeCode: string,
  weights: WeightConfig,
  positionName?: string,
): Promise<void> {
  // 合計が100%になることを確認
  const total =
    weights.resultsWeight + weights.processWeight + weights.growthWeight;
  if (total !== 100) {
    throw new Error(`Weight total must be 100%, got ${total}%`);
  }

  await prisma.evaluationWeight.upsert({
    where: {
      periodId_positionCode_gradeCode: { periodId, positionCode, gradeCode },
    },
    update: {
      positionName,
      resultsWeight: weights.resultsWeight,
      processWeight: weights.processWeight,
      growthWeight: weights.growthWeight,
    },
    create: {
      periodId,
      positionCode,
      positionName,
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
 *
 * @deprecated 各役職×等級ごとに重みを設定するため、グローバルデフォルトは不要。
 * フォールバックはコード内のDEFAULT_WEIGHTS定数で対応。
 */
export async function initializeDefaultWeights(
  _periodId: string,
): Promise<void> {
  // 何もしない - 各役職×等級ごとに設定するためグローバルデフォルトは不要
  // フォールバックはgetWeightsForPositionGrade()内のDEFAULT_WEIGHTSで対応
}

/**
 * 重み設定を削除
 */
export async function deleteWeight(
  periodId: string,
  positionCode: string,
  gradeCode: string,
): Promise<void> {
  await prisma.evaluationWeight.delete({
    where: {
      periodId_positionCode_gradeCode: { periodId, positionCode, gradeCode },
    },
  });
}
