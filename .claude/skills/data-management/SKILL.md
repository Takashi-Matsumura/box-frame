---
name: データインポート・履歴管理
description: BaseImporterを使ったデータインポート、履歴管理フレームワーク。データインポート機能追加、履歴記録実装時に使用。
---

# データインポート・履歴管理フレームワーク

## データインポートアーキテクチャ

```
lib/importers/
  ├── base-importer.ts         # フレーム層：汎用インポーター基底クラス
  └── organization/            # モジュール層：組織図専用
      ├── types.ts             # 型定義
      ├── parser.ts            # データパーサー
      └── organization-importer.ts  # インポーター実装
```

## 新しいインポーターの作成

### 1. 型定義

```typescript
// lib/importers/attendance/types.ts
export interface CSVAttendanceRow {
  社員番号?: string;
  日付?: string;
  出勤時刻?: string;
  退勤時刻?: string;
}

export interface ProcessedAttendance {
  employeeId: string;
  date: Date;
  checkIn: Date;
  checkOut: Date;
}
```

### 2. インポーター実装

```typescript
// lib/importers/attendance/attendance-importer.ts
import { BaseImporter, type ImportResult } from '../base-importer';

export class AttendanceImporter extends BaseImporter<CSVAttendanceRow, ProcessedAttendance> {
  constructor() {
    super({
      fileTypes: ['csv', 'xlsx'],
      maxFileSize: 50 * 1024 * 1024,
      requiredColumns: ['社員番号', '日付', '出勤時刻', '退勤時刻'],
    });
  }

  processData(rows: CSVAttendanceRow[]): ProcessedAttendance[] {
    return processAttendanceData(rows);
  }

  async importToDatabase(data: ProcessedAttendance[]): Promise<ImportResult> {
    // DB登録ロジック
  }
}
```

## BaseImporterの機能

- `parseFile(file)` - CSV/XLSX自動判定
- `parseDate(dateStr)` - 和暦/西暦両対応
- `convertToZenkana(str)` - 半角→全角カタカナ変換

## 履歴管理アーキテクチャ

```
lib/history/
  ├── types.ts              # ChangeEvent, FieldChange
  ├── change-detector.ts    # 変更検出エンジン
  ├── history-recorder.ts   # 履歴記録エンジン
  └── snapshot-manager.ts   # スナップショット管理
```

## データモデル（3層履歴）

```prisma
// 1. 詳細履歴
model ChangeLog {
  entityType        String     // "Employee", "Attendance" など
  entityId          String
  changeType        ChangeType
  fieldName         String?
  oldValue          String?    // JSON
  newValue          String?    // JSON
  batchId           String?    // 一括操作のグルーピング
  changedBy         String
  changedAt         DateTime
}

// 2. 社員スナップショット
model EmployeeHistory {
  employeeId   String
  snapshotData String   // 全フィールドのJSON
  validFrom    DateTime
  validTo      DateTime?
}

// 3. 組織全体スナップショット
model OrganizationHistory {
  organizationId       String
  snapshotData         String
  employeeCountSnapshot Int
}
```

## 履歴記録の実装

```typescript
import { ChangeDetector, HistoryRecorder } from '@/lib/history';

// 変更検出
const detector = new ChangeDetector();
const { changes } = await detector.detectChanges(batchId, data, changedBy, 'Employee');

// 履歴記録
const recorder = new HistoryRecorder();
await recorder.recordChanges(changes, batchId, changedBy);

// 必要に応じてスナップショット作成
await recorder.createSnapshotIfNeeded(changes, organizationId, changedBy);
```

## パーサー拡張アーキテクチャ

### 現在の構造

```
┌─────────────────────────────────────────────────────────┐
│  データソース（人事システムExcel）                        │
│  - 日本語カラム名: 社員番号, 氏名, 所属                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  CSVEmployeeRow（types.ts）                             │
│  - 入力データの型定義（データソース固有）                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  parser.ts                                              │
│  - processEmployeeData(): CSVEmployeeRow → ProcessedEmployee │
│  - parseDate(): 日付変換（和暦/Excel対応）                │
│  - parseAffiliation(): 所属文字列分割                     │
│  - convertToZenkana(): カタカナ正規化                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  ProcessedEmployee（共通内部フォーマット）                │
│  - employeeId, name, department, section, course        │
│  - DBインポートはこの型を使用                            │
└─────────────────────────────────────────────────────────┘
```

