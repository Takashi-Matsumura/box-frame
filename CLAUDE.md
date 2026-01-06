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
│      (organization, system, openldap等)     │
└─────────────────────────────────────────────┘
```

フレーム基盤機能はモジュールではなく、モジュールが利用するインフラストラクチャです。

## モジュールの構成要素

モジュールは**メニュー**と**サービス**の2種類の機能を持ちます。

```
┌─────────────────────────────────────────┐
│            モジュール                    │
│  ┌─────────────────────────────────────┐ │
│  │ メニュー（画面あり）                 │ │
│  │ - 組織図、データインポート等        │ │
│  │ - サイドバーに表示                  │ │
│  │ - ユーザーが直接アクセス            │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │ サービス（画面なし）                 │ │
│  │ - 承認経路取得、ワークフロー等      │ │
│  │ - APIエンドポイントのみ提供         │ │
│  │ - 他モジュールから呼び出される      │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### メニュー vs サービス

| 項目 | メニュー | サービス |
|------|----------|----------|
| 画面 | あり | なし |
| サイドバー表示 | あり | なし |
| ユーザー操作 | 直接アクセス | 間接的（他機能経由） |
| 主な用途 | UI/UX提供 | API/ビジネスロジック提供 |
| 例 | 組織図、データインポート | 承認経路取得、ワークフロー |

### コンテナ依存関係

モジュールはDockerコンテナに依存することがあります。依存関係を定義することで、管理画面でコンテナの稼働状況を確認できます。

```typescript
// モジュール定義例
export const openldapModule: AppModule = {
  id: "openldap",
  // ...
  containers: [
    {
      id: "openldap",
      name: "OpenLDAP Server",
      nameJa: "OpenLDAPサーバ",
      healthCheckUrl: "/api/admin/openldap/status",
      required: true,
    },
  ],
};
```

**表示内容:**
- モジュールカードにコンテナの稼働状況を表示
- 稼働中: 緑色のインジケーター
- 停止中: 黄色のインジケーター + 警告アイコン（必須コンテナの場合）

### MCPサーバー

モジュールは外部AI連携用のMCPサーバーを提供できます。管理画面でMCPサーバーの有無とツール数を確認できます。

```typescript
// モジュール定義例
export const openldapModule: AppModule = {
  id: "openldap",
  // ...
  mcpServer: {
    id: "openldap-mcp",
    name: "OpenLDAP MCP Server",
    nameJa: "OpenLDAP MCPサーバ",
    path: "mcp-servers/openldap",
    toolCount: 5,
    readOnly: true,
    tools: [
      { name: "ldap_check_status", descriptionJa: "サーバ接続状態を確認" },
      { name: "ldap_list_users", descriptionJa: "ユーザ一覧を取得" },
      // ...
    ],
  },
};
```

**表示内容:**
- モジュールカード: `MCP 5ツール`（シンプル表示）
- モジュール詳細: ツール一覧、アクセスモード、サーバパス

## ディレクトリ構造

```
app/
  ├── (menus)/              # メニューページ実装
  │   ├── (user)/           # 全社員向け（組織図）
  │   ├── (manager)/        # 管理職向け（分析）
  │   └── (admin)/          # システム管理者向け
  ├── admin/                # 管理画面
  ├── login/                # ログインページ
  └── api/                  # APIルート

lib/
  ├── modules/              # モジュール定義（registry.tsx）
  ├── core-modules/         # コアモジュール
  │   ├── organization/     # 組織管理モジュール
  │   ├── system/           # システムモジュール
  │   └── ai/               # 生成AIモジュール
  ├── addon-modules/        # アドオンモジュール
  │   └── ldap-migration/   # LDAPマイグレーション
  ├── services/             # フレーム基盤サービス
  │   └── notification-service.ts  # 通知サービス
  ├── stores/               # Zustandストア
  │   └── notification-store.ts    # 通知ストア
  ├── ldap/                 # LDAP認証
  ├── i18n/                 # 多言語対応
  ├── importers/            # データインポート
  └── history/              # 履歴管理

components/
  ├── ui/                   # 共通UIコンポーネント
  ├── notifications/        # 通知UIコンポーネント
  └── *.tsx                 # 各種コンポーネント

prisma/
  └── schema.prisma         # データベーススキーマ

mcp-servers/
  └── openldap/             # OpenLDAP MCPサーバー
```

