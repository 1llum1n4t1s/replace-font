// ポップアップ初期化
document.addEventListener('DOMContentLoaded', () => {
  const manifest = chrome.runtime.getManifest();
  const versionElement = document.getElementById('version');
  if (versionElement && manifest.version) {
    versionElement.textContent = `v${manifest.version}`;
  }
});
