---
name: 人事評価モジュール
description: 評価重み設定、役職グループ管理、成長・プロセス評価カテゴリ。評価機能の実装・設定時に使用。
---

# 人事評価モジュール（HR Evaluation）

## 概要

人事評価システムを提供するアドオンモジュール。評価期間ごとに役職×等級別の重み設定、評価カテゴリの管理を行う。

## ディレクトリ構成

```
lib/addon-modules/evaluation/
├── index.ts              # エクスポート
├── module.tsx            # モジュール定義
└── weight-helper.ts      # 重み取得ユーティリティ

app/admin/evaluation-master/
├── page.tsx              # 評価マスタページ
├── translations.ts       # 翻訳定義
└── components/
    ├── PeriodsSection.tsx          # 評価期間管理
    ├── WeightsSection.tsx          # 重み設定
    ├── GrowthCategoriesSection.tsx # 成長評価カテゴリ
    └── ProcessCategoriesSection.tsx # プロセス評価カテゴリ

app/api/evaluation/
├── periods/              # 評価期間API
├── weights/              # 重み設定API
├── position-groups/      # 役職グループAPI
├── growth-categories/    # 成長評価カテゴリAPI
└── process-categories/   # プロセス評価カテゴリAPI
```

## 評価重み設定

### 重み構成

| 評価項目 | デフォルト | 説明 |
|---------|----------|------|
| 成果評価（resultsWeight） | 30% | 業績・目標達成度 |
| プロセス評価（processWeight） | 40% | 業務遂行プロセス |
| 成長評価（growthWeight） | 30% | スキル・能力向上 |

**合計は必ず100%** になる必要がある。

### 重み取得の優先順位（フォールバック）

```typescript
// lib/addon-modules/evaluation/weight-helper.ts
1. 役職×等級別の重み（periodId + positionCode + gradeCode）
2. 役職のデフォルト（periodId + positionCode + "ALL"）
3. 等級のデフォルト（periodId + "DEFAULT" + gradeCode）
4. グローバルデフォルト（periodId + "DEFAULT" + "ALL"）
5. ハードコーディングされたデフォルト値（30/40/30）
```

### 使用方法

```typescript
import { getWeightsForPositionGrade } from "@/lib/addon-modules/evaluation";

const weights = await getWeightsForPositionGrade(
  periodId,
  employee.positionCode,
  employee.qualificationGradeCode
);

// weights: { resultsWeight: 30, processWeight: 40, growthWeight: 30 }
```

## 役職グループ（Position Groups）

役職の表示順序と結合を管理する機能。

### 機能

| 機能 | 説明 |
|------|------|
| 表示順序変更 | 上下ボタンでアコーディオンの順序を変更 |
| 役職結合 | 複数の役職を1つのグループにまとめる（例：部長・次長→上級管理職） |
| 役職分離 | 結合したグループから役職を分離 |
| 一括設定 | 結合グループ内の全重みを同じ値に一括更新 |
| 空グループ削除 | 設定が0件のグループを削除 |

### API

```typescript
// GET: グループ一覧取得
GET /api/evaluation/position-groups?periodId={periodId}

// POST: 各種操作
POST /api/evaluation/position-groups
{
  action: "merge" | "split" | "save-all" | "reorder" | "initialize",
  periodId: string,
  // action別のパラメータ
}

// DELETE: グループ削除
DELETE /api/evaluation/position-groups?id={groupId}
```

## 評価カテゴリ

### 成長評価カテゴリ（Growth Categories）

スキル・能力向上を評価するカテゴリ。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| name | string | カテゴリ名（日本語） |
| nameEn | string | カテゴリ名（英語） |
| description | string | 説明 |
| scoreT4 | number | T4（大きく上回った）のスコア |
| scoreT3 | number | T3（上回った）のスコア |
| scoreT2 | number | T2（達成）のスコア |
| scoreT1 | number | T1（未達成）のスコア |
| sortOrder | number | 表示順序 |
| isActive | boolean | 有効/無効 |

### プロセス評価カテゴリ（Process Categories）

業務遂行プロセスを評価するカテゴリ。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| name | string | カテゴリ名 |
| nameEn | string | カテゴリ名（英語） |
| categoryCode | string | クラス（A/B/C/D） |
| description | string | 説明 |
| minItemCount | number | 最小選択項目数 |
| scores | JSON | ティア別スコア `{T4, T3, T2, T1}` |
| sortOrder | number | 表示順序 |
| isActive | boolean | 有効/無効 |

### ティアの意味（T4が最高、T1が最低）

| ティア | 説明 |
|--------|------|
| T4 | 大きく上回った（Significantly Exceeded） |
| T3 | 上回った（Exceeded） |
| T2 | 達成（Met） |
| T1 | 未達成（Not Met） |

## Prismaモデル

```prisma
model EvaluationPeriod {
  id            String   @id @default(cuid())
  name          String
  year          Int
  term          Int      // 1: 上期, 2: 下期
  startDate     DateTime
  endDate       DateTime
  status        String   @default("draft")
  weights       EvaluationWeight[]
  positionGroups PositionGroup[]
}

model EvaluationWeight {
  id            String   @id @default(cuid())
  periodId      String
  positionCode  String
  positionName  String?
  gradeCode     String
  resultsWeight Int      @default(30)
  processWeight Int      @default(40)
  growthWeight  Int      @default(30)

  @@unique([periodId, positionCode, gradeCode])
}

model PositionGroup {
  id            String   @id @default(cuid())
  periodId      String
  name          String
  nameEn        String?
  displayOrder  Int      @default(0)
  positionCodes Json     // ["100", "103", "002"]

  @@unique([periodId, name])
}

model GrowthCategory {
  id          String   @id @default(cuid())
  name        String
  nameEn      String?
  description String?
  scoreT1     Float    @default(0.5)
  scoreT2     Float    @default(1.0)
  scoreT3     Float    @default(1.5)
  scoreT4     Float    @default(2.0)
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
}

model ProcessCategory {
  id           String   @id @default(cuid())
  name         String
  nameEn       String?
  categoryCode String   @default("A")
  description  String?
  minItemCount Int      @default(0)
  scores       Json     @default("{\"T4\":110,\"T3\":100,\"T2\":80,\"T1\":60}")
  sortOrder    Int      @default(0)
  isActive     Boolean  @default(true)
}
```

## UI/UXパターン

### アコーディオン2段レイアウト

役職グループのアコーディオンは2段構成：

```
┌─────────────────────────────────────────────────────────────┐
│ 1段目: グループ名 (コード)  [結合Badge] [設定数] [人数] [↑↓] [分離] [削除] │
├─────────────────────────────────────────────────────────────┤
│ 2段目（結合グループのみ）: 一括設定 [成果%] [プロセス%] [成長%] [合計] [適用] │
└─────────────────────────────────────────────────────────────┘
```

### 固定幅によるアライメント

右側の要素は固定幅で揃える：

```tsx
<div className="w-20 text-right"><Badge>設定数</Badge></div>
<div className="w-16 text-right"><Badge>人数</Badge></div>
<div className="w-9">{/* 分離ボタン */}</div>
<div className="w-9">{/* 削除ボタン（0設定時のみ） */}</div>
```

## 注意事項

- **DEFAULTエントリは不要**: フォールバックはコード内のハードコード値で対応
- **空グループの削除**: 全ての重みを削除した役職グループは手動で削除可能
- **評価期間ごとに独立**: 重み設定・役職グループは評価期間に紐づく
