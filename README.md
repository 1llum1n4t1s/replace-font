# NotoSansへ置換するやつ(改修型)

[![Version](https://img.shields.io/badge/version-2.0.26-blue.svg)](https://github.com/1llum1n4t1s/replace-font)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

読みづらい日本語フォントを自動的に **Noto Sans** に置換するブラウザ拡張機能です。パフォーマンス最適化済み。

## 🎯 特徴

- ⚡ **高速処理**: 最適化されたフォントプリロード機構
- 🔄 **自動検出**: 複数の日本語フォントを自動で検出・置換
- 🖼️ **iframe対応**: 動的に追加されるiframe内のフォントも置換
- 🌐 **CSP対応**: JavaScript経由でのCSS注入により厳格なCSPサイトでも動作
- 🔮 **Shadow DOM対応**: Web Componentsを使用したサイトでも正常に動作
- 🎨 **カスタムアイコン**: SVGから自動生成されるアイコン
- 🚀 **Manifest V3**: 最新のChrome拡張仕様に対応
- 💾 **軽量**: ローカルフォントがない場合は拡張機能内蔵フォント(Noto Sans JP)を読み込む

## 📥 インストール

### Chrome
https://chromewebstore.google.com/detail/ipfbjlmjgfobhnncbggaaiknhdgkcdfe

## 🔤 フォント置換

### 通常テキスト
すべてのテキストが **Noto Sans JP** に置換されます。

### コードブロック
コードブロック（`<code>`, `<pre>` など）には **UDEV Gothic JPDOC** が適用されます。

- **UDEV Gothic JPDOC**: プログラミング向けの等幅フォント
  - BIZ UDゴシック + JetBrains Mono の合成フォント
  - 日本語文書頻出記号が全角表示
  - 0（ゼロ）がスラッシュゼロで `O`（オー）と区別しやすい

**ウェイト対応**: Regular (400) と Bold (700)

## 🔧 実装の詳細

### コアテクノロジー

#### フォント配信
- **preload-fonts.js**: Manifest V3対応のコンテンツスクリプト
  - `document_start`タイミングで高速実行
  - CSS Font Loading APIを使用した効率的なフォント読み込み
  - 複数ウェイトの動的管理

#### フォント変換
- **convert-fonts.js**: TTF→WOFF2変換スクリプト
  - TTFファイルを自動検出してWOFF2に変換
  - ファイルサイズを約50%削減
  - 既存のWOFF2ファイルはスキップ

#### パフォーマンス最適化
- **WeakSet**: 重複処理を防止（iframe処理）
- **DocumentFragment**: DOM操作のバッチ化
- **Debounce**: 複数iframe同時追加時の効率化（100ms）
- **requestIdleCallback**: ブラウザ余裕時のリソース解放

### アーキテクチャ

```
manifest.json
├── Content Script (preload-fonts.js)
│   ├── CSS注入（メインドキュメント、Shadow DOM）
│   └── MutationObserver（Shadow DOM検出）
├── CSS (universal-override.css)
│   ├── Noto Sans JP（通常テキスト用）
│   └── UDEV Gothic JPDOC（コードブロック用）
├── フォント
│   ├── NotoSansJP-Regular.woff2
│   ├── NotoSansJP-Bold.woff2
│   ├── UDEVGothicJPDOC-Regular.woff2
│   └── UDEVGothicJPDOC-Bold.woff2
├── アイコン生成 (generate-icons.js)
│   └── SVG → PNG (16x16, 48x48, 128x128)
├── フォント変換 (convert-fonts.js)
│   └── TTF → WOFF2
└── スクリーンショット生成 (generate-screenshots.js)
    └── HTML → PNG (1280x800, 640x400, 440x280, 1400x560)
```

### 置き換え仕組み

1. **ユニバーサルセレクタ**で全要素のフォントを強制的に置換（`!important`）
2. **CSS Font Loading API**で明示的にフォント読み込み
3. **複数ウェイト対応**で細字・太字を個別管理
4. **ローカルフォント優先**で高速化（OSインストール版あれば使用）

**注意**: 以前のバージョンでは `@font-face` でフォント名を再定義する方法を使用していましたが、最新のChromeではシステムフォントが優先されるため、ユニバーサルセレクタによる強制置換に変更しました。

## 🛠️ 開発者向け

### ビルド方法

```bash
# 依存関係のインストール
npm install

# アイコン生成
npm run generate-icons

# フォント変換（TTFファイルがある場合）
npm run convert-fonts

# スクリーンショット生成（Chrome Web Store用）
npm run generate-screenshots

# すべてビルド + ZIP作成
# Windows PowerShell
.\zip.ps1

# Mac / Linux
./zip.sh
```

### 生成される画像

`zip.ps1` / `zip.sh` を実行すると、以下の画像が `webstore-images/` に自動生成されます：

- **スクリーンショット**: 1280x800 および 640x400（最大5枚）
- **プロモーションタイル（小）**: 440x280
- **マーキープロモーションタイル**: 1400x560

すべて PNG 形式（24ビット、アルファなし）で Chrome Web Store の仕様に準拠しています。

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下でライセンスされています。

### フォントライセンス

Noto Sans JP は [SIL Open Font License 1.1](fonts/LICENSE) の下で提供されています。


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

- **Normal text**: Replaced with **Noto Sans JP**
- **Code blocks**: Replaced with **UDEV Gothic JPDOC** (monospace font for programming)

### Implementation Details

#### Core Technologies
- **Manifest V3 Compliant**: Uses native extension API
- **CSS Font Loading API**: Efficient asynchronous font loading
- **WeakSet-based Deduplication**: Prevents duplicate processing
- **DOM Batching**: Uses DocumentFragment for performance
- **Debounce Mechanism**: Optimizes handling of multiple iframes

#### Performance Features
- Preload at `document_start` for early initialization
- Local font fallback (Noto Sans JP, Noto Sans CJK)
- Automatic resource cleanup via requestIdleCallback
- Optimized CSS generation with dynamic weight variants

### License

MIT License - See [LICENSE](LICENSE) file for details.

Noto Sans JP fonts are licensed under the [SIL Open Font License 1.1](fonts/LICENSE).
