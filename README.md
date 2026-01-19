# NotoSansへ置換するやつ(改修型)

[![Version](https://img.shields.io/badge/version-2.0.32-blue.svg)](https://github.com/1llum1n4t1s/replace-font)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

ウェブサイト上の読みづらい日本語フォントを、読みやすい **Noto Sans JP** や **UDEV Gothic JPDOC** に自動で置き換える拡張機能です。
特定のフォント（MS ゴシック、メイリオ、Yu Gothic、システムフォントなど）を狙い撃ちで置換するため、サイトのデザインを極力崩さずに視認性を大幅に向上させます。

## ✨ 特徴

- ⚡ **高速 & 軽量**: ページの表示速度に影響を与えないよう、徹底的に最適化されています。
- 🔄 **完全自動**: インストールするだけで、あらゆるサイトのフォントが自動的に置換されます。
- 📦 **モダンなWeb対応**: 一般的な拡張機能では対応が難しい **Shadow DOM** 内のフォントも漏らさず置換します（YouTube や各種モダンなWebアプリに対応）。
- 🎨 **デザインを尊重**: フォントの種類（ゴシック/明朝/等幅）を判別し、元のデザイン意図を維持したまま最適なフォントへ置き換えます。
- 🛠️ **広範なサポート**: Windows/Mac/Linux の標準フォントから、Inter や Roboto などの主要な Web フォントまで幅広くカバーしています。

## 🔤 置換の仕組み

### 一般的なフォント（ゴシック体・明朝体） → Noto Sans JP
`ＭＳ Ｐゴシック`、`メイリオ`、`游ゴシック` などの標準的な日本語フォントに加え、`Arial`、`Helvetica`、`Inter`、`system-ui` などの欧文・システムフォントも **Noto Sans JP** に置換します。読みづらい明朝体も視認性の高いフォントに置き換わるため、長文の閲覧も快適になります。

### 等幅フォント・コード → UDEV Gothic JPDOC
`ＭＳ ゴシック` や `Consolas`、`JetBrains Mono` などの等幅フォントを、プログラミングや文書作成に最適な **UDEV Gothic JPDOC** に置換します。
GitHub のコード表示や、技術ブログのコードブロック、入力フォームなども圧倒的に読みやすくなります。

- **UDEV Gothic JPDOC のメリット**:
  - BIZ UDゴシックと JetBrains Mono をベースにした、視認性の高い等幅フォントです。
  - 濁点・半濁点（「バ」と「パ」など）の判別がしやすく、英数字（「1」と「l」、「0」と「O」）もはっきりと区別できます。

## 📄 ライセンス

- **プロジェクト本体**: [MIT License](LICENSE)
- **搭載フォント**:
  - Noto Sans JP: [SIL Open Font License 1.1](https://scripts.sil.org/OFL)
  - UDEV Gothic JPDOC: [SIL Open Font License 1.1](https://scripts.sil.org/OFL)

---

## English

This extension automatically replaces hard-to-read fonts on websites with **Noto Sans JP** and **UDEV Gothic JPDOC**.
It targets specific fonts (MS Gothic, Meiryo, Yu Gothic, System fonts, etc.) to improve legibility while preserving the original site design.

### Features
- ⚡ **Fast & Lightweight**: Optimized for minimal impact on page load speed.
- 🔄 **Fully Automatic**: Works instantly across all websites without configuration.
- 📦 **Modern Web Support**: Supports **Shadow DOM** elements (works on YouTube and modern web apps).
- 🎨 **Preserve Intent**: Replaces fonts based on their type (Gothic, Serif, or Monospace) to maintain the intended layout.
- 🛠️ **Broad Coverage**: Covers everything from OS standard fonts to popular web fonts like Inter and Roboto.

### Replacement Logic
- **General Fonts (Gothic/Serif/System)**: Replaced with **Noto Sans JP** for better screen legibility.
- **Monospace Fonts & Code**: Replaced with **UDEV Gothic JPDOC** (high-legibility font optimized for coding and documentation).