## コアモジュール構成

### organizationモジュール
- 組織図表示・検索
  - 役職コード順ソート（一般社員は最後）
  - 重複しない表示モード（評価関係表示）
  - 本部→部→課の階層ナビゲーション
- 社員詳細モーダル
  - 基本情報タブ
  - キャリア履歴タブ（入社・異動・昇進・退職の時系列表示）
- 組織整備（責任者設定）
  - 公開日設定（即時公開/予約公開）
  - インポート取消（ロールバック機能）
- データインポート（CSV/Excel）
  - 役員・顧問の自動分類
  - 重複検出・除外
  - 変更タイプ自動判定（新規/異動/昇進/退職/復職）
- 履歴管理
  - EmployeeHistory: 社員スナップショット（validFrom/validTo）
  - ChangeLog: フィールド単位の変更記録（batchId付き）

### systemモジュール
- ダッシュボード
- 管理画面（ユーザー管理）
- データ履歴
- システム設定

### aiモジュール
- 生成AI機能を提供するコアモジュール
- AIチャット（ChatGPT風UI、ストリーミング対応）
- 翻訳API（日英相互翻訳）
- OpenAI / Anthropic / ローカルLLM対応
  - llama.cpp（OpenAI互換API）
  - LM Studio
  - Ollama
- トークン統計表示（コンテキスト使用量、トークン/秒）
- 管理画面の「システム情報」タブでAPI設定
- RAGバックエンド（Python FastAPI）
  - ChromaDB: ベクトルデータベース
  - sentence-transformers: 埋め込みモデル（multilingual-e5-small）
  - ドキュメント登録・検索・チャット機能
  - SSEストリーミング対応

**RAGバックエンド起動:**
```bash
# Dockerで起動
docker compose up -d airag-backend

# ヘルスチェック
curl http://localhost:8000/health
```

**人事評価モジュールでの利用:**
- 評価画面右側にAIアシスタントパネルを表示
- RAGを使用した評価アドバイス機能
- クイックアクション（評価ポイント、フィードバック例、成長目標）
- マークダウンレンダリング対応（react-markdown + remark-gfm）
- ストリーミング表示（リアルタイムで回答を表示）

**ナレッジベース機能:**
- RAGバッジ（例: `RAG (3ファイル)`）をクリックでダイアログ表示
- 登録ドキュメント一覧をテーブル形式で表示
- ドキュメント選択でマークダウンプレビュー表示（フルサイズダイアログ）
- マニュアル/ドキュメント閲覧機能として利用可能

**評価AIナレッジ管理画面 (`/admin/evaluation-rag`):**
- ドキュメントの登録（タイトル、カテゴリ、内容）
- 登録済みドキュメントの一覧表示（ファイル名でグループ化）
- マークダウンプレビュー/ソース表示切り替え
- ドキュメント削除機能

## アドオンモジュール

### ldap-migrationモジュール（LDAPマイグレーション）

レガシーLDAPからOpenLDAPへのLazy Migration機能を提供するアドオンモジュールです。

**認証フロー:**
```
1. ユーザーがOpenLDAPでログイン試行
2. 認証失敗 & このモジュールが有効な場合
3. レガシーLDAPで認証を試行
4. 成功した場合:
   - 会社組織(Employee)からメールで検索し社員情報取得
   - OpenLDAPに新規ユーザーを自動作成
   - User/LdapUserMappingを作成（migrated=true）
5. マイグレーション完了後はモジュールを無効化するだけで運用可能
```

**設定場所:** モジュール管理画面（`/admin?tab=modules`）でモジュールを選択

**設定項目:**
- サーバURL: `ldap://ldap.example.com:389`
- ベースDN: `ou=Users,dc=example,dc=com`
- 検索フィルタ: `(uid={username})`
- タイムアウト: ミリ秒

**テスト機能:**
- 接続テスト: サーバへの接続確認
- ユーザー検索: ユーザー名でLDAP検索
- 認証テスト: ユーザー名/パスワードで認証確認

**依存:** openldapモジュール

## Prismaモデル（26モデル）

### 認証系
- Account, Session, User, VerificationToken

### 監査・通知系
- AuditLog, Notification, Announcement

