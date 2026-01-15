/**
 * 履歴管理モジュール
 *
 * 組織・社員データの変更履歴を管理するためのユーティリティ
 *
 * @example
 * ```typescript
 * import {
 *   ChangeDetector,
 *   HistoryRecorder,
 *   SnapshotManager,
 * } from "@/lib/history";
 *
 * // 変更検出
 * const result = ChangeDetector.detectEmployeeChanges(existing, updated);
 *
 * // 履歴記録
 * await HistoryRecorder.recordChangeLog(entry);
 *
 * // スナップショット作成
 * const snapshot = await SnapshotManager.createOrganizationSnapshot(orgId);
 * ```
 */

export { ChangeDetector } from "./change-detector";
export { HistoryRecorder } from "./history-recorder";
export { SnapshotManager } from "./snapshot-manager";

export type {
  BatchImportResult,
  ChangeDetectionResult,
  ChangeLogEntry,
  EmployeeSnapshot,
  EntityType,
  FieldChange,
  OrganizationSnapshot,
  RecordHistoryOptions,
} from "./types";

export { changeTypeMapping, fieldNameMapping } from "./types";
