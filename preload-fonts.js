(() => {
  // ベースURL情報をキャッシュして効率化
  const FONT_WEIGHTS = ['Regular', 'Bold'];
  const FONT_BASE_URL = chrome.runtime.getURL('fonts/');
  const CSS_BASE_URL = chrome.runtime.getURL('css/');

  // クラス名の衝突を防ぐためのユニークID生成
  const uniqueId = `preloadFontTag${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // ルートドキュメントにフォント読み込み
  createPreloadTag(document);

  // 既存のiframeを処理
  const iframes = document.getElementsByTagName('iframe');
  for (const iframe of iframes) {
    createPreloadTag(iframe.contentDocument);
  }

  // 動的に追加されるiframeを監視
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IFRAME') {
          // iframeのロード完了を待ってから処理
          node.addEventListener('load', () => {
            createPreloadTag(node.contentDocument);
          });
        }
      });
    });
  });

  // DOM全体を監視
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  function createPreloadTag(elem) {
    if (!elem || !elem.body) return;

    FONT_WEIGHTS.forEach((weight) => {
      const preloadTag = elem.createElement('link');
      preloadTag.setAttribute('rel', 'preload');
      preloadTag.setAttribute('as', 'font');
      preloadTag.setAttribute('href', `${FONT_BASE_URL}NotoSansCJKjp-${weight}-subset.woff2`);
      preloadTag.setAttribute('crossorigin', true);
      preloadTag.classList = `${uniqueId}_${weight}`;
      elem.body.appendChild(preloadTag);

      // フォント読み込み成功時の処理
      preloadTag.addEventListener('load', () => {
        const loadCSS = elem.createElement('link');
        loadCSS.setAttribute('rel', 'stylesheet');
        loadCSS.setAttribute('type', 'text/css');
        loadCSS.setAttribute('href', `${CSS_BASE_URL}replacefont-extension-${weight.toLowerCase()}.css`);
        elem.body.appendChild(loadCSS);
      });

      // フォント読み込み失敗時のエラーハンドリング
      preloadTag.addEventListener('error', () => {
        console.warn(`[やっぱり Noto Sans] フォント読み込み失敗: ${weight}`);
      });
    });
  }
})();
