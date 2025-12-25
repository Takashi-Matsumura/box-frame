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
  │   └── system/           # システムモジュール
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
```

## コアモジュール構成

### organizationモジュール
- 組織図表示・検索
- 社員詳細モーダル
- PDF出力
- データインポート（CSV/DB）
- 履歴管理

### systemモジュール
- ダッシュボード
- 管理画面（ユーザー管理）
- データ履歴
- システム設定

## Prismaモデル（23モデル）

### 認証系
- Account, Session, User, VerificationToken

### LDAP認証系
- LdapConfig, LdapUserMapping, LdapAuthLog, OpenLdapConfig

### アクセス制御系
- Permission, AccessKey, AccessKeyPermission, UserAccessKey

### 組織系
- Organization, Department, Section, Course, Employee

### 履歴系
- EmployeeHistory, OrganizationHistory, ChangeLog

### システム系
- SystemSetting

### 通知系（フレーム基盤）
- Notification

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
```

## 環境変数

```env
# 認証
AUTH_SECRET=<生成された秘密鍵>
AUTH_URL=http://localhost:3000

# データベース
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
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
| USER | 青 | `bg-blue-600` |
| MANAGER | 緑/シアン | `bg-green-600` / `bg-cyan-100` |
| EXECUTIVE | ローズ | `bg-rose-600` / `bg-rose-100` |
| ADMIN | 紫 | `bg-purple-600` |

### ロール階層

```
GUEST → USER → MANAGER → EXECUTIVE → ADMIN
```

- **GUEST**: 未認証/制限付きアクセス
- **USER**: 一般社員
- **MANAGER**: 管理職（部下を持つ）
- **EXECUTIVE**: 役員（経営層）
- **ADMIN**: システム管理者（全権限）

## 認証アーキテクチャ

### Edge Runtime対応

Next.js 15のmiddlewareはEdge Runtimeで動作するため、認証設定を分離：

1. `/auth.config.ts` - Edge Runtime用（middleware）
   - Google OAuthのみ
   - ldaptsを含まない

2. `/auth.ts` - Node.js Runtime用（APIルート）
   - LDAP/OpenLDAPプロバイダーを追加
   - Dynamic Importでldaptsを遅延ロード

3. `/middleware.ts` - auth.config.tsを使用

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

## ビルド情報

- ルート数: 39
- dependencies: 24パッケージ
- devDependencies: 14パッケージ
