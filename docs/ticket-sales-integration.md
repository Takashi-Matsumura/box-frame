# 社内チケット販売システム連携ガイド

このドキュメントでは、社内チケット販売F/Eアプリ（ted-ticketsales）とbox-frameバックエンドの連携について説明します。

## システム概要

社内食堂での食券・チケット販売を行うシステムです。

```
┌─────────────────────────────────────────────────────────────┐
│              チケット販売 F/E アプリ                         │
│              (ted-ticketsales)                              │
│              タブレット端末 / Vercel                         │
│                                                             │
│   ・NFCカードによる顧客認識                                  │
│   ・商品選択・数量指定                                       │
│   ・支払方法選択（給与天引き / 現金）                        │
│   ・販売記録の登録                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS (API Key認証)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  box-frame バックエンド                      │
│                                                             │
│   /api/ticket-sales/customers/*   - 顧客管理                │
│   /api/ticket-sales/products/*    - 商品管理                │
│   /api/ticket-sales/sales/*       - 販売記録                │
│   /api/ticket-sales/csv           - CSV出力                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL                               │
│              TicketCustomer / TicketProduct / TicketSale    │
└─────────────────────────────────────────────────────────────┘
```

## リポジトリ構成

| リポジトリ | 役割 | URL |
|-----------|------|-----|
| box-frame | バックエンドAPI + 管理画面 | このリポジトリ |
| ted-ticketsales | F/E POSアプリ | https://github.com/Takashi-Matsumura/ted-ticketsales |

## 技術スタック

### バックエンド（box-frame）

- Next.js 15 (App Router)
- Prisma (PostgreSQL)
- NextAuth.js v5

### フロントエンド（ted-ticketsales）

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Web USB API（NFCカードリーダー対応）

## データモデル

### TicketCustomer（顧客マスタ）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String | 一意識別子（CUID） |
| name | String | 顧客名 |
| customerId | String | 顧客ID（社員番号等）- unique |
| nfcId | String? | NFC ID - unique |
| email | String? | メールアドレス |
| company | String | 所属（社員/来客等） |
| paymentDay | Int | 給与締め日（デフォルト: 25） |
| hasApproval | Boolean | 承認済みフラグ |
| isActive | Boolean | 有効フラグ |
| employeeId | String? | Employee紐付け |

### TicketProduct（商品マスタ）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String | 一意識別子（CUID） |
| code | String | 商品コード - unique |
| name | String | 商品名（英語） |
| nameJa | String | 商品名（日本語） |
| description | String? | 説明 |
| unitPrice | Int | 単価（円） |
| isActive | Boolean | 有効フラグ |
| sortOrder | Int | 表示順序 |

### TicketSale（販売記録）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String | 一意識別子（CUID） |
| soldAt | DateTime | 販売日時 |
| customerId | String? | 顧客ID（TicketCustomer.id） |
| customerName | String | 顧客名（スナップショット） |
| productId | String | 商品ID（TicketProduct.id） |
| productCode | String | 商品コード（スナップショット） |
| quantity | Int | 数量 |
| unitPrice | Int | 単価（スナップショット） |
| totalPrice | Int | 合計金額 |
| paymentMethod | Enum | CASH / PAYROLL |
| adminNfcId | String | 販売管理者のNFC ID |
| adminName | String | 販売管理者名（スナップショット） |
| notes | String? | 備考 |

---

## APIエンドポイント

### 管理画面用API（セッション認証）

box-frame管理画面から使用するAPIです。ADMINロールが必要です。

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/ticket-sales/customers | 顧客一覧取得 |
| POST | /api/ticket-sales/customers | 顧客作成 |
| GET | /api/ticket-sales/customers/[id] | 顧客詳細取得 |
| PUT | /api/ticket-sales/customers/[id] | 顧客更新 |
| DELETE | /api/ticket-sales/customers/[id] | 顧客削除（論理削除） |
| GET | /api/ticket-sales/products | 商品一覧取得 |
| POST | /api/ticket-sales/products | 商品作成 |
| GET | /api/ticket-sales/products/[id] | 商品詳細取得 |
| PUT | /api/ticket-sales/products/[id] | 商品更新 |
| DELETE | /api/ticket-sales/products/[id] | 商品削除（論理削除） |
| GET | /api/ticket-sales/sales | 販売記録一覧取得 |
| GET | /api/ticket-sales/sales/[id] | 販売記録詳細取得 |
| DELETE | /api/ticket-sales/sales/[id] | 販売記録削除（物理削除） |
| GET | /api/ticket-sales/csv | CSV出力 |

### F/Eアプリ用API（API Key認証）

ted-ticketsalesから使用するAPIです。`X-API-Key`ヘッダーが必要です。

| メソッド | パス | 説明 | 実装状況 |
|---------|------|------|---------|
| GET | /api/ticket-sales/customers/nfc/[nfcId] | NFC IDで顧客検索 | **要追加** |
| GET | /api/ticket-sales/products/public | 有効な商品一覧 | **要追加** |
| POST | /api/ticket-sales/sales | 販売登録 | 実装済み |
| POST | /api/ticket-sales/customers/register-nfc | NFCカード登録 | **要追加** |
| POST | /api/ticket-sales/customers/link-by-email | 社員紐付け | **要追加** |

---

