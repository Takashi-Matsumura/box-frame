/**
 * 評価データ一括生成サービス
 *
 * 評価期間の開始時に全社員の評価レコードを生成する
 */

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_GROWTH_CATEGORIES,
  DEFAULT_PROCESS_CATEGORIES,
} from "../constants";
import type {
  BatchGenerationResult,
  EmployeeWithOrg,
  EvaluationProgress,
  PeriodStatus,
} from "../types";
import { determineEvaluator } from "./evaluator-resolver";
import { initializeDefaultWeights } from "./weight-service";

/**
 * 評価期間の全社員の評価レコードを一括生成
 */
export async function generateEvaluationsForPeriod(
  periodId: string,
  organizationId?: string,
): Promise<BatchGenerationResult> {
  const result: BatchGenerationResult = {
    totalEmployees: 0,
    generatedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  // 評価期間を取得
  const period = await prisma.evaluationPeriod.findUnique({
    where: { id: periodId },
  });

  if (!period) {
    throw new Error("Evaluation period not found");
  }

  if (period.status !== "DRAFT") {
    throw new Error("Can only generate evaluations for DRAFT periods");
  }

  // デフォルトの重み設定を初期化
  await initializeDefaultWeights(periodId);

  // 対象社員を取得
  const whereCondition: Record<string, unknown> = { isActive: true };
  if (organizationId) {
    whereCondition.organizationId = organizationId;
  }

  const employees = await prisma.employee.findMany({
    where: whereCondition,
    include: {
      department: { include: { manager: true } },
      section: { include: { manager: true } },
      course: { include: { manager: true } },
    },
  });

  result.totalEmployees = employees.length;

  // 既存の評価レコードを取得
  const existingEvaluations = await prisma.evaluation.findMany({
    where: { periodId },
    select: { employeeId: true },
  });
  const existingEmployeeIds = new Set(
    existingEvaluations.map((e) => e.employeeId),
  );

  // 各社員の評価レコードを生成
  for (const employee of employees) {
    // 既存レコードがあればスキップ
    if (existingEmployeeIds.has(employee.id)) {
      result.skippedCount++;
      continue;
    }

    try {
      // 評価者を決定
      const evaluator = await determineEvaluator(
        employee as EmployeeWithOrg,
        periodId,
      );

      // 評価レコードを作成
      await prisma.evaluation.create({
        data: {
          periodId,
          employeeId: employee.id,
          evaluatorId: evaluator?.id || null,
          // スナップショット
          departmentName: employee.department?.name || null,
          sectionName: employee.section?.name || null,
          courseName: employee.course?.name || null,
          positionName: employee.position || null,
          gradeCode: employee.qualificationGradeCode || null,
          // ステータス
          status: "PENDING",
        },
      });

      result.generatedCount++;
    } catch (error) {
      result.errors.push({
        employeeId: employee.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return result;
}

/**
 * 評価期間のステータスを変更
 */
export async function updatePeriodStatus(
  periodId: string,
  status: PeriodStatus,
): Promise<void> {
  await prisma.evaluationPeriod.update({
    where: { id: periodId },
    data: { status },
  });
}

/**
 * プロセス評価項目のマスタデータを初期化
 */
export async function initializeProcessCategories(): Promise<void> {
  for (const category of DEFAULT_PROCESS_CATEGORIES) {
    const existing = await prisma.processCategory.findFirst({
      where: { name: category.name },
    });

    if (!existing) {
      await prisma.processCategory.create({
        data: category,
      });
    }
  }
}

/**
 * 成長評価カテゴリのマスタデータを初期化
 */
export async function initializeGrowthCategories(): Promise<void> {
  for (const category of DEFAULT_GROWTH_CATEGORIES) {
    const existing = await prisma.growthCategory.findFirst({
      where: { name: category.name },
    });

    if (!existing) {
      await prisma.growthCategory.create({
        data: category,
      });
    }
  }
}

/**
 * マスタデータの一括初期化
 */
export async function initializeMasterData(): Promise<void> {
  await initializeProcessCategories();
  await initializeGrowthCategories();
}

/**
 * 評価期間の評価データを削除（リセット）
 */
export async function resetEvaluationsForPeriod(
  periodId: string,
): Promise<number> {
  const result = await prisma.evaluation.deleteMany({
    where: { periodId },
  });

  return result.count;
}

/**
 * 評価進捗を取得
 */
export async function getEvaluationProgress(
  periodId: string,
): Promise<EvaluationProgress> {
  const [total, pending, inProgress, completed, confirmed] = await Promise.all([
    prisma.evaluation.count({ where: { periodId } }),
    prisma.evaluation.count({ where: { periodId, status: "PENDING" } }),
    prisma.evaluation.count({ where: { periodId, status: "IN_PROGRESS" } }),
    prisma.evaluation.count({ where: { periodId, status: "COMPLETED" } }),
    prisma.evaluation.count({ where: { periodId, status: "CONFIRMED" } }),
  ]);

  return { total, pending, inProgress, completed, confirmed };
}
