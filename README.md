# BoX2

組織管理・人事評価を支援するモジュラーフレームワーク。Next.js 15 App Routerベースの権限管理とプラグイン形式の機能拡張を提供します。

## 特徴

- **モジュラーアーキテクチャ**: コアモジュールとアドオンモジュールによる機能拡張
- **権限ベースのルーティング**: ロールに応じたページアクセス制御
- **OpenLDAP統合**: エンタープライズ向け認証基盤
- **多言語対応**: 日本語・英語切り替え
- **ダークモード**: システム設定に連動したテーマ切り替え
- **AI機能**: AIチャット、RAGバックエンド連携、評価AIサポート
- **人事評価**: 3軸評価（結果・プロセス・成長）、目標設定、自己評価
- **バックオフィス**: 業務分析、AIヒアリング、チケット販売管理

## 技術スタック

| 技術 | バージョン |
|-----|-----------|
| Next.js | 15 (App Router) |
| React | 19 |
| 認証 | NextAuth.js v5 (Auth.js) |
| ORM | Prisma 6 (PostgreSQL) |
| CSS | Tailwind CSS 4 |
| 言語 | TypeScript 5 |
| 状態管理 | Zustand |
| UI | shadcn/ui |
| Linter | Biome |

## クイックスタート

### 必要条件

- Node.js 20+
- Docker / Docker Compose

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/your-username/ted-box2.git
cd ted-box2

# 依存関係のインストール
npm install

# Dockerコンテナを起動（PostgreSQL + OpenLDAP）
docker compose -f docker-compose.dev.yml up -d

# 環境変数を設定
cp .env.example .env
# AUTH_SECRETを生成: npx auth secret

# データベースを初期化
npx prisma db push
npm run db:seed

# 開発サーバを起動
npm run dev
```

### 初期ログイン

| 項目 | 値 |
|-----|-----|
| URL | http://localhost:3000 |
| ユーザ名 | admin |
| パスワード | admin |

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
│    (system, ai, organization, evaluation,   │
│     backoffice, openldap, ldap-migration)   │
└─────────────────────────────────────────────┘
```

### ディレクトリ構造

```
ted-box2/
├── app/
│   ├── (menus)/                # メニューページ（ルートグループ）
│   │   ├── (user)/             # 全ユーザ向け
│   │   │   ├── ai-chat/        #   AIチャット
│   │   │   ├── dashboard/      #   ダッシュボード
│   │   │   ├── my-evaluation/  #   わたしの評価
│   │   │   └── organization-chart/ # 組織図
│   │   ├── (manager)/          # 管理職向け
│   │   │   └── manager/
│   │   │       ├── evaluations/        # 人事評価
│   │   │       └── evaluator-settings/ # 評価者設定
│   │   ├── (admin)/            # システム管理者向け
│   │   │   └── admin/          #   管理画面（タブ形式）
│   │   └── (backoffice)/       # バックオフィス（アクセスキー必須）
│   │       └── backoffice/
│   │           ├── analytics/      # 業務分析
│   │           ├── ai-analytics/   # AI業務分析
│   │           └── ticket-sales/   # チケット販売
│   ├── login/                  # ログインページ
│   └── api/                    # APIルート
├── components/
│   ├── ui/                     # shadcn/ui コンポーネント
│   ├── sidebar/                # サイドバー
│   ├── notifications/          # 通知システム
│   ├── modals/                 # モーダル
│   └── business/               # 業務コンポーネント
├── lib/
│   ├── modules/                # モジュールレジストリ
│   ├── core-modules/           # コアモジュール (system, ai)
│   ├── addon-modules/          # アドオンモジュール
│   │   ├── evaluation/         #   人事評価
│   │   ├── organization/       #   組織管理
│   │   ├── backoffice/         #   バックオフィス
│   │   ├── openldap/           #   OpenLDAP
│   │   └── ldap-migration/     #   LDAP移行
│   ├── services/               # フレーム基盤サービス
│   ├── i18n/                   # 多言語対応
│   ├── auth/                   # 認証ユーティリティ
│   ├── history/                # 履歴管理
│   ├── importers/              # データインポート
│   ├── stores/                 # Zustandストア
│   └── ldap/                   # LDAP認証
├── prisma/
│   └── schema.prisma           # データベーススキーマ
├── docker/
│   └── openldap/               # OpenLDAP初期設定
├── docs/                       # ドキュメント
└── __tests__/                  # テスト
```

