# BoxFrame 学習パス

このドキュメントは、BoxFrameの基盤（フレーム）を理解し、コードレビューを通じて技術力を向上させたい開発者のためのガイドです。

## はじめに

BoxFrameは、組織管理システムの最小構成フレームワークです。このフレームを理解することで：

- モダンなWeb開発のベストプラクティスを学べる
- 認証・認可の実装パターンを理解できる
- 拡張可能なアーキテクチャの設計思想を体験できる

## 前提知識

| 技術 | 必要レベル | 補足 |
|------|-----------|------|
| JavaScript/TypeScript | 基礎〜中級 | 型定義が読める程度 |
| React | 基礎 | コンポーネント、hooks の概念 |
| Next.js | 基礎 | App Router の概要 |
| Git | 基礎 | clone, commit, push ができる |

以下は学習しながら理解していけるレベルで問題ありません：
- Prisma / PostgreSQL
- NextAuth.js
- Docker

---

## 学習フェーズ

### フェーズ 1: UIコンポーネント層

**目標**: React/TypeScript の型定義パターンを理解する

**対象ファイル**:
```
components/ui/
├── button.tsx      ← 最初に読むべき
├── card.tsx
├── modal.tsx
├── input.tsx
└── index.ts        ← エクスポートパターン
```

**学習ポイント**:

1. **Props の型定義**
   ```typescript
   interface ButtonProps {
     variant?: "primary" | "secondary" | "danger";
     size?: "sm" | "md" | "lg";
     children: React.ReactNode;
   }
   ```

2. **デフォルト値の設定**
   ```typescript
   function Button({ variant = "primary", size = "md" }: ButtonProps) {
   ```

3. **Tailwind CSS のクラス設計**
   - バリアント（variant）による条件分岐
   - cn() ユーティリティの使い方

**レビュー観点**:
- [ ] Props は適切に型定義されているか
- [ ] 再利用性は考慮されているか
- [ ] スタイリングは一貫しているか

---

### フェーズ 2: ページ構造（App Router）

**目標**: Next.js App Router のファイル規約を理解する

**対象ファイル**:
```
app/
├── layout.tsx          ← ルートレイアウト
├── page.tsx            ← トップページ
├── login/
│   └── page.tsx        ← ログインページ（シンプル）
└── (menus)/
    ├── layout.tsx      ← 認証後レイアウト
    └── (admin)/
        └── page.tsx    ← 管理者ページ
```

**学習ポイント**:

1. **Server Component vs Client Component**
   ```typescript
   // Server Component（デフォルト）
   export default async function Page() {
     const data = await fetchData(); // サーバーで実行
     return <div>{data}</div>;
   }

   // Client Component
   "use client";
   export default function ClientPage() {
     const [state, setState] = useState(); // ブラウザで実行
   }
   ```

2. **ルートグループ `(folder)`**
   - URL に影響しないグループ化
   - レイアウトの共有

3. **メタデータ**
   ```typescript
   export const metadata = { title: "ページタイトル" };
   ```

**レビュー観点**:
- [ ] Server/Client の使い分けは適切か
- [ ] レイアウトの階層構造は理解できるか
- [ ] メタデータは設定されているか

---

### フェーズ 3: Server Actions

**目標**: サーバーサイドのデータ操作パターンを理解する

**対象ファイル**:
```
app/api/                    ← 従来の API Routes
lib/actions/                ← Server Actions（あれば）
app/**/actions.ts           ← ページ固有のアクション
```

**学習ポイント**:

1. **Server Actions の基本**
   ```typescript
   "use server";

   export async function createUser(formData: FormData) {
     const name = formData.get("name");
     await prisma.user.create({ data: { name } });
     revalidatePath("/users");
   }
   ```

2. **API Routes との違い**
   | 項目 | Server Actions | API Routes |
   |------|---------------|------------|
   | 呼び出し | フォーム/関数 | fetch() |
   | URL | なし | /api/xxx |
   | 用途 | データ変更 | 外部公開API |

3. **セキュリティ考慮**
   - 認証チェックの実装位置
   - 入力値のバリデーション

**レビュー観点**:
- [ ] "use server" ディレクティブは正しいか
- [ ] 認証チェックは行われているか
- [ ] エラーハンドリングは適切か

---

