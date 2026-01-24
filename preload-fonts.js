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
  const FONT_BASE_URL = `${BASE_URL}fonts/`;
  const CSS_BASE_URL = `${BASE_URL}css/`;

  // フォントURLとCSS URLの設定
  const FONT_CONFIG = [
    { weight: 'Regular', fontUrl: `${FONT_BASE_URL}NotoSansJP-Regular.woff2`, cssUrl: `${CSS_BASE_URL}replacefont-extension-regular.css` },
    { weight: 'Bold', fontUrl: `${FONT_BASE_URL}NotoSansJP-Bold.woff2`, cssUrl: `${CSS_BASE_URL}replacefont-extension-bold.css` },
    { weight: 'MonoRegular', fontUrl: `${FONT_BASE_URL}UDEVGothicJPDOC-Regular.woff2` },
    { weight: 'MonoBold', fontUrl: `${FONT_BASE_URL}UDEVGothicJPDOC-Bold.woff2` }
  ];

  // クラス名の衝突を防ぐためのユニークID
  const uniqueId = `preloadFontTag${Date.now()}`;
  const cssUrls = FONT_CONFIG.filter(c => c.cssUrl).map(c => c.cssUrl);

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
        return cssText; // フォールバック
      }
    }
    return cssText;
  }

  /**
   * Shadow DOM (open/closed) 対応のためのスクリプト注入
   */
  function injectShadowDOMHandler() {
    try {
      const root = document.head;
      if (!root) return;

      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('inject.js');
      script.async = false;
      root.appendChild(script);
      script.onload = () => script.remove();
    } catch (e) {}
  }

  // Shadow DOM 注入イベントの待機
  window.addEventListener('replace-font-inject-shadow', (e) => {
    const shadowRoot = e.detail;
    if (shadowRoot) {
      injectCSS(shadowRoot);
    }
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
      const resources = await Promise.all(cssUrls.map(url => getStyleSheet(url)));
      const validResources = resources.filter(Boolean);

      if (validResources.length === 0) return;

      if (isConstructableSupported && root instanceof ShadowRoot) {
        // Constructable Stylesheets を使用（メモリ効率が良い）
        // 既存のシートを壊さないようにスプレッド演算子で追加
        const sheets = validResources.filter(res => res instanceof CSSStyleSheet);
        if (sheets.length > 0) {
          root.adoptedStyleSheets = [...root.adoptedStyleSheets, ...sheets];
          root._replaceFontApplied = true;
          return;
        }
      }

      // 通常の style タグ方式（fallback または非 ShadowRoot 用）
      const fragment = document.createDocumentFragment();
      validResources.forEach((res, i) => {
        const style = document.createElement('style');
        // res が文字列ならそのまま、Sheet なら元のテキスト（キャッシュ）を使用
        style.textContent = typeof res === 'string' ? res : fixedCSSCache.get(cssUrls[i]);
        style.dataset.replaceFont = 'true';
        fragment.appendChild(style);
      });
      root.appendChild(fragment);
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
    
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      if (currentNode.shadowRoot) injectCSS(currentNode.shadowRoot);
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

    // 既存の要素を非同期（チャンク分け）でチェックして、メインスレッドのブロックを防ぐ
    const allElements = document.querySelectorAll('*');
    let index = 0;
    const CHUNK_SIZE = 200;
    let scanAborted = false;

    function processChunks() {
      if (scanAborted) return;

      if (!document.documentElement?.isConnected) {
        scanAborted = true;
        return;
      }

      const end = Math.min(index + CHUNK_SIZE, allElements.length);
      for (; index < end; index++) {
        const el = allElements[index];
        if (el.isConnected && el.shadowRoot) {
          injectCSS(el.shadowRoot);
        }
      }
      if (index < allElements.length) {
        (window.requestIdleCallback || window.setTimeout)(processChunks, 0);
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
      preloadTag.className = `${uniqueId}_${config.weight}`;
      fragment.appendChild(preloadTag);
    }

    try {
      root.appendChild(fragment);
    } catch (e) {}
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
          }).catch(() => {
            // CSPなどで失敗した場合は無視
          });
        } catch (e) {}
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