### モジュール一覧

| モジュール | 種別 | 説明 |
|-----------|------|------|
| system | コア | システム設定・ユーザ管理 |
| ai | コア | AIプロバイダー・チャット・RAG連携 |
| organization | アドオン | 組織管理・社員情報・組織図 |
| evaluation | アドオン | 人事評価（3軸評価・目標設定・自己評価） |
| backoffice | アドオン | 業務分析・AI分析・チケット販売 |
| openldap | アドオン | OpenLDAP認証統合 |
| ldap-migration | アドオン | LDAP移行ユーティリティ |

### モジュールシステム

プラグイン形式でメニューと機能を拡張できます。

```typescript
// lib/addon-modules/example/module.tsx
export const exampleModule: AppModule = {
  id: "example",
  name: "Example",
  nameJa: "サンプル",
  enabled: true,
  menus: [
    {
      id: "example-page",
      name: "Example Page",
      nameJa: "サンプルページ",
      path: "/example",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "ADMIN"],
    },
  ],
};
```

### カスタムモジュールの作成

#### 1. モジュール定義を作成

```bash
mkdir lib/addon-modules/mymodule
```

#### 2. モジュールIDと名前を設定

`lib/addon-modules/mymodule/module.tsx` を作成:

```typescript
export const myModule: AppModule = {
  id: "mymodule",
  name: "My Module",
  nameJa: "マイモジュール",
  // ...
};
```

#### 3. ページを作成

```bash
mkdir -p app/(menus)/(user)/mypage
```

#### 4. モジュールを登録

`lib/modules/registry.tsx` を編集:

```typescript
import { myModule } from "@/lib/addon-modules/mymodule";

export const moduleRegistry: ModuleRegistry = {
  // ...既存モジュール
  mymodule: myModule,  // 追加
};
```

#### 5. 開発サーバを再起動

```bash
npm run dev
```

詳細は [docs/MODULE_GUIDE.md](docs/MODULE_GUIDE.md) を参照してください。

### ロール

| ロール | 説明 | メニューグループ |
|-------|------|----------------|
| USER | 一般ユーザ | user |
| MANAGER | 管理職 | user, manager |
| EXECUTIVE | 経営層 | user, manager |
| ADMIN | システム管理者 | user, manager, admin |

## Docker環境

```yaml
# docker-compose.yml (本番用)
services:
  nextjs:        # Next.js (port: 8888 → 3000)
  postgres:      # PostgreSQL
  openldap:      # OpenLDAP (port: 3890 → 389)
  airag-backend: # AI RAG Backend

# docker-compose.dev.yml (開発用)
services:
  postgres:    # PostgreSQL (port: 5433)
  openldap:    # OpenLDAP (port: 390)
```

### コンテナ操作

```bash
# 本番: 起動
docker compose up -d

# 本番: 停止
docker compose down

# 開発: 起動
docker compose -f docker-compose.dev.yml up -d

# 開発: 停止
docker compose -f docker-compose.dev.yml down

# ログ確認
docker compose logs -f
```

## 開発コマンド

```bash
npm run dev              # 開発サーバ起動
npm run build            # 本番ビルド
npm run start            # 本番サーバ起動
npm run lint             # Biomeチェック
npm run format           # コードフォーマット
npm run db:seed          # データベース初期投入
npm run test             # テスト実行
npm run test:watch       # テスト（ウォッチモード）
npm run test:coverage    # テスト（カバレッジ付き）
npx prisma studio        # Prisma Studio起動
npx prisma generate      # Prismaクライアント生成
npx prisma db push       # スキーマをDBに反映
```

