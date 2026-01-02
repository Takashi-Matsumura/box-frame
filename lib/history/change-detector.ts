/**
 * 変更検出サービス
 * 既存データと新規データの差分を検出
 */

import type { Employee, ChangeType } from "@prisma/client";
import type {
  ChangeDetectionResult,
  FieldChange,
  EmployeeSnapshot,
} from "./types";
import { fieldNameMapping } from "./types";

/**
 * 比較対象フィールドの定義
 */
const COMPARABLE_FIELDS = [
  "name",
  "nameKana",
  "email",
  "phone",
  "position",
  "positionCode",
  "qualificationGrade",
  "qualificationGradeCode",
  "employmentType",
  "employmentTypeCode",
] as const;

/**
 * 所属関連フィールド（異動判定用）
 */
const DEPARTMENT_FIELDS = [
  "departmentId",
  "sectionId",
  "courseId",
] as const;

/**
 * 役職関連フィールド（昇進判定用）
 */
const POSITION_FIELDS = ["position", "positionCode"] as const;

/**
 * 変更検出クラス
 */
export class ChangeDetector {
  /**
   * 社員データの変更を検出
   */
  static detectEmployeeChanges(
    existing: Employee,
    updated: Partial<EmployeeSnapshot>
  ): ChangeDetectionResult {
    const changes: FieldChange[] = [];

    // 通常フィールドの変更検出
    for (const field of COMPARABLE_FIELDS) {
      const oldValue = this.normalizeValue(existing[field]);
      const newValue = this.normalizeValue(updated[field]);

      if (oldValue !== newValue) {
        changes.push({
          fieldName: field,
          fieldNameJa: fieldNameMapping[field] || field,
          oldValue,
          newValue,
        });
      }
    }

    // 所属変更の検出
    const departmentChanges = this.detectDepartmentChanges(existing, updated);
    changes.push(...departmentChanges);

    // 変更タイプの判定
    const changeType = this.determineChangeType(
      existing,
      updated,
      changes,
      departmentChanges.length > 0
    );

    // 変更サマリーの生成
    const summary = this.generateSummary(changes, changeType);

    return {
      hasChanges: changes.length > 0,
      changeType,
      changes,
      summary,
    };
  }

  /**
   * 所属変更の検出
   */
  private static detectDepartmentChanges(
    existing: Employee,
    updated: Partial<EmployeeSnapshot>
  ): FieldChange[] {
    const changes: FieldChange[] = [];

    for (const field of DEPARTMENT_FIELDS) {
      const oldValue = existing[field] as string | null | undefined;
      const newValue = updated[field] as string | null | undefined;

      if (this.normalizeValue(oldValue) !== this.normalizeValue(newValue)) {
        changes.push({
          fieldName: field,
          fieldNameJa: fieldNameMapping[field] || field,
          oldValue: oldValue || null,
          newValue: newValue || null,
        });
      }
    }

    return changes;
  }

  /**
   * 変更タイプの判定
   */
  private static determineChangeType(
    existing: Employee,
    updated: Partial<EmployeeSnapshot>,
    changes: FieldChange[],
    hasDepartmentChange: boolean
  ): ChangeType {
    // 退職判定
    if (existing.isActive && updated.isActive === false) {
      return "RETIREMENT";
    }

    // 復職判定
    if (!existing.isActive && updated.isActive === true) {
      return "REJOINING";
    }

    // 異動判定（所属変更）
    if (hasDepartmentChange) {
      return "TRANSFER";
    }

    // 昇進判定（役職変更）
    const hasPositionChange = changes.some((c) =>
      POSITION_FIELDS.includes(c.fieldName as typeof POSITION_FIELDS[number])
    );
    if (hasPositionChange) {
      return "PROMOTION";
    }

    // その他の更新
    return "UPDATE";
  }

  /**
   * 値の正規化
   */
  private static normalizeValue(
    value: string | number | boolean | Date | null | undefined
  ): string | null {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    return String(value).trim();
  }

  /**
   * 変更サマリーの生成
   */
  private static generateSummary(
    changes: FieldChange[],
    changeType: ChangeType
  ): string {
    if (changes.length === 0) {
      return "変更なし";
    }

    const typeLabel = this.getChangeTypeLabel(changeType);
    const fieldLabels = changes.map((c) => c.fieldNameJa).join("、");

    return `${typeLabel}: ${fieldLabels}`;
  }

  /**
   * 変更タイプのラベル取得
   */
  private static getChangeTypeLabel(changeType: ChangeType): string {
    const labels: Record<ChangeType, string> = {
      CREATE: "新規登録",
      UPDATE: "更新",
      DELETE: "削除",
      TRANSFER: "異動",
      PROMOTION: "昇進",
      RETIREMENT: "退職",
      REJOINING: "復職",
      IMPORT: "インポート",
      BULK_UPDATE: "一括更新",
      EXPORT: "エクスポート",
    };
    return labels[changeType] || changeType;
  }

  /**
   * 新規社員かどうかを判定
   */
  static isNewEmployee(employeeId: string, existingIds: Set<string>): boolean {
    return !existingIds.has(employeeId);
  }

  /**
   * 退職社員を検出
   * インポートデータに含まれていない既存社員を検出
   */
  static detectRetiredEmployees(
    existingEmployees: Employee[],
    importedEmployeeIds: Set<string>
  ): Employee[] {
    return existingEmployees.filter(
      (emp) => emp.isActive && !importedEmployeeIds.has(emp.employeeId)
    );
  }

  /**
   * 複数社員の一括変更検出
   */
  static detectBulkChanges(
    existingEmployees: Map<string, Employee>,
    updatedEmployees: EmployeeSnapshot[]
  ): Map<string, ChangeDetectionResult> {
    const results = new Map<string, ChangeDetectionResult>();

    for (const updated of updatedEmployees) {
      const existing = existingEmployees.get(updated.employeeId);
      if (existing) {
        const result = this.detectEmployeeChanges(existing, updated);
        if (result.hasChanges) {
          results.set(updated.employeeId, result);
        }
      }
    }

    return results;
  }
}