### LDAP認証系
- LdapConfig, LdapUserMapping, LdapAuthLog, OpenLdapConfig, LegacyLdapConfig

### アクセス制御系
- Permission, AccessKey, AccessKeyPermission, UserAccessKey

### 組織系
- Organization, Department, Section, Course, Employee

### 履歴系
- EmployeeHistory, OrganizationHistory, ChangeLog

### システム系
- SystemSetting

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# Prisma Studio
npx prisma studio

# Prismaクライアント生成
npx prisma generate

# データベース初期化
npx prisma db push && npm run db:seed

# テスト
npm run test

# テスト（カバレッジ付き）
npm run test:coverage

# 特定のテストのみ実行
npm run test -- --testPathPatterns="access-control"
```

## テスト戦略

「仕様通りにフレームが設計されているか」を確認するためのテスト方針です。

### テスト方針

| 対象 | 方針 | 理由 |
|------|------|------|
| バックエンドAPI | 厳密にテスト | 外部モジュールが依存する契約 |
| アクセス制御 | 厳密にテスト | セキュリティリスク |
| フロントエンド | 手動確認中心 | 柔軟な変更に対応 |

### テスト対象

1. **外部モジュール向けAPI（契約テスト）** - 最優先
   - `/api/ai/services/generate`
   - `/api/ai/services/summarize`
   - `/api/ai/services/extract`
   - `/api/ai/translate`

2. **アクセス制御ロジック** - 高優先
   - `canAccessMenu()`
   - `canAccessModule()`
   - `canAccessMenuGroup()`
   - `getAccessibleMenus()`

3. **AIService（サービス層）** - 中優先
   - `generate()`
   - `summarize()`
   - `extract()`

### テストファイル構成

```
__tests__/
├── api/
│   └── ai/
│       ├── services/
│       │   ├── generate.test.ts    # 8テスト
│       │   ├── summarize.test.ts   # 8テスト
│       │   └── extract.test.ts     # 12テスト
│       └── translate.test.ts       # 13テスト
└── lib/
    ├── modules/
    │   └── access-control.test.ts  # 21テスト
    └── core-modules/
        └── ai/
            └── ai-service.test.ts  # 15テスト

jest.config.ts    # Jest設定
jest.setup.ts     # グローバルモック
```

### モック戦略

| 依存 | モック方法 |
|------|-----------|
| Prisma | `jest.mock("@/lib/prisma")` |
| 外部API | `global.fetch = jest.fn()` |
| 認証 | `jest.mock("@/auth")` |

## 環境変数

```env
# 認証
AUTH_SECRET=<生成された秘密鍵>
AUTH_URL=http://localhost:3000

# データベース
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# OAuth（オプション - 管理画面で有効化）
GOOGLE_CLIENT_ID=<Google OAuthクライアントID>
GOOGLE_CLIENT_SECRET=<Google OAuthクライアントシークレット>
GITHUB_CLIENT_ID=<GitHub OAuthクライアントID>
GITHUB_CLIENT_SECRET=<GitHub OAuthクライアントシークレット>
```

## 重要なルール

### menuGroupとURLパスの一致

```typescript
// ✅ 正しい
path: "/manager/analytics"
menuGroup: "manager"

// ❌ 間違い
path: "/admin/dashboard"
menuGroup: "user"
```

### 共通コンポーネントの使用

```typescript
// ✅ 正しい
import { Button } from "@/components/ui";
<Button variant="primary" size="md">保存</Button>

// ❌ 間違い
<button className="px-4 py-2 bg-blue-600...">保存</button>
```

### 翻訳ファイルの使用

```typescript
// ✅ 正しい
const t = translations[language];
<h1>{t.title}</h1>

