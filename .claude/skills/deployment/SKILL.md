---
name: Docker本番環境デプロイ
description: Docker Composeでの本番デプロイ、PostgreSQL設定、LDAP認証設定。本番環境構築、デプロイ作業時に使用。
---

# Docker本番環境デプロイガイド

## 対象サーバー

- **IP**: 172.16.2.222
- **ドメイン**: box2.occ.co.jp（/etc/hostsで名前解決）
- **OS**: macOS (Darwin)
- **プロキシ**: http://proxy.occ.co.jp:8080

## 構成概要

```
[ブラウザ] → https://box2.occ.co.jp:443
                    ↓
            [nginx (SSL終端)]  ← 自己署名証明書
                    ↓
            [Next.js :3000]  ← コンテナ内部
                    ↓
          [PostgreSQL :5432]  [OpenLDAP :389]  [AI RAG :8000]
```

- **nginx**: HTTPS (port 443) でリバースプロキシ、SSL終端
- **nextjs**: ポート3000（外部非公開、nginx経由のみ）
- **postgres**: BoX2専用DB（port 5432、コンテナネットワーク内）
- **openldap**: port 3890（ホスト側）→ 389（コンテナ内）
- **airag-backend**: RAG/Embeddings（コンテナネットワーク内）

## デプロイ手順

### 1. 環境変数の設定

```env
# .env
AUTH_SECRET=<openssl rand -base64 32で生成>
AUTH_URL=https://box2.occ.co.jp
AUTH_TRUST_HOST=true

# Google OAuth (Calendar integration)
GOOGLE_CLIENT_ID=<Google Cloud ConsoleのクライアントID>
GOOGLE_CLIENT_SECRET=<Google Cloud Consoleのクライアントシークレット>

# Module Configuration
NEXT_PUBLIC_ENABLE_HR_EVALUATION=true
NEXT_PUBLIC_ENABLE_BACKOFFICE=true
```

### 2. SSL証明書の準備

自己署名証明書を `docker/nginx/certs/` に配置:

```bash
openssl req -x509 -newkey rsa:2048 -keyout docker/nginx/certs/server-key.pem \
  -out docker/nginx/certs/server.pem -days 365 -nodes \
  -subj "/CN=box2.occ.co.jp" \
  -addext "subjectAltName=DNS:box2.occ.co.jp,IP:172.16.2.222,DNS:localhost"
```

### 3. 本番イメージのビルドと起動

```bash
# イメージ名は box2-nextjs:latest で統一
docker build -t box2-nextjs:latest .

# 全サービス起動
docker compose up -d

# 状態確認
docker compose ps
```

### 4. /etc/hosts の設定

各アクセス元のマシンで `/etc/hosts` に追加が必要:

```bash
# macOS / Linux
sudo sh -c 'echo "172.16.2.222 box2.occ.co.jp" >> /etc/hosts'

# Windows (管理者権限のメモ帳で C:\Windows\System32\drivers\etc\hosts を編集)
172.16.2.222 box2.occ.co.jp
```

**注意**: `/etc/hosts` はマシンごとの設定。社内全体で使うにはDNSサーバーへの登録が必要。

### 5. プロキシバイパスの設定

社内プロキシ環境では `box2.occ.co.jp` をバイパスリストに追加する必要がある:

```bash
# macOS — Ethernetの場合
sudo networksetup -setproxybypassdomains "Ethernet" \
  "*.local" "169.254/16" "localhost" "127.0.0.1" "box2.occ.co.jp"

# 確認
networksetup -getproxybypassdomains "Ethernet"
```

Windows: 設定 → ネットワーク → プロキシ →「プロキシを使わないアドレス」に `box2.occ.co.jp` を追加

### 6. Google Calendar OAuth設定

