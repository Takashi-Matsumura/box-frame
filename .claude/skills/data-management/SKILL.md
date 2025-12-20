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
