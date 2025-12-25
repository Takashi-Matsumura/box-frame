---
name: プロジェクトアーキテクチャ
description: モジュール・メニュー構造、コア/アドオン分離、新規メニュー追加手順。メニュー追加、モジュール作成、アーキテクチャ設計時に使用。
---

# プロジェクトアーキテクチャ

## 2層構造: モジュール定義とメニュー配置

```
lib/modules/              ← ビジネスモジュール定義層
  ├── registry.tsx        ← 全モジュール登録 + menuGroups定義
  ├── access-control.ts   ← アクセス制御ロジック
  └── {module}/module.tsx ← 各モジュール定義

app/(menus)/              ← メニューページ実装層
  ├── user/               ← menuGroup: user（全社員向け）
  ├── manager/            ← menuGroup: manager（管理職向け）
  ├── admin/              ← menuGroup: admin（システム管理者）
  ├── backoffice/         ← menuGroup: backoffice（バックオフィス業務）
  └── permission/         ← menuGroup: permission（権限ベース追加機能）
```

## 新しいメニュー追加手順

### Step 1: モジュール定義にメニューを追加

```typescript
// lib/modules/hr-evaluation/module.tsx
export const hrEvaluationModule: AppModule = {
  id: "hrEvaluation",
  name: "HR Evaluation",
  nameJa: "人事評価",
  icon: <StarIcon />,
  menus: [
    {
      id: "performanceReview",
      moduleId: "hrEvaluation",
      name: "Performance Review",
      nameJa: "パフォーマンスレビュー",
      path: "/manager/performance-review",
      menuGroup: "manager",  // ← menuGroupを指定
      requiredRoles: ["MANAGER", "ADMIN"],
      enabled: true,
      order: 3,
    },
  ],
};
```

### Step 2: ページコンポーネントを作成

```bash
mkdir -p app/(menus)/manager/performance-review
```

```typescript
// app/(menus)/manager/performance-review/page.tsx
export default async function PerformanceReviewPage() {
  // ページの実装
}
```

## menuGroup一覧

| menuGroup ID | 表示名 | 用途 |
|-------------|--------|------|
| `user` | ユーザー | 全社員向け機能 |
| `manager` | マネージャー | 管理職向け機能 |
| `backoffice` | バックオフィス | バックオフィス業務 |
| `permission` | 追加機能 | 権限ベースの追加機能 |
| `admin` | 管理者 | システム管理者向け機能 |

## サービス定義（画面なしAPI）

モジュールには**メニュー**（画面あり）と**サービス**（画面なし）の2種類があります。

### サービスとは

- 画面（UI）を持たないAPI・ビジネスロジック
- 他のモジュールや機能から呼び出される
- サイドバーには表示されない
- 例: 承認経路取得、ワークフロー管理、通知送信

### サービス定義例

```typescript
// lib/core-modules/organization/module.tsx
export const organizationModule: AppModule = {
  id: "organization",
  name: "Organization",
  nameJa: "組織管理",
  enabled: true,
  order: 2,
  menus: [
    // ... 画面ありのメニュー
  ],
  services: [
    {
      id: "approvalRoute",
      moduleId: "organization",
      name: "Approval Route",
      nameJa: "承認経路取得",
      description: "Get approval chain based on organization hierarchy",
      descriptionJa: "組織階層に基づく承認経路を取得します",
      apiEndpoints: ["/api/organization/approval-route"],
      enabled: true,
    },
    {
      id: "workflowService",
      moduleId: "organization",
      name: "Workflow Service",
      nameJa: "ワークフロー管理",
      description: "Create and manage approval requests",
      descriptionJa: "承認リクエストの作成・管理を行います",
      apiEndpoints: [
        "/api/workflow/requests",
        "/api/workflow/requests/[id]",
        "/api/workflow/requests/[id]/approve",
        "/api/workflow/requests/[id]/reject",
      ],
      enabled: true,
    },
  ],
};
```

### サービス追加手順

1. **モジュール定義にサービスを追加**
   - `services` 配列に `AppService` オブジェクトを追加

2. **APIエンドポイントを実装**
   - `app/api/{service-path}/route.ts` を作成

3. **サービスロジックを実装**
   - `lib/services/{service-name}.ts` にビジネスロジックを実装

### メニュー vs サービス 使い分け

| ケース | 選択 |
|--------|------|
| ユーザーが直接アクセスする画面 | メニュー |
| 他機能から呼び出されるAPI | サービス |
| サイドバーに表示したい | メニュー |
| バックグラウンド処理 | サービス |

## コンテナ依存関係

モジュールがDockerコンテナに依存する場合、`containers`プロパティで定義します。

### コンテナ依存定義例

```typescript
// lib/addon-modules/openldap/module.tsx
export const openldapModule: AppModule = {
  id: "openldap",
  name: "OpenLDAP",
  nameJa: "OpenLDAP",
  enabled: true,
  menus: [...],
  containers: [
    {
      id: "openldap",
      name: "OpenLDAP Server",
      nameJa: "OpenLDAPサーバ",
      healthCheckUrl: "/api/admin/openldap/status",
      required: true,
      description: "LDAP authentication server container",
      descriptionJa: "LDAP認証サーバコンテナ",
    },
  ],
};
```

### ContainerDependency型

