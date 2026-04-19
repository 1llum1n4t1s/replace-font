#!/usr/bin/env node
// バージョン同期スクリプト
// package.json を唯一の source of truth として関連ファイルへバージョン番号を同期する。
// zip.sh / zip.ps1 / .github/workflows/publish.yml の 3 重実装を解消するための単一エントリ。

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

// SemVer X.Y.Z のみ受理。コマンドインジェクション / 不正な文字列を拒否。
if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version)) {
  console.error(`❌ 不正なバージョン形式: "${version}" (expected: X.Y.Z)`);
  process.exit(1);
}

// 同期対象ファイル。新しい HTML/README を追加したらここに加えるだけで
// zip.sh/zip.ps1/publish.yml どれから実行しても整合する。
const FILES_TO_UPDATE = [
  'manifest.json',
  'README.md',
  'docs/index.html',
  'docs/privacy.html',
  'src/popup/popup.html',
  'webstore/screenshots/01-popup-ui.html',
  'webstore/screenshots/02-before-after.html',
  'webstore/screenshots/03-hero-promo.html',
  'webstore/screenshots/04-promo-small.html',
  'webstore/screenshots/05-promo-marquee.html'
];

// 置換パターン: zip.sh / zip.ps1 の旧 regex を移植
const PATTERNS = [
  { re: /v[0-9]+\.[0-9]+\.[0-9]+/g, make: v => `v${v}` },
  { re: /Version [0-9]+\.[0-9]+\.[0-9]+/g, make: v => `Version ${v}` },
  { re: /"version":\s*"[^"]*"/g, make: v => `"version": "${v}"` },
  { re: /version-[0-9]+\.[0-9]+\.[0-9]+-/g, make: v => `version-${v}-` }
];

let changed = 0;
let skipped = 0;
for (const rel of FILES_TO_UPDATE) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.warn(`⚠️  ${rel} が見つからないためスキップ`);
    skipped++;
    continue;
  }
  const before = fs.readFileSync(abs, 'utf8');
  let after = before;
  for (const { re, make } of PATTERNS) {
    after = after.replace(re, make(version));
  }
  if (after !== before) {
    fs.writeFileSync(abs, after, 'utf8');
    changed++;
    console.log(`✅ ${rel}`);
  } else {
    console.log(`➖ ${rel} (変更なし)`);
  }
}

console.log(`\n🎯 バージョン同期完了: ${version} (${changed} 更新 / ${skipped} スキップ)`);