Google Cloud Console (https://console.cloud.google.com/apis/credentials) で:

1. OAuthクライアントIDの「承認済みのリダイレクトURI」に追加:
   ```
   https://box2.occ.co.jp/api/calendar/callback/google
   ```
2. クライアントIDとシークレットを `.env` に設定
3. `docker compose up -d` で反映

### 7. OpenLDAP設定

管理画面から設定可能:

1. **管理画面へアクセス**: `https://box2.occ.co.jp/admin/openldap?tab=settings`
2. **設定項目**:
   - サーバーURL（例: `ldap://ldap.example.com:389`）
   - ベースDN（例: `ou=Users,dc=example,dc=com`）
   - バインドDN・パスワード（オプション）
   - 有効/無効トグル

設定はデータベースに保存され、環境変数なしで本番環境で変更可能。

### 8. ヘルスチェック

```bash
# HTTPS経由（プロキシバイパス必須）
NO_PROXY=box2.occ.co.jp curl -sk https://box2.occ.co.jp/api/health

# ビルドIDの確認
NO_PROXY=box2.occ.co.jp curl -sk https://box2.occ.co.jp/api/health | python3 -m json.tool
```

確認メッセージ:
- `{"status":"ok","buildId":"BUILD_YYYYMMDD_HHMMSS"}`

## ビルドIDによるセッション自動無効化

Dockerイメージのビルド時にタイムスタンプベースのビルドID（例: `BUILD_20260130_082049`）が自動生成される。
このIDはJWTトークンに埋め込まれ、再デプロイ後に旧セッションのユーザーは自動的にログイン画面へリダイレクトされる。

- **開発環境**: `build-id`ファイルが存在しないため、ビルドIDは`"dev"`となり検証はスキップされる
- **本番環境**: 再デプロイ（`docker build` → `docker compose up -d`）で新しいビルドIDが生成され、旧セッションが無効化される
- **確認方法**: `/api/health`エンドポイントの`buildId`フィールドで現在のビルドIDを確認可能
- **読み込み方式**: `next.config.ts`（Node.js Runtime）が`build-id`ファイルを読み込み`NEXT_BUILD_ID`環境変数にセット → `auth.config.ts`（Edge Runtime）は`process.env.NEXT_BUILD_ID`を参照。Edge Runtimeでは`fs`モジュールが使用不可のため、環境変数経由で受け渡す
- **重要**: ビルドID検証はmiddleware.tsで`/login`のパブリックルート判定の中でも行う必要がある。保護ルートでのみCookie削除＋`/login`リダイレクトを行うと、`/login`側で「セッションあり→`/dashboard`へ」→「ビルドID不一致→`/login`へ」の無限ループが発生する

## nginxリバースプロキシの注意事項

- **APIルートでのリダイレクト**: `request.url`はコンテナ内部のアドレス（`0.0.0.0:3000`）を返すため、リダイレクト先のURL構築には`X-Forwarded-Host`ヘッダーまたは`AUTH_URL`環境変数を使用すること
- **WebSocket**: nginx設定で`Upgrade`/`Connection`ヘッダーを転送済み
- **Port 80**: 未使用（BoX1と競合回避）。HTTPからHTTPSへのリダイレクトはnginx設定に定義あるがport 80は公開していない

## 運用コマンド

```bash
# ログ確認（リアルタイム）
docker compose logs -f nextjs

# 再起動（全体）
docker compose restart

# 再デプロイ（コード更新時）
docker build -t box2-nextjs:latest . && docker compose up -d

# 停止
docker compose down

# Prisma Studio
docker exec -it box2-nextjs npx prisma studio
```

## データベース

| 環境 | データベース | 接続先 |
|-----|------------|-------|
| 開発 | PostgreSQL 16 | localhost:5433 (Docker) |
| 本番 | PostgreSQL 16 | postgres:5432 (Docker内部ネットワーク) |

### 開発環境セットアップ

```bash
docker compose -f docker-compose.dev.yml up -d postgres
npx prisma db push
npm run db:seed
```

## トラブルシューティング

### アクセスできない（ERR_TUNNEL_CONNECTION_FAILED）

社内プロキシが `box2.occ.co.jp` を中継しようとして失敗している。プロキシバイパスの設定を確認:

```bash
# macOS
networksetup -getproxybypassdomains "Ethernet"
# box2.occ.co.jp が含まれているか確認
```

### 名前解決できない

`/etc/hosts` に `172.16.2.222 box2.occ.co.jp` が記載されているか確認。各クライアントマシンで個別に設定が必要。

### Google OAuth コールバックが 0.0.0.0 にリダイレクトされる

APIルート内で `request.url` を直接使用している場合に発生。`X-Forwarded-Host` ヘッダーまたは `AUTH_URL` を使って正しいベースURLを構築する必要がある。

### OpenLDAP認証が動かない

1. **管理画面で設定確認**: `/admin/openldap?tab=settings`
   - 「接続テスト」ボタンで接続確認
2. **ログ確認**:
   ```bash
   docker compose logs nextjs | grep -i ldap
   ```

### ビルドIDリダイレクトループ

`/login` でのビルドID検証漏れ。middleware.tsの`/login`パブリックルート内でbuildId不一致チェックを行い、Cookie削除後にNextResponse.next()を返すこと。

### PostgreSQL接続できない

```bash
docker compose logs postgres
docker compose restart postgres
```

## 管理者アカウント

```
Email: admin@example.com
Password: password
Role: ADMIN
```

**重要**: 本番環境では初回ログイン後にパスワードを変更してください。
