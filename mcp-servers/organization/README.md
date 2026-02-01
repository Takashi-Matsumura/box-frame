# Organization MCP Server

BoxFrameの会社組織モジュールを外部の生成AIから利用可能にするMCPサーバです。
読み取り専用で、組織構造と社員情報の取得・検索のみをサポートします。

## 機能

読み取り専用で以下の機能を提供します：

| ツール名 | 説明 |
|----------|------|
| `org_check_status` | DB接続状態を確認 |
| `org_get_structure` | 組織階層ツリーを取得（本部→部→課、各レベルの社員数・管理者情報含む） |
| `org_list_departments` | 本部一覧を取得（社員数、管理者情報付き） |
| `org_list_employees` | 社員一覧を取得（本部/部/課でフィルタ、ページネーション対応） |
| `org_get_employee` | 社員詳細を取得（社員番号 or UUID指定） |
| `org_search_employees` | 社員を検索（名前、メール、社員番号で部分一致） |

## セットアップ

### 1. 依存関係のインストール

```bash
cd mcp-servers/organization
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
    "organization": {
      "command": "node",
      "args": ["/path/to/project/mcp-servers/organization/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/dbname?schema=public"
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
    "organization": {
      "command": "node",
      "args": ["mcp-servers/organization/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/dbname?schema=public"
      }
    }
  }
}
```

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `DATABASE_URL` | PostgreSQL接続文字列 | なし（必須） |

## 使用例

Claude に対して以下のような質問ができます：

- 「組織図の全体構造を教えて」
- 「営業本部の社員一覧を表示して」
- 「社員番号EMP001の詳細を教えて」
- 「田中という名前の社員を検索して」
- 「各本部の社員数を一覧で見せて」

## セキュリティ

- **読み取り専用**: 組織・社員データの作成・更新・削除は行えません
- **PUBLISHED組織のみ**: ドラフトやアーカイブ状態の組織データは参照されません
- **環境変数**: DB接続情報は環境変数で管理します
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
