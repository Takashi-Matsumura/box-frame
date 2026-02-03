# Claude Code 開発ガイド

このドキュメントは、Claude Codeを使用してこのプロジェクトを開発する際のガイドラインです。

## プロジェクト概要

組織管理システムの最小構成フレームワーク

| 技術 | バージョン/詳細 |
|-----|----------------|
| Next.js | 15 (App Router) |
| 認証 | NextAuth.js v5 (Auth.js) |
| ORM | Prisma (PostgreSQL) |
| CSS | Tailwind CSS 4 |
| 言語 | TypeScript |
| 多言語 | 英語・日本語 |

## アーキテクチャ

```
┌─────────────────────────────────────────────┐
│              フレーム基盤                    │
│  ┌─────────┐ ┌─────────┐ ┌───────┐ ┌─────┐ │
│  │ 認証    │ │ 通知    │ │ i18n  │ │Prisma│ │
│  └─────────┘ └─────────┘ └───────┘ └─────┘ │
└─────────────────────────────────────────────┘
                    ↑
               使用する
                    │
┌───────────────────┴─────────────────────────┐
│       コアモジュール / アドオンモジュール     │
│      (organization, system, ai, backoffice) │
└─────────────────────────────────────────────┘
```

フレーム基盤機能はモジュールではなく、モジュールが利用するインフラストラクチャです。

## ダッシュボード機能

ダッシュボード（`app/(menus)/(user)/dashboard/`）には以下の機能があります:

| 機能 | 説明 |
|------|------|
| カレンダー | 月表示・日表示の切替、イベント表示 |
| アプリカレンダー | イベントの作成・編集・削除（CRUD） |
| 外部カレンダー連携 | Google Calendar連携（OAuth、CRUD対応） |
| AIコンシェルジュ | カレンダーデータをコンテキストとしたAIチャット |
| スマート会議調整 | 複数社員の空き時間検索・会議日程提案 |

### アプリカレンダー（イベント管理）

アプリ内でイベントを管理する機能:

- **イベント作成**: 日表示でドラッグ選択、または月表示の「+」ボタン
- **イベント編集**: イベントにホバーして編集アイコンをクリック
- **イベント削除**: イベントにホバーして削除アイコンをクリック
- **15分単位スナップ**: ドラッグ選択は15分単位に自動調整

#### データモデル（CalendarEvent）

```prisma
model CalendarEvent {
  id          String    @id @default(cuid())
  userId      String
  title       String
  description String?
  location    String?
  startTime   DateTime
  endTime     DateTime
  allDay      Boolean   @default(false)
  category    String    @default("personal")  // personal, visitor, meeting, vacation, travel
  color       String?
}
```

#### API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/calendar/app-events` | イベント一覧取得（startDate, endDate指定可） |
| POST | `/api/calendar/app-events` | イベント作成 |
| GET | `/api/calendar/app-events/[id]` | イベント詳細取得 |
| PUT | `/api/calendar/app-events/[id]` | イベント更新 |
| DELETE | `/api/calendar/app-events/[id]` | イベント削除 |

### Google Calendar連携（CRUD対応）

Google Calendarとの連携機能。読み取りに加え、イベントの作成・編集・削除が可能。

#### OAuthスコープ

| スコープ | 用途 |
|---------|------|
| `calendar.events` | イベントのCRUD操作 |
| `calendar.readonly` | カレンダーリストの読み取り |

#### 権限管理

- DBの `scope` フィールドで権限を判定
- 旧スコープ（読み取り専用）の場合、UIに「権限を拡張」ボタンを表示
- クリックで再認証フロー開始（新スコープで）

#### API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/calendar/google-events` | Googleイベント作成 |
| PUT | `/api/calendar/google-events/[id]` | Googleイベント更新 |
| DELETE | `/api/calendar/google-events/[id]` | Googleイベント削除 |

#### UI操作

- **イベント作成**: 日表示でドラッグ選択、または月表示の「+」ボタン（書き込み権限必要）
- **イベント編集**: イベントにホバーして編集アイコンをクリック
- **イベント削除**: イベントにホバーして削除アイコンをクリック

