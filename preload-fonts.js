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

  // CSSをヘッドに直接注入（描画前）- 重複チェック付き（iframe用）
  // メインドキュメントはmanifest.jsonで静的注入されるため、この関数はiframe用
  function injectCSS(elem) {
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

  // document.body が利用可能になるまで待機してから処理
  function initializeWhenReady() {
    // メインドキュメントのCSSはmanifest.jsonで静的注入されるため、ここでは注入不要
    if (document.body) {
      initialize();
    } else {
      // DOMContentLoaded を待つ
      document.addEventListener('DOMContentLoaded', initialize);
    }
  }

  function initialize() {
    // メインドキュメントのCSSはmanifest.jsonで静的注入されるため、ここでは注入不要

    // ルートドキュメントにフォント読み込み
    createPreloadTag(document);

    // 既存のiframeを処理
    const iframes = document.getElementsByTagName('iframe');
    for (const iframe of iframes) {
      processIframe(iframe);
    }

    // 動的に追加されるiframeを監視
    setupMutationObserver();

    // ページアンロード時のクリーンアップ
    window.addEventListener('beforeunload', cleanup);

    // ページ読み込み完了後、フォント preload 警告を回避
    setupFontForceLoad();
  }

  function setupMutationObserver() {
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IFRAME') {
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
        }
      }
    });

    // DOM全体を監視
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
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

  // ページ読み込み完了後、ダミー要素でフォントを強制的に使用して preload 警告を回避
  function setupFontForceLoad() {
    window.addEventListener('load', () => {
      // スタイルタグ: preload 警告回避用のダミーフォント定義（Regular と Bold）
      const style = document.createElement('style');
      let cssText = '';
      for (const config of FONT_CONFIG) {
        cssText += `
        @font-face {
          font-family: 'ForceLoadNotoSans${config.weight}';
          src: url('${config.fontUrl}') format('woff2');
          font-display: swap;
        }
      `;
      }
      style.textContent = cssText;
      document.head.appendChild(style);

      // ダミー要素を入れるコンテナ
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';

      // ダミー要素: フォント読み込みをトリガーするための見えない要素
      for (const config of FONT_CONFIG) {
        const dummy = document.createElement('div');
        dummy.style.fontFamily = `ForceLoadNotoSans${config.weight}`;
        dummy.textContent = '.';
        container.appendChild(dummy);
      }
      document.body.appendChild(container);

      // requestIdleCallback で、ブラウザに余裕があるときに削除
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          container.remove();
          style.remove();
        });
      } else {
        // フォールバック: requestIdleCallback 非対応環境
        setTimeout(() => {
          container.remove();
          style.remove();
        }, 2000);
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
