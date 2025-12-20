# データ管理 Skill

## 概要

データインポートと履歴管理フレームワークのガイド。

## データインポート

### BaseImporter フレームワーク

```
lib/importers/
├── base-importer.ts       # 基底クラス
├── organization/          # 組織データインポート
│   ├── importer.ts        # OrganizationImporter
│   └── parser.ts          # Excel/CSVパーサー
└── types.ts               # 共通型定義
```

### インポート手順

1. **ファイルアップロード**: `FileUpload` コンポーネントを使用
2. **パース**: `parser.ts` でExcel/CSVを解析
3. **バリデーション**: 必須フィールドチェック
4. **インポート**: `BaseImporter.import()` でDB更新
5. **履歴記録**: `ChangeLog` テーブルに変更を記録

### 組織データパーサー

```typescript
// 所属文字列のパース（全角スペース対応）
// 入力例: "IT本部　開発部　システム課"
// 出力: { department: "IT本部", section: "開発部", course: "システム課" }
```

## 履歴管理

### スナップショット

スナップショットは **組織図データのみ** をバックアップします。

**含まれるデータ:**
- 社員（Employee）
- 部門（Department）
- 部（Section）
- 課（Course）

**含まれないデータ:**
- 評価データ（Evaluation）
- 設定
- ユーザーアカウント

### スナップショット復元

```typescript
// 復元APIエンドポイント
POST /api/history/snapshot/[id]/restore

// 復元処理（トランザクション）
1. Evaluation, CustomEvaluatorRelation を削除
2. Employee, Course, Section, Department を削除
3. スナップショットから Department を復元
4. スナップショットから Section を復元
5. スナップショットから Course を復元
6. スナップショットから Employee を復元
7. 管理者（managerId）を設定
8. ChangeLog に復元履歴を記録
```

### データベーススキーマ

```prisma
model OrganizationHistory {
  id                String   @id @default(cuid())
  organizationId    String
  changeType        String   // MANUAL, IMPORT, BULK_UPDATE
  changeDescription String
  structureSnapshot String   @db.Text  // JSON形式の組織データ
  changedBy         String
  changedAt         DateTime @default(now())
}

model ChangeLog {
  id                String   @id @default(cuid())
  entityType        String   // ORGANIZATION, EMPLOYEE, etc.
  entityId          String
  changeType        String   // CREATE, UPDATE, DELETE, TRANSFER, etc.
  changeDescription String
  oldValue          String?  @db.Text
  newValue          String?  @db.Text
  changedBy         String
  changedAt         DateTime @default(now())
}
```

## UI コンポーネント

### データインポート画面（スナップショット機能含む）

```
app/(menus)/(admin)/data-import/
└── page.tsx                    # ファイルアップロード、スナップショット、データ削除
```

**タブ構成:**
- ファイルアップロード - CSVまたはXLSXファイルでデータインポート
- スナップショット - スナップショット作成・復元
- データ削除 - 全データ削除（危険な操作）

### データ履歴管理画面

```
app/(menus)/(admin)/data-history/
├── page.tsx                    # サーバーコンポーネント
├── DataHistoryClient.tsx       # クライアントコンポーネント
└── translations.ts             # 翻訳
```

**タブ構成:**
- 変更履歴 - データ変更ログ一覧
- 社員履歴検索
- 組織履歴表示

## 手動スクリプト

```bash
# スナップショットから復元
npx ts-node scripts/restore-snapshot.ts

# 所属データ分割
npx ts-node scripts/split-affiliation.ts
```

## 注意事項

1. **スナップショット復元は破壊的操作**: 現在のデータが上書きされる
2. **評価データも削除される**: 復元時に関連テーブルも削除
3. **インポート前にスナップショット推奨**: ロールバック用
4. **直近のスナップショットのみ復元可能**: UI制限
