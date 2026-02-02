---
name: 認証アーキテクチャ
description: Edge Runtime対応、OAuth設定、LDAP認証フロー、LDAPマイグレーション。認証機能の実装・設定・デバッグ時に使用。
---

# 認証アーキテクチャ

## Edge Runtime対応

Next.js 15のmiddlewareはEdge Runtimeで動作するため、認証設定を分離。

| ファイル | ランタイム | 用途 |
|---------|-----------|------|
| `/auth.config.ts` | Edge | middleware用（OAuth） |
| `/auth.ts` | Node.js | APIルート用（LDAP含む） |
| `/middleware.ts` | Edge | auth.config.tsを使用 |

```typescript
// auth.config.ts - Edge Runtime用
// ldaptsを含まない、Node.js専用モジュール（fs等）も使用不可
// ビルドIDはprocess.env.NEXT_BUILD_ID経由で取得（next.config.tsでセット済み）
export default {
  providers: [Google, GitHub],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.buildId = process.env.NEXT_BUILD_ID || "dev";
      }
    }
  }
}

// auth.ts - Node.js Runtime用
// Dynamic Importでldaptsを遅延ロード
import ldapConfig from "./auth.config";
// LDAP/OpenLDAPプロバイダーを追加
```

**注意**: `auth.config.ts`はEdge Runtimeで実行されるため、`fs`モジュール等のNode.js専用APIは使用不可。ビルドIDの読み込みは`next.config.ts`（Node.js Runtime）が`build-id`ファイルから読み込み`NEXT_BUILD_ID`環境変数にセットする方式を採用。

---

## OAuth設定

管理画面（システム情報タブ）で個別に有効化/無効化。

| プロバイダー | 環境変数 | 管理画面設定キー |
|-------------|----------|-----------------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `google_oauth_enabled` |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `github_oauth_enabled` |

### 設定手順

1. 環境変数にクライアントID/シークレットを設定
2. 管理画面 → システム情報 → 認証設定でトグルを有効化
3. ログイン画面にOAuthボタンが表示される

### ログイン画面の表示ロジック

```typescript
// app/login/page.tsx
// DBから google_oauth_enabled / github_oauth_enabled を取得
// 有効なプロバイダーのみ OAuthButtons に渡す
// OpenLDAPとOAuthの両方が有効な場合はセパレーターで区切り
```

---

## LDAP認証フロー

```
1. ログイン画面でユーザー名/パスワード入力
2. /api/auth/callback/ldap がNode.js Runtimeで実行
3. LdapMigrationServiceで認証（Legacy LDAP + OpenLDAP対応）
4. JWTトークン発行
```

---

## LDAPマイグレーション（ldap-migrationモジュール）

レガシーLDAPからOpenLDAPへのLazy Migration機能。

### 認証フロー

```
1. ユーザーがOpenLDAPでログイン試行
2. 認証失敗 & モジュールが有効な場合
3. レガシーLDAPで認証を試行
4. 成功した場合:
   - Employee（会社組織）からメールで社員情報取得
   - OpenLDAPに新規ユーザーを自動作成
   - User/LdapUserMappingを作成（migrated=true）
5. マイグレーション完了後はモジュールを無効化
```

### 設定場所

モジュール管理画面（`/admin?tab=modules`）

### 設定項目

- サーバURL: `ldap://ldap.example.com:389`
- ベースDN: `ou=Users,dc=example,dc=com`
- 検索フィルタ: `(uid={username})`
- タイムアウト: ミリ秒

### テスト機能

- **接続テスト**: サーバへの接続確認
- **ユーザー検索**: ユーザー名でLDAP検索
- **認証テスト**: ユーザー名/パスワードで認証確認

---

## 環境変数

```env
# 認証
AUTH_SECRET=<生成された秘密鍵>
AUTH_URL=http://localhost:3000

# OAuth（オプション）
GOOGLE_CLIENT_ID=<Google OAuthクライアントID>
GOOGLE_CLIENT_SECRET=<Google OAuthクライアントシークレット>
GITHUB_CLIENT_ID=<GitHub OAuthクライアントID>
GITHUB_CLIENT_SECRET=<GitHub OAuthクライアントシークレット>
```
