#!/bin/bash
set -e

# Chrome Web Store用のZIPファイルを作成するスクリプト
# バージョン同期ロジックは scripts/sync-version.js に一元化済み。

echo "🔄 バージョン同期中..."
node scripts/sync-version.js
echo ""

# CSS生成
echo "🎨 CSSを生成中..."
node scripts/generate-css.js
echo ""

# zipコマンドの確認
if ! command -v zip &> /dev/null; then
  echo "❌ zip をインストールしてください"
  echo "   sudo apt install zip"
  exit 1
fi

# 古いZIPファイルを削除
rm -f ./replace-font-chrome.zip

echo "📦 Chrome Web Store用のZIPファイルを作成中..."

# 必要なファイルのみをZIPに含める
zip -r ./replace-font-chrome.zip \
  manifest.json \
  icons/ \
  src/ \
  -x "*.DS_Store" "*.swp" "*~"

echo "✅ ZIPファイルを作成しました: replace-font-chrome.zip"
echo ""
echo "📊 ファイルサイズ:"
ls -lh ./replace-font-chrome.zip
echo ""
echo "📋 含まれているファイル:"
unzip -l ./replace-font-chrome.zip
