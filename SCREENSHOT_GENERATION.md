# Chrome Web Store スクリーンショット自動生成

このドキュメントでは、Chrome Web Store用のスクリーンショット画像を自動生成する機能について説明します。

## 📸 概要

`zip.ps1`（Windows）または`zip.sh`（Mac/Linux）を実行すると、HTMLファイルから自動的にChrome Web Store用の画像が生成されます。

## 🎯 生成される画像

### スクリーンショット（最大5枚）

Chrome Web Storeのストアリスティングに表示される画像：

| ファイル名 | サイズ | 説明 |
|-----------|--------|------|
| `01-popup-ui-1280x800.png` | 1280×800 | 拡張機能のポップアップUI |
| `02-before-after-1280x800.png` | 1280×800 | フォント置換のBefore/After比較 |
| `03-hero-promo-1280x800.png` | 1280×800 | プロモーション用ヒーロー画像 |
| `01-popup-ui-640x400.png` | 640×400 | ポップアップUI（小サイズ版） |
| `02-before-after-640x400.png` | 640×400 | Before/After（小サイズ版） |
| `03-hero-promo-640x400.png` | 640×400 | ヒーロー画像（小サイズ版） |

### プロモーションタイル（小）

Chrome Web Storeの検索結果などに表示される小さなタイル：

| ファイル名 | サイズ | 説明 |
|-----------|--------|------|
| `promo-small-440x280.png` | 440×280 | プロモーションタイル（小） |

### マーキープロモーションタイル

Chrome Web Storeのトップページなどで表示される大きなバナー：

| ファイル名 | サイズ | 説明 |
|-----------|--------|------|
| `promo-marquee-1400x560.png` | 1400×560 | マーキープロモーションタイル |

## 🚀 使用方法

### 自動生成（推奨）

```bash
# Windows PowerShell
.\zip.ps1

# Mac / Linux
./zip.sh
```

これにより以下が自動的に実行されます：

1. バージョン同期（package.jsonから全ファイルへ）
2. 依存関係のインストール（`npm install`）
3. アイコン生成（`node scripts/generate-icons.js`）
4. CSS生成（`node scripts/generate-css.js`）
5. **スクリーンショット生成**（`node scripts/generate-screenshots.js`）← 新機能
6. ZIPファイル作成（`replace-font-chrome.zip`）

### 手動生成

スクリーンショットのみを生成したい場合：

```bash
npm run generate-screenshots
```

## 📁 出力先

すべての画像は `webstore-images/` ディレクトリに保存されます：

```
webstore-images/
├── 01-popup-ui-1280x800.png
├── 01-popup-ui-640x400.png
├── 02-before-after-1280x800.png
├── 02-before-after-640x400.png
├── 03-hero-promo-1280x800.png
├── 03-hero-promo-640x400.png
├── promo-small-440x280.png
└── promo-marquee-1400x560.png
```

## 🎨 HTMLソースファイル

画像の元となるHTMLファイルは `webstore-screenshots/` ディレクトリにあります：

| HTMLファイル | 説明 | 使用される画像サイズ |
|-------------|------|-------------------|
| `01-popup-ui.html` | ポップアップUI表示 | 1280×800, 640×400 |
| `02-before-after.html` | Before/After比較 | 1280×800, 640×400 |
| `03-hero-promo.html` | ヒーロー画像 | 1280×800, 640×400 |
| `04-promo-small.html` | プロモーションタイル（小） | 440×280 |
| `05-promo-marquee.html` | マーキープロモーションタイル | 1400×560 |

## 🔧 技術仕様

### 使用技術

- **Puppeteer**: ヘッドレスブラウザでHTMLをレンダリング
- **PNG形式**: 24ビット、アルファなし（Chrome Web Store仕様準拠）
- **Retina対応**: deviceScaleFactor: 2で高品質な画像を生成

### 画像品質

