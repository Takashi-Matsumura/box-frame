/**
 * 型定義のエントリポイント
 *
 * 使用例:
 * import type { AppModule, AppMenu, Language, AsyncState } from "@/types";
 */

// 共通型
export type {
  AsyncState,
  AsyncStatus,
  AuditableEntity,
  BaseEntity,
  DateRange,
  DateRangeString,
  FilterParams,
  FormErrors,
  KeyValuePair,
  Language,
  MenuGroupId,
  OptionalKeys,
  PaginationParams,
  PartialNullable,
  RequiredKeys,
  SelectOption,
  SoftDeletableEntity,
  SortParams,
  StatusBadgeConfig,
  StatusColor,
  TableColumn,
  Translations,
  TreeNode,
} from "./common";
// モジュール・メニュー型
export type {
  AppMenu,
  AppModule,
  // レガシー型（非推奨）
  LegacyAppModule,
  MenuGroup,
  ModuleRegistry,
} from "./module";
