(() => {
  // 拡張機能の実行フラグを設定
  window.REPLACE_FONT_EXTENSION = true;

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

  // CSS注入済みドキュメントを追跡（重複処理を防止）
  const cssInjectedDocs = new WeakSet();

  // preload処理済みドキュメントを追跡（重複処理を防止）
  const preloadedDocs = new WeakSet();

  // デバウンス用の変数
  let pendingIframes = [];
  let debounceTimer = null;
  const DEBOUNCE_DELAY = 100;

  // クリーンアップ用のリソース管理
  let observer = null;
  const eventListeners = [];

  // CSSファイルの内容をキャッシュ
  let cssContentCache = null;

  // CSSファイルを読み込んでキャッシュ
  async function loadCSSContent() {
    if (cssContentCache) return cssContentCache;

    try {
      const [regularResponse, boldResponse] = await Promise.all([
        fetch(FONT_CONFIG[0].cssUrl),
        fetch(FONT_CONFIG[1].cssUrl)
      ]);

      const [regularCSS, boldCSS] = await Promise.all([
        regularResponse.text(),
        boldResponse.text()
      ]);

      // CSSの内容を結合してキャッシュ
      cssContentCache = regularCSS + '\n' + boldCSS;
      return cssContentCache;
    } catch (e) {
      console.error('[NotoSansへ置換するやつ(改修型)] CSS読み込みエラー:', e);
      return '';
    }
  }

  // JavaScript経由でCSSを注入（CSP対策）
  async function injectCSSViaJS(elem) {
    // headがなければdocumentElement(htmlタグ)に入れる
    const target = elem?.head || elem?.documentElement;
    if (!elem || !target) return false;

    // 既に処理済みの場合はスキップ
    if (cssInjectedDocs.has(elem)) return true;
    cssInjectedDocs.add(elem);

    try {
      // CSSの内容を取得
      const cssContent = await loadCSSContent();
      if (!cssContent) return false;

      // <style>要素を作成してCSSを注入
      const style = elem.createElement('style');
      style.id = 'replace-font-extension-style';
      style.textContent = cssContent;

      // headの先頭に挿入（他のスタイルより優先）
      if (target.firstChild) {
        target.insertBefore(style, target.firstChild);
      } else {
        target.appendChild(style);
      }

      return true;
    } catch (e) {
      console.error('[NotoSansへ置換するやつ(改修型)] CSS注入エラー:', e);
      return false;
    }
  }

  // 従来のlink要素によるCSS注入（フォールバック）
  function injectCSSViaLink(elem) {
    // headがなければdocumentElement(htmlタグ)に入れる
    const target = elem?.head || elem?.documentElement;
    if (!elem || !target) return false;

    // 既に処理済みの場合はスキップ
    if (cssInjectedDocs.has(elem)) return true;
    cssInjectedDocs.add(elem);

    for (const config of FONT_CONFIG) {
      const link = elem.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = config.cssUrl;
      try {
        target.appendChild(link);
      } catch (e) {
        console.error('[NotoSansへ置換するやつ(改修型)] CSS注入エラー:', e);
      }
    }
    return true;
  }

  // CSSを注入（JavaScript経由を優先、失敗時はlink要素）
  async function injectCSS(elem) {
    // メインドキュメントの場合はJavaScript経由で注入
    if (elem === document) {
      return await injectCSSViaJS(elem);
    }
    // iframeの場合は従来の方法（link要素）
    else {
      return injectCSSViaLink(elem);
    }
  }

  // document.body が利用可能になるまで待機してから処理
  function initializeWhenReady() {
    if (document.body) {
      initialize();
    } else {
      // DOMContentLoaded を待つ
      document.addEventListener('DOMContentLoaded', initialize);
    }
  }

  async function initialize() {
    // メインドキュメントにCSSを注入（JavaScript経由）
    await injectCSS(document);

    // ルートドキュメントにフォント読み込み
    createPreloadTag(document);

    // 既存のiframeを処理
    const iframes = document.getElementsByTagName('iframe');
    for (const iframe of iframes) {
      processIframe(iframe);
    }

    // 動的に追加されるiframeを監視
    setupMutationObserver();

    // Shadow DOMを監視
    setupShadowDOMObserver();

    // ページアンロード時のクリーンアップ
    window.addEventListener('beforeunload', cleanup);

    // ページ読み込み完了後、フォント preload 警告を回避
    setupFontForceLoad();
  }

  function setupMutationObserver() {
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // iframeの処理
            if (node.tagName === 'IFRAME') {
              // iframeのロード完了を待ってから処理（一度だけ）
              const onLoad = () => {
                node.removeEventListener('load', onLoad);
                pendingIframes.push(node);

                // デバウンス：複数のiframeが同時に追加された場合にまとめて処理
                if (!debounceTimer) {
                  debounceTimer = setTimeout(processPendingIframes, DEBOUNCE_DELAY);
                }
              };

              node.addEventListener('load', onLoad);
              eventListeners.push({ element: node, event: 'load', handler: onLoad });
            }
            // Shadow DOMの処理
            else if (node.shadowRoot) {
              injectCSSToShadowRoot(node.shadowRoot);
            }
          }
        }
      }
    });

    // DOM全体を監視
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Shadow DOM内にCSSを注入
  async function injectCSSToShadowRoot(shadowRoot) {
    try {
      // CSSの内容を取得
      const cssContent = await loadCSSContent();
      if (!cssContent) return;

      // <style>要素を作成してCSSを注入
      const style = shadowRoot.ownerDocument.createElement('style');
      style.id = 'replace-font-extension-shadow-style';
      style.textContent = cssContent;

      // Shadow Rootの先頭に挿入
      if (shadowRoot.firstChild) {
        shadowRoot.insertBefore(style, shadowRoot.firstChild);
      } else {
        shadowRoot.appendChild(style);
      }
    } catch (e) {
      console.error('[NotoSansへ置換するやつ(改修型)] Shadow DOM CSS注入エラー:', e);
    }
  }

  // Shadow DOMを監視
  function setupShadowDOMObserver() {
    // 既存のShadow DOMを処理
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      if (element.shadowRoot) {
        injectCSSToShadowRoot(element.shadowRoot);
      }
    });
  }

  // デバウンスされたiframe処理
  function processPendingIframes() {
    const iframesToProcess = pendingIframes;
    pendingIframes = [];
    debounceTimer = null;

    for (const iframe of iframesToProcess) {
      processIframe(iframe);
    }
  }

  function processIframe(iframe) {
    try {
      const iframeDoc = iframe.contentDocument;
      if (iframeDoc) {
        injectCSS(iframeDoc);
        createPreloadTag(iframeDoc);
      }
    } catch (e) {
      // クロスオリジンiframeへのアクセスエラーは無視
      // SecurityError や DOMException のみ無視、その他のエラーはログ出力
      if (e.name !== 'SecurityError' && !(e instanceof DOMException)) {
        console.error('[NotoSansへ置換するやつ(改修型)] iframe処理エラー:', e);
      }
    }
  }

  function createPreloadTag(elem) {
    if (!elem || !elem.body) {
      // body が存在しない場合は、DOMContentLoaded を待つ
      if (elem && elem.readyState !== 'complete') {
        elem.addEventListener('DOMContentLoaded', () => {
          if (elem.body) {
            createPreloadTag(elem);
          }
        });
      }
      return;
    }

    // 既に処理済みの場合はスキップ
    if (preloadedDocs.has(elem)) return;
    preloadedDocs.add(elem);

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
      const onFontLoad = () => {
        preloadTag.removeEventListener('load', onFontLoad);
      };

      // フォント読み込み失敗時のエラーハンドリング
      const onFontError = (e) => {
        preloadTag.removeEventListener('error', onFontError);
        console.error('[NotoSansへ置換するやつ(改修型)] フォント読み込み失敗:', {
          weight: config.weight,
          url: config.fontUrl,
          error: e
        });
      };

      preloadTag.addEventListener('load', onFontLoad);
      preloadTag.addEventListener('error', onFontError);

      fragment.appendChild(preloadTag);
    }

    // 一度のDOM操作でまとめて追加
    try {
      elem.body.appendChild(fragment);
    } catch (e) {
      console.error('[NotoSansへ置換するやつ(改修型)] フォントpreloadタグの追加エラー:', e);
    }
  }

  // ページ読み込み完了後、CSS Font Loading API でフォントを強制的にロードして preload 警告を回避
  function setupFontForceLoad() {
    window.addEventListener('load', () => {
      // CSS Font Loading API を使用してフォントを明示的にロード（DOM操作不要）
      for (const config of FONT_CONFIG) {
        const fontFace = new FontFace(
          `ForceLoadNotoSans${config.weight}`,
          `url(${config.fontUrl})`,
          { display: 'swap' }
        );

        fontFace.load()
          .then(loadedFace => document.fonts.add(loadedFace))
          .catch(() => {
            // preloadタグで既にロード済みの場合があるためエラーは無視
          });
      }
    });
  }

  // クリーンアップ処理
  function cleanup() {
    // MutationObserver を停止
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    // デバウンスタイマーをクリア
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    // イベントリスナーを削除
    for (const { element, event, handler } of eventListeners) {
      try {
        element.removeEventListener(event, handler);
      } catch (e) {
        // 要素が既に削除されている場合は無視
      }
    }
    eventListeners.length = 0;

    // pendingIframes をクリア
    pendingIframes = [];
  }

  // 初期化開始
  initializeWhenReady();
})();
