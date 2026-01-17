# Changelog

## [2.1.0] - 2026-01-17

### 🎯 重大な変更

#### フォント置換方式の変更
- **変更前**: `@font-face` でフォント名を再定義する方式
- **変更後**: ユニバーサルセレクタ (`*`) で `!important` を使って強制置換

**理由**: 最新のChromeでは、`@font-face` で定義されたフォントよりもシステムフォントが優先されるため、`@font-face` による置換が機能しなくなりました。

### ✅ 改善点

#### パフォーマンス最適化（Geminiの提案を統合）
- ✅ **iframe処理の重複排除**: `all_frames: true` に完全委任し、親ページからのiframe走査を削除
- ✅ **CSS注入の堅牢性向上**: ID存在チェックとWeakSetの二重チェック
- ✅ **MutationObserverの最適化**: Shadow DOM検出のみに集中
- ✅ **初期化タイミングの改善**: `<head>` 待機ロジックを追加

#### コード削減
- **CSSファイル**: 1,249行 → 81行（93.5%削減）
- **JSファイル**: 296行 → 182行（38.5%削減）
- **合計**: 約1,400行削減

#### 新機能
- ✅ **UDEV Gothic JPDOC**: コードブロック専用フォントを追加
  - プログラミング向けの等幅フォント
  - BIZ UDゴシック + JetBrains Mono の合成
  - 日本語文書頻出記号が全角表示
  - 0（ゼロ）がスラッシュゼロで読みやすい
- ✅ **フォント変換スクリプト**: TTF→WOFF2自動変換機能を追加
  - `npm run convert-fonts` で実行
  - ファイルサイズを約50%削減

### 🔧 技術的な変更

#### 新しいファイル
- `css/universal-override.css` を追加（81行）
  - すべての要素に対して `!important` でフォントを強制適用
  - コードブロック用に UDEV Gothic JPDOC を指定
  - GitHub専用セレクタを追加
- `scripts/convert-fonts.js` を追加
  - TTF→WOFF2変換機能
- `fonts/UDEVGothicJPDOC-Regular.woff2` を追加（1.76MB）
- `fonts/UDEVGothicJPDOC-Bold.woff2` を追加（1.80MB）

#### 削除されたファイル
- `css/replacefont-extension-regular.css`（588行）
- `css/replacefont-extension-bold.css`（661行）
- `scripts/generate-css.js`（170行）

#### 削除された機能
- `processIframe()` 関数（iframe処理は `all_frames` に委任）
- `processPendingIframes()` 関数
- `createPreloadTag()` 関数（フォントpreloadは不要）
- `setupFontForceLoad()` 関数（CSS Font Loading APIは不要）
- デバウンス処理（`pendingIframes`, `debounceTimer`）
- イベントリスナー管理配列

#### 追加された機能
- `<head>` 要素の作成を待機する MutationObserver
- タイムアウト保険（100ms後に再チェック）
- コードブロック専用のフォント指定
- GitHub専用のセレクタ（`.blob-code`, `.blob-code-inner`, `.react-code-text`）

### 🐛 修正されたバグ

1. **iframe処理の重複**: 同一オリジンiframeでCSS二重注入が発生していた問題を解消
2. **初期化タイミング**: `document.head` が存在しない状態でCSS注入していた問題を解消
3. **`@font-face` が機能しない**: システムフォントが優先される問題を、ユニバーサルセレクタで解決

### 📝 既知の制限

- **`srcdoc` 属性を使った iframe**: 動作しません（実際のWebサイトでは問題なし）
- **インラインスタイル**: `!important` で上書きされます

### 🙏 謝辞

このバージョンは、Gemini AIによる詳細なコードレビューに基づいて改善されました。

---

## [2.0.24] - 以前

以前のバージョン履歴...
