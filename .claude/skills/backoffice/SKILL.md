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

| ステップ | タイトル | 完了条件 |
|---------|---------|---------|
| 1. サンプル生成 | 業務名からAIでサンプル業務分掌を自動生成 | 業務分掌マークダウンあり |
| 2. 業務分掌編集 | サンプルを実際の業務に合わせて編集 | 図が保存されている |
| 3. 業務フロー図 | 複数アクターのスイムレーン図を作成 | 図が保存されている |
| 4. レビュー | 文書化したプロセスを確認・最終調整 | ステータスがREVIEW以降 |
| 5. 公開 | 完成したプロセス文書を公開 | ステータスがPUBLISHED |

---

## サンプル生成機能

業務名と説明から、AIが業務分掌のサンプル（叩き台）を自動生成:

- 8項目すべてを含むマークダウン形式
- 「⚠️ これはAIが生成したサンプルです」の警告付き
- 一般的な内容で構成、後から編集して実際の業務に合わせる

---

## 分割画面編集機能

編集モードでは分割画面を表示:

- **左側（50%）**: マークダウンプレビュー（ReactMarkdownでリアルタイム表示）
- **右側（50%）**: マークダウンエディタ（textarea）

機能:
- 入力するとすぐに左側のプレビューに反映
- 「AIで整形」ボタンで文章の校正・フォーマット
- 保存ボタンで変更を確定

---

## AIサポート機能

業務分掌について質問やアドバイスを受けられるチャット機能:

- 業務分掌の内容について質問
- 改善提案の相談
- 不明点の確認

### パネル分割表示

AIサポートボタンクリック時:
- **左側**: 業務分掌マークダウン表示（参照用）
- **右側**: AIサポートチャット

### 業務分掌8項目

1. 業務概要・目的
2. 責任範囲
3. ステークホルダー
4. 業務フロー
5. インプット/アウトプット
6. 使用システム・ツール
7. 必要なスキル/知識
8. リスク・課題

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
  // DRAFT/EDITING/DIAGRAMMING/REVIEW/PUBLISHED/ARCHIVED

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

## AI業務分析メニュー

業務分析の簡易版。参考資料からAIが業務分掌を自動生成し、編集・完成まで3ステップで完結。

### ワークフロー（3ステップ）

| ステップ | タイトル | 内容 |
|---------|---------|------|
| 1. ドラフト生成 | AIが参考資料から業務分掌を自動生成 | status=DRAFT時に自動発火 |
| 2. 業務分掌編集 | 生成されたドラフトを編集・AIサポートで改善 | 分割画面、AI整形 |
| 3. 完成 | 業務分掌を確定 | ステータスをCOMPLETEDに変更 |

### データモデル

```prisma
enum JobAnalysisStatus {
  DRAFT
  GENERATING
  EDITING
  COMPLETED
}

model JobAnalysis {
  id                String            @id @default(cuid())
  title             String
  description       String?
  inputMaterials    String?           // 参考資料テキスト
  jobDescriptionMd  String?           // AI生成→編集される業務分掌マークダウン
  flowDiagramData   Json?             // Excalidraw フロー図データ
  chatHistory       Json?             // [{role, content, timestamp}]
  status            JobAnalysisStatus @default(DRAFT)
  tags              String?
  version           Int               @default(1)
  createdBy         String
  updatedBy         String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}
```

### 業務フロー図（Excalidraw）

- フローティングウィンドウで表示（`headerClassName: "bg-indigo-600 border-indigo-700"`）
- 業務分掌の「業務フロー」「ステークホルダー」セクションからスイムレーン形式で自動生成
- AIがExcalidraw JSON要素を直接生成（`convertToExcalidrawElements`で変換）
- `safeParseJSON()` で途中切断されたJSON出力にも対応

### メニュー専用AI設定（configOverride）

AI業務分析メニュー専用のLLMを設定可能（リーズニングモデル等の利用を想定）。

- 設定場所: システム環境 → モジュール管理 → バックオフィス → AI業務分析の「AI設定」ボタン
- DB保存: `SystemSetting` テーブルに `job_analysis_ai_*` プレフィックスのキーで保存
- `configOverride` パラメータで `AIService.generate()` / `AIService.chat()` に渡す
- 未設定時はアプリ全体のAI設定をフォールバック
- テスト接続機能あり（ローカルLLM / OpenAI / Anthropic対応）

### APIエンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/backoffice/job-analyses` | 一覧取得 |
| POST | `/api/backoffice/job-analyses` | 新規作成 |
| GET | `/api/backoffice/job-analyses/[id]` | 詳細取得 |
| PUT | `/api/backoffice/job-analyses/[id]` | 更新 |
| DELETE | `/api/backoffice/job-analyses/[id]` | 削除 |
| GET | `/api/backoffice/job-analyses/ai-config` | 専用AI設定取得 |
| PUT | `/api/backoffice/job-analyses/ai-config` | 専用AI設定更新 |
| POST | `/api/backoffice/job-analyses/ai-config` | テスト接続 |

### ファイル構成

```
app/(menus)/(backoffice)/backoffice/ai-analytics/
├── page.tsx                        # 一覧サーバーコンポーネント
├── translations.ts                 # 一覧翻訳
├── AiAnalyticsClient.tsx           # 一覧クライアント
└── [id]/
    ├── page.tsx                    # 詳細サーバーコンポーネント
    ├── translations.ts             # 詳細翻訳
    ├── JobAnalysisDetailClient.tsx  # 詳細クライアント
    └── ExcalidrawFlowEditor.tsx    # Excalidrawフロー図エディタ
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
