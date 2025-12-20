# Git Security - 個人情報・機密情報の保護

git push実行前に必ず確認すること。GitHubへの個人情報漏洩を防止する。

## git push前のチェックリスト

以下のコマンドで機密ファイルがGit管理されていないことを確認：

```bash
# 機密ファイルの追跡状況を確認
echo "=== DBファイル ===" && git ls-files | grep -E "\.db" || echo "  なし ✓"
echo "=== .envファイル ===" && git ls-files | grep -E "\.env" || echo "  なし ✓"
echo "=== backupsディレクトリ ===" && git ls-files | grep "backups/" || echo "  なし ✓"
echo "=== 社員画像 ===" && git ls-files | grep "public/images/employees" || echo "  なし ✓"
```

## 保護対象ファイル（.gitignoreに設定済み）

| ファイル/ディレクトリ | 内容 | 理由 |
|---------------------|------|------|
| `*.db`, `*.db-journal` | SQLiteデータベース | 社員情報を含む |
| `*.db.backup*` | DBバックアップ | 社員情報を含む |
| `prisma/dev.db` | 開発用DB | 社員情報を含む |
| `data/` | データディレクトリ | 社員情報を含む可能性 |
| `.env*` | 環境変数 | APIキー、認証情報 |
| `backups/` | バックアップ | 社員データ、機密データ |
| `public/images/employees/` | 社員顔写真 | 個人情報（顔写真） |

## 誤ってコミットした場合の対処

```bash
# Git管理から削除（ファイルは残す）
git rm --cached <ファイルパス>

# .gitignoreに追加
echo "<パターン>" >> .gitignore

# コミット
git add .gitignore
git commit -m "fix: remove sensitive file from git tracking"
```

## 本番環境へのデプロイ

以下のファイルは手動でコピーが必要：

1. **社員顔写真** (`public/images/employees/`)
   - 開発環境からSCPやセキュアな方法で転送
   - GitHubを経由しない

2. **環境変数** (`.env.production`)
   - 本番サーバーで直接設定

## 新しいファイルタイプを追加する場合

個人情報や機密情報を含むファイルを新しく追加する場合：

1. `.gitignore`に追加
2. このSKILLsドキュメントを更新
3. チームに周知
