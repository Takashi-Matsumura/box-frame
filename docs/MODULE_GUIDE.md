# カスタムモジュール作成ガイド

BoxFrameでカスタムモジュールを作成する方法を説明します。

## 概要

BoxFrameのモジュールシステムは以下の要素で構成されています：

| 要素 | 説明 |
|------|------|
| モジュール定義 | モジュールのメタ情報とメニュー定義 |
| ページ | 実際のUI実装 |
| アイコン | サイドバーに表示されるアイコン |
| レジストリ | モジュールの登録場所 |

## クイックスタート

テンプレートモジュールをコピーして、独自のモジュールを作成できます。

### 1. モジュール定義をコピー

```bash
cp -r lib/addon-modules/template lib/addon-modules/mymodule
```

### 2. モジュールIDと名前を変更

`lib/addon-modules/mymodule/module.tsx` を編集：

```typescript
export const myModule: AppModule = {
  id: "mymodule",           // ← 変更
  name: "My Module",        // ← 変更
  nameJa: "マイモジュール",  // ← 変更
  // ...
};
```

### 3. ページをコピー

```bash
cp -r app/(menus)/(user)/template app/(menus)/(user)/mypage
```

### 4. モジュールを登録

`lib/modules/registry.tsx` を編集：

```typescript
import { myModule } from "@/lib/addon-modules/mymodule";

export const moduleRegistry: ModuleRegistry = {
  system: systemModule,
  openldap: openldapModule,
  mymodule: myModule,  // ← 追加
};
```

### 5. 開発サーバを再起動

```bash
npm run dev
```

---

## 詳細ガイド

### モジュール定義の構造

```typescript
// lib/addon-modules/mymodule/module.tsx

import { getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const myModule: AppModule = {
  // === 基本情報 ===
  id: "mymodule",                    // 一意のID（英数字）
  name: "My Module",                 // 英語名
  nameJa: "マイモジュール",           // 日本語名
  description: "Module description", // 英語説明
  descriptionJa: "モジュールの説明",  // 日本語説明

  // === 設定 ===
  icon: getModuleIcon("mymodule"),   // アイコン
  enabled: true,                     // 有効/無効
  order: 50,                         // 表示順序
  dependencies: ["system"],          // 依存モジュール

  // === メニュー ===
  menus: [
    {
      id: "myMenu",
      moduleId: "mymodule",
      name: "My Menu",
      nameJa: "マイメニュー",
      path: "/mypage",
      menuGroup: "user",             // "user" | "manager" | "admin"
      requiredRoles: ["USER", "MANAGER", "ADMIN"],
      enabled: true,
      order: 10,
    },
  ],
};
```

### メニューグループ

| グループ | 対象ユーザ | パス例 |
|---------|-----------|--------|
| `user` | 全ユーザ | `/mypage` |
| `manager` | 管理職 | `/manager/mypage` |
| `admin` | システム管理者 | `/admin/mypage` |

### ロールによるアクセス制御

```typescript
menus: [
  {
    // 全ユーザがアクセス可能
    requiredRoles: ["USER", "MANAGER", "ADMIN"],
  },
  {
    // ADMINのみアクセス可能
    requiredRoles: ["ADMIN"],
  },
  {
    // MANAGERとADMINがアクセス可能
    requiredRoles: ["MANAGER", "ADMIN"],
  },
]
```

---

### ページの構造

BoxFrameのページは、サーバコンポーネントとクライアントコンポーネントの2層構造です。

```
app/(menus)/(user)/mypage/
├── page.tsx           # サーバコンポーネント
├── MyPageClient.tsx   # クライアントコンポーネント
└── translations.ts    # 翻訳定義
```

#### サーバコンポーネント (page.tsx)

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { MyPageClient } from "./MyPageClient";
import { translations } from "./translations";

// メタデータ生成
export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  return { title: translations[language].title };
}

