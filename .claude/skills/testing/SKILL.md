---
name: テスト戦略
description: テスト方針、テスト対象、モック戦略、テストファイル構成。テスト作成・実行・デバッグ時に使用。
---

# テスト戦略

「仕様通りにフレームが設計されているか」を確認するためのテスト方針。

---

## テスト方針

| 対象 | 方針 | 理由 |
|------|------|------|
| バックエンドAPI | 厳密にテスト | 外部モジュールが依存する契約 |
| アクセス制御 | 厳密にテスト | セキュリティリスク |
| フロントエンド | 手動確認中心 | 柔軟な変更に対応 |

---

## テスト対象

### 1. 外部モジュール向けAPI（契約テスト）- 最優先

| API | テスト数 |
|-----|---------|
| `/api/ai/services/generate` | 8テスト |
| `/api/ai/services/summarize` | 8テスト |
| `/api/ai/services/extract` | 12テスト |
| `/api/ai/translate` | 13テスト |

### 2. アクセス制御ロジック - 高優先

| 関数 | テスト数 |
|------|---------|
| `canAccessMenu()` | - |
| `canAccessModule()` | - |
| `canAccessMenuGroup()` | - |
| `getAccessibleMenus()` | - |
| **合計** | 21テスト |

### 3. AIService（サービス層）- 中優先

| メソッド | テスト数 |
|---------|---------|
| `generate()` | - |
| `summarize()` | - |
| `extract()` | - |
| **合計** | 15テスト |

---

## テストファイル構成

```
__tests__/
├── api/
│   └── ai/
│       ├── services/
│       │   ├── generate.test.ts
│       │   ├── summarize.test.ts
│       │   └── extract.test.ts
│       └── translate.test.ts
└── lib/
    ├── modules/
    │   └── access-control.test.ts
    └── core-modules/
        └── ai/
            └── ai-service.test.ts

jest.config.ts    # Jest設定
jest.setup.ts     # グローバルモック
```

---

## モック戦略

| 依存 | モック方法 |
|------|-----------|
| Prisma | `jest.mock("@/lib/prisma")` |
| 外部API | `global.fetch = jest.fn()` |
| 認証 | `jest.mock("@/auth")` |

### Prismaモック例

```typescript
import { prismaMock } from "@/lib/__mocks__/prisma";

jest.mock("@/lib/prisma");

beforeEach(() => {
  jest.clearAllMocks();
});

test("ユーザーを取得できる", async () => {
  prismaMock.user.findUnique.mockResolvedValue({
    id: "1",
    email: "test@example.com",
    // ...
  });

  const result = await getUser("1");
  expect(result.email).toBe("test@example.com");
});
```

### fetchモック例

```typescript
beforeEach(() => {
  global.fetch = jest.fn();
});

test("APIを呼び出せる", async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: "test" }),
  });

  const result = await callApi();
  expect(result.data).toBe("test");
});
```

### 認証モック例

```typescript
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

import { auth } from "@/auth";

test("認証済みユーザーのみアクセス可能", async () => {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: "1", role: "ADMIN" },
  });

  // テスト実行
});
```

---

## テストコマンド

```bash
# 全テスト実行
npm run test

# カバレッジ付き
npm run test:coverage

# 特定のテストのみ
npm run test -- --testPathPatterns="access-control"

# ウォッチモード
npm run test -- --watch
```

---

## テスト作成ガイドライン

### 1. 命名規則

```typescript
describe("AIService", () => {
  describe("generate", () => {
    it("正常系: テキストを生成できる", async () => {});
    it("異常系: 無効な入力でエラーを返す", async () => {});
  });
});
```

### 2. AAA パターン

```typescript
it("ユーザーを作成できる", async () => {
  // Arrange
  const input = { name: "Test User", email: "test@example.com" };
  prismaMock.user.create.mockResolvedValue({ id: "1", ...input });

  // Act
  const result = await createUser(input);

  // Assert
  expect(result.id).toBe("1");
  expect(prismaMock.user.create).toHaveBeenCalledWith({
    data: input,
  });
});
```

### 3. エラーケースも必ずテスト

```typescript
it("存在しないユーザーで404を返す", async () => {
  prismaMock.user.findUnique.mockResolvedValue(null);

  await expect(getUser("invalid")).rejects.toThrow("User not found");
});
```
