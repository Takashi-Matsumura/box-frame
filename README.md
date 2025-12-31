# BoxFrame

バックオフィス業務を支援するモジュラーフレームワーク。Next.js 15 App Routerベースの権限管理とプラグイン形式の機能拡張を提供します。

## 特徴

- **モジュラーアーキテクチャ**: プラグイン形式でメニューと機能を拡張
- **権限ベースのルーティング**: ロールに応じたページアクセス制御
- **OpenLDAP統合**: エンタープライズ向け認証基盤
- **多言語対応**: 日本語・英語切り替え
- **ダークモード**: システム設定に連動したテーマ切り替え

## 技術スタック

| 技術 | バージョン |
|-----|-----------|
| Next.js | 15 (App Router) |
| React | 19 |
| 認証 | NextAuth.js v5 (Auth.js) |
| ORM | Prisma (PostgreSQL) |
| CSS | Tailwind CSS 4 |
| 言語 | TypeScript |
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
git clone https://github.com/your-username/box-frame.git
cd box-frame

# 依存関係のインストール
npm install

# Dockerコンテナを起動（PostgreSQL + OpenLDAP）
docker compose up -d

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

### ディレクトリ構造

```
box-frame/
├── app/
│   ├── (menus)/              # メニューページ（ルートグループ）
│   │   ├── (user)/           # 全ユーザ向け
│   │   ├── (manager)/        # 管理職向け
│   │   └── (admin)/          # システム管理者向け
│   ├── admin/                # 管理画面
│   ├── login/                # ログインページ
│   └── api/                  # APIルート
├── components/
│   ├── ui/                   # shadcn/ui コンポーネント
│   └── sidebar/              # サイドバーコンポーネント
├── lib/
│   ├── modules/              # モジュールレジストリ
│   ├── core-modules/         # コアモジュール
│   ├── addon-modules/        # アドオンモジュール
│   └── ldap/                 # LDAP認証
├── prisma/
│   └── schema.prisma         # データベーススキーマ
└── docker/
    └── openldap/             # OpenLDAP初期設定
```

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

テンプレートモジュールをコピーして独自のモジュールを作成できます。

#### 1. モジュール定義をコピー

```bash
cp -r lib/addon-modules/template lib/addon-modules/mymodule
```

#### 2. モジュールIDと名前を変更

`lib/addon-modules/mymodule/module.tsx` を編集:

```typescript
export const myModule: AppModule = {
  id: "mymodule",           // 変更
  name: "My Module",        // 変更
  nameJa: "マイモジュール",  // 変更
  // ...
};
```

#### 3. ページをコピー

```bash
cp -r app/(menus)/(user)/template app/(menus)/(user)/mypage
```

#### 4. モジュールを登録

`lib/modules/registry.tsx` を編集:

```typescript
import { myModule } from "@/lib/addon-modules/mymodule";

export const moduleRegistry: ModuleRegistry = {
  system: systemModule,
  openldap: openldapModule,
  mymodule: myModule,  // 追加
};
```

#### 5. 開発サーバを再起動

```bash
npm run dev
```

詳細は [docs/MODULE_GUIDE.md](docs/MODULE_GUIDE.md) を参照してください。

### ロール

| ロール | 説明 |
|-------|-----|
| USER | 一般ユーザ |
| MANAGER | 管理職 |
| ADMIN | システム管理者 |

## Docker環境

```yaml
# docker-compose.yml
services:
  postgres:    # PostgreSQL (port: 5433)
  openldap:    # OpenLDAP (port: 390)
```

### コンテナ操作

```bash
# 起動
docker compose up -d

# 停止
docker compose down

# ログ確認
docker compose logs -f
```

## 開発コマンド

```bash
npm run dev          # 開発サーバ起動
npm run build        # 本番ビルド
npm run start        # 本番サーバ起動
npm run lint         # Biomeチェック
npm run format       # コードフォーマット
npm run test         # テスト実行
npx prisma studio    # Prisma Studio起動
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

// カスタム通知
await NotificationService.create({
  userId: "user-id",
  type: "ACTION",
  priority: "NORMAL",
  title: "Approval required",
  titleJa: "承認が必要です",
  message: "Please review the pending request.",
  messageJa: "保留中のリクエストを確認してください。",
  actionUrl: "/approvals/123",
  actionLabel: "Review",
  actionLabelJa: "確認する",
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
