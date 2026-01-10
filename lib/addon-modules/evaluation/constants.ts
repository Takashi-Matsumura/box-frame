/**
 * 人事評価モジュール 定数
 *
 * 評価システムで使用する定数を集約
 */

import type { WeightConfig, ScoreRange } from "./types";

// ============================================
// レベル → スコア変換
// ============================================

/**
 * T1〜T4のレベルからスコアへの変換マップ
 *
 * - T1 = 1.0（不十分）
 * - T2 = 2.5（要改善）
 * - T3 = 3.5（標準）
 * - T4 = 5.0（優秀）
 */
export const LEVEL_TO_SCORE: Record<number, number> = {
  1: 1.0,
  2: 2.5,
  3: 3.5,
  4: 5.0,
} as const;

// ============================================
// デフォルト重み設定
// ============================================

/**
 * デフォルトの重み設定
 * 役職×等級別の設定がない場合に使用
 */
export const DEFAULT_WEIGHTS: WeightConfig = {
  resultsWeight: 30,
  processWeight: 40,
  growthWeight: 30,
} as const;

// ============================================
// スコア範囲
// ============================================

/**
 * デフォルトのスコア範囲
 * DBからスコア範囲を取得できない場合に使用
 */
export const DEFAULT_SCORE_RANGE: ScoreRange = {
  min: 50,
  max: 130,
} as const;

// ============================================
// グレード閾値
// ============================================

/**
 * グレード判定の閾値（スコア範囲内の相対位置）
 *
 * - 90%以上 → S
 * - 70%以上 → A
 * - 50%以上 → B
 * - 30%以上 → C
 * - 30%未満 → D
 */
export const GRADE_THRESHOLDS = {
  S: 0.9,
  A: 0.7,
  B: 0.5,
  C: 0.3,
} as const;

/**
 * グレード判定の閾値（固定スコア版）
 * @deprecated GRADE_THRESHOLDS を使用してください
 */
export const FIXED_GRADE_THRESHOLDS = {
  S: 4.5,
  A: 3.5,
  B: 2.5,
  C: 1.5,
} as const;

// ============================================
// 達成率 → スコア変換の閾値
// ============================================

/**
 * 達成率からスコアへの変換閾値
 *
 * - 80%未満 → 最小スコア付近
 * - 80% → 25%位置
 * - 100% → 50%位置（中央）
 * - 120% → 75%位置
 * - 120%以上 → 最大スコア付近
 */
export const ACHIEVEMENT_RATE_THRESHOLDS = {
  LOW: 80,      // 80%未満は低評価
  STANDARD: 100, // 100%が標準
  HIGH: 120,    // 120%以上は高評価
  MAX: 160,     // 160%で最高スコア
} as const;

// ============================================
// デフォルトプロセスカテゴリ
// ============================================

/**
 * デフォルトのプロセス評価項目
 */
export const DEFAULT_PROCESS_CATEGORIES = [
  { name: "主体性", nameEn: "Initiative", description: "自ら考え、積極的に行動する姿勢", sortOrder: 1 },
  { name: "協調性", nameEn: "Teamwork", description: "チーム内での協力・連携", sortOrder: 2 },
  { name: "責任感", nameEn: "Responsibility", description: "役割達成への意識・コミットメント", sortOrder: 3 },
  { name: "改善力", nameEn: "Improvement", description: "より良い方法を模索・提案する力", sortOrder: 4 },
  { name: "専門性", nameEn: "Expertise", description: "業務に必要な知識・スキルの発揮", sortOrder: 5 },
] as const;

// ============================================
// デフォルト成長カテゴリ
// ============================================

/**
 * デフォルトの成長評価カテゴリ
 */
export const DEFAULT_GROWTH_CATEGORIES = [
  { name: "専門スキル向上", nameEn: "Professional Skill Improvement", description: "業務スキルの習得・向上", coefficient: 1.0, sortOrder: 1 },
  { name: "資格取得・認定", nameEn: "Certification", description: "業務関連資格の取得", coefficient: 1.2, sortOrder: 2 },
  { name: "業務知識深化", nameEn: "Domain Knowledge", description: "業界・業務知識の深化", coefficient: 1.0, sortOrder: 3 },
  { name: "部下・後輩指導", nameEn: "Mentoring", description: "部下や後輩の育成・指導", coefficient: 1.3, sortOrder: 4 },
  { name: "リーダーシップ発揮", nameEn: "Leadership", description: "チームを牽引するリーダーシップ", coefficient: 1.3, sortOrder: 5 },
  { name: "問題解決・改善提案", nameEn: "Problem Solving", description: "課題の解決と改善提案", coefficient: 1.1, sortOrder: 6 },
  { name: "新規領域への挑戦", nameEn: "New Challenge", description: "新しい分野・技術への挑戦", coefficient: 1.2, sortOrder: 7 },
] as const;

// ============================================
// 成長スコアの上限
// ============================================

/**
 * 成長スコアの上限値
 * 係数適用後もこの値を超えない
 */
export const MAX_GROWTH_SCORE = 5.0;
