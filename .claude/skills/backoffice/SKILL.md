---
name: 業務分析モジュール
description: backofficeモジュール詳細、業務分掌、AIヒアリング、業務フロー図（draw.io）。業務分析機能の実装・拡張時に使用。
---

# 業務分析モジュール（backoffice）

アクセスキーで保護された業務プロセス分析とドキュメント化機能。

## アクセス制御

```typescript
requiredAccessKey: "backoffice"
// ADMINロールはアクセスキーなしで閲覧可能
// 一般ユーザーは管理画面でアクセスキーを付与する必要あり
```

## モジュール構造

```
lib/addon-modules/backoffice/
├── module.tsx
├── index.ts
├── components/
│   ├── DiagramEditor.tsx         # draw.ioエディタ
│   └── DiagramEditorWithAI.tsx   # AIアシスタント付き
└── utils/
    └── diagram-utils.ts          # XML操作
```

---

## ステップインジケーター

5ステップのワークフロー:

| ステップ | 完了条件 |
|---------|---------|
| 1. AIヒアリング | 業務分掌マークダウンあり OR 8メッセージ以上 |
| 2. 業務分掌整理 | 業務分掌マークダウンあり |
| 3. 業務フロー図 | 図が保存されている |
| 4. レビュー | ステータスがREVIEW以降 |
| 5. 公開 | ステータスがPUBLISHED |

---

## AIヒアリング機能

対話形式で業務分掌9項目をヒアリング:

1. 業務概要・目的
2. 責任範囲
3. ステークホルダー
4. 業務フロー
5. インプット/アウトプット
6. 使用システム・ツール
7. KPI/成果指標
8. リスク・課題
9. 改善提案

### パネル分割表示

AIヒアリングボタンクリック時:
- **左側**: 業務分掌マークダウン表示（参照用）
- **右側**: AIヒアリングチャット

---

## 業務分掌（マークダウン形式）

```typescript
// jobDescriptionMd フィールドに格納
// ReactMarkdownで表示、直接編集も可能
// AIレビュー機能で課題を検出
```

---

## 業務フロー図機能

### draw.io統合

- フローティングサブウィンドウ表示（1200×700）
- ドラッグ、リサイズ、最小化、最大化対応
- XMLデータとしてDBに保存

### AIアシスタント付きエディタ

- 左パネル: AIチャット + 保存ボタン
- 右パネル: draw.ioエディタ
- 「業務フロー図を生成」でスイムレーン形式の図を自動生成

### ガイドライン準拠の記号セット

| 記号 | 形状 | 用途 |
|------|------|------|
| 状態 | 楕円 | 開始条件、終了結果 |
| 作業 | 長方形 | 人手による作業 |
| 処理 | 角丸長方形 | システム処理 |
| 分岐 | ひし形 | 判断による分岐 |
| 伝達データ | 角丸長方形・紫 | 作業間で受け渡すデータ |
| 蓄積データ | 円筒 | DB等に蓄積されるデータ |

矢印:
- **実線矢印**: 作業の流れ
- **点線矢印**: データの流れ

---

## データモデル

```prisma
model BusinessProcess {
  id                String                @id
  title             String
  description       String?
  status            BusinessProcessStatus
  // DRAFT/INTERVIEW/DIAGRAMMING/REVIEW/PUBLISHED/ARCHIVED

  flowDescription   String?               // レガシー
  interviewHistory  Json?                 // AIヒアリング履歴
  diagramXml        String?               // draw.io XMLデータ
  tags              String?
  version           Int

  // 業務分掌（マークダウン形式）
  jobDescriptionMd  String?               // メイン

  // 業務分掌9項目（レガシー - 今後廃止予定）
  purpose           String?
  responsibleDepartment String?
  // ... 他フィールド

  createdBy         String
  updatedBy         String?
  createdAt         DateTime
  updatedAt         DateTime
}
```

---

## 今後の機能拡張候補

参照: `docs/business-manual-guideline.md`

### 1. 付加価値分析（VA/NVA/BV）

- 各作業にタグ付与
- 色分け表示（VA=緑、NVA=赤、BV=黄）
- AIによる自動分類提案

### 2. 作業手順書（ユースケース記述）

- 業務フローから1:1で作業手順書を作成
- メイン/代替/例外フローの記述対応

### 3. スイムレーン記号拡張

- KPI測定ポイントのマーキング
