(() => {
  // ベースURL情報を取得。常に絶対パスになるようにする。
  const getExtensionBaseURL = () => {
    try {
      const url = chrome.runtime.getURL('');
      if (url && url.includes('://')) return url;
    } catch (e) {}
    // フォールバック: manifest から取得を試みる（通常は不要）
    return `chrome-extension://${chrome.runtime.id}/`;
  };

  const BASE_URL = getExtensionBaseURL();
  const FONT_BASE_URL = `${BASE_URL}src/fonts/`;
  const CSS_BASE_URL = `${BASE_URL}src/css/`;

  // フォントURLとCSS URLの設定
  const FONT_CONFIG = [
    { weight: 'Regular', fontUrl: `${FONT_BASE_URL}NotoSansJP-Regular.woff2` },
    { weight: 'Bold', fontUrl: `${FONT_BASE_URL}NotoSansJP-Bold.woff2` },
    { weight: 'MonoRegular', fontUrl: `${FONT_BASE_URL}UDEVGothicJPDOC-Regular.woff2` },
    { weight: 'MonoBold', fontUrl: `${FONT_BASE_URL}UDEVGothicJPDOC-Bold.woff2` }
  ];

  // 統合CSSファイルのURL
  const CSS_URL = `${CSS_BASE_URL}replacefont-extension.css`;

  const PRELOAD_CLASS = 'preloadFontTag';

  // キャッシュされた固定済みCSS
  const fixedCSSCache = new Map();
  // Constructable Stylesheets のキャッシュ
  const sheetCache = new Map();
  const isConstructableSupported = typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype;

  /**
   * CSSファイルをフェッチして、プレースホルダーを絶対パスに置換したものを返す
   */
  async function getFixedCSS(url) {
    if (fixedCSSCache.has(url)) return fixedCSSCache.get(url);
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      let text = await response.text();
      text = text.replace(/__REPLACE_FONT_BASE__/g, BASE_URL)
                 .replace(/\.\.\/fonts\//g, FONT_BASE_URL);
      fixedCSSCache.set(url, text);
      return text;
    } catch (e) {
      return null;
    }
  }

  /**
   * StyleSheet オブジェクトを取得（サポートされている場合）
   */
  async function getStyleSheet(url) {
    if (sheetCache.has(url)) return sheetCache.get(url);
    const cssText = await getFixedCSS(url);
    if (!cssText) return null;

    if (isConstructableSupported) {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        sheetCache.set(url, sheet);
        return sheet;
      } catch (e) {
        sheetCache.set(url, cssText); // フォールバック時もキャッシュに保存
        return cssText;
      }
    }
    return cssText;
  }

  /**
   * Shadow DOM (open/closed) 対応のためのスクリプト注入
   * inject.js は MAIN World で attachShadow をフックし、取得した ShadowRoot に
   * 直接 CSS を注入する。closed Shadow Root にも届かせるため、CSS URL と BASE_URL を
   * dataset で渡す (CustomEvent.detail では DOM 参照を渡せないが data 属性なら確実)。
   */
  function injectShadowDOMHandler() {
    try {
      const root = document.head;
      if (!root) return;

      const scriptUrl = chrome.runtime.getURL('src/content/inject.js');
      // 既にスクリプトが注入されているかチェック
      if (document.querySelector(`script[src="${scriptUrl}"]`)) return;

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.dataset.rfsCssUrl = CSS_URL;
      script.dataset.rfsBaseUrl = BASE_URL;
      script.async = false;
      script.onload = () => script.remove();
      root.appendChild(script);
    } catch (e) {
      console.debug('[NotoSans置換] Shadow DOM handler injection failed:', e);
    }
  }

  // Shadow DOM 注入イベントの待機
  // inject.js (MAIN World) が attachShadow インターセプト時に
  // host element に data-rfs-shadow 属性を付与 → Event で通知
  // ※ CustomEvent.detail に DOM オブジェクトを渡しても MAIN → ISOLATED World 間の
  //   構造化クローンで null になるため、data 属性方式を使用
  // ※ attachShadow が連続呼び出しされる場合（YouTube等）のバースト対策として、
  //   同一マイクロタスク内のイベントをまとめて1回の querySelectorAll で処理する
  let shadowEventPending = false;
  window.addEventListener('replace-font-shadow-created', () => {
    if (shadowEventPending) return;
    shadowEventPending = true;
    queueMicrotask(() => {
      shadowEventPending = false;
      const elements = document.querySelectorAll('[data-rfs-shadow]:not([data-rfs-done])');
      for (const el of elements) {
        el.setAttribute('data-rfs-done', '');
        if (el.shadowRoot) {
          injectCSS(el.shadowRoot);
        }
      }
    });
  });

  /**
   * 指定したルート（ShadowRootなど）に CSS を注入する
   */
  async function injectCSS(root) {
    if (!root) return;

    // 既に適用済み、または注入実行中かチェック
    if (root._replaceFontApplied || root._replaceFontInProgress) return;

    // styleタグ方式が既に存在するか念のため確認
    if (root.querySelector && root.querySelector('[data-replace-font]')) {
      root._replaceFontApplied = true;
      return;
    }

    root._replaceFontInProgress = true;

    try {
      const resource = await getStyleSheet(CSS_URL);

      if (!resource) {
        // 一時的なエラーの可能性があるため、3回まで再試行を許可
        root._replaceFontRetryCount = (root._replaceFontRetryCount || 0) + 1;
        if (root._replaceFontRetryCount >= 3) {
          root._replaceFontApplied = true;
        }
        return;
      }

      if (isConstructableSupported && root instanceof ShadowRoot && resource instanceof CSSStyleSheet) {
        // Constructable Stylesheets を使用（メモリ効率が良い）
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, resource];
        root._replaceFontApplied = true;
        return;
      }

      // 通常の style タグ方式（fallback または非 ShadowRoot 用）
      const style = document.createElement('style');
      style.textContent = typeof resource === 'string' ? resource : fixedCSSCache.get(CSS_URL);
      style.dataset.replaceFont = 'true';
      root.appendChild(style);
      root._replaceFontApplied = true;
    } catch (e) {
      console.debug('[NotoSans置換] Injection failed:', e);
    } finally {
      root._replaceFontInProgress = false;
    }
  }

  /**
   * 指定されたノードとその子孫要素から Shadow DOM を持つ要素を検索して CSS を注入
   * @param {Node} node - 走査対象のノード
   */
  function findShadowRoots(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    // 起点となるノード自体の Shadow DOM を処理
    // createTreeWalker の nextNode() は起点ノードを含まないため、ここで明示的に処理する
    if (node.isConnected && node.shadowRoot) {
      injectCSS(node.shadowRoot);
    }

    // 子孫要素の Shadow DOM を走査
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      if (currentNode.isConnected && currentNode.shadowRoot) {
        injectCSS(currentNode.shadowRoot);
      }
    }
  }

  /**
   * 既存の Open Shadow DOM と MutationObserver による監視
   */
  function setupShadowDOMObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            findShadowRoots(node);
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // 既存の要素をTreeWalkerで逐次走査（querySelectorAll('*')と違い全要素リストをメモリに保持しない）
    const walker = document.createTreeWalker(
      document.documentElement,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    const CHUNK_SIZE = 200;
    let scanAborted = false;

    function processChunks() {
      if (scanAborted) return;

      if (!document.documentElement?.isConnected) {
        scanAborted = true;
        return;
      }

      let count = 0;
      let currentNode;
      while (count < CHUNK_SIZE && (currentNode = walker.nextNode())) {
        if (currentNode.isConnected && currentNode.shadowRoot) {
          injectCSS(currentNode.shadowRoot);
        }
        count++;
      }

      if (count === CHUNK_SIZE) {
        // まだ要素がある可能性がある
        if (window.requestIdleCallback) {
          window.requestIdleCallback(processChunks, { timeout: 100 });
        } else {
          setTimeout(processChunks, 0);
        }
      }
    }

    window.addEventListener('pagehide', () => { scanAborted = true; }, { once: true });
    processChunks();
  }

  // フォントの preload タグを生成して挿入
  function createPreloadTag() {
    const root = document.head || document.documentElement;
    if (!root) return;

    const fragment = document.createDocumentFragment();
    for (const config of FONT_CONFIG) {
      // 有効な絶対URLであることを確認
      if (!config.fontUrl || !config.fontUrl.includes('://')) continue;
      // 重複チェック
      if (document.querySelector(`link[href="${config.fontUrl}"]`)) continue;

      const preloadTag = document.createElement('link');
      preloadTag.rel = 'preload';
      preloadTag.as = 'font';
      preloadTag.href = config.fontUrl;
      preloadTag.crossOrigin = 'anonymous';
      preloadTag.className = `${PRELOAD_CLASS}_${config.weight}`;
      fragment.appendChild(preloadTag);
    }

    try {
      root.appendChild(fragment);
    } catch (e) {
      console.debug('[NotoSans置換] Preload tag insertion failed:', e.message);
    }
  }

  // ページ読み込み完了後、CSS Font Loading API でフォントを強制的にロード
  function setupFontForceLoad() {
    const forceLoad = () => {
      for (const config of FONT_CONFIG) {
        // 有効な絶対URLであることを確認
        if (!config.fontUrl || !config.fontUrl.includes('://')) continue;

        try {
          const fontFace = new FontFace(
            `ForceLoadNotoSans${config.weight}`,
            `url("${config.fontUrl}")`,
            { display: 'swap' }
          );
          fontFace.load().then(loadedFace => {
            // ドキュメントが有効な場合のみ追加
            if (document.fonts) {
              document.fonts.add(loadedFace);
            }
          }).catch((e) => {
            console.debug('[NotoSans置換] Font preload failed:', config.weight, e.message);
          });
        } catch (e) {
          console.debug('[NotoSans置換] FontFace creation failed:', config.weight, e.message);
        }
      }
    };

    if (document.readyState === 'complete') {
      forceLoad();
    } else {
      window.addEventListener('load', forceLoad, { once: true });
    }
  }

  // 初期化処理
  function initialize() {
    if (document.documentElement.dataset.replaceFontInitialized) return;
    document.documentElement.dataset.replaceFontInitialized = 'true';

    // メインドキュメントへの注入処理（head が利用可能になってから実行）
    const performInjections = () => {
      const head = document.head;
      if (!head) return;

      injectCSS(head);
      createPreloadTag();
      injectShadowDOMHandler();
    };

    if (document.head) {
      performInjections();
    } else {
      const observer = new MutationObserver(() => {
        if (document.head) {
          observer.disconnect();
          performInjections();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }

    setupShadowDOMObserver(); // Shadow DOM 監視（Content Script側）
    setupFontForceLoad();
  }

  // 実行開始
  if (document.documentElement) {
    initialize();
  } else {
    // documentElementがまだない極稀なケースへの対応
    const observer = new MutationObserver(() => {
      if (document.documentElement) {
        observer.disconnect();
        initialize();
      }
    });
    observer.observe(document, { childList: true });
  }
})();
