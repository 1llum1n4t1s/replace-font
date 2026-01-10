# NotoSansへ置換するやつ（改修型）

[![Version](https://img.shields.io/badge/version-1.1.10-blue.svg)](https://github.com/1llum1n4t1s/replace-font)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

読みづらい日本語フォントを自動的に **Noto Sans** に置換するブラウザ拡張機能です。パフォーマンス最適化済み。

## 🎯 特徴

- ⚡ **高速処理**: 最適化されたフォントプリロード機構
- 🔄 **自動検出**: 複数の日本語フォントを自動で検出・置換
- 🖼️ **iframe対応**: 動的に追加されるiframe内のフォントも置換
- 🎨 **カスタムアイコン**: SVGから自動生成されるアイコン
- 🚀 **Manifest V3**: 最新のChrome拡張仕様に対応
- 💾 **軽量**: サブセット化されたフォントファイルで高速読み込み

## 📥 インストール

### Chrome
https://chrome.google.com/webstore/detail/oecglhldbofcklanmhckefiflhfhabdd

### Firefox
https://addons.mozilla.org/ja/firefox/addon/replace-with-noto/

## 🔤 置換対象フォント

以下のフォントが **Noto Sans** に自動置換されます：

- **MS Gothic** / MS ゴシック / ＭＳ ゴシック
- **MS PGothic** / MS Pゴシック / ＭＳ Ｐゴシック
- **MS UI Gothic**
- **Meiryo** / メイリオ
- **Meiryo UI**
- **Yu Gothic** / 游ゴシック / YuGothic
- **Yu Gothic Medium** / 游ゴシック Medium
- **Yu Gothic UI**
- **M PLUS Rounded 1c**
- **Malgun Gothic**
- **Arial Unicode MS**

## 🛠️ 技術仕様

### アーキテクチャ

```
replace-font/
├── manifest.json              # Chrome Extension Manifest V3
├── preload-fonts.js          # メインロジック（フォントプリロード & CSS注入）
├── popup/                    # 拡張機能ポップアップUI
│   ├── popup.html
│   └── style.css
├── css/                      # フォント置換CSS
│   ├── replacefont-extension-regular.css
│   └── replacefont-extension-bold.css
├── fonts/                    # サブセット化されたフォント
│   ├── NotoSansCJKjp-Regular-subset.woff2
│   └── NotoSansCJKjp-Bold-subset.woff2
├── icons/                    # アイコンファイル
│   ├── icon.svg             # ソースSVG
│   ├── icon-16x16.png
│   ├── icon-48x48.png
│   └── icon-128x128.png
└── scripts/
    └── generate-icons.js    # アイコン自動生成スクリプト
```

### 主要機能

#### 1. フォントプリロード機構 (`preload-fonts.js`)

- **効率的なキャッシュ**: ベースURL情報をキャッシュして重複計算を削減
- **ユニークID生成**: クラス名の衝突を防ぐためのタイムスタンプベースID
- **段階的読み込み**:
  1. フォントファイルをプリロード
  2. 読み込み成功後にCSS適用
  3. エラーハンドリング付き
- **iframe対応**:
  - 既存のiframeを自動検出
  - MutationObserverで動的に追加されるiframeを監視
  - 各iframeのcontentDocumentに個別にフォントを注入

#### 2. CSS Font-Face定義

- 複数の表記バリエーションに対応（全角/半角、大文字/小文字）
- `font-display: swap` でレイアウトシフトを防止
- フォールバック: `local()` → `chrome-extension://` → `local('BIZ UDPGothic')`

#### 3. カスタムアイコン生成

```bash
npm run generate-icons
```

`icons/icon.svg` から3サイズのPNGアイコンを自動生成：
- 16x16px（ツールバー）
- 48x48px（拡張機能管理）
- 128x128px（Webストア）

## 🔧 開発

### 必要な環境

- Node.js (v14以降)
- npm

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/1llum1n4t1s/replace-font.git
cd replace-font

# 依存パッケージをインストール
npm install

# アイコンを生成（オプション）
npm run generate-icons
```

### ローカルでのテスト

#### Chrome
1. `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このディレクトリを選択

#### Firefox
1. `about:debugging#/runtime/this-firefox` を開く
2. 「一時的なアドオンを読み込む」をクリック
3. `manifest.json` を選択

### ビルド & パッケージング

```bash
# 配布用ZIPを作成
./zip.sh
```

## 📝 パフォーマンス最適化

このバージョンでは以下の最適化を実施：

1. **効率的なリソース管理**
   - ベースURL情報のキャッシュ化
   - 不要な再計算の削減

2. **段階的CSS適用**
   - フォント読み込み完了後にCSSを適用
   - 初期レンダリングブロックの防止

3. **エラーハンドリング**
   - フォント読み込み失敗時の警告表示
   - グレースフルデグラデーション

4. **サブセット化フォント**
   - 日本語常用漢字に最適化されたサブセット
   - ファイルサイズの大幅削減

## 💡 推奨設定

さらに多くのサイトで文字を美しく表示するには、ブラウザのデフォルトフォント設定を変更することをおすすめします。

詳細: [Chrome のフォントを美しい Noto Sans にする方法](https://r-40021.github.io/blog/2022-05/font)

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下でライセンスされています。

### フォントライセンス

Noto Sans CJK JP は [SIL Open Font License 1.1](fonts/LICENSE) の下で提供されています。

## 🤝 コントリビューション

Issue報告やPull Requestを歓迎します。

---

## English

This is a browser extension that automatically replaces hard-to-read Japanese fonts with **Noto Sans**. Performance optimized.

### Features

- ⚡ High-performance font preloading mechanism
- 🔄 Automatic detection and replacement of multiple Japanese fonts
- 🖼️ Support for dynamically added iframes
- 🎨 Custom icons generated from SVG
- 🚀 Chrome Extension Manifest V3 compliant
- 💾 Lightweight with subset fonts for fast loading

### Replaced Fonts

- MS Gothic / MS ゴシック
- MS PGothic / MS Pゴシック
- Meiryo / メイリオ
- Yu Gothic / 游ゴシック
- Yu Gothic UI
- Meiryo UI
- M PLUS Rounded 1c
- Malgun Gothic
- Arial Unicode MS
- And more...

### Technical Highlights

**Smart Font Loading**:
1. Preload font files
2. Apply CSS after successful load
3. Error handling with console warnings

**iframe Support**:
- Detects existing iframes
- Monitors dynamically added iframes with MutationObserver
- Injects fonts into each iframe's contentDocument

**Custom Icon Generation**:
```bash
npm run generate-icons
```
Automatically generates 16x16, 48x48, and 128x128 PNG icons from SVG source.

### Development

```bash
# Install dependencies
npm install

# Generate icons (optional)
npm run generate-icons

# Load unpacked extension in Chrome
# Navigate to chrome://extensions/ and load this directory
```

### License

MIT License - See [LICENSE](LICENSE) file for details.

Noto Sans CJK JP fonts are licensed under the [SIL Open Font License 1.1](fonts/LICENSE).

---

![Font replacement example](https://user-images.githubusercontent.com/75155258/159868921-7dd6896a-19b0-41c9-86c3-8041ec9fe730.png)
