# NotoSansへ置換するやつ(改修型)

[![Version](https://img.shields.io/badge/version-2.0.28-blue.svg)](https://github.com/1llum1n4t1s/replace-font)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

読みづらい日本語フォントを自動的に **Noto Sans** に置換するブラウザ拡張機能です。パフォーマンスを重視して最適化されています。

## 🎯 特徴

- ⚡ **高速処理**: ページの読み込みを妨げない高速なフォント適用
- 🔄 **自動置換**: サイト上の読みづらい日本語フォントを自動で検出して置換
- 🖼️ **幅広い対応**: iframeや動的なコンテンツ、モダンなウェブサイトの仕組み（Shadow DOM等）にも対応
- 🚀 **最新仕様**: 最新のブラウザ拡張仕様（Manifest V3）に準拠
- 💾 **軽量設計**: パフォーマンスを最適化し、必要なリソースのみを効率的に管理

## 📥 インストール

### Chrome ウェブストア
[こちらからインストール](https://chromewebstore.google.com/detail/ipfbjlmjgfobhnncbggaaiknhdgkcdfe)できます。

## 🔤 置換されるフォント

### 通常テキスト
標準的なテキストは **Noto Sans JP** に置換されます。

### コードブロック
プログラムのコードや等幅テキスト（`<code>`, `<pre>` など）には **UDEV Gothic JPDOC** が適用されます。

- **UDEV Gothic JPDOC**: プログラミングに最適な読みやすさを追求した等幅フォント
  - BIZ UDゴシック + JetBrains Mono をベースにした合成フォント
  - 日本語文書で頻出する記号を全角で表示
  - 0（ゼロ）と O（オー）を区別しやすいスラッシュゼロを採用

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下でライセンスされています。

### フォントライセンス

- Noto Sans JP: [SIL Open Font License 1.1](fonts/LICENSE)
- UDEV Gothic JPDOC: [SIL Open Font License 1.1](fonts/LICENSE)

## 🤝 コントリビューション

不具合の報告や機能改善の提案は、Issue または Pull Request にて受け付けています。

---

## English

This browser extension automatically replaces hard-to-read Japanese fonts with **Noto Sans**. It is optimized for high performance.

### Features

- ⚡ **Fast Performance**: Quickly applies fonts without slowing down page loads
- 🔄 **Automatic Replacement**: Detects and replaces various Japanese fonts automatically
- 🖼️ **Wide Compatibility**: Supports iframes, dynamic content, and modern web structures (like Shadow DOM)
- 🚀 **Modern Standard**: Fully compliant with Chrome Extension Manifest V3
- 💾 **Lightweight**: Optimized resources for minimal impact on system performance

### Replaced Fonts

- **Normal Text**: Replaced with **Noto Sans JP**
- **Code Blocks**: Replaced with **UDEV Gothic JPDOC** (a high-legibility monospace font for programming)

### License

Licensed under the [MIT License](LICENSE).

- Noto Sans JP: [SIL Open Font License 1.1](fonts/LICENSE)
- UDEV Gothic JPDOC: [SIL Open Font License 1.1](fonts/LICENSE)
