---
name: コアモジュール詳細
description: organization/system/aiモジュールの機能詳細、履歴管理、Prismaモデル。コアモジュール実装・拡張・デバッグ時に使用。
---

# コアモジュール詳細

## organizationモジュール

組織図と社員管理を提供するコアモジュール。

### 機能一覧

| 機能 | 説明 |
|------|------|
| 組織図表示 | 本部→部→課の階層ナビゲーション |
| 社員検索 | 名前・部署・役職で検索 |
| 社員詳細 | 基本情報 + キャリア履歴タブ |
| 組織整備 | 責任者設定、公開日設定 |
| データインポート | CSV/Excel対応 |
| 履歴管理 | スナップショット + 変更ログ |

### 組織図表示

```typescript
// 役職コード順ソート（一般社員は最後）
// 重複しない表示モード（評価関係表示）
// 本部→部→課の階層ナビゲーション
```

### 社員詳細モーダル

- **基本情報タブ**: 氏名、部署、役職、連絡先
- **キャリア履歴タブ**: 入社・異動・昇進・退職の時系列表示

### データインポート

```typescript
// CSV/Excel対応
// 役員・顧問の自動分類
// 重複検出・除外
// 変更タイプ自動判定: 新規/異動/昇進/退職/復職
```

### 履歴管理

| モデル | 用途 |
|--------|------|
| EmployeeHistory | 社員スナップショット（validFrom/validTo） |
| ChangeLog | フィールド単位の変更記録（batchId付き） |

---

## systemモジュール

システム管理機能を提供するコアモジュール。

### 機能一覧

| 機能 | パス |
|------|------|
| ダッシュボード | `/admin` |
| ユーザー管理 | `/admin?tab=users` |
| モジュール管理 | `/admin?tab=modules` |
| データ履歴 | `/admin?tab=history` |
| システム設定 | `/admin?tab=system` |
| 監査ログ | `/admin?tab=audit` |
| アナウンス | `/admin?tab=announcements` |

---

## aiモジュール

生成AI機能を提供するコアモジュール。

### モジュール構造

```
lib/core-modules/ai/
├── module.tsx        # モジュール定義
├── index.ts          # エクスポート
├── types.ts          # 型定義（AIConfig, ChatMessage等）
├── constants.ts      # 定数（LOCAL_LLM_DEFAULTS等）
├── services/
│   ├── ai-service.ts # メインサービス
│   └── token-utils.ts
└── providers/
    ├── openai-provider.ts
    ├── anthropic-provider.ts
    └── local-provider.ts
```

### 機能一覧

- AIチャット（ChatGPT風UI、ストリーミング対応）
- 翻訳API（日英相互翻訳）
- トークン統計表示

### RAGバックエンド

```bash
# Docker起動
docker compose up -d airag-backend

# ヘルスチェック
curl http://localhost:8000/health
```

構成:
- ChromaDB: ベクトルデータベース
- sentence-transformers: multilingual-e5-small
- SSEストリーミング対応

---

## Prismaモデル一覧（27モデル）

### 認証系
- Account, Session, User, VerificationToken

### 監査・通知系
- AuditLog, Notification, Announcement

### LDAP認証系
- LdapConfig, LdapUserMapping, LdapAuthLog, OpenLdapConfig, LegacyLdapConfig

### アクセス制御系
- Permission, AccessKey, AccessKeyPermission, UserAccessKey

### 組織系
- Organization, Department, Section, Course, Employee

### 履歴系
- EmployeeHistory, OrganizationHistory, ChangeLog

### システム系
- SystemSetting

### 業務分析系
- BusinessProcess
