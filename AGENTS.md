# AGENTS.md

This file provides guidance to Codex (and other AI agents) when working with code in this repository.

## Overview

Chrome extension (Manifest V3) — 読みづらい日本語フォントを Noto Sans JP / UDEV Gothic JP DOC に自動置換。MAIN World で attachShadow をインターセプトし、Shadow DOM 内のフォントも置換可能（パフォーマンス改善版）。

## Commands

**Build:** `npm install && node scripts/generate-icons.js && node scripts/generate-css.js`
**Package:** `.\zip.ps1` (Windows) / `./zip.sh` (Linux/macOS) → `replace-font-chrome.zip`

## Directory Structure (統一規約)

```
manifest.json                  # ルート直置き
icons/
src/
├── popup/                     # popup.html / popup.js / style.css
├── content/                   # preload-fonts.js (isolated) + inject.js (MAIN world)
├── css/                       # 生成済み統合CSS
└── fonts/                     # woff2 ファイル
scripts/                       # ビルドツール (generate-icons / generate-css / convert-fonts)
webstore/                      # ストア申請用スクショ
.github/workflows/             # 自動公開ワークフロー
```

## Architecture

- **`src/content/preload-fonts.js`** — isolated world で動作。content_scripts に登録。`chrome.runtime.getURL('src/content/inject.js')` を MAIN world に注入し、Shadow DOM 対応フォント置換を有効化
- **`src/content/inject.js`** — MAIN world で attachShadow をフック → 配下に統合 CSS（src/css/replacefont-extension.css）を inject
- **`src/css/replacefont-extension.css`** — `scripts/generate-css.js` が生成する @font-face 統合 CSS。フォントは `src/fonts/*.woff2` を参照
- **`src/fonts/`** — Noto Sans JP / UDEV Gothic JP DOC の woff2 ファイル

## Conventions

- バージョンは `package.json` を Source of truth として `manifest.json` 等に同期（`zip.ps1` / `zip.sh` 起動時に自動）
- フォント参照は **`src/fonts/`** 配下に統一
- CSS 参照は **`src/css/`** 配下に統一