// ❌ 間違い
<h1>Dashboard</h1>
```

### ヘッダータイトルの動的取得

ヘッダーに表示されるページタイトルは、モジュールレジストリから自動的に取得されます。

**取得順序:**
1. `lib/i18n/page-titles.ts` のハードコーディング（既存ページ用）
2. モジュールレジストリの `menu.name` / `menu.nameJa`（新規モジュール用）
3. フォールバック: "BoxFrame"

新しいモジュールを追加する際、`page-titles.ts` を編集する必要はありません。モジュール定義の `name` / `nameJa` がヘッダーに自動表示されます。

### ロールカラースキーム

テンプレートのウェルカムカード等で使用するロール別カラー:

| ロール | 色 | Tailwind クラス |
|--------|-----|-----------------|
| GUEST | グレー | `bg-gray-600` |
| USER | 青/シアン | `bg-blue-600` / `bg-cyan-700` |
| MANAGER | 緑 | `bg-green-600` / `bg-green-700` |
| EXECUTIVE | ローズ | `bg-rose-600` / `bg-rose-700` |
| ADMIN | 紫 | `bg-purple-600` / `bg-purple-700` |

### ロール階層とメニューセクション

```
GUEST → USER → MANAGER → EXECUTIVE → ADMIN
```

| ロール | 説明 | 表示されるセクション |
|--------|------|---------------------|
| GUEST | 未認証/制限付き | ゲスト |
| USER | 一般社員 | ゲスト、ユーザ |
| MANAGER | 管理職 | ゲスト、ユーザ、マネージャー |
| EXECUTIVE | 役員（経営層） | ゲスト、ユーザ、マネージャー、エグゼクティブ |
| ADMIN | システム管理者 | 全セクション |

**メニューグループ（セクション）:**
```typescript
type MenuGroupId = "guest" | "user" | "manager" | "executive" | "admin";
```

各メニューは `menuGroup` プロパティでセクションを指定します。上位ロールは下位ロールのセクションも表示されます。

## レスポンシブ対応

### ブレークポイント

| サイズ | 幅 | サイドバー表示 |
|--------|-----|---------------|
| モバイル | < 768px | オーバーレイ（Sheet） |
| タブレット | 768px - 1023px | オーバーレイ（Sheet） |
| デスクトップ | >= 1024px | 固定表示 |

**ベース端末**: iPad Mini（768×1024）

### フック

```typescript
// hooks/use-mobile.ts
import { useIsMobile, useIsTabletOrMobile } from "@/hooks/use-mobile";

// モバイルのみ（768px未満）
const isMobile = useIsMobile();

// タブレット含む（1024px未満）
const isTabletOrMobile = useIsTabletOrMobile();
```

### サイドバー動作

- **デスクトップ**: 固定表示、幅調整ハンドル（ResizeHandle）あり
- **タブレット/モバイル**: オーバーレイ表示（Sheet）、ハンバーガーメニューで開閉

### 実装時の注意

```typescript
// ✅ タブレット対応のレイアウト
const isTabletOrMobile = useIsTabletOrMobile();
<div style={{ left: isTabletOrMobile ? "0" : `${sidebarWidth}px` }}>

// ❌ モバイルのみの判定（タブレットで問題発生）
const isMobile = useIsMobile();
<div style={{ left: isMobile ? "0" : `${sidebarWidth}px` }}>
```

## 認証アーキテクチャ

### Edge Runtime対応

Next.js 15のmiddlewareはEdge Runtimeで動作するため、認証設定を分離：

1. `/auth.config.ts` - Edge Runtime用（middleware）
   - Google OAuth / GitHub OAuth
   - ldaptsを含まない

2. `/auth.ts` - Node.js Runtime用（APIルート）
   - LDAP/OpenLDAPプロバイダーを追加
   - Dynamic Importでldaptsを遅延ロード

3. `/middleware.ts` - auth.config.tsを使用

### OAuth設定

OAuth認証は管理画面（システム情報タブ）で個別に有効化/無効化できます。

| プロバイダー | 環境変数 | 管理画面設定キー |
|-------------|----------|-----------------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `google_oauth_enabled` |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `github_oauth_enabled` |

**設定手順:**
1. 環境変数にクライアントID/シークレットを設定
2. 管理画面 → システム情報 → 認証設定でトグルを有効化
3. ログイン画面にOAuthボタンが表示される

**ログイン画面の表示ロジック:**
- `app/login/page.tsx` でDBから `google_oauth_enabled` / `github_oauth_enabled` を取得
- 有効なプロバイダーのみ `OAuthButtons` コンポーネントに渡す
- OpenLDAPとOAuthの両方が有効な場合はセパレーターで区切って表示

### LDAP認証フロー

1. ログイン画面でユーザー名/パスワード入力
2. `/api/auth/callback/ldap`がNode.js Runtimeで実行
3. LdapMigrationServiceで認証（Legacy LDAP + OpenLDAP対応）
4. JWTトークン発行

## 通知機能（フレーム基盤）

通知機能はモジュールではなく、フレーム基盤として提供されます。

### 使用方法

```typescript
import { NotificationService } from "@/lib/services/notification-service";

