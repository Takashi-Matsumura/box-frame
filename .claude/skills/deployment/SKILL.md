---
name: Docker本番環境デプロイ
description: Docker Composeでの本番デプロイ、PostgreSQL設定、LDAP認証設定。本番環境構築、デプロイ作業時に使用。
---

# Docker本番環境デプロイガイド

## 対象サーバー

- **IP**: 172.16.2.222
- **OS**: macOS (Darwin)
- **プロキシ**: http://proxy.occ.co.jp:8080

## デプロイ手順

### 1. 環境変数の設定

```env
# .env
AUTH_SECRET=<openssl rand -base64 32で生成>
AUTH_URL=http://172.16.2.222

# LDAP Configuration
LDAP_URL=ldap://ldap.es.occ.co.jp:389
LDAP_SEARCH_BASE=ou=Users,dc=occ,dc=co,dc=jp
LDAP_SEARCH_FILTER=(uid={username})
LDAP_BIND_DN=cn=admin,dc=occ,dc=co,dc=jp
LDAP_BIND_PASSWORD=

# Module Configuration
NEXT_PUBLIC_ENABLE_HR_EVALUATION=true
NEXT_PUBLIC_ENABLE_BACKOFFICE=false
```

### 2. 本番イメージのビルドと起動

```bash
# ビルド
docker-compose -f docker-compose.prod.yml build

# 起動
docker-compose -f docker-compose.prod.yml up -d

# 状態確認
docker-compose -f docker-compose.prod.yml ps
```

### 3. OpenLDAP設定

OpenLDAPの設定は管理画面から行えます：

1. **管理画面へアクセス**: `http://172.16.2.222/admin/openldap?tab=settings`
2. **設定項目**:
   - サーバーURL（例: `ldap://ldap.example.com:389`）
   - ベースDN（例: `ou=Users,dc=example,dc=com`）
   - バインドDN・パスワード（オプション）
   - 有効/無効トグル

設定はデータベースに保存され、環境変数を使わずに本番環境で変更可能です。

#### 旧方式：スクリプトによる初期化（非推奨）

```bash
docker exec box1-nextjs-prod npx tsx /app/scripts/init-ldap-config.ts
```

### 4. ヘルスチェック

```bash
curl -I http://172.16.2.222/
docker-compose -f docker-compose.prod.yml logs nextjs | tail -60

# ビルドIDの確認（セッション自動無効化用）
curl -s http://127.0.0.1:8888/api/health | jq .buildId
```

確認メッセージ：
- ✅ "All migrations have been successfully applied."
- ✅ "✅ Database seeded successfully!"
- ✅ "✓ Ready in XXms"

### 5. ビルドIDによるセッション自動無効化

Dockerイメージのビルド時にタイムスタンプベースのビルドID（例: `BUILD_20260130_082049`）が自動生成される。
このIDはJWTトークンに埋め込まれ、再デプロイ後に旧セッションのユーザーは自動的にログイン画面へリダイレクトされる。

- **開発環境**: `build-id`ファイルが存在しないため、ビルドIDは`"dev"`となり検証はスキップされる
- **本番環境**: 再デプロイ（`docker build` → `docker compose up -d`）で新しいビルドIDが生成され、旧セッションが無効化される
- **確認方法**: `/api/health`エンドポイントの`buildId`フィールドで現在のビルドIDを確認可能
- **読み込み方式**: `next.config.ts`（Node.js Runtime）が`build-id`ファイルを読み込み`NEXT_BUILD_ID`環境変数にセット → `auth.config.ts`（Edge Runtime）は`process.env.NEXT_BUILD_ID`を参照。Edge Runtimeでは`fs`モジュールが使用不可のため、環境変数経由で受け渡す
- **重要**: ビルドID検証はmiddleware.tsで`/login`のパブリックルート判定の中でも行う必要がある。保護ルートでのみCookie削除＋`/login`リダイレクトを行うと、`/login`側で「セッションあり→`/dashboard`へ」→「ビルドID不一致→`/login`へ」の無限ループが発生する

## 運用コマンド

```bash
# ログ確認（リアルタイム）
docker-compose -f docker-compose.prod.yml logs -f nextjs

# 再起動
docker-compose -f docker-compose.prod.yml restart

# 停止
docker-compose -f docker-compose.prod.yml down

# Prisma Studio
docker exec -it box1-nextjs-prod npx prisma studio
```

## データベース

| 環境 | データベース | 接続先 |
|-----|------------|-------|
| 開発 | PostgreSQL 16 | localhost:5432 (Docker) |
| 本番 | PostgreSQL 16 | postgres:5432 (Docker) |

### 開発環境セットアップ

```bash
docker-compose -f docker-compose.dev.yml up -d postgres
npx prisma db push
npm run db:seed
```

## トラブルシューティング

### OpenLDAP認証が動かない

1. **管理画面で設定確認**: `/admin/openldap?tab=settings`
   - サーバーURLが正しいか確認
   - 「接続テスト」ボタンで接続確認
   - 有効/無効トグルがONになっているか確認

2. **ログ確認**:
```bash
docker-compose -f docker-compose.prod.yml logs nextjs | grep -i ldap
```

3. **データベース設定の確認**:
```bash
docker exec -it box1-nextjs-prod npx prisma studio
# OpenLdapConfigテーブルを確認
```

### PostgreSQL接続できない

```bash
docker-compose -f docker-compose.prod.yml logs postgres
docker-compose -f docker-compose.prod.yml restart postgres
```

## 管理者アカウント

```
Email: admin@example.com
Password: password
Role: ADMIN
```

**重要**: 本番環境では初回ログイン後にパスワードを変更してください。
