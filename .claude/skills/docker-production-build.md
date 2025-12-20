# 本番環境用Dockerイメージの作成・エクスポート・インポート手順

このスキルは、**別のPC（開発PC）で本番環境用Dockerイメージを作成し、本番サーバーに転送する**手順を説明します。

## 前提条件

### 開発PC（イメージ作成側）
- Docker Desktopがインストールされている
- プロジェクトのソースコードがある
- インターネット接続（依存関係のダウンロード用）

### 本番サーバー（イメージインポート側）
- Docker Desktopがインストールされている
- docker-compose.prod.ymlがある
- 十分なディスク容量（イメージサイズ + データボリューム）

---

## フェーズ1: 開発PCでのDockerイメージ作成

### 1-1. プロジェクトの準備

```bash
# プロジェクトディレクトリに移動
cd ~/projects/ted-box1

# 最新のコードをプル（GitHubを使用している場合）
git pull origin main

# 不要なビルドキャッシュをクリア
rm -rf .next node_modules
npm install
```

### 1-2. 環境変数の確認

`.env`ファイルが**本番環境用**の設定になっているか確認：

```bash
cat .env
```

**重要な環境変数:**
- `DATABASE_URL`: PostgreSQL接続先（本番サーバーのPostgreSQL）
- `AUTH_SECRET`: 本番用のシークレット
- `LDAP_URL`, `OPENLDAP_URL`: 本番LDAP設定

**注意:** `.env`ファイルはDockerイメージに含まれません（.dockerignoreに記載）。
本番サーバーで別途設定が必要です。

### 1-3. Dockerfileの確認

以下のファイルが正しく配置されているか確認：

```bash
# ✅ これらのファイルが存在することを確認
ls -la Dockerfile
ls -la next.config.ts
ls -la scripts/docker-init.sh
ls -la .dockerignore
```

**Dockerfile**: 4段階のマルチステージビルド
- `base`: Node.js 20ベースイメージ
- `deps`: 依存関係のインストール
- `builder`: Next.jsビルド + Prisma生成
- `runner`: 本番環境用の最小イメージ

**next.config.ts**: `output: "standalone"` が設定されている

**docker-init.sh**: データベース初期化スクリプト

### 1-4. プロキシ環境の設定（社内プロキシがある場合）

```bash
# プロキシ環境変数を設定
export HTTP_PROXY=http://proxy.occ.co.jp:8080
export HTTPS_PROXY=http://proxy.occ.co.jp:8080
export NO_PROXY=localhost,127.0.0.1,172.16.0.0/12
```

### 1-5. Dockerイメージのビルド

**方法1: docker-compose経由（推奨）**

```bash
docker-compose -f docker-compose.prod.yml build nextjs
```

**方法2: 直接dockerコマンド**

```bash
docker build \
  --build-arg HTTP_PROXY=http://proxy.occ.co.jp:8080 \
  --build-arg HTTPS_PROXY=http://proxy.occ.co.jp:8080 \
  --build-arg NO_PROXY=localhost,127.0.0.1,172.16.0.0/12 \
  -t box1-nextjs:latest \
  -f Dockerfile \
  .
```

**ビルド時間:** 初回は10〜15分程度（依存関係のダウンロード含む）

### 1-6. ビルド成功の確認

```bash
# イメージが作成されたか確認
docker images | grep box1-nextjs

# 出力例:
# box1-nextjs    latest    a1b2c3d4e5f6   2 minutes ago   1.2GB
```

**イメージサイズの目安:**
- Next.jsアプリ: 約1.2GB
- OpenLDAP: 約300MB
- PostgreSQL: 約250MB

---

## フェーズ2: Dockerイメージのエクスポート

### 2-1. イメージをtarファイルにエクスポート

```bash
# Next.jsイメージをエクスポート
docker save -o box1-nextjs-latest.tar box1-nextjs:latest

# ファイルサイズを確認
ls -lh box1-nextjs-latest.tar

# 出力例:
# -rw-r--r--  1 user  staff   1.1G Dec 15 12:34 box1-nextjs-latest.tar
```

