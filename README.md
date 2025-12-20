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

- Google OAuth
- OpenLDAP
- 2要素認証 (TOTP)

### Edge Runtime対応

Next.js middlewareはEdge Runtimeで動作するため、認証設定を分離:

- `auth.config.ts` - Edge Runtime用（middleware）
- `auth.ts` - Node.js Runtime用（LDAP認証を含む）

## ライセンス

MIT License

## 作者

MatsBACCANO
