#!/bin/bash

# Chrome Web Store用のZIPファイルを作成するスクリプト

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