// セキュリティ通知（対象ユーザへ）
await NotificationService.securityNotify(userId, {
  title: "New login detected",
  titleJa: "新しいログインを検出しました",
  message: "You have logged in successfully.",
  messageJa: "正常にログインしました。",
});

// ブロードキャスト通知（特定ロールへ）
await NotificationService.broadcast({
  role: "ADMIN",
  type: "SYSTEM",
  priority: "HIGH",
  title: "Settings updated",
  titleJa: "設定が更新されました",
  message: "Configuration has been changed.",
  messageJa: "設定が変更されました。",
  source: "ADMIN",
});
```

### 注意事項

- 通知は自動生成されない（開発者が明示的に呼び出す）
- 通知失敗はメイン処理に影響させない（`.catch()` でログのみ）
- 英語・日本語両方のタイトル・メッセージを指定

詳細は `.claude/skills/notifications/SKILL.md` を参照。

## 監査ログ（フレーム基盤）

管理者操作とログイン履歴を記録・閲覧するためのフレーム基盤機能です。

### 記録対象

| カテゴリ | アクション | 説明 |
|---------|-----------|------|
| AUTH | LOGIN_SUCCESS | ログイン成功 |
| AUTH | LOGIN_FAILURE | ログイン失敗 |
| USER_MANAGEMENT | USER_DELETE | ユーザー削除 |
| USER_MANAGEMENT | USER_ROLE_CHANGE | ロール変更 |
| SYSTEM_SETTING | ANNOUNCEMENT_CREATE | アナウンス作成 |
| SYSTEM_SETTING | ANNOUNCEMENT_UPDATE | アナウンス更新 |
| SYSTEM_SETTING | ANNOUNCEMENT_DELETE | アナウンス削除 |
| SYSTEM_SETTING | AI_CONFIG_UPDATE | AI設定変更 |
| MODULE | MODULE_TOGGLE | モジュール有効/無効 |

### 使用方法

```typescript
import { AuditService } from "@/lib/services/audit-service";

// 監査ログを記録
await AuditService.log({
  action: "USER_DELETE",
  category: "USER_MANAGEMENT",
  userId: session.user.id,
  targetId: deletedUserId,
  targetType: "User",
  details: { deletedUserName: "user@example.com" },
}).catch(() => {});

// ログを取得（ページネーション付き）
const { logs, total } = await AuditService.getLogs({
  category: "AUTH",
  limit: 25,
  offset: 0,
});
```

### 管理画面

管理画面の「監査ログ」タブで、カテゴリ・アクションによるフィルタリングとページネーション付きで閲覧可能。

## システムアナウンス（フレーム基盤）

全ユーザーへの告知バナーを表示するためのフレーム基盤機能です。

### 機能

- ヘッダー上部にバナー表示
- ユーザーが閉じることができる（セッション中のみ非表示）
- 開始日時・終了日時を設定可能
- 重要度レベル（info, warning, critical）

### レベル別スタイル

| レベル | 色 | 用途 |
|--------|-----|------|
| info | 青色 | 一般的なお知らせ |
| warning | 黄色 | 注意喚起 |
| critical | 赤色 | 重要な警告 |

### 管理画面

管理画面の「アナウンス」タブで、アナウンスの作成・編集・削除・有効/無効の切り替えが可能。

### API

- `GET /api/announcements` - 現在有効なアナウンスを取得（全ユーザー）
- `GET /api/admin/announcements` - 全アナウンスを取得（管理者）
- `POST /api/admin/announcements` - アナウンスを作成（管理者）
- `PATCH /api/admin/announcements/[id]` - アナウンスを更新（管理者）
- `DELETE /api/admin/announcements/[id]` - アナウンスを削除（管理者）

## 生成AI（コアモジュール）

翻訳などのAI機能を提供するコアモジュールです。

### 対応プロバイダー

#### ローカルLLM（推奨）

APIキー不要でローカルで動作するLLMサーバを使用します。

| サーバ | デフォルトエンドポイント | 備考 |
|--------|------------------------|------|
| **llama.cpp** | `http://localhost:8080/v1/chat/completions` | デフォルト、OpenAI互換API |
| **LM Studio** | `http://localhost:1234/v1/chat/completions` | OpenAI互換API |
| **Ollama** | `http://localhost:11434/api/chat` | Ollama独自API |