// ページコンポーネント
export default async function MyPage() {
  // 1. 認証チェック
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  // 2. 言語設定
  const language = await getLanguage();

  // 3. サーバサイドでデータ取得（必要に応じて）
  // const data = await prisma.myTable.findMany();

  // 4. クライアントコンポーネントをレンダリング
  return (
    <div className="max-w-7xl mx-auto">
      <MyPageClient
        language={language as "en" | "ja"}
        userName={session.user.name || "User"}
      />
    </div>
  );
}
```

#### クライアントコンポーネント (MyPageClient.tsx)

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { translations } from "./translations";

interface MyPageClientProps {
  language: "en" | "ja";
  userName: string;
}

export function MyPageClient({ language, userName }: MyPageClientProps) {
  const t = translations[language];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t.welcome}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{userName}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 翻訳定義 (translations.ts)

```typescript
export const translations = {
  en: {
    title: "My Page",
    welcome: "Welcome",
  },
  ja: {
    title: "マイページ",
    welcome: "ようこそ",
  },
} as const;
```

---

### アイコンの追加

`lib/modules/icons.tsx` にアイコンを追加：

```typescript
export const iconPaths = {
  // 既存のアイコン...

  // 新しいアイコン（Heroicons等のSVGパスを使用）
  mymodule:
    "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
};
```

**アイコンの取得方法**
- [Heroicons](https://heroicons.com/) からSVGをコピー
- `<path d="...">` の `d` 属性の値を使用

---

### データベースの追加

新しいデータベーステーブルが必要な場合：

#### 1. Prismaスキーマを編集

```prisma
// prisma/schema.prisma

model MyTable {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### 2. マイグレーションを実行

```bash
npx prisma migrate dev --name add_my_table
```

#### 3. ページでデータを使用

```typescript
// page.tsx (サーバコンポーネント)
import { prisma } from "@/lib/prisma";

export default async function MyPage() {
  const data = await prisma.myTable.findMany();
  return <MyPageClient data={data} />;
}
```

---

### APIルートの追加

```typescript
// app/api/mymodule/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await prisma.myTable.findMany();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = await prisma.myTable.create({ data: body });
  return NextResponse.json(result);
}
```

---

## ファイル構成まとめ

新しいモジュール「mymodule」を作成する場合：

```
lib/
├── addon-modules/
│   └── mymodule/
│       ├── module.tsx    # モジュール定義
│       └── index.ts      # エクスポート
└── modules/
    ├── registry.tsx      # モジュール登録（編集）
    └── icons.tsx         # アイコン追加（編集）

app/
├── (menus)/
│   └── (user)/
│       └── mypage/               # ユーザ向けページ（/mypage）
│           ├── page.tsx
│           ├── MyPageClient.tsx
│           └── translations.ts
├── manager/
│   └── mypage/                   # マネージャー向けページ（/manager/mypage）
│       ├── page.tsx
│       ├── MyPageManagerClient.tsx
│       └── translations.ts
├── admin/
│   └── mypage/                   # 管理者向けページ（/admin/mypage）
│       ├── page.tsx
│       ├── MyPageAdminClient.tsx
│       └── translations.ts
└── api/
    └── mymodule/
        └── route.ts              # APIルート（必要に応じて）
```

---

## チェックリスト

新しいモジュールを作成する際のチェックリスト：

- [ ] モジュール定義ファイルを作成 (`lib/addon-modules/mymodule/module.tsx`)
- [ ] index.ts でエクスポート
- [ ] レジストリに登録 (`lib/modules/registry.tsx`)
- [ ] アイコンを追加 (`lib/modules/icons.tsx`)
- [ ] ページを作成 (`app/(menus)/...`)
- [ ] 翻訳ファイルを作成
- [ ] 必要に応じてAPIルートを作成
- [ ] 必要に応じてPrismaスキーマを更新
- [ ] 開発サーバで動作確認

---

## 参考リンク

- [テンプレートモジュール](/template) - 実際に動作するテンプレート
- [Next.js App Router](https://nextjs.org/docs/app)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Heroicons](https://heroicons.com/) - アイコン素材
