const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const svgPath = path.join(__dirname, '../icons/icon.svg');
const iconsDir = path.join(__dirname, '../icons');

async function generateIcons() {
  console.log('🎨 アイコン生成を開始します...\n');

  // SVGファイルの存在確認
  if (!fs.existsSync(svgPath)) {
    console.error('❌ エラー: icon.svg が見つかりません');
    process.exit(1);
  }

  // iconsディレクトリの確認
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // 各サイズのPNGを生成
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✅ ${size}x${size} アイコンを生成しました: ${path.basename(outputPath)}`);
    } catch (error) {
      console.error(`❌ ${size}x${size} アイコンの生成に失敗しました:`, error.message);
    }
  }

  console.log('\n🎉 アイコン生成が完了しました！');
  console.log('\n📂 生成されたファイル:');
  sizes.forEach(size => {
    console.log(`   - icons/icon-${size}x${size}.png`);
  });
}

generateIcons().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
