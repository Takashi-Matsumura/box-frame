/**
 * 評価者決定ロジック
 *
 * 優先順位:
 * 1. カスタム評価者（CustomEvaluator）- 最優先
 * 2. 課の責任者（Course.managerId）
 * 3. 部の責任者（Section.managerId）
 * 4. 本部の責任者（Department.managerId）
 */

import { prisma } from "@/lib/prisma";
import type { Employee, Course, Section, Department } from "@prisma/client";

export interface EmployeeWithOrg extends Employee {
  course?: (Course & { manager?: Employee | null }) | null;
  section?: (Section & { manager?: Employee | null }) | null;
  department: Department & { manager?: Employee | null };
}

/**
 * 評価者を決定する
 */
export async function determineEvaluator(
  employee: EmployeeWithOrg,
  periodId: string
): Promise<Employee | null> {
  // ========================================
  // 優先順位1: カスタム評価者（最優先）
  // ========================================
  const now = new Date();
  const customEvaluator = await prisma.customEvaluator.findFirst({
    where: {
      employeeId: employee.id,
      OR: [
        { periodId: periodId },  // 期間指定
        { periodId: null },       // 全期間有効
      ],
    },
    include: { evaluator: true },
    orderBy: { periodId: "desc" },  // 期間指定優先
  });

  if (customEvaluator) {
    // 有効期間チェック
    const isInEffectivePeriod =
      (!customEvaluator.effectiveFrom || customEvaluator.effectiveFrom <= now) &&
      (!customEvaluator.effectiveTo || customEvaluator.effectiveTo >= now);

    if (isInEffectivePeriod) {
      return customEvaluator.evaluator;
    }
  }

  // ========================================
  // 優先順位2: 課の責任者（課長）
  // ========================================
  if (
    employee.course?.manager &&
    employee.course.manager.id !== employee.id
  ) {
    return employee.course.manager;
  }

  // ========================================
  // 優先順位3: 部の責任者（部長）
  // ========================================
  if (
    employee.section?.manager &&
    employee.section.manager.id !== employee.id
  ) {
    return employee.section.manager;
  }

  // ========================================
  // 優先順位4: 本部の責任者（本部長）
  // ========================================
  if (
    employee.department?.manager &&
    employee.department.manager.id !== employee.id
  ) {
    return employee.department.manager;
  }

  // 評価者なし（手動設定が必要）
  return null;
}

/**
 * 被評価者一覧を取得する
 * 指定された評価者が評価すべき社員の一覧を返す
 */
export async function getEvaluatees(
  evaluatorId: string,
  periodId: string
): Promise<string[]> {
  // 1. カスタム評価者として設定されている社員
  const customEvaluatees = await prisma.customEvaluator.findMany({
    where: {
      evaluatorId,
      OR: [{ periodId }, { periodId: null }],
    },
    select: { employeeId: true },
  });
  const customIds = customEvaluatees.map((ce) => ce.employeeId);

  // 2. 課・部・本部の責任者として管理している社員
  const managedEmployees = await prisma.employee.findMany({
    where: {
      isActive: true,
      id: { notIn: [evaluatorId, ...customIds] }, // 自分自身とカスタム設定済みを除外
      OR: [
        { course: { managerId: evaluatorId } },
        { section: { managerId: evaluatorId } },
        { department: { managerId: evaluatorId } },
      ],
    },
    select: { id: true },
  });

  // カスタム評価者として別の人に割り当てられている社員を除外
  const otherCustomEvaluatees = await prisma.customEvaluator.findMany({
    where: {
      evaluatorId: { not: evaluatorId },
      OR: [{ periodId }, { periodId: null }],
    },
    select: { employeeId: true },
  });
  const otherCustomIds = new Set(otherCustomEvaluatees.map((ce) => ce.employeeId));

  const managedIds = managedEmployees
    .filter((e) => !otherCustomIds.has(e.id))
    .map((e) => e.id);

  return [...customIds, ...managedIds];
}

/**
 * 社員の評価者情報を取得
 */
export async function getEvaluatorInfo(
  employeeId: string,
  periodId: string
): Promise<{
  evaluator: Employee | null;
  source: "custom" | "course" | "section" | "department" | null;
}> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      course: { include: { manager: true } },
      section: { include: { manager: true } },
      department: { include: { manager: true } },
    },
  });

  if (!employee) {
    return { evaluator: null, source: null };
  }

  // カスタム評価者をチェック
  const now = new Date();
  const customEvaluator = await prisma.customEvaluator.findFirst({
    where: {
      employeeId: employee.id,
      OR: [{ periodId }, { periodId: null }],
    },
    include: { evaluator: true },
    orderBy: { periodId: "desc" },
  });

  if (customEvaluator) {
    const isInEffectivePeriod =
      (!customEvaluator.effectiveFrom || customEvaluator.effectiveFrom <= now) &&
      (!customEvaluator.effectiveTo || customEvaluator.effectiveTo >= now);

    if (isInEffectivePeriod) {
      return { evaluator: customEvaluator.evaluator, source: "custom" };
    }
  }

  // 組織階層をチェック
  if (employee.course?.manager && employee.course.manager.id !== employee.id) {
    return { evaluator: employee.course.manager, source: "course" };
  }

  if (employee.section?.manager && employee.section.manager.id !== employee.id) {
    return { evaluator: employee.section.manager, source: "section" };
  }

  if (employee.department?.manager && employee.department.manager.id !== employee.id) {
    return { evaluator: employee.department.manager, source: "department" };
  }

  return { evaluator: null, source: null };
}
