#!/bin/bash

# Chrome Web Store用のZIPファイルを作成するスクリプト

# バージョン同期: package.json から全ファイルにバージョンを自動同期
echo "Version syncing..."
PACKAGE_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')

# 更新対象ファイル
FILES_TO_UPDATE=("manifest.json" "README.md" "docs/index.html" "src/popup/popup.html" "webstore/screenshots/01-popup-ui.html" "webstore/screenshots/03-hero-promo.html" "webstore/screenshots/04-promo-small.html" "webstore/screenshots/05-promo-marquee.html")

for file in "${FILES_TO_UPDATE[@]}"; do
    if [ -f "$file" ]; then
        # バージョン番号を置換（macOS対応）
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$PACKAGE_VERSION/g" "$file"
            sed -i '' "s/Version [0-9]\+\.[0-9]\+\.[0-9]\+/Version $PACKAGE_VERSION/g" "$file"
            sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$PACKAGE_VERSION\"/g" "$file"
            sed -i '' "s/version-[0-9]\+\.[0-9]\+\.[0-9]\+-/version-$PACKAGE_VERSION-/g" "$file"
        else
            sed -i "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$PACKAGE_VERSION/g" "$file"
            sed -i "s/Version [0-9]\+\.[0-9]\+\.[0-9]\+/Version $PACKAGE_VERSION/g" "$file"
            sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$PACKAGE_VERSION\"/g" "$file"
            sed -i "s/version-[0-9]\+\.[0-9]\+\.[0-9]\+-/version-$PACKAGE_VERSION-/g" "$file"
        fi
    fi
done

echo "Version synced: $PACKAGE_VERSION"
echo ""

# CSS生成
echo "🎨 CSSを生成中..."
node scripts/generate-css.js
if [ $? -ne 0 ]; then
  echo "❌ CSS生成に失敗しました"
  exit 1
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
  icons/ \
  src/ \
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

