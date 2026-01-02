/**
 * 履歴管理システムの型定義
 */

import type { ChangeType } from "@prisma/client";

/**
 * エンティティタイプ
 */
export type EntityType =
  | "Employee"
  | "Department"
  | "Section"
  | "Course"
  | "Organization";

/**
 * フィールド変更情報
 */
export interface FieldChange {
  fieldName: string;
  fieldNameJa: string;
  oldValue: string | null;
  newValue: string | null;
}

/**
 * 変更検出結果
 */
export interface ChangeDetectionResult {
  hasChanges: boolean;
  changeType: ChangeType;
  changes: FieldChange[];
  summary: string;
}

/**
 * 変更ログエントリ
 */
export interface ChangeLogEntry {
  entityType: EntityType;
  entityId: string;
  changeType: ChangeType;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  changeDescription?: string;
  batchId?: string;
  changedBy: string;
}

/**
 * スナップショットデータ
 */
export interface EmployeeSnapshot {
  employeeId: string;
  name: string;
  nameKana?: string;
  email?: string;
  phone?: string;
  position: string;
  positionCode?: string;
  departmentId: string;
  departmentName: string;
  sectionId?: string;
  sectionName?: string;
  courseId?: string;
  courseName?: string;
  qualificationGrade?: string;
  qualificationGradeCode?: string;
  employmentType?: string;
  employmentTypeCode?: string;
  isActive: boolean;
}

/**
 * 組織スナップショットデータ
 */
export interface OrganizationSnapshot {
  organizationId: string;
  organizationName: string;
  departments: {
    id: string;
    name: string;
    code?: string;
    managerId?: string;
    sections: {
      id: string;
      name: string;
      code?: string;
      managerId?: string;
      courses: {
        id: string;
        name: string;
        code?: string;
        managerId?: string;
      }[];
    }[];
  }[];
  employeeCount: number;
}

/**
 * 履歴記録オプション
 */
export interface RecordHistoryOptions {
  batchId?: string;
  changedBy: string;
  effectiveDate?: Date;
  reason?: string;
}

/**
 * バッチインポート結果
 */
export interface BatchImportResult {
  batchId: string;
  importedAt: Date;
  statistics: {
    totalRecords: number;
    created: number;
    updated: number;
    transferred: number;
    retired: number;
    errors: number;
  };
  changes: ChangeLogEntry[];
}

/**
 * フィールド名の日本語マッピング
 */
export const fieldNameMapping: Record<string, string> = {
  name: "氏名",
  nameKana: "氏名（フリガナ）",
  email: "メールアドレス",
  phone: "電話番号",
  position: "役職",
  positionCode: "役職コード",
  department: "所属（本部）",
  departmentId: "所属（本部）",
  section: "所属（部）",
  sectionId: "所属（部）",
  course: "所属（課）",
  courseId: "所属（課）",
  qualificationGrade: "資格等級",
  qualificationGradeCode: "資格等級コード",
  employmentType: "雇用区分",
  employmentTypeCode: "雇用区分コード",
  joinDate: "入社年月日",
  birthDate: "生年月日",
  isActive: "在籍状況",
};

/**
 * 変更タイプの日本語マッピング
 */
export const changeTypeMapping: Record<ChangeType, string> = {
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
