/**
 * 組織図インポート用の型定義
 */

/**
 * CSVの社員データ行（生データ）
 */
export interface CSVEmployeeRow {
  所属コード?: string;
  社員番号?: string;
  氏名?: string;
  "氏名(フリガナ)"?: string;
  "社用e-Mail１"?: string;
  所属?: string;
  セクション?: string;
  コース?: string;
  役職?: string;
  役職コード?: string;
  電話番号?: string;
  入社年月日?: string;
  生年月日?: string;
  資格等級?: string;
  資格等級コード?: string;
  雇用区分?: string;
  雇用区分コード?: string;
}

/**
 * 処理済み社員データ
 */
export interface ProcessedEmployee {
  employeeId: string;
  name: string;
  nameKana?: string;
  email: string;
  department: string;
  departmentCode?: string; // 本部コード（所属コードの1-2桁目）
  section?: string;
  sectionCode?: string; // 部コード（所属コードの3-4桁目）
  course?: string;
  courseCode?: string; // 課コード（所属コードの5-7桁目）
  affiliationCode?: string; // 所属コード（元の7桁コード）
  position: string;
  positionCode?: string;
  phone?: string;
  joinDate?: Date;
  birthDate?: Date;
  qualificationGrade?: string;
  qualificationGradeCode?: string;
  employmentType?: string;
  employmentTypeCode?: string;
}

/**
 * 除外された重複社員
 */
export interface ExcludedDuplicateInfo {
  employeeId: string;
  name: string;
  position: string;
  reason: string;
  keptEmployeeId: string;
}

/**
 * プレビュー結果
 */
export interface PreviewResult {
  totalRecords: number;
  newEmployees: ProcessedEmployee[];
  updatedEmployees: {
    employee: ProcessedEmployee;
    changes: FieldChange[];
  }[];
  transferredEmployees: {
    employee: ProcessedEmployee;
    oldDepartment: string;
    newDepartment: string;
  }[];
  retiredEmployees: {
    employeeId: string;
    name: string;
    department: string;
  }[];
  excludedDuplicates: ExcludedDuplicateInfo[];
  errors: {
    row: number;
    message: string;
  }[];
}

/**
 * フィールド変更情報
 */
export interface FieldChange {
  fieldName: string;
  fieldNameJa: string;
  oldValue: string;
  newValue: string;
}
