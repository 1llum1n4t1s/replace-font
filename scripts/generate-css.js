const fs = require('fs');
const path = require('path');
// フォント定義は src/content/font-config.js が単一の真実の源泉。
// 両経路（ビルド / ランタイム）の食い違いを物理的に防ぐ。
const { BODY_FONT, MONO_FONT } = require('../src/content/font-config');

// ---------------------------------------------
// 多言語対応ポリシー
// ---------------------------------------------
// unicode-range は指定しない。置換フォントが持つ全グリフ範囲を使用し、
// フォントに含まれない文字は CSS font fallback によって次の candidate
// （元サイトの指定 / システムフォント）へ自然に落ちる。

// ---------------------------------------------
// フォントウェイト境界定数
// 100-599 → Regular woff2、600-900 → Bold woff2
// ---------------------------------------------
const WEIGHT_REGULAR_RANGE = '100 599';
const WEIGHT_BOLD_RANGE = '600 900';

// ---------------------------------------------
// 置換対象フォント
// ---------------------------------------------
// 注: 'serif' / 'sans-serif' / 'monospace' / 'system-ui' / 'ui-sans-serif' /
// 'ui-serif' / 'ui-monospace' / '-apple-system' / 'BlinkMacSystemFont' 等は
// CSS 汎用キーワード (generic family) であり、@font-face の font-family 記述子に
// 指定すると仕様上未定義動作。ブラウザに黙殺され得るため対象に含めない。
// これらへの対応は BODY_CSS_VARS / MONO_CSS_VARS の上書きで行う。
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
  'ABC Social', 'Graphik', 'Euclid Circular',
  'Manrope', 'Poppins', 'Outfit', 'Plus Jakarta Sans',
  'Söhne', 'Söhne-Buch', 'Söhne-Kraft',
  'Signifer',
  'Anthropic Serif Web Text',
  'Anthropic Sans Web Text',
  'pplxSans', 'pplxSerif',
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
  // 注: 'Noto Sans CJK JP' は BODY_FONT.localFontsRegular/Bold に含まれるため
  // 置換対象に入れると自己参照になる。validateConsistency() で検出済み。
  'MS Mincho', 'ms mincho', 'MS PMincho', 'ＭＳ 明朝', 'ＭＳ Ｐ明朝',
  'YuMincho', 'Yu Mincho', '游明朝', '游明朝体',
  'HiraMinProN-W3', 'Hiragino Mincho ProN', 'ヒラギノ明朝 ProN',
  'Times New Roman', 'Times', 'Georgia'
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
  'pplxSansMono'
];

// ヒラギノシリーズのバリエーション生成
const HIRAGINO_BASES = ['Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ ProN', 'ヒラギノ角ゴ Pro'];
const HIRAGINO_VARIANTS = [
  ...HIRAGINO_BASES,
  ...Array.from({ length: 9 }, (_, i) => i + 1).flatMap(w => HIRAGINO_BASES.map(b => `${b} W${w}`))
];

const GOTHIC_FAMILIES = [...new Set([...GOTHIC_FONT_FAMILIES, ...HIRAGINO_VARIANTS])];

// フォント設定（プレースホルダーを使用）
const GOTHIC_CONFIGS = [
  { weight: 'Regular', localFonts: '__BODY_LOCAL_REGULAR__', webFont: '__BODY_WOFF2_REGULAR__', fontWeight: WEIGHT_REGULAR_RANGE },
  { weight: 'Bold',    localFonts: '__BODY_LOCAL_BOLD__',    webFont: '__BODY_WOFF2_BOLD__',    fontWeight: WEIGHT_BOLD_RANGE }
];

