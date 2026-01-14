// ポップアップ初期化
document.addEventListener('DOMContentLoaded', () => {
  // manifest.json からバージョン番号を取得して表示
  const manifest = chrome.runtime.getManifest();
  const versionElement = document.getElementById('version');

  if (versionElement && manifest.version) {
    versionElement.textContent = `v${manifest.version}`;
  }
});
