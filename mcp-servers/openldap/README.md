# OpenLDAP MCP Server

BoxFrameのOpenLDAPモジュールを外部の生成AIから利用可能にするMCPサーバです。

## 機能

読み取り専用で以下の機能を提供します：

| ツール名 | 説明 |
|----------|------|
| `ldap_check_status` | サーバー接続状態を確認 |
| `ldap_list_users` | ユーザー一覧を取得 |
| `ldap_get_user` | ユーザー詳細を取得 |
| `ldap_search_users` | ユーザーを検索 |
| `ldap_user_exists` | ユーザー存在確認 |

## セットアップ

### 1. 依存関係のインストール

```bash
cd mcp-servers/openldap
npm install
```

### 2. ビルド

```bash
npm run build
```

### 3. Claude Desktop に設定

`~/Library/Application Support/Claude/claude_desktop_config.json` を編集：

```json
{
  "mcpServers": {
    "openldap": {
      "command": "node",
      "args": ["/path/to/lion-frame/mcp-servers/openldap/dist/index.js"],
      "env": {
        "OPENLDAP_URL": "ldap://localhost:390",
        "OPENLDAP_ADMIN_DN": "cn=admin,dc=boxframe,dc=local",
        "OPENLDAP_ADMIN_PASSWORD": "admin",
        "OPENLDAP_BASE_DN": "dc=boxframe,dc=local",
        "OPENLDAP_USERS_OU": "ou=users,dc=boxframe,dc=local"
      }
    }
  }
}
```

### 4. Claude Code に設定

プロジェクトの `.mcp.json` を編集：

```json
{
  "mcpServers": {
    "openldap": {
      "command": "node",
      "args": ["mcp-servers/openldap/dist/index.js"],
      "env": {
        "OPENLDAP_URL": "ldap://localhost:390",
        "OPENLDAP_ADMIN_DN": "cn=admin,dc=boxframe,dc=local",
        "OPENLDAP_ADMIN_PASSWORD": "admin",
        "OPENLDAP_BASE_DN": "dc=boxframe,dc=local",
        "OPENLDAP_USERS_OU": "ou=users,dc=boxframe,dc=local"
      }
    }
  }
}
```

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `OPENLDAP_URL` | LDAPサーバーURL | `ldap://localhost:389` |
| `OPENLDAP_ADMIN_DN` | 管理者DN | `cn=admin,dc=boxframe,dc=local` |
| `OPENLDAP_ADMIN_PASSWORD` | 管理者パスワード | `admin` |
| `OPENLDAP_BASE_DN` | ベースDN | `dc=boxframe,dc=local` |
| `OPENLDAP_USERS_OU` | ユーザーOU | `ou=users,dc=boxframe,dc=local` |
| `OPENLDAP_TIMEOUT` | タイムアウト（ms） | `10000` |

## 使用例

Claude に対して以下のような質問ができます：

- 「LDAPに登録されているユーザー一覧を表示して」
- 「adminユーザーの詳細を教えて」
- 「社員番号12345のユーザーを検索して」
- 「testというユーザーは存在する？」

## セキュリティ

- **読み取り専用**: ユーザーの作成・更新・削除は行えません
- **環境変数**: パスワードなどの機密情報は環境変数で管理します
- **ローカル実行**: MCPサーバはローカルで実行され、外部に公開されません

## 開発

```bash
# 開発モード（ファイル変更を監視）
npm run dev

# ビルド
npm run build

# 実行
npm start
```