const MONO_CONFIGS = [
  { weight: 'Regular', localFonts: '__MONO_LOCAL_REGULAR__', webFont: '__MONO_WOFF2_REGULAR__', fontWeight: WEIGHT_REGULAR_RANGE },
  { weight: 'Bold',    localFonts: '__MONO_LOCAL_BOLD__',    webFont: '__MONO_WOFF2_BOLD__',    fontWeight: WEIGHT_BOLD_RANGE }
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

// ---------------------------------------------
// CSS変数・セレクタの単一の真実の源泉
// ---------------------------------------------

const BODY_CSS_VARS = [
  '--font-sans', '--font-inter', '--font-geist-sans',
  '--font-fk-grotesk', '--font-fkgrotesk',
  '--font-fk-grotesk-neue', '--font-fkgrotesk-neue',
  '--font-body', '--font-sans-brand', '--font-family-sans', '--tw-font-sans',
  '--font-anthropic-serif', '--font-anthropic-sans',
  '--font-ui', '--font-ui-serif',
  '--font-user-message', '--font-claude-response',
  '--font-sans-serif', '--font-serif',
];

const MONO_CSS_VARS = [
  '--font-mono', '--font-berkeley-mono', '--font-geist-mono', '--font-code',
  '--font-family-mono', '--font-family-code', '--tw-font-mono',
  '--mono-font', '--code-font', '--monospace-font', '--pplx-font-mono',
];

const EDITABLE_SELECTORS = [
  '[contenteditable="true"]',
  '[contenteditable=""]',
  '[contenteditable="plaintext-only"]',
  'input',
  'textarea',
  '[role="textbox"]',
  '.ProseMirror',
  '.ql-editor',
  '.mce-content-body',
  '.cke_editable',
  '.CodeMirror',
  '.cm-editor',
  '.monaco-editor',
  '.ace_editor',
];

const VAR_OVERRIDE_CLASS_SELECTORS = [
  '[class*="prose"]', '[class*="markdown"]',
];

const VAR_OVERRIDE_SELECTORS = [
  ':root', ':host', 'html', 'body',
  ...VAR_OVERRIDE_CLASS_SELECTORS,
];

const MONO_FORCE_TARGETS = [
  'pre', 'code', 'kbd', 'samp', '.mono',
  '[class*="font-mono"]',
  '[class*="codeblock"]',
  '[class*="shiki"]',
  '[class*="hljs"]',
  '[class*="prism"]',
  '[class*="language-"]',
];

function buildEditableExclusionList() {
  return [
    ...EDITABLE_SELECTORS,
    ...EDITABLE_SELECTORS.map(s => `${s} *`),
  ].join(', ');
}

function buildVariableOverrides() {
  const selector = VAR_OVERRIDE_SELECTORS.join(', ');
  const bodyVarsSet = BODY_CSS_VARS
    .map(v => `  ${v}: "__BODY_FONT_NAME__", __BODY_FONT_FALLBACK__ !important;`)
    .join('\n');
  const monoVarsSet = MONO_CSS_VARS
    .map(v => `  ${v}: "__MONO_FONT_NAME__", __MONO_FONT_FALLBACK__ !important;`)
    .join('\n');
  const monoForceCompound = MONO_FORCE_TARGETS.join(', ');
  const editableExclusion = buildEditableExclusionList();

  return `
${selector} {
${bodyVarsSet}

${monoVarsSet}
}

:root :is(${monoForceCompound}):not(:where(${editableExclusion})),
:host :is(${monoForceCompound}):not(:where(${editableExclusion})),
[style*="monospace"]:not(:where(${editableExclusion})),
[style*="ui-monospace"]:not(:where(${editableExclusion})) {
  font-family: "__MONO_FONT_NAME__", "Berkeley Mono", "IBM Plex Mono", "Geist Mono", "Cascadia Code", "Cascadia Mono", "Consolas", "Monaco", "Courier New", __MONO_FONT_FALLBACK__ !important;
}
`;
}

function buildExclusionZone() {
  const editableList = EDITABLE_SELECTORS.map(s => `  ${s}`).join(',\n');
  const bodyVarsReset = BODY_CSS_VARS.map(v => `  ${v}: initial !important;`).join('\n');
  const monoVarsReset = MONO_CSS_VARS.map(v => `  ${v}: initial !important;`).join('\n');
  const overrideClassTargets = VAR_OVERRIDE_CLASS_SELECTORS.join(', ');

  return `
/* 編集可能領域の除外ゾーン (RTE / input / code editor) */
:is(:root, :host) :is(
${editableList}
) {
${bodyVarsReset}

${monoVarsReset}
}

:is(:root, :host) :is(
${editableList}
) :is(${overrideClassTargets}) {
${bodyVarsReset}

${monoVarsReset}
}
`;
}

/**
 * @font-face ルールを生成（プレースホルダー版）
 * family 名の " は CSS 構造破壊防止のため除去する。
 */
function generateFontFace(fontFamily, config) {
  const sanitized = String(fontFamily).replace(/"/g, '');
  const quotedFontFamily = `"${sanitized}"`;

  const localSources = config.localFonts;
  const webFontUrl = `url('__REPLACE_FONT_BASE__src/fonts/${config.webFont}') format('woff2')`;
  const srcParts = [localSources, webFontUrl];

  let rule = `@font-face {
  font-family: ${quotedFontFamily};
  src:  ${srcParts.join(',\n        ')};`;

  if (config.fontWeight) {
    rule += `\n  font-weight: ${config.fontWeight};`;
  }

  rule += `\n  font-display: swap;`;
  rule += `\n}`;

  return rule;
}

function generateCSS(outputConfig) {
  const header = `@charset "UTF-8";
/* ============================================================================
 * DO NOT EDIT — このファイルは scripts/generate-css.js により自動生成されます。
 * 変更は scripts/generate-css.js を編集し、npm run generate-css を実行してください。
 * ============================================================================ */`;

  const variableOverrides = buildVariableOverrides();
  const exclusionZone = buildExclusionZone();

  const replacementFontFaces = `
/* 置換フォント自体の @font-face 定義 */
@font-face {
  font-family: "__BODY_FONT_NAME__";
  src:  __BODY_LOCAL_REGULAR__,
        url('__REPLACE_FONT_BASE__src/fonts/__BODY_WOFF2_REGULAR__') format('woff2');
  font-weight: ${WEIGHT_REGULAR_RANGE};
  font-display: swap;
}
@font-face {
  font-family: "__BODY_FONT_NAME__";
  src:  __BODY_LOCAL_BOLD__,
        url('__REPLACE_FONT_BASE__src/fonts/__BODY_WOFF2_BOLD__') format('woff2');
  font-weight: ${WEIGHT_BOLD_RANGE};
  font-display: swap;
}
@font-face {
  font-family: "__MONO_FONT_NAME__";
  src:  __MONO_LOCAL_REGULAR__,
        url('__REPLACE_FONT_BASE__src/fonts/__MONO_WOFF2_REGULAR__') format('woff2');
  font-weight: ${WEIGHT_REGULAR_RANGE};
  font-display: swap;
}
@font-face {
  font-family: "__MONO_FONT_NAME__";
  src:  __MONO_LOCAL_BOLD__,
        url('__REPLACE_FONT_BASE__src/fonts/__MONO_WOFF2_BOLD__') format('woff2');
  font-weight: ${WEIGHT_BOLD_RANGE};
  font-display: swap;
}
`;

  const sections = outputConfig.configs.map(item =>
    item.families.map(family => generateFontFace(family, item.config)).join('\n')
  );

  return `${header}\n${variableOverrides}\n${exclusionZone}\n${replacementFontFaces}\n${sections.join('\n')}\n`;
}

// ---------------------------------------------
// 整合検証: 置換先フォント name および local() 代替名が GOTHIC/MONO FAMILIES に
// 混入していないか確認（混在すると自己参照ループになる）。
// ---------------------------------------------
function validateConsistency() {
  const gothicSet = new Set(GOTHIC_FAMILIES);
  const monoSet = new Set(MONO_FONT_FAMILIES);
  const conflicts = [];

  const bodyAliases = new Set([
    BODY_FONT.name,
    ...(BODY_FONT.localFontsRegular || []),
    ...(BODY_FONT.localFontsBold || []),
  ]);
  const monoAliases = new Set([
    MONO_FONT.name,
    ...(MONO_FONT.localFontsRegular || []),
    ...(MONO_FONT.localFontsBold || []),
  ]);

  for (const alias of bodyAliases) {
    if (gothicSet.has(alias)) {
      conflicts.push(`body alias '${alias}' が GOTHIC_FAMILIES にも含まれています (自己参照)`);
    }
  }
  for (const alias of monoAliases) {
    if (monoSet.has(alias)) {
      conflicts.push(`mono alias '${alias}' が MONO_FONT_FAMILIES にも含まれています (自己参照)`);
    }
  }

  if (conflicts.length) {
    console.error('❌ 整合性エラー:');
    conflicts.forEach(c => console.error(`   - ${c}`));
    process.exit(1);
  }
}

// ---------------------------------------------
// プレースホルダー解決
// 置換先フォント情報は固定なのでビルド時にすべて resolved される。
// __REPLACE_FONT_BASE__ のみ実行時 (preload-fonts.js) で置換する。
// ---------------------------------------------
function buildPlaceholderMap() {
  const safeLocal = (list) => list.map(f => `local("${String(f).replace(/"/g, '')}")`).join(', ');
  return {
    '__BODY_FONT_NAME__': BODY_FONT.name,
    '__BODY_FONT_FALLBACK__': BODY_FONT.fallback,
    '__BODY_LOCAL_REGULAR__': safeLocal(BODY_FONT.localFontsRegular),
    '__BODY_LOCAL_BOLD__': safeLocal(BODY_FONT.localFontsBold),
    '__BODY_WOFF2_REGULAR__': BODY_FONT.woff2Regular,
    '__BODY_WOFF2_BOLD__': BODY_FONT.woff2Bold,
    '__MONO_FONT_NAME__': MONO_FONT.name,
    '__MONO_FONT_FALLBACK__': MONO_FONT.fallback,
    '__MONO_LOCAL_REGULAR__': safeLocal(MONO_FONT.localFontsRegular),
    '__MONO_LOCAL_BOLD__': safeLocal(MONO_FONT.localFontsBold),
    '__MONO_WOFF2_REGULAR__': MONO_FONT.woff2Regular,
    '__MONO_WOFF2_BOLD__': MONO_FONT.woff2Bold
  };
}

let _placeholderRegexCache = null;
function getPlaceholderRegex(keys) {
  if (_placeholderRegexCache) return _placeholderRegexCache;
  const escaped = keys.map(k => k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'));
  _placeholderRegexCache = new RegExp(escaped.join('|'), 'g');
  return _placeholderRegexCache;
}

function resolveTemplate(templateCSS, placeholderMap) {
  const regex = getPlaceholderRegex(Object.keys(placeholderMap));
  return templateCSS.replace(regex, match => placeholderMap[match]);
}

function main() {
  console.log('🎨 CSS ファイル生成を開始します...\n');

  validateConsistency();

  const cssDir = path.join(__dirname, '../src/css');
  fs.mkdirSync(cssDir, { recursive: true });

  const placeholderMap = buildPlaceholderMap();

  for (const outputConfig of OUTPUT_CONFIGS) {
    const outputPath = path.join(cssDir, outputConfig.fileName);
    try {
      const templateCSS = generateCSS(outputConfig);
      // フォント情報は固定なのでビルド時に全置換。__REPLACE_FONT_BASE__ だけ実行時へ残す。
      const resolvedCSS = resolveTemplate(templateCSS, placeholderMap);
      fs.writeFileSync(outputPath, resolvedCSS, 'utf8');
      const totalFonts = outputConfig.configs.reduce((acc, curr) => acc + curr.families.length, 0);
      const sizeKB = (Buffer.byteLength(resolvedCSS, 'utf8') / 1024).toFixed(1);
      console.log(`✅ ${outputConfig.title} CSS を生成しました: ${outputConfig.fileName} (${totalFonts} 定義 / ${sizeKB} KB)`);
    } catch (error) {
      console.error(`❌ CSS の生成に失敗しました:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n🎉 CSS ファイル生成が完了しました！');
}

main();
