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
│   /api/ticket-sales/admin/verify        - 管理者認証        │
│   /api/ticket-sales/customers/nfc/*     - NFC顧客検索       │
│   /api/ticket-sales/customers/register-nfc - NFCカード登録  │
│   /api/ticket-sales/products/public     - 商品一覧          │
│   /api/ticket-sales/sales               - 販売記録          │
│   /api/ticket-sales/csv                 - CSV出力           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL                               │
│   TicketCustomer / TicketProduct / TicketSale               │
│   TicketSalesApiKey                                         │
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

### TicketSalesApiKey（APIキー管理）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String | 一意識別子（CUID） |
| apiKey | String | ハッシュ化されたAPIキー - unique |
| adminNfcId | String | 管理者のNFC ID |
| adminName | String | 管理者名 |
| expiresAt | DateTime? | 有効期限（デフォルト: 90日後） |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

※ 常に1レコードのみ存在（新規発行時は古いキーを削除）

### TicketSalesApiLog（監査ログ）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String | 一意識別子（CUID） |
| endpoint | String | アクセスされたエンドポイント |
| method | String | HTTPメソッド |
| statusCode | Int | HTTPステータスコード |
| apiKeyId | String? | 使用されたAPIキーID |
| ipAddress | String? | クライアントIPアドレス |
| userAgent | String? | User-Agent |
| origin | String? | Originヘッダー |
| responseTimeMs | Int? | レスポンス時間（ミリ秒） |
| errorMessage | String? | エラーメッセージ |
| createdAt | DateTime | 作成日時 |

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
| GET | /api/ticket-sales/api-keys | APIキー設定取得 |
| POST | /api/ticket-sales/api-keys | APIキー発行 |

### F/Eアプリ用API（API Key認証）

ted-ticketsalesから使用するAPIです。`X-API-Key`ヘッダーが必要です。

| メソッド | パス | 説明 |
|---------|------|------|
| POST | /api/ticket-sales/admin/verify | 管理者認証 |
| GET | /api/ticket-sales/customers/nfc/[nfcId] | NFC IDで顧客検索 |
| GET | /api/ticket-sales/products/public | 有効な商品一覧 |
| POST | /api/ticket-sales/sales | 販売登録 |
| POST | /api/ticket-sales/customers/register-nfc | NFCカード登録 |

---

## APIキー管理

### 概要

F/EアプリからバックエンドAPIへのアクセスには、APIキー認証を使用します。
APIキーは管理画面（`/backoffice/ticket-sales?tab=api`）から発行・管理できます。

### APIキー発行手順

1. 管理画面の「社内チケット販売」→「API設定」タブを開く
2. 管理者NFC IDと管理者名を入力
3. 「APIキーを発行」ボタンをクリック
4. 表示されたAPIキーをコピーして安全な場所に保存
   - **重要**: APIキーは発行時に1度だけ表示されます。再度表示することはできません。

### APIキーの仕様

- 64文字の16進数（32バイトのランダム値）
- SHA-256でハッシュ化してDBに保存
- 常に1つのキーのみ有効（新規発行時は古いキーが無効化）
- 管理者NFC IDと管理者名がキーに紐付け
- **有効期限**: デフォルト90日（管理画面で確認可能）

### F/Eアプリでの使用方法

```typescript
// ted-ticketsales での使用例
const response = await fetch(`${API_BASE_URL}/api/ticket-sales/admin/verify`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.TICKET_SALES_API_KEY,
  },
  body: JSON.stringify({ nfcId: adminNfcId }),
});
```

---

## セキュリティ

### CORS設定

F/Eアプリ用APIは、CORS（Cross-Origin Resource Sharing）で保護されています。

**環境変数:**

```env
# 許可するオリジン（カンマ区切りで複数指定可能）
TICKET_SALES_ALLOWED_ORIGINS=https://pos.example.com,https://pos2.example.com
```

- 未設定の場合、開発環境では`http://localhost:3001`がデフォルトで許可されます
- 本番環境では必ず明示的に設定してください

### APIキー有効期限

- APIキーにはデフォルトで90日の有効期限が設定されます
- 有効期限が切れたAPIキーは認証に失敗します
- 管理画面の「API設定」タブで有効期限を確認できます
- 期限切れ前に新しいAPIキーを発行してください

### 監査ログ

F/Eアプリ用APIへのアクセスは自動的に記録されます。

**記録される情報:**

- アクセス日時
- エンドポイント・HTTPメソッド
- ステータスコード
- 使用されたAPIキーID
- クライアントIP、User-Agent、Origin
- レスポンス時間
- エラーメッセージ（エラー時）

**ログの確認:**

```sql
-- 最新のAPIアクセスログを確認
SELECT * FROM "TicketSalesApiLog" ORDER BY "createdAt" DESC LIMIT 100;

-- エラーのみ抽出
SELECT * FROM "TicketSalesApiLog" WHERE "statusCode" >= 400 ORDER BY "createdAt" DESC;
```

### 推奨セキュリティ設定

| 項目 | 説明 |
|------|------|
| HTTPS強制 | 本番環境では必ずHTTPSを使用 |
| ネットワーク分離 | F/EアプリはVPNまたは社内ネットワーク内に配置 |
| APIキー定期更新 | 90日ごとにAPIキーを再発行 |
| ログ監視 | 異常なアクセスパターンを定期的に確認 |

---

## F/Eアプリ用API詳細仕様

### 1. 管理者認証 API

`POST /api/ticket-sales/admin/verify`

NFCカードとAPIキーで管理者としてログインできるか検証します。

**リクエスト:**

```json
{
  "nfcId": "NFC-12345678"
}
```

**成功レスポンス (200):**

```json
{
  "success": true,
  "admin": {
    "nfcId": "NFC-12345678",
    "name": "管理者名"
  }
}
```

**エラーレスポンス:**

- 401: APIキーが無効
- 403: NFC IDが管理者と一致しない

### 2. NFC ID顧客検索 API

`GET /api/ticket-sales/customers/nfc/{nfcId}`

NFC IDで顧客を検索します。

**成功レスポンス (200):**

```json
{
  "id": "cuid",
  "name": "山田 太郎",
  "customerId": "EMP001",
  "nfcId": "NFC-12345678",
  "email": "yamada@example.com",
  "company": "本社",
  "paymentDay": 25,
  "hasApproval": true,
  "isActive": true,
  "employee": {
    "id": "emp-id",
    "name": "山田 太郎",
    "employeeId": "EMP001",
    "department": {
      "name": "営業部"
    }
  }
}
```

**エラーレスポンス:**

- 401: APIキーが無効
- 404: 該当する顧客が見つからない / 顧客が無効

### 3. 商品一覧（公開版）API

`GET /api/ticket-sales/products/public`

有効な商品一覧を取得します。

**成功レスポンス (200):**

```json
[
  {
    "id": "prod-id",
    "code": "TICKET-A",
    "name": "Lunch Ticket A",
    "nameJa": "食券A",
    "unitPrice": 500,
    "sortOrder": 1
  },
  {
    "id": "prod-id-2",
    "code": "TICKET-B",
    "name": "Lunch Ticket B",
    "nameJa": "食券B",
    "unitPrice": 600,
    "sortOrder": 2
  }
]
```

**エラーレスポンス:**

- 401: APIキーが無効

### 4. NFCカード登録 API

`POST /api/ticket-sales/customers/register-nfc`

社員にNFCカードを紐づけます。

**リクエスト:**

```json
{
  "employeeId": "EMP001",
  "nfcId": "NFC-12345678"
}
```

**成功レスポンス (200):**

```json
{
  "success": true,
  "customer": {
    "id": "cuid",
    "name": "山田 太郎",
    "customerId": "EMP001",
    "nfcId": "NFC-12345678",
    "company": "本社",
    "hasApproval": false,
    "isActive": true
  }
}
```

**エラーレスポンス:**

- 401: APIキーが無効
- 404: 社員が見つからない
- 409: NFC IDが既に別の顧客に登録済み

---

## 環境設定

### box-frame（バックエンド）

`.env`ファイル（チケット販売関連）：

```env
# CORS許可オリジン（本番環境では必須）
TICKET_SALES_ALLOWED_ORIGINS=https://pos.example.com
```

### ted-ticketsales（F/Eアプリ）

`.env.local`ファイル：

```env
# バックエンドAPIのURL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# API認証キー（管理画面から発行）
TICKET_SALES_API_KEY=<管理画面から発行されたAPIキー>
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
- 機能:
  - 顧客管理
  - 商品管理
  - 販売記録閲覧
  - CSV出力
  - **API設定（APIキー発行）**

### F/Eアプリ（ted-ticketsales）

- API Key認証（`X-API-Key`ヘッダー）
- 食堂端末からのみアクセス（ネットワーク制限推奨）

---

## 運用フロー

### 初期セットアップ

1. box-frameで商品マスタを登録（管理画面）
2. box-frameで顧客マスタを登録（管理画面）
3. **box-frameでAPIキーを発行（管理画面 → API設定タブ）**
4. ted-ticketsalesの環境変数にAPIキーを設定
5. ted-ticketsalesを食堂端末にデプロイ
6. 管理者NFCカードでログイン

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
│ ・APIキーの発行・再発行                                      │
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
2. `TICKET_SALES_API_KEY`が正しく設定されているか確認
3. 管理画面でAPIキーが発行済みか確認
4. CORS設定を確認（必要に応じてbox-frame側で設定）

### 管理者認証に失敗する

1. APIキーが正しいか確認
2. 管理者NFC IDがAPIキー発行時に設定したものと一致しているか確認

### NFCカードが認識されない

1. ブラウザがChrome/Edgeか確認
2. HTTPS環境またはlocalhost環境か確認
3. カードリーダーのペアリングを再実行

### 顧客が「未承認」エラーになる

- 管理画面で該当顧客の「承認済み」フラグをONにする

### APIキーを紛失した

- 管理画面から新しいAPIキーを再発行してください
- 古いキーは自動的に無効化されます

### APIキーの有効期限が切れた

- 管理画面の「API設定」タブで有効期限を確認してください
- 期限切れの場合は新しいAPIキーを発行してください
- 新しいAPIキーはデフォルトで90日間有効です
