(() => {
  // 注入された script タグから設定を取得
  const scriptTag = document.currentScript;
  if (!scriptTag) return;

  try {
    const cssUrls = JSON.parse(scriptTag.dataset.cssUrls || '[]');
    
    const inject = (root) => {
      if (!root || root.querySelector('link[data-replace-font]') || root.querySelector('style[data-replace-font]')) return;
      for (const url of cssUrls) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.dataset.replaceFont = 'true';
        root.appendChild(link);
      }
    };

    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(init) {
      const shadowRoot = originalAttachShadow.apply(this, arguments);
      if (shadowRoot) {
        // 少し遅延させて、Shadow DOM の中身が作成されるタイミングに合わせる
        setTimeout(() => inject(shadowRoot), 0);
      }
      return shadowRoot;
    };
  } catch (e) {
    console.error('[NotoSans置換] inject.js エラー:', e);
  }
})();
