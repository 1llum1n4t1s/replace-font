// Chrome Web Store用のスクリーンショット画像を自動生成するスクリプト
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 出力ディレクトリのパス
const OUTPUT_DIR = './webstore/images';

// 生成する画像の各設定項目（入力パス、出力名、サイズ、タイプ）
const IMAGE_CONFIGS = [
  // スクリーンショット：1280x800
  {
    input: 'webstore/screenshots/01-popup-ui.html',
    output: '01-popup-ui-1280x800.png',
    width: 1280,
    height: 800,
    type: 'screenshot'
  },
  {
    input: 'webstore/screenshots/02-before-after.html',
    output: '02-before-after-1280x800.png',
    width: 1280,
    height: 800,
    type: 'screenshot'
  },
  {
    input: 'webstore/screenshots/03-hero-promo.html',
    output: '03-hero-promo-1280x800.png',
    width: 1280,
    height: 800,
    type: 'screenshot'
  },
  
  // プロモーション タイル（小）：440x280
  {
    input: 'webstore/screenshots/04-promo-small.html',
    output: 'promo-small-440x280.png',
    width: 440,
    height: 280,
    type: 'promo-small'
  },
  
  // マーキー プロモーション タイル：1400x560
  {
    input: 'webstore/screenshots/05-promo-marquee.html',
    output: 'promo-marquee-1400x560.png',
    width: 1400,
    height: 560,
    type: 'promo-marquee'
  }
];

/**
 * 共有ブラウザインスタンスを使用してHTMLファイルから画像を生成
 * @param {import('puppeteer').Browser} browser - 共有ブラウザインスタンス
 * @param {string} htmlPath - HTMLファイルのパス
 * @param {string} outputPath - 出力画像のパス
 * @param {number} width - 画像の幅
 * @param {number} height - 画像の高さ
 */
async function generateScreenshot(browser, htmlPath, outputPath, width, height) {
  const page = await browser.newPage();

  try {
    // ビューポートを設定
    // deviceScaleFactorを1に設定することで、指定したwidth/height通りのピクセルサイズで出力します
    await page.setViewport({
      width: width,
      height: height,
      deviceScaleFactor: 1
    });

    // HTMLファイルの絶対パスを取得してブラウザで読み込み
    const absolutePath = path.resolve(htmlPath);
    await page.goto(`file://${absolutePath}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // フォントの読み込みやレンダリングの完了を待機するためのウェイト
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 指定した範囲（clip）でスクリーンショットを撮影して保存
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
    throw error;
  } finally {
    await page.close();
  }
}

/**
 * メイン処理：出力ディレクトリの準備と各画像の並列生成
 */
async function main() {
  console.log('🎨 Chrome Web Store用スクリーンショットを生成中...\n');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // ブラウザを1回だけ起動して全画像で共有
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // 全画像を並列生成（失敗を個別キャッチし、最後にまとめて報告）
    const results = await Promise.allSettled(IMAGE_CONFIGS.map(config => {
      const inputPath = config.input;
      const outputPath = path.join(OUTPUT_DIR, config.output);

      if (!fs.existsSync(inputPath)) {
        return Promise.reject(new Error(`HTMLファイルが見つかりません: ${inputPath}`));
      }

      return generateScreenshot(browser, inputPath, outputPath, config.width, config.height);
    }));
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      throw new Error(`${failures.length}件の画像生成に失敗しました`);
    }
  } finally {
    await browser.close();
  }

  console.log('\n✨ すべての画像生成が完了しました！');
  console.log(`\n📂 生成された画像は ${OUTPUT_DIR} ディレクトリにあります。`);
  console.log('\n📋 生成された画像一覧:');
  
  // 生成されたファイルのサイズを確認して表示
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

// スクリプトの実行（エラーハンドリング付き）
main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