**ファイルサイズ:** 圧縮されていないため、イメージサイズとほぼ同じ

### 2-2. （オプション）圧縮してサイズを削減

```bash
# gzipで圧縮（サイズが約1/3に削減）
gzip box1-nextjs-latest.tar

# 圧縮後のサイズを確認
ls -lh box1-nextjs-latest.tar.gz

# 出力例:
# -rw-r--r--  1 user  staff   380M Dec 15 12:35 box1-nextjs-latest.tar.gz
```

**圧縮のメリット:**
- ファイルサイズが約1/3に削減（転送時間短縮）
- ネットワーク転送のコスト削減

**圧縮のデメリット:**
- 圧縮・解凍の時間が必要（各2〜3分）

### 2-3. チェックサム（整合性確認）の作成

```bash
# SHA256チェックサムを作成
shasum -a 256 box1-nextjs-latest.tar.gz > box1-nextjs-latest.tar.gz.sha256

# チェックサムを確認
cat box1-nextjs-latest.tar.gz.sha256
```

**重要:** 本番サーバーで受信後、このチェックサムと比較してファイルの破損を検出します。

---

## フェーズ3: 本番サーバーへの転送

### 3-1. ファイル転送方法の選択

**方法A: USBメモリ・外付けHDD（物理転送）**

```bash
# USBメモリにコピー
cp box1-nextjs-latest.tar.gz /Volumes/USB_DRIVE/

# チェックサムもコピー
cp box1-nextjs-latest.tar.gz.sha256 /Volumes/USB_DRIVE/
```

**方法B: scp（SSH転送）**

```bash
# scpでサーバーに転送
scp box1-nextjs-latest.tar.gz matsumura@172.16.2.222:~/

# チェックサムも転送
scp box1-nextjs-latest.tar.gz.sha256 matsumura@172.16.2.222:~/
```

**方法C: 共有フォルダ（ネットワークドライブ）**

```bash
# 共有フォルダにコピー
cp box1-nextjs-latest.tar.gz /Volumes/SharedFolder/
cp box1-nextjs-latest.tar.gz.sha256 /Volumes/SharedFolder/
```

---

## フェーズ4: 本番サーバーでのイメージインポート

### 4-1. ファイルの整合性確認

```bash
# 本番サーバーにSSHまたは直接ログイン
cd ~

# チェックサムを検証
shasum -a 256 -c box1-nextjs-latest.tar.gz.sha256

# 出力:
# box1-nextjs-latest.tar.gz: OK  ← 成功
```

**エラーが出た場合:**
- ファイルが破損している可能性があります
- 再度転送してください

### 4-2. 圧縮ファイルの解凍（圧縮した場合のみ）

```bash
# gzipを解凍
gunzip box1-nextjs-latest.tar.gz

# 解凍後のファイルを確認
ls -lh box1-nextjs-latest.tar
```

### 4-3. Dockerイメージのインポート

```bash
# tarファイルからDockerイメージをロード
docker load -i box1-nextjs-latest.tar

# 出力例:
# Loaded image: box1-nextjs:latest
```

**所要時間:** 約3〜5分

### 4-4. インポートの確認

```bash
# イメージが正しくロードされたか確認
docker images | grep box1-nextjs

# 出力例:
# box1-nextjs    latest    a1b2c3d4e5f6   10 minutes ago   1.2GB
```

**重要:** イメージIDが開発PCと同じであることを確認してください。

---

## フェーズ5: docker-composeでの起動

### 5-1. 環境変数の設定

```bash
cd ~/projects/ted-box1

# .envファイルを作成・編集
nano .env
```

**.envの必須項目:**

