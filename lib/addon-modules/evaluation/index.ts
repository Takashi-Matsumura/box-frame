/**
 * 人事評価モジュール
 *
 * 評価システムの型定義、定数、サービスを提供
 */

// モジュール定義
export { evaluationModule } from "./module";

// 型定義
export type {
  WeightConfig,
  ScoreRange,
  ScoreResult,
  EmployeeWithOrg,
  EvaluatorInfo,
  BatchGenerationResult,
  EvaluationProgress,
  ProcessGoal,
  GrowthGoal,
  InterviewDate,
  EvaluationStatus,
  PeriodStatus,
  OrganizationLevel,
} from "./types";

// 定数
export {
  LEVEL_TO_SCORE,
  DEFAULT_WEIGHTS,
  DEFAULT_SCORE_RANGE,
  GRADE_THRESHOLDS,
  FIXED_GRADE_THRESHOLDS,
  ACHIEVEMENT_RATE_THRESHOLDS,
  DEFAULT_PROCESS_CATEGORIES,
  DEFAULT_GROWTH_CATEGORIES,
  MAX_GROWTH_SCORE,
} from "./constants";

// サービス
export * from "./services";
