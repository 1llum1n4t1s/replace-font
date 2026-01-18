# NotoSansへ置換するやつ(改修型)

[![Version](https://img.shields.io/badge/version-2.0.30-blue.svg)](https://github.com/1llum1n4t1s/replace-font)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

ウェブサイト上の読みづらい日本語フォントを、読みやすい **Noto Sans JP** や **UDEV Gothic JPDOC** に自動で置き換える拡張機能です。
特定のフォント（MS ゴシック、メイリオ、Yu Gothic など）を狙い撃ちで置換するため、サイトのデザインを極力崩さずに視認性を向上させます。

## ✨ 特徴

- ⚡ **高速**: ページの表示速度に影響を与えないよう、軽量に設計されています。
- 🔄 **自動**: 拡張機能をインストールするだけで、対象のフォントが自動的に置換されます。
- 📦 **iframe & Shadow DOM 対応**: ページ内の埋め込みコンテンツや、モダンなWebサイトで使われる Shadow DOM 内のフォントにも対応しています。
- 🎨 **デザイン維持**: すべてのフォントを一律に置換するのではなく、元のフォントの種類（ゴシック/明朝/等幅）に合わせて最適なフォントへ置き換えます。

## 🔤 置換の仕組み

### 一般的なフォント（ゴシック体・明朝体） → Noto Sans JP
`ＭＳ Ｐゴシック`、`メイリオ`、`游ゴシック` などのゴシック体だけでなく、画面上では読みづらい `ＭＳ Ｐ明朝` などの明朝体も、視認性の高い **Noto Sans JP** に置換します。

### 等幅フォント → UDEV Gothic JPDOC
`ＭＳ ゴシック` や `Consolas` などの等幅フォントを、プログラミングや文書作成に最適な **UDEV Gothic JPDOC** に置換します。

- **UDEV Gothic JPDOC とは**:
  - BIZ UDゴシックと JetBrains Mono をベースにした、非常に読みやすい等幅フォントです。
  - 濁点・半濁点の判別がしやすく、英数字もはっきりと区別できます。

## 📄 ライセンス

- **プロジェクト本体**: [MIT License](LICENSE)
- **搭載フォント**:
  - Noto Sans JP: [SIL Open Font License 1.1](https://scripts.sil.org/OFL)
  - UDEV Gothic JPDOC: [SIL Open Font License 1.1](https://scripts.sil.org/OFL)

---

## English

This extension automatically replaces hard-to-read fonts on websites with **Noto Sans JP** and **UDEV Gothic JPDOC**.
It targets specific fonts like MS Gothic, Meiryo, and Yu Gothic to improve legibility while preserving the original site design.

### Features
- ⚡ **Fast**: Lightweight design with minimal impact on page load speed.
- 🔄 **Automatic**: Just install and it works instantly.
- 📦 **Iframe & Shadow DOM Support**: Works for embedded content and Shadow DOM elements.
- 🎨 **Preserve Design**: Replaces fonts based on their type (Gothic, Serif, or Monospace) to maintain the intended layout.

### Replacement Logic
- **General Fonts (Gothic/Serif)**: Replaced with **Noto Sans JP** for better screen legibility.
- **Monospace Fonts**: Replaced with **UDEV Gothic JPDOC** (high-legibility font for coding and documents).
