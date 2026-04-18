const fs = require('fs');
const path = require('path');

// ---------------------------------------------
// 置換対象フォント
// ---------------------------------------------
const GOTHIC_FONT_FAMILIES = [
  // --- 既存のゴシック系 ---
  'MS PGothic', 'ms pgothic', 'MS Pゴシック', 'ms pゴシック', 'ＭＳ Ｐゴシック',
  'MS UI Gothic',
  'メイリオ', 'Meiryo',
  'YuGothic', 'Yu Gothic', '游ゴシック',
  'YuGothic Medium', 'Yu Gothic Medium', '游ゴシック Medium',
  'Yu Gothic UI', 'Meiryo UI', 'Segoe UI',
  'Motiva Sans', 'MotivaSans',
  'Arial', 'ArialMT', 'Roboto', 'RobotoDraft', 'Helvetica', 'Helvetica Neue', 'HelveticaNeue',
  'Trebuchet MS', 'TrebuchetMS', 'Verdana',
  'M PLUS Rounded 1c', 'Malgun Gothic',
  'Arial Unicode MS',
  'Hiragino Sans', 'Hiragino Sans Pro',
  'Inter', 'Inter Variable', 'Inter-Regular', 'Inter-Bold', 'Inter UI',
  'Public Sans', 'Roobert', 'Geist', 'Geist Sans',
  'FK Grotesk', 'FK Grotesk Neue', 'FK Grotesk Neue Thin', 'FK Display',
  'FKGrotesk', 'FKGroteskNeue', 'FKGroteskNeueThin', 'FKDisplay',
  'IBM Plex Sans', 'IBMPlexSans',
  'ABC Social',   'Graphik', 'Euclid Circular',
  'Manrope', 'Poppins', 'Outfit', 'Plus Jakarta Sans',
  'Söhne', 'Söhne-Buch', 'Söhne-Kraft',
  'Signifer',
  'Anthropic Serif Web Text',
  'Anthropic Sans Web Text',

  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  '-apple-system',
  'BlinkMacSystemFont',
  'San Francisco',
  'Segoe UI Variable',
  'Segoe UI Variable Display',
  'Segoe UI Variable Text',
  'Segoe UI Historic',

  'Open Sans',
  'Lato',
  'Montserrat',
  'Source Sans Pro',
  'Oswald',
  'Raleway',
  'Merriweather Sans',
  'Noto Sans', // Webフォント版をローカル版で上書き

  'MS Mincho', 'ms mincho', 'MS PMincho', 'ＭＳ 明朝', 'ＭＳ Ｐ明朝',
  'YuMincho', 'Yu Mincho', '游明朝', '游明朝体',
  'HiraMinProN-W3', 'Hiragino Mincho ProN', 'ヒラギノ明朝 ProN',
  'Times New Roman', 'Times', 'Georgia',
  'serif', // 一部のブラウザで有効
  'sans-serif' // 汎用サンセリフ
];

// 置換対象フォントの定義（等幅系）
const MONO_FONT_FAMILIES = [
  'MS Gothic', 'ms gothic', 'MS ゴシック', 'ms ゴシック', 'ＭＳ ゴシック',
  'Consolas', 'Monaco', 'Courier New', 'Courier', 'Menlo',
  'Ubuntu Mono', 'source-code-pro', 'Source Code Pro',
  'Cascadia Code', 'Cascadia Mono',
  'Berkeley Mono', 'BerkeleyMono',
  'IBM Plex Mono', 'IBMPlexMono',
  'Geist Mono',
  'Fira Code', 'Fira Mono',
  'JetBrains Mono',
  'Roboto Mono',
  'Inconsolata',
  'SFMono-Regular', 'SF Mono',
  'Söhne Mono',
  'UDEV Gothic JPDOC',
  'ui-monospace',
  'monospace' // 汎用等幅
];