```typescript
interface ContainerDependency {
  id: string;           // コンテナID
  name: string;         // 表示名（英語）
  nameJa: string;       // 表示名（日本語）
  healthCheckUrl: string; // ヘルスチェックAPI
  required: boolean;    // 必須かどうか
  description?: string;
  descriptionJa?: string;
}
```

### ヘルスチェックAPI要件

`healthCheckUrl`で指定するAPIは以下のレスポンス形式を返す必要があります:

```typescript
// 成功時
{ "isAvailable": true, ... }

// 失敗時
{ "isAvailable": false, ... }
```

### UI表示

モジュール管理画面のカードに以下が表示されます:
- **稼働中**: 緑色インジケーター
- **停止中**: 黄色インジケーター + ⚠️（必須コンテナの場合）

## コア/アドオンモジュール分離

```
lib/
├── core-modules/        # コアモジュール（常に有効）
│   ├── organization/    # 組織管理
│   ├── system/          # システム設定
│   └── schedule/        # スケジュール管理
└── addon-modules/       # アドオンモジュール（選択的に有効化）
    ├── hr-evaluation/   # 人事評価
    ├── backoffice/      # バックオフィス
    └── business-intelligence/  # BI
```

### モジュール有効化/無効化

```env
# .env
NEXT_PUBLIC_ENABLE_HR_EVALUATION=true
NEXT_PUBLIC_ENABLE_BACKOFFICE=false
NEXT_PUBLIC_ENABLE_BI=false
```

## フレームヘッダー設定

### ページタイトルの表示

フレームヘッダーには**メニュー名（ページタイトル）**を表示する。説明文は表示しない。

```typescript
// lib/i18n/page-titles.ts にページタイトルを追加
export const pageTitles = {
  en: {
    "/backoffice/ticket-sales": "Internal Ticket Sales",
    // ...
  },
  ja: {
    "/backoffice/ticket-sales": "社内チケット販売",
    // ...
  },
};

// ページ説明（情報モーダル用）も同様に追加
export const pageDescriptions = {
  en: {
    "/backoffice/ticket-sales": "Manage internal ticket sales, customers, and products",
  },
  ja: {
    "/backoffice/ticket-sales": "社内チケット販売、顧客、商品を管理します",
  },
};
```

### サブタブをフレームヘッダーに追加

メニュー内のタブ切り替えは**フレームヘッダー内**にサブタブとして表示する。コンテンツ領域にタブを置かない。

```typescript
// components/Header.tsx に追加

// 1. ページ判定を追加
const isTicketSales = pathname === "/backoffice/ticket-sales";

// 2. タブ定義を追加（URLパラメータで制御）
const ticketSalesTab = searchParams.get("tab") || "customers";
const ticketSalesTabs = [
  {
    name: language === "ja" ? "顧客管理" : "Customers",
    icon: <FaUsers className="w-5 h-5" />,
    path: "/backoffice/ticket-sales?tab=customers",
    active: ticketSalesTab === "customers",
  },
  {
    name: language === "ja" ? "商品管理" : "Products",
    icon: <FaStickyNote className="w-5 h-5" />,
    path: "/backoffice/ticket-sales?tab=products",
    active: ticketSalesTab === "products",
  },
  {
    name: language === "ja" ? "販売記録" : "Sales",
    icon: <FaChartLine className="w-5 h-5" />,
    path: "/backoffice/ticket-sales?tab=sales",
    active: ticketSalesTab === "sales",
  },
];

// 3. JSXにタブナビゲーションを追加
{isTicketSales && (
  <div className="border-t border-gray-700 bg-gray-600">
    <nav className="flex gap-1 px-6" aria-label="Ticket Sales Tabs">
      {ticketSalesTabs.map((tab) => (
        <Link
          key={tab.path}
          href={tab.path}
          className={`
            flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors
            ${tab.active
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-white hover:text-gray-200 hover:border-gray-600"
            }
          `}
        >
          {tab.icon}
          {tab.name}
        </Link>
      ))}
    </nav>
  </div>
)}
```

### クライアントコンポーネントでのタブ切り替え

```typescript
// タブはURLパラメータで制御
"use client";

import { useSearchParams } from "next/navigation";

export default function PageClient({ language }: { language: "en" | "ja" }) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "default";

  return (
    <div className="pt-12">  {/* ヘッダータブ分の余白 */}
      {activeTab === "tab1" && <Tab1Component language={language} />}
      {activeTab === "tab2" && <Tab2Component language={language} />}
    </div>
  );
}
```

**重要**: ヘッダーにサブタブがある場合、コンテンツに `pt-12` の余白が必要。

### ❌ 避けるパターン

```tsx
// コンテンツ領域に説明文を表示しない
<div>
  <p className="text-gray-600">{t.description}</p>  // ← 不要
</div>

// コンテンツ領域にタブナビゲーションを置かない
<div className="border-b border-gray-200">
  <nav className="-mb-px flex space-x-8">  // ← フレームヘッダーに移動
    {tabs.map((tab) => ...)}
  </nav>
</div>
```

## ベストプラクティス

### ✅ 推奨

```typescript
// menuGroupとURLパスの一致
path: "/manager/hr-evaluation"
menuGroup: "manager"
```

### ❌ 避ける

```typescript
// URLとmenuGroupの不一致
path: "/admin/dashboard"
menuGroup: "user"  // NG
```