### 別システム連携時の拡張方法

#### 方法1: カラムマッピング設定（推奨）

```typescript
// lib/importers/organization/column-mappings.ts

export interface ColumnMapping {
  employeeId: string;
  name: string;
  nameKana?: string;
  email?: string;
  affiliation: string;  // 所属（本部・部・課を含む）
  position?: string;
  joinDate?: string;
}

// 人事システムA用
export const hrSystemAMapping: ColumnMapping = {
  employeeId: "社員番号",
  name: "氏名",
  nameKana: "氏名(フリガナ)",
  email: "社用e-Mail１",
  affiliation: "所属",
  position: "役職",
  joinDate: "入社年月日",
};

// 別システムB用（英語カラム）
export const systemBMapping: ColumnMapping = {
  employeeId: "emp_id",
  name: "full_name",
  nameKana: "name_kana",
  email: "email",
  affiliation: "department",
  position: "job_title",
  joinDate: "hire_date",
};
```

#### 方法2: パーサー戦略パターン

```typescript
// lib/importers/organization/parsers/index.ts

export interface EmployeeParser {
  parse(rows: Record<string, string>[]): ProcessedEmployee[];
  validate(row: Record<string, string>): boolean;
}

// lib/importers/organization/parsers/hr-system-parser.ts
export class HRSystemParser implements EmployeeParser {
  parse(rows: Record<string, string>[]): ProcessedEmployee[] {
    return rows.map(row => ({
      employeeId: row["社員番号"],
      name: row["氏名"],
      // ...現在のロジック
    }));
  }
}

// lib/importers/organization/parsers/api-parser.ts
export class APISystemParser implements EmployeeParser {
  parse(rows: Record<string, string>[]): ProcessedEmployee[] {
    return rows.map(row => ({
      employeeId: row["emp_id"],
      name: row["full_name"],
      // ...別システム用ロジック
    }));
  }
}
```

#### 方法3: API連携用アダプター

```typescript
// lib/importers/organization/adapters/external-api-adapter.ts

export interface ExternalAPIResponse {
  employees: {
    id: string;
    fullName: string;
    department: string;
    // ...
  }[];
}

export function adaptAPIResponse(response: ExternalAPIResponse): ProcessedEmployee[] {
  return response.employees.map(emp => ({
    employeeId: emp.id,
    name: emp.fullName,
    department: emp.department,
    // ...
  }));
}
```

### 所属文字列の分割ルール

現在の `parseAffiliation()` は以下のルールで分割:

```typescript
"PFO本部　データビジネスセンター　ファシリティ管理グループ"
  ↓ スペース（全角/半角）で分割
[0]: "PFO本部"           → department（本部）
[1]: "データビジネスセンター" → section（部）
[2]: "ファシリティ管理グループ" → course（課）
```

別システムで分割ルールが異なる場合は、`parseAffiliation()` を拡張するか、新しいパーサーを作成。

### 日付パースの対応形式

| 形式 | 例 | 対応状況 |
|------|-----|---------|
| Excelシリアル | `35065` | ✅ |
| 和暦（令和） | `R5.4.1` | ✅ |
| 和暦（平成） | `H30.10.5` | ✅ |
| 和暦（昭和） | `S63.12.31` | ✅ |
| 日本語形式 | `1997年4月1日` | ✅ |
| スラッシュ区切り | `2023/4/1` | ✅ |
| ハイフン区切り | `2023-04-01` | ✅ |

## ベストプラクティス

### ✅ 推奨

```typescript
// entityTypeで明確に区別
entityType: 'Employee'    // 組織図
entityType: 'Attendance'  // 勤怠
entityType: 'Expense'     // 経費

// batchIdで関連変更をグループ化
const batchId = crypto.randomUUID();

// 人間が読める説明
changeDescription: "異動: 営業部 → 開発部"
```

### ❌ 避ける

```typescript
// 履歴なしで直接更新
await prisma.employee.update({ ... });  // NG

// entityTypeの不統一
entityType: 'employee'  // 小文字
entityType: 'Employee'  // 大文字 ← 統一する
```
