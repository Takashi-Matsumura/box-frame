---
name: 生成AIサービス
description: AIプロバイダー設定、外部向けAPI（generate/summarize/extract）、RAGバックエンド、MCP。AI機能の実装・設定・利用時に使用。
---

# 生成AIサービス

翻訳などのAI機能を提供するコアモジュール。

---

## 対応プロバイダー

### ローカルLLM（推奨）

APIキー不要でローカルで動作。

| サーバ | デフォルトエンドポイント |
|--------|------------------------|
| **llama.cpp** | `http://localhost:8080/v1/chat/completions` |
| **LM Studio** | `http://localhost:1234/v1/chat/completions` |
| **Ollama** | `http://localhost:11434/api/chat` |

### クラウドAPI

| プロバイダー | 推奨モデル |
|-------------|-----------|
| OpenAI | gpt-4o-mini |
| Anthropic | claude-3-haiku |

---

## 管理画面設定

`/admin?tab=system` → AI設定:

1. AI機能の有効/無効切り替え
2. プロバイダー選択
3. ローカルLLM: サーバ選択、URL、モデル名、接続テスト
4. クラウドAPI: モデル選択、APIキー

---

## AIService直接利用

```typescript
import { AIService } from "@/lib/core-modules/ai";

// 利用可能か確認
const available = await AIService.isAvailable();

// 翻訳
const result = await AIService.translate({
  text: "こんにちは",
  sourceLanguage: "ja",
  targetLanguage: "en",
});

// 汎用テキスト生成
const result = await AIService.generate({
  input: "入力テキスト",
  systemPrompt: "AIへの指示",
  temperature: 0.5,
});

// 要約
const summary = await AIService.summarize({
  text: "長いテキスト",
  length: "short", // "short" | "medium" | "long"
  language: "ja",
});

// データ抽出
const extracted = await AIService.extract({
  text: "非構造化テキスト",
  schema: [
    { name: "field1", description: "説明", type: "string" },
  ],
});
```

---

## 外部モジュール向けAPI

### 汎用テキスト生成

```typescript
// POST /api/ai/services/generate
{
  input: "売上データ: 1月100万円",
  systemPrompt: "データを分析してください",
  temperature: 0.5,  // オプション（0-2）
  maxTokens: 1000,   // オプション
}
// Response: { output, provider, model }
```

### 要約

```typescript
// POST /api/ai/services/summarize
{
  text: "長い議事録テキスト...",
  length: "short",  // "short" | "medium" | "long"
  language: "ja",
}
// Response: { summary, provider, model }
```

### データ抽出

```typescript
// POST /api/ai/services/extract
{
  text: "田中太郎さん（35歳）は東京都在住",
  schema: [
    { name: "name", description: "人物の名前", type: "string", required: true },
    { name: "age", description: "年齢", type: "number" },
  ],
  language: "ja",
}
// Response: { data: { name, age, ... }, provider, model }
```

### 翻訳

```typescript
// POST /api/ai/translate
{
  text: "こんにちは",
  sourceLanguage: "ja",
  targetLanguage: "en",
}
// Response: { translatedText, provider, model }
```

---

## 人事評価モジュールでの利用

- 評価画面右側にAIアシスタントパネル
- RAGを使用した評価アドバイス
- クイックアクション（コメント作成、フィードバック例、成長目標）
- リアルタイムスコアをLLMに自動送信

### ナレッジベース機能

- RAGバッジクリックでドキュメント一覧表示
- マークダウンプレビュー対応

### 評価AIナレッジ管理画面

`/admin/evaluation-rag`:
- ドキュメント登録（タイトル、カテゴリ、内容）
- 一覧表示・プレビュー・削除

---

## MCPサーバー

外部AI連携用のMCPサーバー。

### OpenLDAP MCPサーバー

`mcp-servers/openldap/` に配置。読み取り専用。

**ツール:**
| ツール名 | 説明 |
|----------|------|
| `ldap_check_status` | 接続状態確認 |
| `ldap_list_users` | ユーザー一覧 |
| `ldap_get_user` | ユーザー詳細 |
| `ldap_search_users` | ユーザー検索 |
| `ldap_user_exists` | 存在確認 |

**セットアップ:**
```bash
cd mcp-servers/openldap
npm install && npm run build
```

**Claude Code設定 (.mcp.json):**
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
