/**
 * 人事評価モジュール 型定義
 *
 * 評価システムで使用する共通の型定義を集約
 */

import type { Course, Department, Employee, Section } from "@prisma/client";

// ============================================
// 重み設定の型
// ============================================

/**
 * 評価重み設定
 * 結果・プロセス・成長の3軸評価の配分（合計100%）
 */
export interface WeightConfig {
  /** 結果評価の重み (%) */
  resultsWeight: number;
  /** プロセス評価の重み (%) */
  processWeight: number;
  /** 成長評価の重み (%) */
  growthWeight: number;
}

// ============================================
// スコア計算の型
// ============================================

/**
 * スコア範囲
 * 評価スコアの最小値・最大値を定義
 */
export interface ScoreRange {
  min: number;
  max: number;
}

/**
 * スコア計算結果
 * 3軸評価の各スコアと最終結果
 */
export interface ScoreResult {
  /** 結果評価スコア（素点） */
  score1: number;
  /** プロセス評価スコア（素点） */
  score2: number;
  /** 成長評価スコア（素点） */
  score3: number;
  /** 加重後スコア1 */
  weightedScore1: number;
  /** 加重後スコア2 */
  weightedScore2: number;
  /** 加重後スコア3 */
  weightedScore3: number;
  /** 最終スコア */
  finalScore: number;
  /** 最終グレード (S/A/B/C/D) */
  finalGrade: string;
}

// ============================================
// 評価者決定の型
// ============================================

/**
 * 組織情報付き社員
 * 評価者決定ロジックで使用
 */
export interface EmployeeWithOrg extends Employee {
  course?: (Course & { manager?: Employee | null }) | null;
  section?: (Section & { manager?: Employee | null }) | null;
  department: Department & { manager?: Employee | null };
}

/**
 * 評価者情報
 */
export interface EvaluatorInfo {
  evaluator: Employee | null;
  source: "custom" | "course" | "section" | "department" | null;
}

// ============================================
// 一括生成の型
// ============================================

/**
 * 一括生成結果
 */
export interface BatchGenerationResult {
  totalEmployees: number;
  generatedCount: number;
  skippedCount: number;
  errors: Array<{ employeeId: string; error: string }>;
}

/**
 * 評価進捗
 */
export interface EvaluationProgress {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  confirmed: number;
}

// ============================================
// 目標設定の型
// ============================================

/**
 * プロセス目標
 */
export interface ProcessGoal {
  id: string;
  name: string;
  goalText: string;
  isDefault: boolean;
  order: number;
}

/**
 * 成長目標
 */
export interface GrowthGoal {
  categoryId: string;
  categoryName: string;
  goalText: string;
}

/**
 * 面談日
 */
export interface InterviewDate {
  id: string;
  date: string;
  note?: string;
}

// ============================================
// 評価ステータスの型
// ============================================

/**
 * 評価ステータス
 */
export type EvaluationStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CONFIRMED";

/**
 * 評価期間ステータス
 */
export type PeriodStatus = "DRAFT" | "ACTIVE" | "REVIEW" | "CLOSED";

// ============================================
// 組織レベルの型
// ============================================

/**
 * 組織階層レベル
 */
export type OrganizationLevel = "DEPARTMENT" | "SECTION" | "COURSE";
