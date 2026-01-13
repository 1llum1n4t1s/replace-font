#!/bin/bash

# Chrome Web Store用のZIPファイルを作成するスクリプト

# バージョン同期: package.json から manifest.json に自動同期
echo "Version syncing..."
PACKAGE_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')
MANIFEST_VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\([^"]*\)".*/\1/')

if [ "$MANIFEST_VERSION" != "$PACKAGE_VERSION" ]; then
    # jqがない場合は sed で対応
    if command -v jq &> /dev/null; then
        jq ".version = \"$PACKAGE_VERSION\"" manifest.json > manifest.json.tmp && mv manifest.json.tmp manifest.json
    else
        sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$PACKAGE_VERSION\"/" manifest.json
        rm -f manifest.json.bak
    fi
    echo "Version synced: $PACKAGE_VERSION"
else
    echo "Version already synced: $PACKAGE_VERSION"
fi
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
  preload-fonts.js \
  popup/ \
  css/ \
  fonts/ \
  icons/ \
  -x "*.DS_Store" "*.swp" "*~"

if [ $? -eq 0 ]; then
  echo "✅ ZIPファイルを作成しました: replace-font-chrome.zip"
  echo ""
  echo "📊 ファイルサイズ:"
  ls -lh ./replace-font-chrome.zip
  echo ""
  echo "📋 含まれているファイル:"
  unzip -l ./replace-font-chrome.zip
else
  echo "❌ ZIPファイルの作成に失敗しました"
  exit 1
fi