### フェーズ 4: データ層（Prisma）

**目標**: データベース設計とクエリパターンを理解する

**対象ファイル**:
```
prisma/
├── schema.prisma       ← スキーマ定義
└── seed.ts            ← 初期データ
lib/
└── prisma.ts          ← クライアント設定
```

**学習ポイント**:

1. **モデル定義**
   ```prisma
   model User {
     id        String   @id @default(cuid())
     email     String   @unique
     name      String?
     role      Role     @default(USER)
     posts     Post[]   // リレーション
     createdAt DateTime @default(now())
   }
   ```

2. **リレーションの種類**
   - 1対多（User → Posts）
   - 多対多（User ↔ Roles）
   - 1対1（User ↔ Profile）

3. **クエリパターン**
   ```typescript
   // 基本
   await prisma.user.findMany();

   // リレーション含む
   await prisma.user.findUnique({
     where: { id },
     include: { posts: true }
   });

   // 選択的取得
   await prisma.user.findMany({
     select: { id: true, name: true }
   });
   ```

**レビュー観点**:
- [ ] インデックスは適切に設定されているか
- [ ] リレーションは正規化されているか
- [ ] N+1 問題は発生していないか

---

### フェーズ 5: 認証フロー

**目標**: NextAuth.js による認証の仕組みを理解する

**対象ファイル**:
```
auth.ts                 ← メイン設定（Node.js Runtime）
auth.config.ts          ← Edge Runtime 用
middleware.ts           ← 認証ミドルウェア
app/api/auth/[...nextauth]/route.ts
```

**学習ポイント**:

1. **認証フローの全体像**
   ```
   ユーザー → ログインページ → Provider認証
                                    ↓
   セッション ← JWT生成 ← コールバック処理
   ```

2. **Provider の種類**
   - OAuth（Google, GitHub など）
   - Credentials（ID/パスワード）
   - LDAP（企業認証）

3. **ミドルウェアによる保護**
   ```typescript
   // middleware.ts
   export default auth((req) => {
     if (!req.auth && req.nextUrl.pathname !== "/login") {
       return Response.redirect(new URL("/login", req.url));
     }
   });
   ```

**レビュー観点**:
- [ ] 認証が必要なルートは保護されているか
- [ ] セッション情報は安全に管理されているか
- [ ] エラー時のリダイレクトは適切か

---

### フェーズ 6: インフラ層

**目標**: 開発/本番環境の構成を理解する

**対象ファイル**:
```
docker-compose.yml      ← 開発環境
Dockerfile             ← コンテナ定義（あれば）
.env.example           ← 環境変数テンプレート
```

**学習ポイント**:

1. **Docker Compose の構成**
   ```yaml
   services:
     postgres:        # データベース
     openldap:        # LDAP サーバー
   ```

2. **環境変数の管理**
   - DATABASE_URL
   - AUTH_SECRET
   - OAuth クレデンシャル

**レビュー観点**:
- [ ] 機密情報は .env で管理されているか
- [ ] ボリュームの永続化は設定されているか

---

## レビューの進め方

### 1. ファイルを選ぶ

各フェーズの「対象ファイル」から1つ選びます。

### 2. 全体を読む

まずはコード全体を眺めて、何をしているファイルか把握します。

### 3. 疑問を書き出す

理解できない箇所、気になる箇所をメモします。

### 4. 調査・質問する

- 公式ドキュメントを参照
- AI（Claude等）に質問
- チームメンバーに相談

### 5. 改善点を検討する

「もっと良い書き方はないか？」を考えます。

---

## 推奨ツール

| 用途 | ツール |
|------|--------|
| コード理解 | Claude Code, GitHub Copilot |
| 型チェック | TypeScript (VSCode) |
| Lint | Biome |
| DB確認 | Prisma Studio (`npx prisma studio`) |
| API確認 | Thunder Client, Postman |

---

## 次のステップ

1. [MODULE_GUIDE.md](./MODULE_GUIDE.md) - モジュール作成方法
2. [CLAUDE.md](../CLAUDE.md) - 開発ガイドライン（プロジェクトルート）

---

## 貢献について

このフレームワークは継続的に進化しています。学習中に気づいた改善点や疑問点は、Issue や Pull Request として共有してください。

あなたの学びが、次の開発者の道しるべになります。
