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
  ├── ldap/                 # LDAP認証
  ├── i18n/                 # 多言語対応
  ├── importers/            # データインポート
  └── history/              # 履歴管理

components/
  ├── ui/                   # 共通UIコンポーネント
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

## Prismaモデル（22モデル）

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
| MANAGER | 緑 | `bg-green-600` |
| ADMIN | 紫 | `bg-purple-600` |

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

## ビルド情報

- ルート数: 39
- dependencies: 24パッケージ
- devDependencies: 14パッケージ
