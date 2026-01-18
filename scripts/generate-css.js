const fs = require('fs');
const path = require('path');

// 置換対象フォントの定義（ゴシック系）
const GOTHIC_FONT_FAMILIES = [
  'MS PGothic',
  'ms pgothic',
  'MS Pゴシック',
  'ms pゴシック',
  'ＭＳ Ｐゴシック',
  'MS UI Gothic',
  'メイリオ',
  'Meiryo',
  'YuGothic',
  'Yu Gothic',
  '游ゴシック',
  'YuGothic Medium',
  'Yu Gothic Medium',
  '游ゴシック Medium',
  'Yu Gothic UI',
  'Meiryo UI',
  'Segoe UI',
  'Arial',
  'ArialMT',
  'Roboto',
  'RobotoDraft',
  'Helvetica',
  'M PLUS Rounded 1c',
  'Malgun Gothic',
  'Arial Unicode MS',
  'Hiragino Sans',
  'Hiragino Sans Pro',
  'Inter'
];

// 置換対象フォントの定義（等幅系）
const MONO_FONT_FAMILIES = [
  'MS Gothic',
  'ms gothic',
  'MS ゴシック',
  'ms ゴシック',
  'ＭＳ ゴシック',
  'Consolas',
  'Monaco',
  'Courier New',
  'Courier',
  'Menlo',
  'Ubuntu Mono',
  'source-code-pro',
  'Cascadia Code',
  'Cascadia Mono',
  'monospace'
];

// ヒラギノシリーズはウェイト指定バリエーション（W1〜W9）を動的に生成
const HIRAGINO_WEIGHTS = Array.from({ length: 9 }, (_, i) => i + 1);
const HIRAGINO_VARIANTS = [];
for (const weight of HIRAGINO_WEIGHTS) {
  HIRAGINO_VARIANTS.push(`Hiragino Kaku Gothic ProN W${weight}`);
  HIRAGINO_VARIANTS.push(`Hiragino Kaku Gothic Pro W${weight}`);
  HIRAGINO_VARIANTS.push(`ヒラギノ角ゴ ProN W${weight}`);
  HIRAGINO_VARIANTS.push(`ヒラギノ角ゴ Pro W${weight}`);
}

// ウェイト指定なしのベース定義も追加
HIRAGINO_VARIANTS.unshift('Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ ProN', 'ヒラギノ角ゴ Pro');

// 最終的なフォントファミリー配列
const GOTHIC_FAMILIES = [...GOTHIC_FONT_FAMILIES, ...HIRAGINO_VARIANTS];

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
    fileName: 'replacefont-extension-regular.css',
    title: 'Regular',
    configs: [
      { families: GOTHIC_FAMILIES, config: GOTHIC_CONFIGS[0] },
      { families: MONO_FONT_FAMILIES, config: MONO_CONFIGS[0] }
    ]
  },
  {
    fileName: 'replacefont-extension-bold.css',
    title: 'Bold',
    configs: [
      { families: GOTHIC_FAMILIES, config: GOTHIC_CONFIGS[1] },
      { families: MONO_FONT_FAMILIES, config: MONO_CONFIGS[1] }
    ]
  }
];

/**
 * @font-face ルールを生成
 * @param {string} fontFamily - フォントファミリー名
 * @param {object} config - フォント設定
 * @returns {string} CSS ルール
 */
function generateFontFace(fontFamily, config) {
  const needsQuotes = fontFamily.includes(' ') || fontFamily.includes('　');
  const quotedFontFamily = needsQuotes ? `"${fontFamily}"` : `'${fontFamily}'`;

  const localSources = config.localFonts.map(font => `local('${font}')`);
  const webFontUrl = `url('../fonts/${config.webFont}') format('woff2')`;
  const srcParts = [...localSources, webFontUrl];

  let rule = `@font-face {
  font-family: ${quotedFontFamily};
  src:  ${srcParts.join(',\n        ')};`;

  if (config.fontWeight) {
    rule += `\n  font-weight: ${config.fontWeight};`;
  }

  rule += `\n  font-display: swap;\n}`;

  return rule;
}

/**
 * CSS ファイルを生成
 * @param {object} outputConfig - 出力設定
 * @returns {string} CSS 内容
 */
function generateCSS(outputConfig) {
  const header = `@charset "UTF-8";

/* ${outputConfig.title} */`;

  const sections = outputConfig.configs.map(item => {
    return item.families.map(family =>
      generateFontFace(family, item.config)
    ).join('\n');
  });

  return `${header}\n${sections.join('\n')}\n`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🎨 CSS ファイル生成を開始します...\n');

  const cssDir = path.join(__dirname, '../css');

  // css ディレクトリの確認
  if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir, { recursive: true });
  }

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
    console.log(`   - css/${config.fileName}`);
  });
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