// ヒラギノシリーズのバリエーション生成（既存ロジック維持）
const HIRAGINO_WEIGHTS = Array.from({ length: 9 }, (_, i) => i + 1);
const HIRAGINO_VARIANTS = [];
for (const weight of HIRAGINO_WEIGHTS) {
  HIRAGINO_VARIANTS.push(`Hiragino Kaku Gothic ProN W${weight}`);
  HIRAGINO_VARIANTS.push(`Hiragino Kaku Gothic Pro W${weight}`);
  HIRAGINO_VARIANTS.push(`ヒラギノ角ゴ ProN W${weight}`);
  HIRAGINO_VARIANTS.push(`ヒラギノ角ゴ Pro W${weight}`);
}
HIRAGINO_VARIANTS.unshift('Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ ProN', 'ヒラギノ角ゴ Pro');

// 最終的なフォントファミリー配列
const GOTHIC_FAMILIES = [...new Set([...GOTHIC_FONT_FAMILIES, ...HIRAGINO_VARIANTS])]; // 重複排除を追加

// フォント設定
const GOTHIC_CONFIGS = [
  {
    weight: 'Regular',
    localFonts: ['Noto Sans JP', 'Noto Sans CJK Variable', 'Noto Sans CJK JP'],
    webFont: 'NotoSansJP-Regular.woff2',
    fontWeight: null
  },
  {
    weight: 'Bold',
    localFonts: ['Noto Sans JP', 'Noto Sans CJK Variable', 'Noto Sans CJK JP'],
    webFont: 'NotoSansJP-Bold.woff2',
    fontWeight: 'bold'
  }
];

const MONO_CONFIGS = [
  {
    weight: 'Regular',
    localFonts: ['UDEV Gothic JPDOC'],
    webFont: 'UDEVGothicJPDOC-Regular.woff2',
    fontWeight: null
  },
  {
    weight: 'Bold',
    localFonts: ['UDEV Gothic JPDOC Bold'],
    webFont: 'UDEVGothicJPDOC-Bold.woff2',
    fontWeight: 'bold'
  }
];

const OUTPUT_CONFIGS = [
  {
    fileName: 'replacefont-extension.css',
    title: 'Regular & Bold',
    configs: [
      { families: GOTHIC_FAMILIES, config: GOTHIC_CONFIGS[0] },
      { families: GOTHIC_FAMILIES, config: GOTHIC_CONFIGS[1] },
      { families: MONO_FONT_FAMILIES, config: MONO_CONFIGS[0] },
      { families: MONO_FONT_FAMILIES, config: MONO_CONFIGS[1] }
    ]
  }
];

// CSS 文字列リテラル ("..." 内) として安全に埋め込めるようエスケープ
// Why: フォントファミリ名リストが将来 バックスラッシュ / " / コメント終端記号 を
//      含む可能性に備える (現状リストでは未含だが供給チェーン経路を塞ぐ)
function escapeCSSString(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
}

/**
 * @font-face ルールを生成
 */
function generateFontFace(fontFamily, config) {
  const quotedFontFamily = `"${escapeCSSString(fontFamily)}"`;

  // 拡張機能IDが動的なため、プレースホルダーを使用し、Content Script側で置換する
  // フォントは src/fonts/ 配下に配置されている (manifest.json の web_accessible_resources と一致させる)
  const safeWebFont = escapeCSSString(config.webFont);
  const webFontUrl = `url('__REPLACE_FONT_BASE__src/fonts/${safeWebFont}') format('woff2')`;
  // local() を src の末尾に置く: 同期 fingerprint (FontFace.load による loaded/unloaded 判定) の
  // 表面積を縮小しつつ、システムにインストール済みの場合は WOFF2 ダウンロード前にローカル使用される
  const localSources = config.localFonts.map(font => `local("${escapeCSSString(font)}")`);
  const srcParts = [webFontUrl, ...localSources];

  let rule = `@font-face {
  font-family: ${quotedFontFamily};
  src:  ${srcParts.join(',\n        ')};`;

  if (config.fontWeight) {
    rule += `\n  font-weight: ${config.fontWeight};`;
  }

  // display: swap は必須
  rule += `\n  font-display: swap;\n}`;

  return rule;
}

/**
 * CSS ファイルを生成
 * @param {object} outputConfig - 出力設定（ファイル名、タイトル、設定リスト）
 * @returns {string} 生成された CSS 内容
 */
