# App Directory Structure

このディレクトリは **Next.js Route Groups** を使用して、基盤フレームとメニューモジュールを明確に分離しています。

## 📁 ディレクトリ構成

```
app/
├── (system)/              # 🔧 基盤フレーム（システム・認証）
│   ├── api/              # API Routes
│   ├── login/            # 認証・ログイン
│   ├── settings/         # 設定ページ
│   ├── profile/          # プロフィールページ
│   ├── access-keys/      # アクセスキー管理
│   └── dashboard/        # ダッシュボード
│
├── (modules)/            # 📦 メニューモジュール（ビジネスロジック）
│   ├── admin/            # 管理者メニュー
│   ├── manager/          # マネージャーメニュー
│   ├── backoffice/       # バックオフィスメニュー
│   ├── organization/     # 組織管理・データインポート
│   ├── analytics/        # 分析
│   ├── reports/          # レポート
│   └── advanced-settings/ # 詳細設定
│
├── layout.tsx            # ルートレイアウト
├── page.tsx              # ホームページ
├── globals.css           # グローバルCSS
└── translations.ts       # ホームページ翻訳
```

## 🎯 Route Groups とは？

**Route Groups** は、Next.js 13以降の機能で、ディレクトリ構造を整理しながら **URLに影響を与えない** 方法です。

### 特徴

- ✅ **URLは変わらない**: `(system)` や `(modules)` はURLに含まれません
  - `app/(system)/api/` → URL: `/api/...`
  - `app/(modules)/admin/` → URL: `/admin/...`
- ✅ **視覚的に区別しやすい**: 括弧で囲まれたディレクトリ名で明確
- ✅ **Next.js公式機能**: フレームワークの標準機能

### 例

```
app/(system)/login/page.tsx  → URL: /login
app/(modules)/admin/page.tsx → URL: /admin
```

## 🔧 基盤フレーム `(system)/`

アプリケーションの基盤となる機能：

| ディレクトリ | 説明 | アクセス権限 |
|------------|------|------------|
| `api/` | API Routes（バックエンドロジック） | - |
| `login/` | 認証・ログイン画面 | Guest |
| `settings/` | ユーザー設定 | User以上 |
| `profile/` | プロフィール管理 | User以上 |
| `access-keys/` | アクセスキー管理 | Admin |
| `dashboard/` | ダッシュボード | User以上 |

## 📦 メニューモジュール `(modules)/`

ビジネスロジックを含む機能モジュール：

| ディレクトリ | 説明 | アクセス権限 |
|------------|------|------------|
| `admin/` | 管理者向け機能（ユーザー管理、履歴管理） | Admin |
| `manager/` | マネージャー向け機能（組織図、BI、人事評価） | Manager以上 |
| `backoffice/` | バックオフィス業務（出張申請、経費精算） | User以上（一部Manager以上） |
| `organization/` | 組織データのインポート・管理 | Admin |
| `analytics/` | 分析・レポート | Manager以上 |
| `reports/` | レポート機能 | Manager以上 |
| `advanced-settings/` | 詳細設定 | Admin |

## 🚀 新しいモジュールを追加する場合

### 1. メニューモジュールとして追加

```bash
mkdir -p "app/(modules)/新しいモジュール"
```

### 2. 基盤機能として追加（システム・認証関連）

```bash
mkdir -p "app/(system)/新しい機能"
```

### 3. メニューレジストリへの登録

新しいモジュールを追加したら、`lib/modules/registry.tsx` に登録してください：

```typescript
{
  id: "新しいモジュール",
  name: "New Module",
  nameJa: "新しいモジュール",
  path: "/新しいモジュール",  // Route Groupsは含まない
  icon: ModuleIcon,
  requiredRoles: ["MANAGER", "ADMIN"],
  groupId: "manager",
}
```

## 📝 注意事項

### インポートパスについて

Route Groupsを使用してもインポートパスは変わりません：

```typescript
// ❌ 間違い
import { Component } from '@/app/(modules)/admin/component';

// ✅ 正しい
import { Component } from '@/app/admin/component';
```

Next.jsは自動的にRoute Groupsを解決するため、通常どおりインポートできます。

### middlewareについて

`middleware.ts` でパスをマッチングする場合、Route Groupsは含まれません：

```typescript
// ✅ 正しい
export const config = {
  matcher: ['/admin/:path*', '/manager/:path*']  // (modules) は含まない
};
```

## 🔄 移行履歴

- **2025-10-12**: Route Groupsを使用したディレクトリ構造のリファクタリング
  - `(system)/` グループの作成
  - `(modules)/` グループの作成
  - URLに影響なく、視覚的な整理を実現

## 参考リンク

- [Next.js Route Groups Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- プロジェクトルートの `README.md` - プロジェクト全体の説明
- `CLAUDE.md` - 開発ガイドライン
