(() => {
  // ベースURL情報をキャッシュして効率化
  const FONT_BASE_URL = chrome.runtime.getURL('fonts/');
  const CSS_BASE_URL = chrome.runtime.getURL('css/');

  // フォントURLとCSS URLをプリコンピュート
  const FONT_CONFIG = [
    { weight: 'Regular', fontUrl: `${FONT_BASE_URL}NotoSansJP-Regular.woff2`, cssUrl: `${CSS_BASE_URL}replacefont-extension-regular.css` },
    { weight: 'Bold', fontUrl: `${FONT_BASE_URL}NotoSansJP-Bold.woff2`, cssUrl: `${CSS_BASE_URL}replacefont-extension-bold.css` },
    { weight: 'MonoRegular', fontUrl: `${FONT_BASE_URL}UDEVGothicJPDOC-Regular.woff2` },
    { weight: 'MonoBold', fontUrl: `${FONT_BASE_URL}UDEVGothicJPDOC-Bold.woff2` }
  ];

  // クラス名の衝突を防ぐためのユニークID生成
  const uniqueId = `preloadFontTag${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const cssUrls = FONT_CONFIG.filter(c => c.cssUrl).map(c => c.cssUrl);
  
  // キャッシュされた固定済みCSS
  const fixedCSSCache = new Map();

  /**
   * CSSファイルをフェッチして、相対パスを絶対パスに置換したものを返す
   */
  async function getFixedCSS(url) {
    if (fixedCSSCache.has(url)) return fixedCSSCache.get(url);
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      let text = await response.text();
      // 相対パス ../fonts/ を絶対パス chrome-extension://.../fonts/ に置換
      text = text.replace(/\.\.\/fonts\//g, FONT_BASE_URL);
      fixedCSSCache.set(url, text);
      return text;
    } catch (e) {
      return null;
    }
  }

  /**
   * Shadow DOM (open/closed) 対応のためのスクリプト注入
   * ページ側の JS で作成される Shadow DOM を捕捉するために attachShadow をパッチする
   */
  function injectShadowDOMHandler() {
    try {
      const script = document.createElement('script');
      script.textContent = `
        (() => {
          const cssUrls = ${JSON.stringify(cssUrls)};
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
        })();
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (e) {
      // CSP などで制限されている場合は失敗する可能性がある
    }
  }

  /**
   * 指定したルート（ShadowRootなど）に CSS を注入する (Content Script側)
   */
  async function injectCSS(root) {
    if (!root || root.querySelector('link[data-replace-font]') || root.querySelector('style[data-replace-font]')) return;

    for (const url of cssUrls) {
      const fixedCSS = await getFixedCSS(url);
      if (fixedCSS) {
        const style = document.createElement('style');
        style.textContent = fixedCSS;
        style.dataset.replaceFont = 'true';
        try {
          root.appendChild(style);
        } catch (e) {
          // 静かに失敗
        }
      } else {
        // フェッチに失敗した場合は link タグでフォールバック
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.dataset.replaceFont = 'true';
        try {
          root.appendChild(link);
        } catch (e) {
          // 静かに失敗
        }
      }
    }
  }

  /**
   * 既存の Open Shadow DOM と MutationObserver による監視
   */
  function setupShadowDOMObserver() {
    // 既存の要素をチェック (openのみ)
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      if (el.shadowRoot) {
        injectCSS(el.shadowRoot);
      }
    }

    // 新規追加要素を監視
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.shadowRoot) {
              injectCSS(node.shadowRoot);
            }
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // document.body が利用可能になるまで待機してから処理
  function initializeWhenReady() {
    if (document.body) {
      initialize();
    } else {
      // DOMContentLoaded を待つ
      document.addEventListener('DOMContentLoaded', initialize, { once: true });
    }
  }

  // 初期化処理
  function initialize() {
    // 1. メインドキュメントに修正済みCSSを注入 (Manifest V3の相対パス解決問題を回避)
    injectCSS(document.head || document.documentElement);

    // 2. フォントのプリロード
    createPreloadTag();

    // 3. Shadow DOM 対応
    injectShadowDOMHandler();
    setupShadowDOMObserver();

    // 4. ページ読み込み完了後、フォント preload 警告を回避
    setupFontForceLoad();
  }

  // フォントの preload タグを生成して挿入
  function createPreloadTag() {
    if (!document.body) return;

    const fragment = document.createDocumentFragment();
    for (const config of FONT_CONFIG) {
      const preloadTag = document.createElement('link');
      preloadTag.rel = 'preload';
      preloadTag.as = 'font';
      preloadTag.href = config.fontUrl;
      preloadTag.crossOrigin = 'anonymous';
      preloadTag.className = `${uniqueId}_${config.weight}`;
      fragment.appendChild(preloadTag);
    }

    try {
      document.body.appendChild(fragment);
    } catch (e) {
      console.error('[NotoSansへ置換するやつ(改修型)] フォントpreloadタグの追加エラー:', e);
    }
  }

  // ページ読み込み完了後、CSS Font Loading API でフォントを強制的にロードして preload 警告を回避
  function setupFontForceLoad() {
    const forceLoad = () => {
      for (const config of FONT_CONFIG) {
        try {
          // URL を引用符で囲み、より確実に解決させる
          const fontFace = new FontFace(
            `ForceLoadNotoSans${config.weight}`,
            `url("${config.fontUrl}")`,
            { display: 'swap' }
          );

          fontFace.load()
            .then(loadedFace => {
              try {
                document.fonts.add(loadedFace);
              } catch (e) {
                // Ignore
              }
            })
            .catch(() => {
              // preloadタグで既にロード済みの場合があるためエラーは無視
            });
        } catch (e) {
          // FontFace constructor might throw on invalid URLs
        }
      }
    };

    if (document.readyState === 'complete') {
      forceLoad();
    } else {
      window.addEventListener('load', forceLoad, { once: true });
    }
  }

  // 初期化開始
  initializeWhenReady();
})();
