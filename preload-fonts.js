(() => {
  // ベースURL情報をキャッシュして効率化
  const FONT_BASE_URL = chrome.runtime.getURL('fonts/');
  const CSS_BASE_URL = chrome.runtime.getURL('css/');

  // フォントURLをプリコンピュート（ループ内での文字列連結を回避）
  const FONT_CONFIG = [
    { weight: 'Regular', fontUrl: `${FONT_BASE_URL}NotoSansJP-Regular.woff2`, cssUrl: `${CSS_BASE_URL}replacefont-extension-regular.css` },
    { weight: 'Bold', fontUrl: `${FONT_BASE_URL}NotoSansJP-Bold.woff2`, cssUrl: `${CSS_BASE_URL}replacefont-extension-bold.css` }
  ];

  // クラス名の衝突を防ぐためのユニークID生成
  const uniqueId = `preloadFontTag${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // 処理済みドキュメントを追跡（重複処理を防止）
  const processedDocs = new WeakSet();

  // ルートドキュメントにフォント読み込み
  createPreloadTag(document);

  // 既存のiframeを処理
  const iframes = document.getElementsByTagName('iframe');
  for (const iframe of iframes) {
    try {
      if (iframe.contentDocument) {
        createPreloadTag(iframe.contentDocument);
      }
    } catch (e) {
      // クロスオリジンiframeへのアクセスエラーは無視
    }
  }

  // デバウンス用の変数
  let pendingIframes = [];
  let debounceTimer = null;
  const DEBOUNCE_DELAY = 100; // ミリ秒

  // デバウンスされたiframe処理
  function processPendingIframes() {
    const iframesToProcess = pendingIframes;
    pendingIframes = [];
    debounceTimer = null;

    for (const iframe of iframesToProcess) {
      try {
        if (iframe.contentDocument && !processedDocs.has(iframe.contentDocument)) {
          createPreloadTag(iframe.contentDocument);
        }
      } catch (e) {
        // クロスオリジンiframeへのアクセスエラーは無視
      }
    }
  }

  // 動的に追加されるiframeを監視
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IFRAME') {
          // iframeのロード完了を待ってから処理（一度だけ）
          node.addEventListener('load', function onLoad() {
            node.removeEventListener('load', onLoad);
            pendingIframes.push(node);

            // デバウンス：複数のiframeが同時に追加された場合にまとめて処理
            if (!debounceTimer) {
              debounceTimer = setTimeout(processPendingIframes, DEBOUNCE_DELAY);
            }
          });
        }
      }
    }
  });

  // DOM全体を監視
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  function createPreloadTag(elem) {
    if (!elem || !elem.body) return;

    // 既に処理済みの場合はスキップ
    if (processedDocs.has(elem)) return;
    processedDocs.add(elem);

    // DocumentFragmentを使用してDOM操作をバッチ化
    const fragment = elem.createDocumentFragment();

    for (const config of FONT_CONFIG) {
      const preloadTag = elem.createElement('link');
      preloadTag.rel = 'preload';
      preloadTag.as = 'font';
      preloadTag.href = config.fontUrl;
      preloadTag.crossOrigin = 'anonymous';
      preloadTag.className = `${uniqueId}_${config.weight}`;

      // フォント読み込み成功時の処理
      preloadTag.addEventListener('load', function onFontLoad() {
        preloadTag.removeEventListener('load', onFontLoad);
        const loadCSS = elem.createElement('link');
        loadCSS.rel = 'stylesheet';
        loadCSS.type = 'text/css';
        loadCSS.href = config.cssUrl;
        elem.body.appendChild(loadCSS);
      });

      // フォント読み込み失敗時のエラーハンドリング
      preloadTag.addEventListener('error', function onFontError() {
        preloadTag.removeEventListener('error', onFontError);
        console.warn(`[NotoSansへ置換するやつ(改修型)] フォント読み込み失敗: ${config.weight}`);
      });

      fragment.appendChild(preloadTag);
    }

    // 一度のDOM操作でまとめて追加
    elem.body.appendChild(fragment);
  }
})();