#### クラウドAPI

| プロバイダー | モデル | 備考 |
|-------------|--------|------|
| OpenAI | gpt-4o-mini, gpt-4o, gpt-4-turbo | 推奨: gpt-4o-mini |
| Anthropic | claude-3-haiku, claude-3.5-sonnet, claude-3-opus | 推奨: claude-3-haiku |

### 設定

管理画面の「システム情報」タブでAI設定を行います：

1. AI機能の有効/無効切り替え
2. プロバイダー選択（ローカルLLM / OpenAI / Anthropic）
3. ローカルLLMの場合: サーバ選択、エンドポイントURL、モデル名、接続テスト
4. クラウドAPIの場合: モデル選択、APIキー設定

### 使用方法

```typescript
import { AIService } from "@/lib/core-modules/ai/ai-service";

// AI機能が利用可能か確認
const available = await AIService.isAvailable();

// テキスト翻訳
const result = await AIService.translate({
  text: "こんにちは",
  sourceLanguage: "ja",
  targetLanguage: "en",
});
// result: { translatedText: "Hello", provider: "openai", model: "gpt-4o-mini" }
```

### API

- `GET /api/ai/translate` - AI翻訳が利用可能か確認
- `POST /api/ai/translate` - テキストを翻訳
- `GET /api/admin/ai` - AI設定を取得（管理者）
- `PATCH /api/admin/ai` - AI設定を更新（管理者）
- `POST /api/admin/ai` - ローカルLLM接続テスト（管理者）

### 外部モジュール向けAPIサービス

他のモジュールからAI機能を利用するためのAPIサービスです。

#### 汎用テキスト生成 `/api/ai/services/generate`

カスタムプロンプトでテキストを生成します。

```typescript
// リクエスト
const response = await fetch("/api/ai/services/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input: "売上データ: 1月100万円、2月150万円、3月120万円",
    systemPrompt: "あなたはビジネスアナリストです。データを分析してください。",
    temperature: 0.5, // オプション（0-2、デフォルト0.7）
    maxTokens: 1000,  // オプション（デフォルト2000）
  }),
});

// レスポンス
{
  "output": "分析結果...",
  "provider": "local",
  "model": "llama.cpp/gemma-3n"
}
```

#### 要約 `/api/ai/services/summarize`

テキストを要約します。

```typescript
// リクエスト
const response = await fetch("/api/ai/services/summarize", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "長い議事録テキスト...",
    length: "short", // "short" | "medium" | "long"（オプション）
    language: "ja",  // "ja" | "en"（オプション）
  }),
});

// レスポンス
{
  "summary": "要約されたテキスト...",
  "provider": "local",
  "model": "llama.cpp/gemma-3n"
}
```

#### データ抽出 `/api/ai/services/extract`

テキストから構造化データを抽出します。

```typescript
// リクエスト
const response = await fetch("/api/ai/services/extract", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "田中太郎さん（35歳）は東京都在住で、エンジニアとして働いています。",
    schema: [
      { name: "name", description: "人物の名前", type: "string", required: true },
      { name: "age", description: "年齢", type: "number" },
      { name: "location", description: "居住地", type: "string" },
      { name: "occupation", description: "職業", type: "string" },
    ],
    language: "ja", // オプション
  }),
});

// レスポンス
{
  "data": {
    "name": "田中太郎",
    "age": 35,
    "location": "東京都",
    "occupation": "エンジニア"
  },
  "provider": "local",
  "model": "llama.cpp/gemma-3n"
}
```

### AIServiceの直接利用

API経由ではなく、サーバーサイドから直接AIServiceを利用することもできます。

```typescript
import { AIService } from "@/lib/core-modules/ai";

// 汎用テキスト生成
const result = await AIService.generate({
  input: "入力テキスト",
  systemPrompt: "AIへの指示",
  temperature: 0.5,
});

// 要約
const summary = await AIService.summarize({
  text: "長いテキスト",
  length: "short",
  language: "ja",
});

// データ抽出
const extracted = await AIService.extract({
  text: "非構造化テキスト",
  schema: [
    { name: "field1", description: "説明", type: "string" },
  ],
});
```

