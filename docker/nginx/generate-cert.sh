#!/bin/bash
# generate-cert.sh - mkcert で box2.occ.co.jp の自己署名証明書を生成

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CERT_DIR="$SCRIPT_DIR/certs"

# mkcert の存在チェック
if ! command -v mkcert &> /dev/null; then
  echo "mkcert がインストールされていません。"
  echo ""
  echo "インストール方法:"
  echo "  brew install mkcert"
  echo "  mkcert -install"
  echo ""
  exit 1
fi

mkdir -p "$CERT_DIR"

echo "box2.occ.co.jp の証明書を生成しています..."
mkcert -cert-file "$CERT_DIR/box2.occ.co.jp.pem" -key-file "$CERT_DIR/box2.occ.co.jp-key.pem" box2.occ.co.jp

echo ""
echo "証明書が生成されました:"
echo "  $CERT_DIR/box2.occ.co.jp.pem"
echo "  $CERT_DIR/box2.occ.co.jp-key.pem"
echo ""
echo "mkcert -install を実行済みであれば、ブラウザで警告なくアクセスできます。"
