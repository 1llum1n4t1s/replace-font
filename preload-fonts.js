(() => {
  // 拡張機能の実行フラグを設定
  window.REPLACE_FONT_EXTENSION = true;
  
  // デバッグログ
  console.log('[NotoSansへ置換するやつ(改修型)] スクリプト実行開始', {
    readyState: document.readyState,
    hasHead: !!document.head,
    hasBody: !!document.body
  });

  // CSS URL（ユニバーサルセレクタ版）
  const CSS_URL = chrome.runtime.getURL('css/universal-override.css');

  // CSS注入済みドキュメントを追跡（重複処理を防止）
  const cssInjectedDocs = new WeakSet();

  // クリーンアップ用のリソース管理
  let observer = null;

  // JavaScript経由でCSSを注入（link要素を使用、CSP対策）
  function injectCSS(elem) {
    // link要素はhead内に配置する必要がある
    const target = elem?.head;
    if (!elem || !target) {
      console.warn('[NotoSansへ置換するやつ(改修型)] CSS注入スキップ: headなし');
      return false;
    }

    // IDによる存在チェック（実行コンテキストが異なる場合に対応）
    const existingLink = elem.querySelector('link[data-replace-font-extension]');
    if (existingLink) {
      console.log('[NotoSansへ置換するやつ(改修型)] CSS注入スキップ: 既に存在');
      return true;
    }

    // 既に処理済みの場合はスキップ（WeakSetによる二重チェック）
    if (cssInjectedDocs.has(elem)) {
      console.log('[NotoSansへ置換するやつ(改修型)] CSS注入スキップ: WeakSet');
      return true;
    }
    cssInjectedDocs.add(elem);

    try {
      // 単一のCSS linkを作成（ユニバーサルセレクタ版）
      const link = elem.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = CSS_URL;
      link.setAttribute('data-replace-font-extension', 'universal');

      // headの先頭に挿入（他のスタイルより優先）
      if (target.firstChild) {
        target.insertBefore(link, target.firstChild);
      } else {
        target.appendChild(link);
      }

      console.log('[NotoSansへ置換するやつ(改修型)] CSS注入成功（ユニバーサルセレクタ版）', {
        target: target.tagName,
        url: CSS_URL
      });
      return true;
    } catch (e) {
      console.error('[NotoSansへ置換するやつ(改修型)] CSS注入エラー:', e);
      return false;
    }
  }

  // 初期化処理
  function initialize() {
    // CSS注入はheadが必要
    if (document.head) {
      injectCSS(document);
      console.log('[NotoSansへ置換するやつ(改修型)] CSS注入完了（head存在）');
    } else {
      // headが存在しない場合は、headが作成されるまで待つ
      console.log('[NotoSansへ置換するやつ(改修型)] head待機中...');
      
      // MutationObserverでheadの作成を監視
      const headObserver = new MutationObserver(() => {
        if (document.head) {
          headObserver.disconnect();
          injectCSS(document);
          console.log('[NotoSansへ置換するやつ(改修型)] CSS注入完了（head作成後）');
        }
      });
      
      headObserver.observe(document.documentElement, {
        childList: true,
        subtree: false
      });
      
      // タイムアウト保険（100ms後にもう一度チェック）
      setTimeout(() => {
        if (document.head && !document.querySelector('link[data-replace-font-extension]')) {
          headObserver.disconnect();
          injectCSS(document);
          console.log('[NotoSansへ置換するやつ(改修型)] CSS注入完了（タイムアウト後）');
        }
      }, 100);
    }

    // Shadow DOMを監視（既存と動的追加の両方）
    setupShadowDOMObserver();

    // ページアンロード時のクリーンアップ
    window.addEventListener('beforeunload', cleanup);
  }

  // Shadow DOM専用のMutationObserver
  function setupMutationObserver() {
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.shadowRoot) {
            // Shadow DOMが追加された場合のみ処理
            injectCSSToShadowRoot(node.shadowRoot);
          }
        }
      }
    });

    // DOM全体を監視（Shadow DOM検出のみ）
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Shadow DOM内にCSSを注入
  function injectCSSToShadowRoot(shadowRoot) {
    try {
      // 既に注入済みかチェック
      const existingLink = shadowRoot.querySelector('link[data-replace-font-extension]');
      if (existingLink) return;

      // 単一のCSS linkを作成（ユニバーサルセレクタ版）
      const link = shadowRoot.ownerDocument.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = CSS_URL;
      link.setAttribute('data-replace-font-extension', 'universal');

      // Shadow Rootの先頭に挿入
      if (shadowRoot.firstChild) {
        shadowRoot.insertBefore(link, shadowRoot.firstChild);
      } else {
        shadowRoot.appendChild(link);
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

    // 動的に追加されるShadow DOMを監視
    setupMutationObserver();
  }

  // クリーンアップ処理
  function cleanup() {
    // MutationObserver を停止
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // 初期化開始（即座に実行）
  initialize();
})();
