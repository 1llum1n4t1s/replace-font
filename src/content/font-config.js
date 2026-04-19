// フォント定義の単一の真実の源泉（固定フォント版）
//
// このファイルは 2 つの実行コンテキストから読まれる:
// 1. コンテンツスクリプト (manifest の content_scripts で preload-fonts.js より前に読み込まれる)
//    → 同一スクリプトスコープ内で const を共有。preload-fonts.js の IIFE から外部参照で読める
// 2. Node.js ビルドスクリプト (scripts/generate-css.js) → require() で CommonJS として読む
//
// フォントを差し替えるときはこのファイルだけを編集する。両経路に自動反映される。

// eslint-disable-next-line no-unused-vars
const BODY_FONT = {
  name: 'Noto Sans JP',
  fallback: 'sans-serif',
  localFontsRegular: ['Noto Sans JP', 'Noto Sans CJK Variable', 'Noto Sans CJK JP'],
  localFontsBold: ['Noto Sans JP', 'Noto Sans CJK Variable', 'Noto Sans CJK JP'],
  woff2Regular: 'NotoSansJP-Regular.woff2',
  woff2Bold: 'NotoSansJP-Bold.woff2'
};

// eslint-disable-next-line no-unused-vars
const MONO_FONT = {
  name: 'UDEV Gothic JPDOC',
  fallback: 'monospace',
  localFontsRegular: ['UDEV Gothic JPDOC'],
  localFontsBold: ['UDEV Gothic JPDOC Bold'],
  woff2Regular: 'UDEVGothicJPDOC-Regular.woff2',
  woff2Bold: 'UDEVGothicJPDOC-Bold.woff2'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BODY_FONT, MONO_FONT };
}
