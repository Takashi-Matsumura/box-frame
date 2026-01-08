/**
 * 評価データ一括生成
 *
 * 評価期間の開始時に全社員の評価レコードを生成する
 */

import { prisma } from "@/lib/prisma";
import { determineEvaluator, type EmployeeWithOrg } from "./evaluator-logic";
import { initializeDefaultWeights } from "./weight-helper";

export interface BatchGenerationResult {
  totalEmployees: number;
  generatedCount: number;
  skippedCount: number;
  errors: Array<{ employeeId: string; error: string }>;
}

/**
 * 評価期間の全社員の評価レコードを一括生成
 */
export async function generateEvaluationsForPeriod(
  periodId: string,
  organizationId?: string
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
  const existingEmployeeIds = new Set(existingEvaluations.map((e) => e.employeeId));

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
        periodId
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
  status: "DRAFT" | "ACTIVE" | "REVIEW" | "CLOSED"
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
  const defaultCategories = [
    { name: "主体性", nameEn: "Initiative", description: "自ら考え、積極的に行動する姿勢", sortOrder: 1 },
    { name: "協調性", nameEn: "Teamwork", description: "チーム内での協力・連携", sortOrder: 2 },
    { name: "責任感", nameEn: "Responsibility", description: "役割達成への意識・コミットメント", sortOrder: 3 },
    { name: "改善力", nameEn: "Improvement", description: "より良い方法を模索・提案する力", sortOrder: 4 },
    { name: "専門性", nameEn: "Expertise", description: "業務に必要な知識・スキルの発揮", sortOrder: 5 },
  ];

  for (const category of defaultCategories) {
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
  const defaultCategories = [
    { name: "専門スキル向上", nameEn: "Professional Skill Improvement", description: "業務スキルの習得・向上", coefficient: 1.0, sortOrder: 1 },
    { name: "資格取得・認定", nameEn: "Certification", description: "業務関連資格の取得", coefficient: 1.2, sortOrder: 2 },
    { name: "業務知識深化", nameEn: "Domain Knowledge", description: "業界・業務知識の深化", coefficient: 1.0, sortOrder: 3 },
    { name: "部下・後輩指導", nameEn: "Mentoring", description: "部下や後輩の育成・指導", coefficient: 1.3, sortOrder: 4 },
    { name: "リーダーシップ発揮", nameEn: "Leadership", description: "チームを牽引するリーダーシップ", coefficient: 1.3, sortOrder: 5 },
    { name: "問題解決・改善提案", nameEn: "Problem Solving", description: "課題の解決と改善提案", coefficient: 1.1, sortOrder: 6 },
    { name: "新規領域への挑戦", nameEn: "New Challenge", description: "新しい分野・技術への挑戦", coefficient: 1.2, sortOrder: 7 },
  ];

  for (const category of defaultCategories) {
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
export async function resetEvaluationsForPeriod(periodId: string): Promise<number> {
  const result = await prisma.evaluation.deleteMany({
    where: { periodId },
  });

  return result.count;
}

/**
 * 評価進捗を取得
 */
export async function getEvaluationProgress(periodId: string): Promise<{
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  confirmed: number;
}> {
  const [total, pending, inProgress, completed, confirmed] = await Promise.all([
    prisma.evaluation.count({ where: { periodId } }),
    prisma.evaluation.count({ where: { periodId, status: "PENDING" } }),
    prisma.evaluation.count({ where: { periodId, status: "IN_PROGRESS" } }),
    prisma.evaluation.count({ where: { periodId, status: "COMPLETED" } }),
    prisma.evaluation.count({ where: { periodId, status: "CONFIRMED" } }),
  ]);

  return { total, pending, inProgress, completed, confirmed };
}
