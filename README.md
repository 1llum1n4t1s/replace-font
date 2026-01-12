# NotoSansへ置換するやつ（改修型）

[![Version](https://img.shields.io/badge/version-2.0.1-blue.svg)](https://github.com/1llum1n4t1s/replace-font)
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
├── fonts/                    # Noto Sans JP フォント
│   ├── NotoSansJP-Regular.woff2
│   └── NotoSansJP-Bold.woff2
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

#### Linux / Mac / WSL
```bash
# 配布用ZIPを作成
./zip.sh
```

#### Windows (PowerShell)
```powershell
# 配布用ZIPを作成
.\zip.ps1
```

#### Git Bash (Windows)
```bash
# 配布用ZIPを作成
./zip.sh
```

このスクリプトは以下を実行します：
- 拡張機能の動作に必要なファイルのみをZIPに含める
- 開発用ファイル（README.md, package.json, scriptsディレクトリ等）を除外
- `replace-font-chrome.zip` (約1.3MB) を生成

### Chrome Web Storeへのアップロード

1. **ZIPファイルを作成**

   **Linux / Mac / Git Bash:**
   ```bash
   ./zip.sh
   ```

   **Windows PowerShell:**
   ```powershell
   .\zip.ps1
   ```

2. **Chrome Web Store Developer Dashboardにアクセス**
   - https://chrome.google.com/webstore/devconsole にアクセス
   - Googleアカウントでログイン（初回は$5の登録料が必要）

3. **新しいアイテムをアップロード**
   - 「新しいアイテム」をクリック
   - `replace-font-chrome.zip` をアップロード
   - 必要な情報を入力：
     - **詳細な説明**: 拡張機能の機能と利点を説明
     - **スクリーンショット**: 最低1枚（推奨サイズ: 1280x800 または 640x400）
     - **カテゴリ**: 「ツール」または「アクセシビリティ」
     - **言語**: 日本語

4. **プライバシー設定**
   - プライバシーポリシーのURL: https://1llum1n4t1s.github.io/replace-font/privacy.html
   - データ収集の有無を明記

5. **公開設定**
   - 「公開」または「非公開」を選択
   - 審査のために送信

**注意事項**:
- 審査には通常1〜3営業日かかります
- manifest.jsonのバージョン番号は更新の度にインクリメントしてください
- スクリーンショットは拡張機能の動作を明確に示すものを用意してください

### GitHub Pagesの設定（プライバシーポリシー公開）

プライバシーポリシーを公開するために、GitHub Pagesを有効化します：

1. GitHubリポジトリページで「Settings」タブをクリック
2. 左サイドバーの「Pages」をクリック
3. 「Source」セクションで以下を選択：
   - Branch: `main` (または `master`)
   - Folder: `/docs`
4. 「Save」ボタンをクリック
5. 数分後、以下のURLでプライバシーポリシーが公開されます：
   - トップページ: https://1llum1n4t1s.github.io/replace-font/
   - プライバシーポリシー: https://1llum1n4t1s.github.io/replace-font/privacy.html

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
