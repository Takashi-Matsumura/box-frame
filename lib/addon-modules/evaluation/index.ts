/**
 * 人事評価モジュール
 *
 * 評価システムの型定義、定数、サービスを提供
 */

// 定数
export {
  ACHIEVEMENT_RATE_THRESHOLDS,
  DEFAULT_GROWTH_CATEGORIES,
  DEFAULT_PROCESS_CATEGORIES,
  DEFAULT_SCORE_RANGE,
  DEFAULT_WEIGHTS,
  FIXED_GRADE_THRESHOLDS,
  GRADE_THRESHOLDS,
  LEVEL_TO_SCORE,
  MAX_GROWTH_SCORE,
} from "./constants";
// モジュール定義
export { evaluationModule } from "./module";
// サービス
export * from "./services";
// 型定義
export type {
  BatchGenerationResult,
  EmployeeWithOrg,
  EvaluationProgress,
  EvaluationStatus,
  EvaluatorInfo,
  GrowthGoal,
  InterviewDate,
  OrganizationLevel,
  PeriodStatus,
  ProcessGoal,
  ScoreRange,
  ScoreResult,
  WeightConfig,
} from "./types";
