// Chrome Web Store用のスクリーンショット画像を自動生成するスクリプト
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 出力ディレクトリのパス
const OUTPUT_DIR = './webstore-images';

// 生成する画像の各設定項目（入力パス、出力名、サイズ、タイプ）
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
  // ブラウザの起動オプション（ヘッドレスモード、サンドボックス無効化など）
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // 新しいページ（タブ）を作成
    const page = await browser.newPage();
    
    // ビューポートを設定
    // deviceScaleFactorを1に設定することで、指定したwidth/height通りのピクセルサイズで出力します
    // 2以上にするとRetinaディスプレイ相当の解像度になりますが、Web Storeの要件に合わせるため1に固定します
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
  } finally {
    // ブラウザを確実に終了させる
    await browser.close();
  }
}

/**
 * メイン処理：出力ディレクトリの準備と各画像の生成ループ
 */
async function main() {
  console.log('🎨 Chrome Web Store用スクリーンショットを生成中...\n');

  // 出力ディレクトリが存在しない場合は再帰的に作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 出力ディレクトリを作成: ${OUTPUT_DIR}\n`);
  }

  // 設定に基づいて各画像を順番に生成
  for (const config of IMAGE_CONFIGS) {
    // 入力ファイルパスと出力先フルパスの決定
    const inputPath = config.input;
    const outputPath = path.join(OUTPUT_DIR, config.output);

    // HTMLファイルの存在確認（存在しない場合はスキップ）
    if (!fs.existsSync(inputPath)) {
      console.error(`❌ HTMLファイルが見つかりません: ${inputPath}`);
      continue;
    }

    // 画像生成関数の呼び出し
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