```env
# PostgreSQL
POSTGRES_PASSWORD=secure-production-password

# NextAuth.js
AUTH_SECRET=<openssl rand -base64 32で生成>
AUTH_URL=http://172.16.2.222

# LDAP（旧LDAP）
LDAP_URL=ldap://ldap.es.occ.co.jp:389
LDAP_BIND_DN=cn=admin,dc=occ,dc=co,dc=jp
LDAP_BIND_PASSWORD=<LDAP管理者パスワード>
LDAP_SEARCH_BASE=ou=Users,dc=occ,dc=co,dc=jp
LDAP_SEARCH_FILTER=(uid={username})

# OpenLDAP（新LDAP）
OPENLDAP_ADMIN_PASSWORD=<OpenLDAP管理者パスワード>
OPENLDAP_CONFIG_PASSWORD=config-password

# モジュール設定
NEXT_PUBLIC_ENABLE_HR_EVALUATION=true
NEXT_PUBLIC_ENABLE_BACKOFFICE=false
NEXT_PUBLIC_ENABLE_BI=false
```

### 5-2. ボリュームディレクトリの作成

```bash
# データボリューム用ディレクトリを作成
mkdir -p ~/docker-volumes/box1/data
mkdir -p ~/docker-volumes/box1/uploads
mkdir -p ~/docker-volumes/box1/chroma_data
mkdir -p ~/docker-volumes/box1/model_cache
mkdir -p ~/docker-volumes/box1/openldap/data
mkdir -p ~/docker-volumes/box1/openldap/config
```

### 5-3. docker-compose.prod.ymlの確認

ボリュームパスが正しいユーザー名になっているか確認：

```bash
# 現在のユーザー名を確認
whoami

# docker-compose.prod.ymlのボリュームパスを確認
grep -A3 "device:" docker-compose.prod.yml
```

**修正が必要な場合:**

```yaml
volumes:
  box1-data:
    driver_opts:
      device: /Users/<現在のユーザー名>/docker-volumes/box1/data
```

### 5-4. 本番環境の起動

```bash
# すべてのサービスを起動
docker-compose -f docker-compose.prod.yml up -d

# 起動状態を確認
docker-compose -f docker-compose.prod.yml ps
```

**期待される出力:**

```
NAME                    STATUS              PORTS
box1-nextjs-prod        Up (healthy)        3000/tcp
box1-postgres-prod      Up (healthy)        5432/tcp
box1-openldap-prod      Up (healthy)        0.0.0.0:172.16.2.222:389->389/tcp
box1-nginx-prod         Up (healthy)        0.0.0.0:80->80/tcp
box1-airag-backend-prod Up (healthy)        8000/tcp
```

### 5-5. ログの確認

```bash
# Next.jsのログを確認
docker-compose -f docker-compose.prod.yml logs nextjs | tail -50

# データベース初期化のログを確認
docker-compose -f docker-compose.prod.yml logs nextjs | grep -E "(prisma|データベース|初期化)"
```

**正常に起動した場合のログ:**

```
✓ データベースの初期化が完了しました
✓ 初期化完了
✓ Ready in 2345ms
```

### 5-6. LDAP設定の初期化

```bash
# LDAP設定をデータベースに初期化
docker exec box1-nextjs-prod npx tsx /app/scripts/init-ldap-config.ts
```

### 5-7. 動作確認

```bash
# HTTPアクセスを確認
curl -I http://172.16.2.222/

# 出力例:
# HTTP/1.1 200 OK
```

ブラウザで http://172.16.2.222/ にアクセスして、ログイン画面が表示されることを確認。

---

## トラブルシューティング

### 問題1: イメージのビルドが失敗する

**症状:**
```
ERROR [builder 6/6] RUN npm run build
```

**原因と対策:**

1. **メモリ不足**
   ```bash
   # Docker Desktopのメモリを8GB以上に増やす
   # Docker Desktop → Settings → Resources → Memory
   ```

2. **プロキシ設定が間違っている**
   ```bash
   # プロキシ環境変数を確認
   echo $HTTP_PROXY
   echo $HTTPS_PROXY
   ```

3. **ソースコードにエラーがある**
   ```bash
   # ローカルでビルドを確認
   npm run build
   ```

### 問題2: イメージのエクスポートが失敗する

**症状:**
```
Error response from daemon: reference does not exist
```

