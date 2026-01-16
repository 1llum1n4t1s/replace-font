const fs = require('fs');
const path = require('path');

// 置換対象フォントの定義
const FONT_FAMILIES = [
  'MS PGothic',
  'ms pgothic',
  'MS Pゴシック',
  'ms pゴシック',
  'ＭＳ Ｐゴシック',
  'MS Gothic',
  'ms gothic',
  'MS ゴシック',
  'ms ゴシック',
  'ＭＳ ゴシック',
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
  'SegoeUI-Bold',
  'Arial',
  'ArialMT',
  'Roboto',
  'M PLUS Rounded 1c',
  'Malgun Gothic',
  'Arial Unicode MS',
  'Hiragino Kaku Gothic ProN',
  'Hiragino Kaku Gothic Pro',
  'ヒラギノ角ゴ ProN',
  'ヒラギノ角ゴ Pro',
  'Hiragino Sans',
  'Hiragino Sans Pro'
];

// フォント設定
const FONT_CONFIGS = [
  {
    weight: 'Regular',
    fileName: 'replacefont-extension-regular.css',
    fontWeight: null,
    localFonts: [],
    webFont: 'NotoSansJP-Regular.woff2',
    fallbackFont: 'BIZ UDPGothic'
  },
  {
    weight: 'Bold',
    fileName: 'replacefont-extension-bold.css',
    fontWeight: 'bold',
    localFonts: [],
    webFont: 'NotoSansJP-Bold.woff2',
    fallbackFont: 'BIZ UDPGothic'
  }
];

const HIRAGINO_FAMILIES = new Set([
  'Hiragino Kaku Gothic ProN',
  'Hiragino Kaku Gothic Pro',
  'ヒラギノ角ゴ ProN',
  'ヒラギノ角ゴ Pro',
  'Hiragino Sans',
  'Hiragino Sans Pro'
]);

const MACOS_FALLBACKS = ['San Francisco', '-apple-system', 'BlinkMacSystemFont'];

/**
 * フォールバックフォントを取得
 * @param {string} fontFamily - フォントファミリー名
 * @param {object} config - フォント設定
 * @returns {string[]} フォールバックフォント一覧
 */
function getFallbackFonts(fontFamily, config) {
  if (HIRAGINO_FAMILIES.has(fontFamily)) {
    return MACOS_FALLBACKS;
  }

  return [config.fallbackFont];
}

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
  const webFontUrl = `url('chrome-extension://__MSG_@@extension_id__/fonts/${config.webFont}') format('woff2')`;
  const fallback = getFallbackFonts(fontFamily, config).map(font => `local('${font}')`);
  const srcParts = [...localSources, webFontUrl, ...fallback];

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
 * @param {object} config - フォント設定
 * @returns {string} CSS 内容
 */
function generateCSS(config) {
  const header = `@charset "UTF-8";

/* ${config.weight} */`;

  const fontFaces = FONT_FAMILIES.map(family =>
    generateFontFace(family, config)
  ).join('\n');

  return `${header}\n${fontFaces}\n`;
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

  // 各フォント設定ごとに CSS を生成
  for (const config of FONT_CONFIGS) {
    const outputPath = path.join(cssDir, config.fileName);
    const cssContent = generateCSS(config);

    try {
      fs.writeFileSync(outputPath, cssContent, 'utf8');
      console.log(`✅ ${config.weight} CSS を生成しました: ${config.fileName}`);
      console.log(`   - フォント定義数: ${FONT_FAMILIES.length}`);
    } catch (error) {
      console.error(`❌ ${config.weight} CSS の生成に失敗しました:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n🎉 CSS ファイル生成が完了しました！');
  console.log('\n📂 生成されたファイル:');
  FONT_CONFIGS.forEach(config => {
    console.log(`   - css/${config.fileName}`);
  });
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