## MCPサーバー

外部の生成AIからBoxFrameの機能を利用可能にするMCPサーバーを提供しています。

### OpenLDAP MCPサーバー

`mcp-servers/openldap/` に配置。読み取り専用でLDAPユーザー情報にアクセスできます。

**提供ツール:**
| ツール名 | 説明 |
|----------|------|
| `ldap_check_status` | サーバー接続状態を確認 |
| `ldap_list_users` | ユーザー一覧を取得 |
| `ldap_get_user` | ユーザー詳細を取得 |
| `ldap_search_users` | ユーザーを検索 |
| `ldap_user_exists` | ユーザー存在確認 |

**セットアップ:**
```bash
cd mcp-servers/openldap
npm install
npm run build
```

**Claude Code設定 (.mcp.json):**
```json
{
  "mcpServers": {
    "openldap": {
      "command": "node",
      "args": ["mcp-servers/openldap/dist/index.js"],
      "env": {
        "OPENLDAP_URL": "ldap://localhost:390",
        "OPENLDAP_ADMIN_DN": "cn=admin,dc=boxframe,dc=local",
        "OPENLDAP_ADMIN_PASSWORD": "admin",
        "OPENLDAP_BASE_DN": "dc=boxframe,dc=local",
        "OPENLDAP_USERS_OU": "ou=users,dc=boxframe,dc=local"
      }
    }
  }
}
```

詳細は `mcp-servers/openldap/README.md` を参照。

## 派生プロジェクト向け運用方針

BoxFrameをクローンして業務アプリを開発する際のルールです。

### ディレクトリ構成

```
project/
├── lib/
│   ├── core-modules/       # フレーム提供（編集禁止）
│   │   ├── organization/
│   │   ├── system/
│   │   └── ai/
│   └── addon-modules/      # 業務モジュール（追加のみ）
│       └── workflow/       # 例: ワークフローモジュール
│       └── expense/        # 例: 経費精算モジュール
├── app/
│   └── (menus)/
│       ├── (admin)/        # フレーム提供
│       ├── (user)/         # フレーム提供
│       └── (business)/     # 業務画面（追加のみ）
└── components/
    ├── ui/                 # フレーム提供（編集禁止）
    └── business/           # 業務コンポーネント（追加のみ）
```

### 編集禁止ディレクトリ

以下はフレーム提供のため、直接編集しないこと：

| ディレクトリ | 理由 |
|-------------|------|
| `lib/core-modules/` | コアモジュール |
| `lib/modules/registry.tsx` の既存定義 | モジュールレジストリ |
| `components/ui/` | 共通UIコンポーネント |
| `lib/services/` | フレーム基盤サービス |

### 業務モジュールの配置先

| 種別 | 配置先 |
|------|--------|
| モジュール定義 | `lib/addon-modules/<module-name>/` |
| 画面（ページ） | `app/(menus)/(business)/<path>/` |
| コンポーネント | `components/business/` |
| API | `app/api/<module-name>/` |

### フレーム改修が必要な場合

```
業務開発中にフレーム改修が必要
              ↓
      BoxFrame本体にIssue作成
              ↓
       ┌──────┴──────┐
       ↓             ↓
    急ぎでない      急ぎ
       ↓             ↓
    本家の対応    一時的にローカル修正
    を待つ        （コメントで明記）
                     ↓
                  本家にPR作成
                     ↓
                  マージ後、
                  ローカル修正を削除
```

### upstreamの設定

```bash
# BoxFrame本体をupstreamとして追加
git remote add upstream https://github.com/Takashi-Matsumura/box-frame.git

# フレーム更新の取り込み
git fetch upstream
git merge upstream/main

# Issue作成（ghコマンド）
gh issue create --repo Takashi-Matsumura/box-frame \
  --title "機能提案: ○○" \
  --body "業務開発中に必要になった機能です..."
```

### 一時的なローカル修正のルール

やむを得ずフレームを一時修正する場合：

```typescript
// ========================================
// TEMPORARY FIX: BoxFrame Issue #123
// TODO: 本家マージ後に削除
// ========================================
// 修正内容の説明
```

## ビルド情報

- ルート数: 39
- dependencies: 24パッケージ
- devDependencies: 14パッケージ