**対策:**
```bash
# イメージが存在するか確認
docker images | grep box1-nextjs

# イメージ名を確認してコマンドを修正
docker save -o box1-nextjs-latest.tar <正しいイメージ名>
```

### 問題3: イメージのインポートが失敗する

**症状:**
```
Error processing tar file(exit status 1): unexpected EOF
```

**原因:** ファイルが破損している

**対策:**
```bash
# チェックサムを再確認
shasum -a 256 -c box1-nextjs-latest.tar.gz.sha256

# ファイルを再転送
```

### 問題4: コンテナが起動しない

**症状:**
```
box1-nextjs-prod    Exited (1)
```

**対策:**
```bash
# ログを確認
docker-compose -f docker-compose.prod.yml logs nextjs

# よくあるエラー:
# - DATABASE_URLが間違っている → .envを修正
# - ポートが競合している → 使用中のポートを確認
# - ボリュームの権限がない → sudo chown -R $USER ~/docker-volumes
```

### 問題5: データベースの初期化が失敗する

**症状:**
```
Error: P1001: Can't reach database server
```

**対策:**
```bash
# PostgreSQLコンテナが起動しているか確認
docker-compose -f docker-compose.prod.yml ps postgres

# PostgreSQLのログを確認
docker-compose -f docker-compose.prod.yml logs postgres

# PostgreSQLを再起動
docker-compose -f docker-compose.prod.yml restart postgres
```

---

## ベストプラクティス

### 1. バージョン管理

イメージにバージョンタグを付けると、複数のバージョンを管理できます：

```bash
# ビルド時にバージョンタグを付ける
docker build -t box1-nextjs:v1.0.0 -t box1-nextjs:latest .

# エクスポート時にバージョン名を含める
docker save -o box1-nextjs-v1.0.0.tar box1-nextjs:v1.0.0
```

### 2. 定期的なイメージの更新

```bash
# 月次でイメージを再ビルド（セキュリティパッチ適用）
docker-compose -f docker-compose.prod.yml build --no-cache nextjs
```

### 3. イメージのバックアップ

```bash
# 本番環境で動作中のイメージをバックアップ
docker save -o ~/backups/box1-nextjs-$(date +%Y%m%d).tar box1-nextjs:latest
```

### 4. ディスク容量の管理

```bash
# 不要なイメージを削除
docker image prune -a

# 使用されていないボリュームを削除
docker volume prune
```

---

## チェックリスト

### 開発PC（ビルド側）

- [ ] プロジェクトのソースコードが最新
- [ ] Dockerfileが正しく配置されている
- [ ] next.config.tsに`output: "standalone"`が設定されている
- [ ] .dockerignoreが正しく配置されている
- [ ] プロキシ設定（必要な場合）
- [ ] `docker build`が成功
- [ ] `docker save`でエクスポート成功
- [ ] チェックサムファイルを作成

### 本番サーバー（インポート側）

- [ ] ファイルが正しく転送された
- [ ] チェックサムの検証が成功
- [ ] `docker load`が成功
- [ ] .envファイルが正しく設定されている
- [ ] ボリュームディレクトリが作成されている
- [ ] docker-compose.prod.ymlのパスが正しい
- [ ] `docker-compose up`が成功
- [ ] すべてのコンテナが`Up (healthy)`
- [ ] LDAP設定の初期化が成功
- [ ] ブラウザでアクセス可能

---

## まとめ

この手順により、**開発PCで作成したDockerイメージを本番サーバーに安全に転送・起動**できます。

**重要なポイント:**
1. イメージのビルドは`docker-compose build`で実行
2. エクスポートは`docker save`、インポートは`docker load`
3. チェックサムで整合性を必ず確認
4. .envファイルはイメージに含まれないため、本番サーバーで別途設定
5. ボリュームパスは現在のユーザー名に合わせて修正

**所要時間（目安）:**
- イメージビルド: 10〜15分
- エクスポート: 3〜5分
- 転送: 5〜30分（方法による）
- インポート: 3〜5分
- 起動: 2〜3分

**合計:** 約30〜60分
