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
│   ├── DiagramEditorWithAI.tsx   # AIアシスタント付き
│   ├── ProcedureEditModal.tsx    # 作業手順書編集モーダル
│   └── WorkProceduresPanel.tsx   # 作業手順書一覧パネル
└── utils/
    ├── diagram-utils.ts          # XML操作
    └── task-extractor.ts         # フロー図から作業抽出
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

## 作業手順書機能

公開済み業務プロセスのフロー図から作業を抽出し、各作業の手順書を作成・管理。

### 画面構成

`/backoffice/analytics/[id]/procedures` - 専用ページ

- **左側**: 業務フロー図（draw.io 閲覧専用）
- **右側**: 作業一覧（抽出された作業のリスト）

### 作業抽出ロジック

`task-extractor.ts` で draw.io XML から作業を自動抽出:

| 形状 | 作業タイプ |
|------|-----------|
| 長方形（rounded=0）| manual（人手作業） |
| 角丸長方形（rounded=1）| system（システム処理） |

除外: 楕円（状態）、ひし形（分岐）、円筒（データ）、スイムレーン

### 作業手順書フォーマット

マークダウン形式で記述:

```markdown
# 作業名

## 概要
## 目的
## アクター
## 事前条件
## メインフロー
## 代替フロー
## 例外処理
## 事後条件
## 備考
```

### AI生成機能

「AIで生成」ボタンで業務分掌コンテキストを活用した手順書ドラフトを自動生成。

### APIエンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/backoffice/processes/[id]/tasks` | フロー図から作業を抽出 |
| GET | `/api/backoffice/processes/[id]/procedures` | 手順書一覧を取得 |
| POST | `/api/backoffice/processes/[id]/procedures` | 手順書を作成/更新 |
| POST | `/api/backoffice/processes/[id]/procedures/generate` | AI手順書生成 |

---

## データモデル

### BusinessProcess

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

  // リレーション
  workProcedures    WorkProcedure[]       // 作業手順書

  createdBy         String
  updatedBy         String?
  createdAt         DateTime
  updatedAt         DateTime
}
```

### WorkProcedure

```prisma
model WorkProcedure {
  id                String          @id @default(cuid())
  businessProcessId String
  businessProcess   BusinessProcess @relation(...)

  // draw.ioでの識別情報
  diagramCellId     String          // mxCell id
  swimlaneId        String?         // 親スイムレーンのid

  // 作業情報
  taskName          String          // 作業名
  taskType          String          // manual | system
  actorName         String?         // アクター名

  // 作業手順書（マークダウン）
  procedureMd       String?

  sortOrder         Int             @default(0)
  createdAt         DateTime
  updatedAt         DateTime

  @@unique([businessProcessId, diagramCellId])
}
```

---

## 今後の機能拡張候補

参照: `docs/business-manual-guideline.md`

### 1. 付加価値分析（VA/NVA/BV）

- 各作業にタグ付与
- 色分け表示（VA=緑、NVA=赤、BV=黄）
- AIによる自動分類提案

### 2. スイムレーン記号拡張

- KPI測定ポイントのマーキング