- **解像度**: 各サイズで正確なピクセル数
- **フォーマット**: PNG（24ビット、アルファチャンネルなし）
- **最大ファイルサイズ**: 各5MB以内（Chrome Web Store制限）
- **カラープロファイル**: sRGB

## 📋 Chrome Web Store仕様

### スクリーンショット

- **必須**: 最低1枚
- **最大**: 5枚まで
- **サイズ**: 1280×800 または 640×400
- **形式**: JPEG または 24ビット PNG（アルファなし）
- **ファイルサイズ**: 各5MB以内

### プロモーションタイル（小）

- **サイズ**: 440×280
- **形式**: JPEG または 24ビット PNG（アルファなし）
- **用途**: 検索結果、カテゴリページ

### マーキープロモーションタイル

- **サイズ**: 1400×560
- **形式**: JPEG または 24ビット PNG（アルファなし）
- **用途**: トップページ、特集ページ

## 🎨 カスタマイズ

HTMLファイルを編集することで、画像のデザインをカスタマイズできます：

1. `webstore-screenshots/` 内のHTMLファイルを編集
2. `zip.ps1` / `zip.sh` を実行
3. `webstore-images/` に新しい画像が生成されます

### 編集可能な要素

- 色・グラデーション
- テキスト内容
- アイコン・絵文字
- レイアウト
- フォント

## 🔄 バージョン同期

`zip.ps1` / `zip.sh` を実行すると、`package.json` のバージョン番号が自動的に以下のファイルに同期されます：

- `manifest.json`
- `README.md`
- `docs/index.html`
- `popup/popup.html`
- `webstore-screenshots/01-popup-ui.html`
- `webstore-screenshots/03-hero-promo.html`
- `webstore-screenshots/04-promo-small.html`
- `webstore-screenshots/05-promo-marquee.html`

これにより、すべてのスクリーンショットに正しいバージョン番号が表示されます。

## 📤 Chrome Web Storeへのアップロード

1. `zip.ps1` / `zip.sh` を実行
2. `webstore-images/` ディレクトリ内の画像を確認
3. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセス
4. 「Store Listing」タブを開く
5. 画像をアップロード：
   - **スクリーンショット**: 最大5枚（1280×800推奨）
   - **プロモーションタイル（小）**: 440×280
   - **マーキープロモーションタイル**: 1400×560

## 🐛 トラブルシューティング

### Puppeteerのインストールエラー

```bash
# 依存関係を再インストール
npm install
```

### 画像が生成されない

1. HTMLファイルが存在するか確認
2. `webstore-screenshots/` ディレクトリの内容を確認
3. エラーメッセージを確認

### 画像サイズが正しくない

- HTMLファイルの `width` と `height` を確認
- ブラウザのズームレベルが100%であることを確認

## 📝 開発者向け情報

### スクリプトの場所

- **生成スクリプト**: `scripts/generate-screenshots.js`
- **HTMLソース**: `webstore-screenshots/*.html`
- **出力先**: `webstore-images/`（.gitignoreに含まれる）

### package.json スクリプト

```json
{
  "scripts": {
    "generate-screenshots": "node scripts/generate-screenshots.js"
  }
}
```

### 依存関係

```json
{
  "devDependencies": {
    "puppeteer": "^22.0.0"
  }
}
```

## ✅ チェックリスト

アップロード前に以下を確認してください：

- [ ] すべての画像が生成されている
- [ ] 画像サイズが正しい（1280×800, 640×400, 440×280, 1400×560）
- [ ] 画像形式がPNG（24ビット、アルファなし）
- [ ] ファイルサイズが5MB以内
- [ ] バージョン番号が正しく表示されている
- [ ] テキストが読みやすい
- [ ] デザインが統一されている

---

**関連ドキュメント**:
- [webstore-screenshots/README.md](webstore-screenshots/README.md) - HTMLファイルの詳細
- [README.md](README.md) - プロジェクト全体のドキュメント
