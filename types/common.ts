/**
 * 共通の型定義
 *
 * アプリケーション全体で使用される共通の型を定義します。
 */

/**
 * 言語コード
 */
export type Language = "en" | "ja";

/**
 * メニューグループID
 * サイドバーでの表示グループを定義
 * ロール階層: GUEST → USER → MANAGER → EXECUTIVE → ADMIN
 */
export type MenuGroupId =
  | "guest"
  | "user"
  | "manager"
  | "executive"
  | "admin";

/**
 * 日付範囲型
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * 日付文字列範囲型（ISO形式）
 */
export interface DateRangeString {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

/**
 * ページネーションパラメータ
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * ソートパラメータ
 */
export interface SortParams<T extends string = string> {
  field: T;
  order: "asc" | "desc";
}

/**
 * フィルターパラメータ（汎用）
 */
export type FilterParams<T> = Partial<T>;

/**
 * 選択肢型
 */
export interface SelectOption<T = string> {
  value: T;
  label: string;
  labelJa?: string;
  disabled?: boolean;
}

/**
 * 翻訳オブジェクト型
 */
export interface Translations<T extends string = string> {
  en: Record<T, string>;
  ja: Record<T, string>;
}

/**
 * バッジ/ステータス表示用の色定義
 */
export type StatusColor =
  | "gray"
  | "red"
  | "yellow"
  | "green"
  | "blue"
  | "indigo"
  | "purple"
  | "pink";

/**
 * ステータスバッジ設定
 */
export interface StatusBadgeConfig {
  color: StatusColor;
  label: string;
  labelJa: string;
}

/**
 * 非同期操作のステータス
 */
export type AsyncStatus = "idle" | "loading" | "success" | "error";

/**
 * 非同期操作の状態
 */
export interface AsyncState<T, E = Error> {
  status: AsyncStatus;
  data: T | null;
  error: E | null;
}

/**
 * フォームフィールドのエラー状態
 */
export type FormErrors<T> = Partial<Record<keyof T, string>>;

/**
 * IDを持つエンティティの基本型
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 監査情報を持つエンティティの基本型
 */
export interface AuditableEntity extends BaseEntity {
  createdBy?: string;
  updatedBy?: string;
}

/**
 * ソフト削除をサポートするエンティティの基本型
 */
export interface SoftDeletableEntity extends BaseEntity {
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

/**
 * テーブルカラム定義
 */
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  labelJa?: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: T) => React.ReactNode;
}

/**
 * ツリー構造のノード
 */
export interface TreeNode<T = unknown> {
  id: string;
  label: string;
  data?: T;
  children?: TreeNode<T>[];
  isExpanded?: boolean;
  isSelected?: boolean;
}

/**
 * キーバリューペア
 */
export interface KeyValuePair<K = string, V = unknown> {
  key: K;
  value: V;
}

/**
 * 部分的なNullable型
 */
export type PartialNullable<T> = {
  [P in keyof T]?: T[P] | null;
};

/**
 * 必須キーを指定する型
 */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * オプショナルキーを指定する型
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
