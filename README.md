# NotoSansへ置換するやつ(改修型)

[![Version](https://img.shields.io/badge/version-2.0.21-blue.svg)](https://github.com/1llum1n4t1s/replace-font)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

読みづらい日本語フォントを自動的に **Noto Sans** に置換するブラウザ拡張機能です。パフォーマンス最適化済み。

## 🎯 特徴

- ⚡ **高速処理**: 最適化されたフォントプリロード機構
- 🔄 **自動検出**: 複数の日本語フォントを自動で検出・置換
- 🖼️ **iframe対応**: 動的に追加されるiframe内のフォントも置換
- 🎨 **カスタムアイコン**: SVGから自動生成されるアイコン
- 🚀 **Manifest V3**: 最新のChrome拡張仕様に対応
- 💾 **軽量**: ローカルフォントがない場合は拡張機能内蔵フォント(Noto Sans JP)を読み込む

## 📥 インストール

### Chrome
https://chromewebstore.google.com/detail/ipfbjlmjgfobhnncbggaaiknhdgkcdfe

## 🔤 置換対象フォント

以下の**45個以上のフォント**が **Noto Sans JP** に自動置換されます：

### Microsoftフォント
- **MS Gothic** / MS ゴシック / ＭＳ ゴシック
- **MS PGothic** / MS Pゴシック / ＭＳ Ｐゴシック
- **MS UI Gothic**
- **Meiryo** / メイリオ
- **Meiryo UI**

### Adobeフォント
- **Yu Gothic** / 游ゴシック / YuGothic (W1〜W9のウェイト指定)
- **Yu Gothic Medium** / 游ゴシック Medium
- **Yu Gothic UI**

### ヒラギノシリーズ
- **Hiragino Kaku Gothic Pro** / ヒラギノ角ゴ Pro (W1〜W9のウェイト指定)
- **Hiragino Kaku Gothic ProN** / ヒラギノ角ゴ ProN (W1〜W9のウェイト指定)
- **Hiragino Sans** / ヒラギノ sans
- **Hiragino Sans Pro**

### その他フォント
- **M PLUS Rounded 1c**
- **Malgun Gothic**
- **Arial** / **ArialMT** / **Arial Unicode MS**
- **Roboto** / **RobotoDraft**
- **Helvetica**
- **Segoe UI**
- **Inter**

**ウェイト対応**: Regular (400) と Bold (700)

## 🔧 実装の詳細

### コアテクノロジー

#### フォント配信
- **preload-fonts.js**: Manifest V3対応のコンテンツスクリプト
  - `document_start`タイミングで高速実行
  - CSS Font Loading APIを使用した効率的なフォント読み込み
  - 複数ウェイトの動的管理

#### CSS生成
- **generate-css.js**: 自動CSS生成スクリプト
  - 45個以上のフォント定義を自動生成
  - ヒラギノ角ゴのW1〜W9ウェイト指定を動的に生成
  - ローカルフォント候補（Noto Sans JP、Noto Sans CJK）をフォールバック設定

#### パフォーマンス最適化
- **WeakSet**: 重複処理を防止（iframe処理）
- **DocumentFragment**: DOM操作のバッチ化
- **Debounce**: 複数iframe同時追加時の効率化（100ms）
- **requestIdleCallback**: ブラウザ余裕時のリソース解放

### アーキテクチャ

```
manifest.json
├── Content Script (preload-fonts.js)
│   ├── CSS注入 (iframe用)
│   ├── preloadタグ生成
│   └── CSS Font Loading API
├── 静的CSS (manifest.json)
│   ├── replacefont-extension-regular.css
│   └── replacefont-extension-bold.css
└── アイコン生成 (generate-icons.js)
    └── SVG → PNG (16x16, 48x48, 128x128)
```

### 置き換え仕組み

1. **@font-face定義**で指定フォント名をNoto Sans JPに再定義
2. **CSS Font Loading API**で明示的にフォント読み込み
3. **複数ウェイト対応**で細字・太字を個別管理
4. **ローカルフォント優先**で高速化（OSインストール版あれば使用）

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

- MS Gothic / MS ゴシック
- MS PGothic / MS Pゴシック
- Meiryo / メイリオ
- Yu Gothic / 游ゴシック (W1-W9 weights)
- Yu Gothic UI / Yu Gothic Medium
- Meiryo UI
- M PLUS Rounded 1c
- Malgun Gothic
- Arial Unicode MS / Arial / Helvetica
- Roboto / RobotoDraft
- Hiragino Kaku Gothic Pro / ProN (W1-W9 weights)
- Hiragino Sans / Sans Pro
- Segoe UI
- Inter
- And more... (45+ fonts total)

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
