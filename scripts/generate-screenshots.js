// Chrome Web Store用のスクリーンショット画像を自動生成するスクリプト
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 出力ディレクトリ
const OUTPUT_DIR = './webstore-images';

// 画像設定
const IMAGE_CONFIGS = [
  // スクリーンショット：1280x800
  {
    input: 'webstore-screenshots/01-popup-ui.html',
    output: '01-popup-ui-1280x800.png',
    width: 1280,
    height: 800,
    type: 'screenshot'
  },
  {
    input: 'webstore-screenshots/02-before-after.html',
    output: '02-before-after-1280x800.png',
    width: 1280,
    height: 800,
    type: 'screenshot'
  },
  {
    input: 'webstore-screenshots/03-hero-promo.html',
    output: '03-hero-promo-1280x800.png',
    width: 1280,
    height: 800,
    type: 'screenshot'
  },
  
  // プロモーション タイル（小）：440x280
  {
    input: 'webstore-screenshots/04-promo-small.html',
    output: 'promo-small-440x280.png',
    width: 440,
    height: 280,
    type: 'promo-small'
  },
  
  // マーキー プロモーション タイル：1400x560
  {
    input: 'webstore-screenshots/05-promo-marquee.html',
    output: 'promo-marquee-1400x560.png',
    width: 1400,
    height: 560,
    type: 'promo-marquee'
  }
];

/**
 * HTMLファイルから画像を生成
 * @param {string} htmlPath - HTMLファイルのパス
 * @param {string} outputPath - 出力画像のパス
 * @param {number} width - 画像の幅
 * @param {number} height - 画像の高さ
 * @param {string} type - 画像のタイプ
 */
async function generateScreenshot(htmlPath, outputPath, width, height, type) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // ビューポートを設定
    await page.setViewport({
      width: width,
      height: height,
      deviceScaleFactor: 2 // Retina対応
    });

    // HTMLファイルを読み込み
    const absolutePath = path.resolve(htmlPath);
    await page.goto(`file://${absolutePath}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // フォントの読み込みを待機
    await new Promise(resolve => setTimeout(resolve, 2000));

    // スクリーンショットを撮影
    await page.screenshot({
      path: outputPath,
      type: 'png',
      omitBackground: false,
      clip: {
        x: 0,
        y: 0,
        width: width,
        height: height
      }
    });

    console.log(`✅ 生成完了: ${outputPath} (${width}x${height})`);
  } catch (error) {
    console.error(`❌ エラー: ${htmlPath} -> ${outputPath}`);
    console.error(error);
  } finally {
    await browser.close();
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🎨 Chrome Web Store用スクリーンショットを生成中...\n');

  // 出力ディレクトリを作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 出力ディレクトリを作成: ${OUTPUT_DIR}\n`);
  }

  // 各画像を生成
  for (const config of IMAGE_CONFIGS) {
    const inputPath = config.input;
    const outputPath = path.join(OUTPUT_DIR, config.output);

    // HTMLファイルの存在確認
    if (!fs.existsSync(inputPath)) {
      console.error(`❌ HTMLファイルが見つかりません: ${inputPath}`);
      continue;
    }

    await generateScreenshot(
      inputPath,
      outputPath,
      config.width,
      config.height,
      config.type
    );
  }

  console.log('\n✨ すべての画像生成が完了しました！');
  console.log(`\n📂 生成された画像は ${OUTPUT_DIR} ディレクトリにあります。`);
  console.log('\n📋 生成された画像一覧:');
  
  // 生成された画像のサイズを表示
  const files = fs.readdirSync(OUTPUT_DIR);
  files.forEach(file => {
    const filePath = path.join(OUTPUT_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`   - ${file} (${sizeKB} KB)`);
  });

  console.log('\n📝 Chrome Web Storeアップロード仕様:');
  console.log('   ✓ スクリーンショット: 1280x800 または 640x400');
  console.log('   ✓ プロモーション タイル（小）: 440x280');
  console.log('   ✓ マーキー プロモーション タイル: 1400x560');
  console.log('   ✓ 形式: PNG (24ビット、アルファなし)');
}

// スクリプト実行
main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