### AIコンシェルジュ

- `components/CalendarConcierge.tsx` - AIチャットコンポーネント
- `/api/ai/chat/stream` エンドポイントをSSEストリーミングで使用
- アプリイベント + Google Calendarイベントの両方をシステムプロンプトに注入
- ReactMarkdown + remarkGfm でレスポンス描画
- AbortController による停止、IME変換対応

### スマート会議調整

複数の社員の空き時間を検索し、最適な会議日程を提案する機能。

#### 機能概要

| 機能 | 説明 |
|------|------|
| AI参加者解析 | 自然言語（「田中さんと鈴木さんで会議」）から参加者を抽出 |
| 社員選択UI | 検索・チェックボックスで社員を選択 |
| 空き時間検索 | 全員の空きスロットを自動検出 |
| 会議作成 | 選択したスロットで自分のカレンダーにイベント作成 |

#### 仕様

- **検索対象**: アプリイベントのみ（Google Calendar除外）
- **作成先**: 自分のカレンダーのみ
- **営業時間**: 9:00〜18:00（週末自動スキップ）
- **スロット間隔**: 30分刻み

#### API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/calendar/meeting-scheduler/parse-participants` | 自然言語から参加者を抽出 |
| POST | `/api/calendar/meeting-scheduler/availability` | 空き時間を検索 |
| POST | `/api/users/by-emails` | メールからユーザーID取得 |

#### UI操作

1. ダッシュボードの「アプリ」タブで「会議を調整」ボタンをクリック
2. 参加者を入力（AI解析または選択モード）
3. 日付範囲と会議時間（30/60/90/120分）を設定
4. 「空き時間を検索」をクリック
5. 表示された空きスロットから希望の時間を選択
6. 会議名を入力して「会議を作成」

### レイアウト

- **月表示**: 右パネルに「イベント」/「コンシェルジュ」タブ切替、イベント追加ボタン
- **日表示**: 左=DayView（ドラッグでイベント作成） + 右=AIコンシェルジュ常時表示（2カラム）

## チームスケジュール（マネージャー向け）

マネージャーが管理するチームメンバーのスケジュールをマージして週間表示する機能。

### 機能概要

| 機能 | 説明 |
|------|------|
| 週間カレンダー | チームメンバーのイベントをマージ表示 |
| メンバーフィルター | 特定メンバーで絞り込み |
| カラーコード | メンバーごとに色分け表示 |
| ナビゲーション | 前週/今日/翌週の切替 |

### アクセス権限

| ロール | アクセス |
|--------|----------|
| MANAGER | ○ |
| EXECUTIVE | ○ |
| ADMIN | ○ |
| USER | × |

### 表示対象メンバーの決定ロジック

1. **管理部署がある場合**: managedDepartments/Sections/Coursesのメンバー
2. **管理部署がない場合**: 自分と同じ所属のメンバー
3. **ADMINで社員レコードがない場合**: 全社員（最大100名）

### API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/calendar/team-schedule` | チームスケジュール取得 |

クエリパラメータ:
- `startDate`: 開始日（YYYY-MM-DD）
- `endDate`: 終了日（YYYY-MM-DD）

### ファイル構成

```
app/(menus)/(manager)/manager/team-schedule/
  ├── page.tsx              # サーバーコンポーネント（認証・権限チェック）
  ├── TeamScheduleClient.tsx # クライアントコンポーネント（カレンダーUI）
  └── translations.ts       # 翻訳ファイル

lib/addon-modules/calendar/
  ├── module.tsx            # カレンダーモジュール定義
  └── index.ts              # エクスポート
```

## ディレクトリ構造