## 環境設定

### box-frame（バックエンド）

`.env`ファイルに追加：

```env
# チケット販売F/EアプリからのAPI認証キー
TICKET_SALES_API_KEY=your-secure-api-key-here-32chars-minimum
```

### ted-ticketsales（F/Eアプリ）

`.env.local`ファイル：

```env
# バックエンドAPIのURL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# API認証キー（バックエンドと同じ値）
TICKET_SALES_API_KEY=your-secure-api-key-here-32chars-minimum
```

---

## デプロイ構成

### 構成A: 開発環境（ローカル）

```
localhost:3000  → box-frame（バックエンド + 管理画面）
localhost:3002  → ted-ticketsales（F/E POSアプリ）
localhost:5433  → PostgreSQL
```

### 構成B: 本番環境（Docker Compose）

両リポジトリを同じディレクトリに配置：

```
projects/
├── box-frame/
├── ted-ticketsales/
└── docker-compose.yml
```

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: boxframe
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5433:5432"

  app:
    build:
      context: ./box-frame
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/boxframe
      - TICKET_SALES_API_KEY=${TICKET_SALES_API_KEY}
    depends_on:
      - db

  ticket-pos:
    build:
      context: ./ted-ticketsales
    ports:
      - "3002:3002"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://app:3000
      - TICKET_SALES_API_KEY=${TICKET_SALES_API_KEY}
    depends_on:
      - app

volumes:
  postgres_data:
```

### 構成C: 本番環境（分離デプロイ）

| アプリ | デプロイ先 | URL例 |
|--------|-----------|-------|
| box-frame | オンプレ/VPS | https://admin.example.com |
| ted-ticketsales | Vercel | https://pos.example.com |
| PostgreSQL | オンプレ/RDS | - |

---

## アクセス制御

### 管理画面（box-frame）

- パス: `/backoffice/ticket-sales`
- アクセス条件: ADMINロール、または`backoffice`アクセスキー
- 機能: 顧客管理、商品管理、販売記録閲覧、CSV出力

### F/Eアプリ（ted-ticketsales）

- API Key認証（`X-API-Key`ヘッダー）
- 食堂端末からのみアクセス（ネットワーク制限推奨）

---

## 運用フロー

### 初期セットアップ

1. box-frameで商品マスタを登録（管理画面）
2. box-frameで顧客マスタを登録（管理画面）
3. ted-ticketsalesを食堂端末にデプロイ
4. 管理者NFCカードでログイン

### 日常運用

```
┌─────────────────────────────────────────────────────────────┐
│ 食堂端末（ted-ticketsales）                                  │
│                                                             │
│ 1. 管理者NFCカードでログイン                                 │
│ 2. 顧客NFCカードをかざす                                     │
│    └→ 未登録の場合: LDAP認証で新規登録                      │
│ 3. 商品を選択・数量指定                                      │
│ 4. 支払方法を選択（給与天引き/現金）                         │
│ 5. 販売確定                                                 │
│ 6. 次の顧客へ（自動遷移）                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 管理画面（box-frame /backoffice/ticket-sales）              │
│                                                             │
│ ・販売記録の確認                                             │
│ ・期間指定でCSV出力（給与天引き集計用）                      │
│ ・顧客マスタの管理（承認フラグ等）                           │
│ ・商品マスタの管理（価格変更等）                             │
└─────────────────────────────────────────────────────────────┘
```

### 月次処理

1. 管理画面で期間を指定してCSV出力
2. 給与天引き分を給与システムに連携

---

## NFCカードリーダー

### 対応機器

- Sony RC-S300 (PaSoRi)
- Sony RC-S380

### 動作モード

| モード | 説明 |
|--------|------|
| polling | 常時ポーリングでカード検知（推奨） |
| button | ボタン押下時に1回読み取り |
| keyboard | キーボードエミュレーション（開発用） |

### 注意事項

- Web USB APIはHTTPS環境またはlocalhost環境で動作
- 初回のみユーザー操作によるペアリングが必要
- Chrome/Edgeブラウザが必要

---

## トラブルシューティング

### F/EアプリからAPIに接続できない

1. `NEXT_PUBLIC_API_BASE_URL`が正しいか確認
2. `TICKET_SALES_API_KEY`が両方で一致しているか確認
3. CORS設定を確認（必要に応じてbox-frame側で設定）

### NFCカードが認識されない

1. ブラウザがChrome/Edgeか確認
2. HTTPS環境またはlocalhost環境か確認
3. カードリーダーのペアリングを再実行

### 顧客が「未承認」エラーになる

- 管理画面で該当顧客の「承認済み」フラグをONにする

---

## 追加実装が必要なAPI

F/Eアプリとの完全な連携には、以下のAPIを追加実装する必要があります：

### 1. NFC IDによる顧客検索

`app/api/ticket-sales/customers/nfc/[nfcId]/route.ts`

### 2. 公開商品一覧

`app/api/ticket-sales/products/public/route.ts`

### 3. NFCカード登録

`app/api/ticket-sales/customers/register-nfc/route.ts`

### 4. 社員紐付け（メールアドレス）

`app/api/ticket-sales/customers/link-by-email/route.ts`

これらのAPIの詳細仕様は、ted-ticketsalesリポジトリの`docs/`ディレクトリを参照してください。
