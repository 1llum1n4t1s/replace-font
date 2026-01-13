# NotoSansへ置換するやつ(改修型)

[![Version](https://img.shields.io/badge/version-2.0.3-blue.svg)](https://github.com/1llum1n4t1s/replace-font)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

読みづらい日本語フォントを自動的に **Noto Sans** に置換するブラウザ拡張機能です。パフォーマンス最適化済み。

## 🎯 特徴

- ⚡ **高速処理**: 最適化されたフォントプリロード機構
- 🔄 **自動検出**: 複数の日本語フォントを自動で検出・置換
- 🖼️ **iframe対応**: 動的に追加されるiframe内のフォントも置換
- 🎨 **カスタムアイコン**: SVGから自動生成されるアイコン
- 🚀 **Manifest V3**: 最新のChrome拡張仕様に対応
- 💾 **軽量**: ローカルフォントがない場合は拡張機能内蔵フォントを読み込む

## 📥 インストール

### Chrome
https://chromewebstore.google.com/detail/ipfbjlmjgfobhnncbggaaiknhdgkcdfe

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

## 💡 推奨設定

さらに多くのサイトで文字を美しく表示するには、ブラウザのデフォルトフォント設定を変更することをおすすめします。

詳細: [Chrome のフォントを美しい Noto Sans にする方法](https://r-40021.github.io/blog/2022-05/font)

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下でライセンスされています。

### フォントライセンス

Noto Sans CJK JP は [SIL Open Font License 1.1](fonts/LICENSE) の下で提供されています。

## 🔖 バージョン管理

バージョン番号は `package.json` で一元管理されており、パッケージング時に自動的に `manifest.json` と同期されます。

**バージョンを更新する場合:**

```bash
# package.json のバージョンを更新
npm version minor  # または patch, major
```

パッケージング時（`./zip.sh` または `./zip.ps1` 実行時）に、`manifest.json` のバージョンが自動同期されます。

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

### License

MIT License - See [LICENSE](LICENSE) file for details.

Noto Sans CJK JP fonts are licensed under the [SIL Open Font License 1.1](fonts/LICENSE).
