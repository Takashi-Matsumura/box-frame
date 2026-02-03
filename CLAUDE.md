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
│      (organization, system, ai, backoffice) │
└─────────────────────────────────────────────┘
```

フレーム基盤機能はモジュールではなく、モジュールが利用するインフラストラクチャです。

## ダッシュボード機能

ダッシュボード（`app/(menus)/(user)/dashboard/`）には以下の機能があります:

| 機能 | 説明 |
|------|------|
| カレンダー | 月表示・日表示の切替、イベント表示 |
| 外部カレンダー連携 | Google Calendar連携（OAuth） |
| AIコンシェルジュ | カレンダーデータをコンテキストとしたAIチャット |

### AIコンシェルジュ

- `components/CalendarConcierge.tsx` - AIチャットコンポーネント
- `/api/ai/chat/stream` エンドポイントをSSEストリーミングで使用
- アプリイベント + Google Calendarイベントの両方をシステムプロンプトに注入
- ReactMarkdown + remarkGfm でレスポンス描画
- AbortController による停止、IME変換対応

### レイアウト

- **月表示**: 右パネルに「イベント」/「コンシェルジュ」タブ切替
- **日表示**: 左=DayView + 右=AIコンシェルジュ常時表示（2カラム）

## ディレクトリ構造

```
app/
  ├── (menus)/              # メニューページ実装
  │   ├── (user)/           # 全社員向け
  │   ├── (manager)/        # 管理職向け
  │   ├── (admin)/          # システム管理者向け
  │   └── (backoffice)/     # バックオフィス（アクセスキー必須）
  ├── admin/                # 管理画面
  └── api/                  # APIルート

lib/
  ├── modules/              # モジュール定義（registry.tsx）
  ├── core-modules/         # コアモジュール（organization, system, ai）
  ├── addon-modules/        # アドオンモジュール（evaluation, backoffice等）
  ├── services/             # フレーム基盤サービス
  └── i18n/                 # 多言語対応

components/
  ├── ui/                   # 共通UIコンポーネント
  └── *.tsx                 # 各種コンポーネント

prisma/
  └── schema.prisma         # データベーススキーマ
```

## 開発コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # ビルド
npm run test         # テスト実行
npx prisma studio    # Prisma Studio
npx prisma generate  # Prismaクライアント生成
npx prisma db push && npm run db:seed  # DB初期化
```

## 環境変数

```env
AUTH_SECRET=<生成された秘密鍵>
AUTH_URL=http://localhost:3000
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# OAuth（オプション - 管理画面で有効化）
GOOGLE_CLIENT_ID=<Google OAuthクライアントID>
GOOGLE_CLIENT_SECRET=<Google OAuthクライアントシークレット>
```

---

## スキル活用ガイド

詳細情報は必要に応じてスキルを参照してください。

| 作業内容 | 使用スキル |
|---------|-----------|
| メニュー/モジュール追加 | /architecture |
| UI実装、コンポーネント作成 | /ui-ux |
| 翻訳追加、新規ページ作成 | /i18n |
| 通知発行、通知センター拡張 | /notifications |
| データインポート、履歴記録 | /data-management |
| 本番環境構築、デプロイ | /deployment |
| テスト作成・実行・デバッグ | /testing |
| 認証機能の実装・設定 | /auth |
| AI機能の実装・設定・利用 | /ai-services |
| フローティングウィンドウ、監査ログ | /frame-services |
| コアモジュール実装・拡張 | /core-modules |
| 業務分析機能の実装・拡張 | /backoffice |
| 人事評価機能の実装 | /evaluation |
| Reactフック、無限ループ防止 | /react-hooks |
| 日本語表記、用語統一 | /terminology |

---

## 基本ルール

### 翻訳ファイルの使用

```typescript
// ✅ 正しい
const t = translations[language];
<h1>{t.title}</h1>

// ❌ 間違い
<h1>Dashboard</h1>
```

### 共通コンポーネントの使用

```typescript
// ✅ 正しい
import { Button } from "@/components/ui";
<Button variant="primary" size="md">保存</Button>

// ❌ 間違い
<button className="px-4 py-2 bg-blue-600...">保存</button>
```

### menuGroupとURLパスの一致

```typescript
// ✅ 正しい
path: "/manager/analytics"
menuGroup: "manager"

// ❌ 間違い
path: "/admin/dashboard"
menuGroup: "user"
```

### ヘッダータイトルの動的取得

新しいモジュールを追加する際、`page-titles.ts` を編集する必要はありません。
モジュール定義の `name` / `nameJa` がヘッダーに自動表示されます。

---

## 派生プロジェクト運用

BoxFrameをクローンして業務アプリを開発する際のルール:

### 編集禁止ディレクトリ

- `lib/core-modules/` - コアモジュール
- `components/ui/` - 共通UIコンポーネント
- `lib/services/` - フレーム基盤サービス

### 業務モジュールの配置先

| 種別 | 配置先 |
|------|--------|
| モジュール定義 | `lib/addon-modules/<module-name>/` |
| 画面（ページ） | `app/(menus)/(business)/<path>/` |
| コンポーネント | `components/business/` |
| API | `app/api/<module-name>/` |

### フレーム改修が必要な場合

1. BoxFrame本体にIssue作成
2. 急ぎの場合は一時的にローカル修正（コメントで明記）
3. 本家にPR作成
4. マージ後、ローカル修正を削除

```bash
# upstreamの設定
git remote add upstream https://github.com/Takashi-Matsumura/box-frame.git
git fetch upstream
git merge upstream/main
```
