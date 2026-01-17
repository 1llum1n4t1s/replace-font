const fs = require('fs');
const path = require('path');
const ttf2woff2Module = require('ttf2woff2');

// ttf2woff2 のインポート方法を確認
const ttf2woff2 = ttf2woff2Module.default || ttf2woff2Module;

const fontsDir = path.join(__dirname, '..', 'fonts');

// TTFファイルを検索
const ttfFiles = fs.readdirSync(fontsDir).filter(file => file.endsWith('.ttf'));

if (ttfFiles.length === 0) {
  console.log('✅ TTFファイルが見つかりませんでした。変換の必要はありません。');
  process.exit(0);
}

console.log(`🔍 ${ttfFiles.length}個のTTFファイルが見つかりました。`);

let convertedCount = 0;
let skippedCount = 0;

for (const ttfFile of ttfFiles) {
  const ttfPath = path.join(fontsDir, ttfFile);
  const woff2File = ttfFile.replace('.ttf', '.woff2');
  const woff2Path = path.join(fontsDir, woff2File);

  // 既にWOFF2ファイルが存在する場合はスキップ
  if (fs.existsSync(woff2Path)) {
    console.log(`⏭️  スキップ: ${woff2File} (既に存在)`);
    skippedCount++;
    continue;
  }

  try {
    console.log(`🔄 変換中: ${ttfFile} → ${woff2File}`);
    
    // TTFファイルを読み込み
    const ttfBuffer = fs.readFileSync(ttfPath);
    
    // WOFF2に変換
    const woff2Buffer = Buffer.from(ttf2woff2(ttfBuffer));
    
    // WOFF2ファイルを保存
    fs.writeFileSync(woff2Path, woff2Buffer);
    
    const ttfSize = (fs.statSync(ttfPath).size / 1024 / 1024).toFixed(2);
    const woff2Size = (fs.statSync(woff2Path).size / 1024 / 1024).toFixed(2);
    const reduction = ((1 - woff2Size / ttfSize) * 100).toFixed(1);
    
    console.log(`✅ 完了: ${woff2File} (${ttfSize}MB → ${woff2Size}MB, ${reduction}%削減)`);
    convertedCount++;
  } catch (error) {
    console.error(`❌ エラー: ${ttfFile} の変換に失敗しました:`, error.message);
  }
}

console.log('\n📊 変換結果:');
console.log(`  ✅ 変換: ${convertedCount}個`);
console.log(`  ⏭️  スキップ: ${skippedCount}個`);

if (convertedCount > 0) {
  console.log('\n💡 TTFファイルを削除する場合は、以下のコマンドを実行してください:');
  console.log('   Remove-Item fonts/*.ttf');
}