function generateCSS(outputConfig) {
  /** @type {string} CSSファイルのヘッダー */
  const header = `@charset "UTF-8";`;

  /** @type {string} 共通のCSS変数によるフォント指定を上書きするスタイル定義 */
  const variableOverrides = `
:root, :host, html, body, .prose, [class*="prose"], [class*="markdown"], [class*="content"], [class*="answer"], [class*="light"], [class*="dark"] {
  /* Sans-serif 系 CSS 変数: Noto Sans JP を優先 */
  --font-sans: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;
  --font-inter: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;
  --font-geist-sans: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;
  --font-fk-grotesk: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;
  --font-fkgrotesk: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;
  --font-fk-grotesk-neue: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;
  --font-fkgrotesk-neue: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;
  --font-body: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;
  --font-sans-brand: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;
  --font-family-sans: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;
  --tw-font-sans: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;
  --font-anthropic-serif: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;
  --font-anthropic-sans: "Noto Sans JP", "Noto Sans CJK Variable", "Noto Sans CJK JP", sans-serif !important;

  /* Monospace 系 CSS 変数: UDEV Gothic JPDOC を優先 */
  --font-mono: "UDEV Gothic JPDOC", monospace !important;
  --font-berkeley-mono: "UDEV Gothic JPDOC", monospace !important;
  --font-geist-mono: "UDEV Gothic JPDOC", monospace !important;
  --font-code: "UDEV Gothic JPDOC", monospace !important;
  --font-family-mono: "UDEV Gothic JPDOC", monospace !important;
  --tw-font-mono: "UDEV Gothic JPDOC", monospace !important;
  --mono-font: "UDEV Gothic JPDOC", monospace !important;
  --code-font: "UDEV Gothic JPDOC", monospace !important;
  --font-family-code: "UDEV Gothic JPDOC", monospace !important;
  --monospace-font: "UDEV Gothic JPDOC", monospace !important;
  --pplx-font-mono: "UDEV Gothic JPDOC", monospace !important;
}

/* 汎用的な等幅フォント要素に対する強制指定（詳細度を高めて上書きを確実に） */
:root :is(pre, code, kbd, samp, .mono, [class*="font-mono"], [class*="codeblock"], [class*="shiki"], [class*="hljs"], [class*="prism"], [class*="language-"]),
:host :is(pre, code, kbd, samp, .mono, [class*="font-mono"], [class*="codeblock"], [class*="shiki"], [class*="hljs"], [class*="prism"], [class*="language-"]),
:root :is(pre, code, kbd, samp, .mono, [class*="font-mono"], [class*="codeblock"], [class*="shiki"], [class*="hljs"], [class*="prism"], [class*="language-"]) :not(i, .icon, [class*="icon"], [class*="Icon"]),
:host :is(pre, code, kbd, samp, .mono, [class*="font-mono"], [class*="codeblock"], [class*="shiki"], [class*="hljs"], [class*="prism"], [class*="language-"]) :not(i, .icon, [class*="icon"], [class*="Icon"]),
[style*="monospace"], [style*="ui-monospace"] {
  font-family: "UDEV Gothic JPDOC", "Berkeley Mono", "IBM Plex Mono", "Geist Mono", "Cascadia Code", "Cascadia Mono", "Consolas", "Monaco", "Courier New", monospace !important;
}

/* ============================================================================
   編集可能領域（RTE / 入力フィールド / コードエディタ）の除外ゾーン
   ----------------------------------------------------------------------------
   Excel Online / Googleスプレッドシート / Word Online / PowerPoint Online /
   ブログエディタ等、ブラウザ上でフォントを選択して編集するアプリの置換を
   無効化する。DOM構造で判別するためドメインリストのメンテナンス不要。
   - CSS変数の上書き（Layer 1）は要素スコープで無効化可能。ただしCSS変数は
     inherited のため 'revert' だと親から継承されてしまう（親の :root で
     !important 済みのため）。'initial' で guaranteed-invalid value にすると、
     子孫の var() 参照時に fallback 値もしくは IACVT → unset に落ちる
   - @font-face 再定義（Layer 2）はドキュメントグローバルのため要素単位での
     無効化は原理的に不可。モダンRTEは主にCSS変数経由で font-family を指定する
     ため、実用上これで大半のケースをカバーできる
   - 上の variableOverrides にCSS変数を追加したら、ここのリストも同期更新すること
   ============================================================================ */
:is(
  [contenteditable="true"],
  [contenteditable=""],
  [contenteditable="plaintext-only"],
  input,
  textarea,
  [role="textbox"],
  .ProseMirror,
  .ql-editor,
  .mce-content-body,
  .cke_editable,
  .fr-element,
  .tox-edit-area,
  .note-editable,
  .trix-content,
  .public-DraftEditor-content,
  .CodeMirror,
  .cm-editor,
  .monaco-editor,
  .ace_editor
) {
  /* Sans-serif 系 CSS 変数を guaranteed-invalid に（var() fallback または IACVT へ） */
  --font-sans: initial !important;
  --font-inter: initial !important;
  --font-geist-sans: initial !important;
  --font-fk-grotesk: initial !important;
  --font-fkgrotesk: initial !important;
  --font-fk-grotesk-neue: initial !important;
  --font-fkgrotesk-neue: initial !important;
  --font-body: initial !important;
  --font-sans-brand: initial !important;
  --font-family-sans: initial !important;
  --tw-font-sans: initial !important;
  --font-anthropic-serif: initial !important;
  --font-anthropic-sans: initial !important;

  /* Monospace 系 CSS 変数 */
  --font-mono: initial !important;
  --font-berkeley-mono: initial !important;
  --font-geist-mono: initial !important;
  --font-code: initial !important;
  --font-family-mono: initial !important;
  --tw-font-mono: initial !important;
  --mono-font: initial !important;
  --code-font: initial !important;
  --font-family-code: initial !important;
  --monospace-font: initial !important;
  --pplx-font-mono: initial !important;

  /* font-family は標準プロパティなので revert で UA value に戻せる
     （input/textarea では UA のフォームコントロール default、その他は inherit） */
  font-family: revert !important;
}

/* 除外ゾーン内の pre/code/kbd/samp は上の :root/:host :is(pre, code, ...) の
   強制 mono 指定に負けないよう、:is(:root, :host) 前置で同等以上のspecificityで
   revert する（Shadow DOM 内のコードエディタにも対応） */
:is(:root, :host) :is(
  [contenteditable="true"],
  [contenteditable=""],
  [contenteditable="plaintext-only"],
  input,
  textarea,
  [role="textbox"],
  .ProseMirror,
  .ql-editor,
  .mce-content-body,
  .cke_editable,
  .fr-element,
  .tox-edit-area,
  .note-editable,
  .trix-content,
  .public-DraftEditor-content,
  .CodeMirror,
  .cm-editor,
  .monaco-editor,
  .ace_editor
) :is(pre, code, kbd, samp, .mono, [class*="font-mono"], [class*="codeblock"], [class*="shiki"], [class*="hljs"], [class*="prism"], [class*="language-"]) {
  font-family: revert !important;
}
`;

  /** @type {string[]} 各セクション（Gothic/Mono）の @font-face ルール */
  const sections = outputConfig.configs.map(item => {
    return item.families.map(family =>
      generateFontFace(family, item.config)
    ).join('\n');
  });

  return `${header}\n${variableOverrides}\n${sections.join('\n')}\n`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🎨 CSS ファイル生成を開始します...\n');

  const cssDir = path.join(__dirname, '../src/css');

  fs.mkdirSync(cssDir, { recursive: true });

  // 各設定ごとに CSS を生成
  for (const outputConfig of OUTPUT_CONFIGS) {
    const outputPath = path.join(cssDir, outputConfig.fileName);
    const cssContent = generateCSS(outputConfig);

    try {
      fs.writeFileSync(outputPath, cssContent, 'utf8');
      console.log(`✅ ${outputConfig.title} CSS を生成しました: ${outputConfig.fileName}`);
      const totalFonts = outputConfig.configs.reduce((acc, curr) => acc + curr.families.length, 0);
      console.log(`   - フォント定義数: ${totalFonts}`);
    } catch (error) {
      console.error(`❌ ${outputConfig.title} CSS の生成に失敗しました:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n🎉 CSS ファイル生成が完了しました！');
  console.log('\n📂 生成されたファイル:');
  OUTPUT_CONFIGS.forEach(config => {
    console.log(`   - src/css/${config.fileName}`);
  });
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