## 認証

### 対応プロバイダ

- Google OAuth（管理者が有効/無効を切り替え可能）
- GitHub OAuth（管理者が有効/無効を切り替え可能）
- OpenLDAP
- 二要素認証 (TOTP)

### OAuth設定

管理画面（`/admin`）のシステム設定タブでOAuthプロバイダを有効/無効に切り替えできます。

環境変数に以下を設定してください:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### 二要素認証 (2FA)

ユーザは設定画面から二要素認証を有効化できます。

1. 設定画面 (`/settings`) で「二要素認証を有効にする」をクリック
2. 認証アプリ（Google Authenticator等）でQRコードをスキャン
3. 6桁のコードを入力して有効化
4. 次回ログイン時から認証コードの入力が必要

### Edge Runtime対応

Next.js middlewareはEdge Runtimeで動作するため、認証設定を分離:

- `auth.config.ts` - Edge Runtime用（middleware）
- `auth.ts` - Node.js Runtime用（LDAP認証を含む）

## 通知機能

### 概要

アプリケーション内での重要なイベントをユーザに通知するシステムです。

- **通知センター**: ヘッダーのベルアイコンから通知一覧を確認
- **トースト通知**: 新着通知をリアルタイムで表示
- **DB永続化**: 通知履歴をPostgreSQLに保存

### 通知タイプ

| タイプ | 説明 | 例 |
|-------|------|-----|
| SYSTEM | システム通知 | モジュール設定変更、LDAP設定変更 |
| SECURITY | セキュリティ通知 | ログイン検出、2FA変更、パスワード変更 |
| ACTION | アクション要求 | 承認依頼 |
| INFO | 一般情報 | お知らせ |
| WARNING | 警告 | 期限切れ警告 |
| ERROR | エラー | 処理失敗 |

### 優先度

| 優先度 | 説明 |
|-------|------|
| URGENT | 緊急（即時対応必要） |
| HIGH | 高（重要なセキュリティイベント） |
| NORMAL | 通常 |
| LOW | 低（情報通知） |

### 開発者向け: 通知の発行方法

通知は自動生成されません。開発者が明示的に `NotificationService` を呼び出す必要があります。

```typescript
import { NotificationService } from "@/lib/services/notification-service";

// 特定ユーザへのセキュリティ通知
await NotificationService.securityNotify(userId, {
  title: "New login detected",
  titleJa: "新しいログインを検出しました",
  message: "You have logged in from a new device.",
  messageJa: "新しいデバイスからログインしました。",
});

// 特定ロールへのブロードキャスト通知
await NotificationService.broadcast({
  role: "ADMIN",
  type: "SYSTEM",
  priority: "HIGH",
  title: "Configuration updated",
  titleJa: "設定が更新されました",
  message: "LDAP configuration has been changed.",
  messageJa: "LDAP設定が変更されました。",
  source: "LDAP",
});
```

### 現在の通知トリガー

以下のイベントで自動的に通知が発行されます:

**セキュリティイベント（対象ユーザへ通知）**
- ログイン成功（OpenLDAP / Google OAuth）
- 二要素認証の有効化/無効化
- パスワード変更
- ロール変更
- アクセスキーの作成/変更/削除

**システムイベント（全管理者へ通知）**
- ユーザアカウント削除
- OpenLDAP設定変更
- LDAP移行設定変更
- モジュールの有効化/無効化

### APIエンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /api/notifications | 通知一覧取得 |
| POST | /api/notifications | 通知作成（管理者用） |
| PATCH | /api/notifications/[id] | 既読更新 |
| DELETE | /api/notifications/[id] | 通知削除 |
| POST | /api/notifications/read-all | 一括既読 |
| GET | /api/notifications/unread-count | 未読数取得 |

## ライセンス

MIT License

## 作者

MatsBACCANO
