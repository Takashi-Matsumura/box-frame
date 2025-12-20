# アーキテクチャ Skill

## 概要

モジュール・メニュー構造、コア/アドオンの違い、依存関係の原則、新規メニュー追加手順。

## 3層構造

```
フレーム（Frame）    → UIシェル、認証、モジュール統合
    ↓
モジュール（Module） → 業務機能の単位（コア/アドオン）
    ↓
メニュー（Menu）     → ユーザーに見える画面単位
```

## ディレクトリ構造

```
lib/
├── modules/           # モジュール管理（registry.tsx）
├── core-modules/      # コアモジュール（常に有効）
│   ├── system/
│   └── organization/
├── addon-modules/     # アドオンモジュール（着脱可能）
│   ├── hr-evaluation/
│   ├── schedule/
│   └── ...
└── frameworks/        # 共有ライブラリ（モジュールではない）
    └── resource-management/
```

## モジュールの種類

| 種類 | 配置場所 | 特徴 |
|------|---------|------|
| **コア** | `lib/core-modules/` | 常に有効、取り外し不可 |
| **アドオン** | `lib/addon-modules/` | 環境変数で有効/無効切替 |
| **フレームワーク** | `lib/frameworks/` | 共有コード、モジュール登録されない |

## 依存関係の原則（重要）

### 依存関係マトリクス

| 依存元 → 依存先 | コア | アドオン | フレームワーク |
|----------------|------|---------|--------------|
| **コア** | ⚠️ 避ける | ❌ 禁止 | ✅ OK |
| **アドオン** | ✅ OK | ❌ 避ける | ✅ OK |
| **フレームワーク** | ❌ 禁止 | ❌ 禁止 | ⚠️ 慎重に |

### 原則

1. **アドオン間の依存は避ける** - 「着脱可能」の本質が失われる
2. **共有機能はフレームワークへ抽出** - 複数モジュールで使うコードは `lib/frameworks/`
3. **データ共有はコア経由** - アドオン→アドオンではなく、コア（organization）経由

### 解決パターン

| 場面 | ❌ 悪い | ✅ 良い |
|------|--------|--------|
| 同じUIを使いたい | モジュール間依存 | `lib/frameworks/` に共有コンポーネント |
| 同じロジックを使いたい | モジュール間依存 | `lib/frameworks/` に共有Hooks |
| 他モジュールのデータを使いたい | アドオン→アドオン | コア（organization）経由 |

## 新規メニュー追加手順

### 1. モジュール定義を編集

```typescript
// lib/addon-modules/{module}/module.tsx
export const myModule: AppModule = {
  id: "myModule",
  dependencies: ["organization"],  // ← 依存を明示
  menus: [
    {
      id: "newMenu",
      moduleId: "myModule",
      name: "New Menu",
      nameJa: "新しいメニュー",
      path: "/manager/new-menu",  // ← pathとmenuGroupの一致が重要
      menuGroup: "manager",
      requiredRoles: ["MANAGER", "ADMIN"],
      enabled: true,
      order: 3,
    },
  ],
};
```

### 2. ページを作成

```typescript
// app/(menus)/(manager)/new-menu/page.tsx
export default function NewMenuPage() {
  return <div>新しいメニューのページ</div>;
}
```

### 3. 翻訳を追加（必要に応じて）

```typescript
// lib/i18n/page-titles.ts
"/manager/new-menu": "New Menu",  // 英語
"/manager/new-menu": "新しいメニュー",  // 日本語
```

## メニューグループ

| グループID | 表示名 | 対象ロール | URL接頭辞 |
|----------|--------|---------|----------|
| `user` | ユーザー | 全員 | `/user/` or `/` |
| `manager` | マネージャー | MANAGER, ADMIN | `/manager/` or `/` |
| `backoffice` | バックオフィス | 要アクセスキー | `/backoffice/` |
| `permission` | 追加機能 | 要アクセスキー | 任意 |
| `admin` | 管理者 | ADMIN | `/admin/` |

## 重要なルール

### menuGroupとURLパスの一致

```typescript
// ✅ 正しい
path: "/manager/hr-evaluation"
menuGroup: "manager"

// ❌ 間違い
path: "/admin/dashboard"
menuGroup: "user"
```

### 共通コンポーネントの使用

```typescript
// ✅ 正しい
import { Button } from "@/components/ui";
<Button variant="primary">保存</Button>

// ❌ 間違い
<button className="px-4 py-2 bg-blue-600...">保存</button>
```

## 関連ドキュメント

- [ARCHITECTURE_DESIGN.md](../../docs/ARCHITECTURE_DESIGN.md) - 詳細な設計思想
- [architecture-diagram.md](../../docs/architecture-diagram.md) - 図式化
- [MODULE_MIGRATION_GUIDE.md](../../docs/MODULE_MIGRATION_GUIDE.md) - 移行ガイド