```
app/
  ├── (menus)/              # メニューページ実装
  │   ├── (user)/           # 全社員向け
  │   ├── (manager)/        # 管理職向け
  │   ├── (admin)/          # システム管理者向け
  │   └── (backoffice)/     # バックオフィス（アクセスキー必須）
  ├── admin/                # 管理画面
  └── api/                  # APIルート

lib/
  ├── modules/              # モジュール定義（registry.tsx）
  ├── core-modules/         # コアモジュール（organization, system, ai）
  ├── addon-modules/        # アドオンモジュール（evaluation, backoffice等）
  ├── services/             # フレーム基盤サービス
  └── i18n/                 # 多言語対応

components/
  ├── ui/                   # 共通UIコンポーネント
  └── *.tsx                 # 各種コンポーネント

prisma/
  └── schema.prisma         # データベーススキーマ
```

## 開発コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # ビルド
npm run test         # テスト実行
npx prisma studio    # Prisma Studio
npx prisma generate  # Prismaクライアント生成
npx prisma db push && npm run db:seed  # DB初期化
```

## 環境変数

```env
AUTH_SECRET=<生成された秘密鍵>
AUTH_URL=http://localhost:3000
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# OAuth（オプション - 管理画面で有効化）
GOOGLE_CLIENT_ID=<Google OAuthクライアントID>
GOOGLE_CLIENT_SECRET=<Google OAuthクライアントシークレット>
```

---

## スキル活用ガイド

詳細情報は必要に応じてスキルを参照してください。

| 作業内容 | 使用スキル |
|---------|-----------|
| メニュー/モジュール追加 | /architecture |
| UI実装、コンポーネント作成 | /ui-ux |
| 翻訳追加、新規ページ作成 | /i18n |
| 通知発行、通知センター拡張 | /notifications |
| データインポート、履歴記録 | /data-management |
| 本番環境構築、デプロイ | /deployment |
| テスト作成・実行・デバッグ | /testing |
| 認証機能の実装・設定 | /auth |
| AI機能の実装・設定・利用 | /ai-services |
| フローティングウィンドウ、監査ログ | /frame-services |
| コアモジュール実装・拡張 | /core-modules |
| 業務分析機能の実装・拡張 | /backoffice |
| 人事評価機能の実装 | /evaluation |
| Reactフック、無限ループ防止 | /react-hooks |
| 日本語表記、用語統一 | /terminology |

---

## 基本ルール

### 翻訳ファイルの使用

```typescript
// ✅ 正しい
const t = translations[language];
<h1>{t.title}</h1>

// ❌ 間違い
<h1>Dashboard</h1>
```

### 共通コンポーネントの使用

```typescript
// ✅ 正しい
import { Button } from "@/components/ui";
<Button variant="primary" size="md">保存</Button>

// ❌ 間違い
<button className="px-4 py-2 bg-blue-600...">保存</button>
```

### menuGroupとURLパスの一致

```typescript
// ✅ 正しい
path: "/manager/analytics"
menuGroup: "manager"

// ❌ 間違い
path: "/admin/dashboard"
menuGroup: "user"
```

### ヘッダータイトルの動的取得

新しいモジュールを追加する際、`page-titles.ts` を編集する必要はありません。
モジュール定義の `name` / `nameJa` がヘッダーに自動表示されます。

---

## 派生プロジェクト運用

BoxFrameをクローンして業務アプリを開発する際のルール:

### 編集禁止ディレクトリ

- `lib/core-modules/` - コアモジュール
- `components/ui/` - 共通UIコンポーネント
- `lib/services/` - フレーム基盤サービス

### 業務モジュールの配置先

| 種別 | 配置先 |
|------|--------|
| モジュール定義 | `lib/addon-modules/<module-name>/` |
| 画面（ページ） | `app/(menus)/(business)/<path>/` |
| コンポーネント | `components/business/` |
| API | `app/api/<module-name>/` |

### フレーム改修が必要な場合

1. BoxFrame本体にIssue作成
2. 急ぎの場合は一時的にローカル修正（コメントで明記）
3. 本家にPR作成
4. マージ後、ローカル修正を削除

```bash
# upstreamの設定
git remote add upstream https://github.com/Takashi-Matsumura/box-frame.git
git fetch upstream
git merge upstream/main
```
