(() => {
  // === 定数 ===
  // Why: B3 #I-1 でマジック値が定数化されていない指摘 → 設定変更時の影響範囲を局所化
  const MAX_RETRY_COUNT = 3;          // injectCSS の fetch 失敗リトライ上限
  const FAILURE_TTL_MS = 5000;        // フェッチ失敗の負キャッシュ TTL（ストーム抑制）
  const RETRY_RESET_MS = 30000;       // リトライ上限到達後、再試行を許可するまでの待機
  const CHUNK_SIZE = 200;             // TreeWalker チャンクあたりの要素数
  const IDLE_TIMEOUT_MS = 100;        // requestIdleCallback の最大待ち時間
  const PAYLOAD_TYPE = 'replace-font-css-payload'; // inject.js と一致させること
  // 共有フラグ名: inject.js の APPLIED_FLAG と一字一句一致させる必要がある
  const APPLIED_FLAG = '__replaceFontApplied';

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
  // メインフレームかどうか: iframe 多用ページで preload/CSS 注入が重複しないよう判定
  const IS_TOP_FRAME = (() => {
    try { return window.top === window; } catch (_) { return false; }
  })();

  // キャッシュされた固定済みCSS
  const fixedCSSCache = new Map();
  // フェッチ失敗の負キャッシュ (URL → 失敗時刻 ms)。ストーム抑制用。
  const fetchFailureCache = new Map();
  // Constructable Stylesheets のキャッシュ
  const sheetCache = new Map();
  const isConstructableSupported = typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype;

  /**
   * CSSファイルをフェッチして、プレースホルダーを絶対パスに置換したものを返す。
   * 失敗時は FAILURE_TTL_MS の負キャッシュで以降の連続フェッチを抑制する。
   */
  async function getFixedCSS(url) {
    if (fixedCSSCache.has(url)) return fixedCSSCache.get(url);
    const failedAt = fetchFailureCache.get(url);
    if (failedAt && Date.now() - failedAt < FAILURE_TTL_MS) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        fetchFailureCache.set(url, Date.now());
        return null;
      }
      let text = await response.text();
      text = text.replace(/__REPLACE_FONT_BASE__/g, BASE_URL)
                 .replace(/\.\.\/fonts\//g, FONT_BASE_URL);
      fixedCSSCache.set(url, text);
      fetchFailureCache.delete(url);
      return text;
    } catch (e) {
      fetchFailureCache.set(url, Date.now());
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
   * Shadow DOM (open/closed) 対応のためのスクリプト注入。
   * inject.js が manifest 側で declarative に world:"MAIN" content_script として
   * 起動するため、ここでは <script> タグの動的注入を行わない（旧設計を撤廃）。
   * CSS テキストだけを postMessage で MAIN world に転送する。
   */
  async function dispatchCSSToMainWorld() {
    try {
      const cssText = await getFixedCSS(CSS_URL);
      if (cssText) {
        // targetOrigin '*' を使うが、inject.js 側で構造検証・@import 排除等を行うため
        // 受信側スプーフィング対策はそちらに集約。
        window.postMessage({ type: PAYLOAD_TYPE, css: cssText }, '*');
      }
    } catch (e) {
      console.debug('[NotoSans置換] CSS payload dispatch failed:', e.message);
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

    // 既に適用済み、または注入実行中かチェック (inject.js と同じフラグ名で重複防止)
    if (root[APPLIED_FLAG] || root._replaceFontInProgress) return;

    // styleタグ方式が既に存在するか念のため確認
    if (root.querySelector && root.querySelector('[data-replace-font]')) {
      root[APPLIED_FLAG] = true;
      return;
    }

    root._replaceFontInProgress = true;

    try {
      const resource = await getStyleSheet(CSS_URL);

      if (!resource) {
        // 一時的なエラーの可能性を考慮し、MAX_RETRY_COUNT 回まで連続失敗をカウントする。
        // 上限到達後は RETRY_RESET_MS 経過後に自動でカウントをリセットして再試行を許可する
        // （永久ロックを避け、ネットワーク回復後に自然復旧）
        const retries = (root._replaceFontRetryCount || 0) + 1;
        root._replaceFontRetryCount = retries;
        if (retries >= MAX_RETRY_COUNT) {
          setTimeout(() => {
            try { root._replaceFontRetryCount = 0; } catch (_) {}
          }, RETRY_RESET_MS);
        }
        return;
      }

      if (isConstructableSupported && root instanceof ShadowRoot && resource instanceof CSSStyleSheet) {
        // Constructable Stylesheets を使用（メモリ効率が良い）。
        // includes ガードで重複追加を防ぐ（inject.js と同じセマンティクス）
        if (!root.adoptedStyleSheets.includes(resource)) {
          root.adoptedStyleSheets = [...root.adoptedStyleSheets, resource];
        }
        root[APPLIED_FLAG] = true;
        return;
      }

      // 通常の style タグ方式（fallback または非 ShadowRoot 用）
      const style = document.createElement('style');
      style.textContent = typeof resource === 'string' ? resource : fixedCSSCache.get(CSS_URL);
      style.dataset.replaceFont = 'true';
      root.appendChild(style);
      root[APPLIED_FLAG] = true;
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
    // mutation バーストを microtask で集約 → 1 tick あたり 1 回だけ走査する。
    // これにより React/Vue の初期マウント時の O(M×N) スキャンを抑制
    const pendingMutationNodes = new Set();
    let mutationFlushPending = false;

    function flushMutationQueue() {
      mutationFlushPending = false;
      const nodes = pendingMutationNodes;
      // 新しい Set に切り替えて走査中の追加を分離
      const snapshot = [...nodes];
      nodes.clear();
      for (const node of snapshot) {
        if (node.isConnected) {
          findShadowRoots(node);
        }
      }
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            pendingMutationNodes.add(node);
          }
        }
      }
      if (!mutationFlushPending && pendingMutationNodes.size > 0) {
        mutationFlushPending = true;
        queueMicrotask(flushMutationQueue);
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
          window.requestIdleCallback(processChunks, { timeout: IDLE_TIMEOUT_MS });
        } else {
          setTimeout(processChunks, 0);
        }
      }
    }

    // pagehide で観測停止 + チャンクスキャン中断（リスナー残存・MutationObserver 永続発火を防ぐ）
    window.addEventListener('pagehide', () => {
      scanAborted = true;
      try { observer.disconnect(); } catch (_) {}
    }, { once: true });
    processChunks();
  }

  // フォントの preload タグを生成して挿入（メインフレーム限定）。
  // Why: all_frames=true で iframe 数だけ <link> が増える問題を緩和。
  // chrome-extension:// の WOFF2 は同一プロセスでブラウザに cache されるため、
  // メインフレーム 1 回の preload だけで子フレームでも即座に利用可能。
  function createPreloadTag() {
    if (!IS_TOP_FRAME) return;
    const root = document.head || document.documentElement;
    if (!root) return;

    // 既存 preload <link> を一括取得して Set 化（毎ループで querySelector しない）
    const existingHrefs = new Set();
    for (const link of document.querySelectorAll('link[rel="preload"][as="font"]')) {
      if (link.href) existingHrefs.add(link.href);
    }

    const fragment = document.createDocumentFragment();
    for (const config of FONT_CONFIG) {
      // 有効な絶対URLであることを確認
      if (!config.fontUrl || !config.fontUrl.includes('://')) continue;
      if (existingHrefs.has(config.fontUrl)) continue;

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

  // NOTE: setupFontForceLoad (FontFace.load) は削除した。
  // - <link rel="preload"> と二重取得になりリクエスト数を倍増させていた (C2 #1)
  // - 旧名 "ForceLoadNotoSans${weight}" は UDEV を Mono で誤認識させる命名でもあった (B3 #I-6)
  // - chrome-extension:// プロトコルは FS 直読みのため <link rel="preload"> 一本で十分

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
      // inject.js は manifest の world:"MAIN" content_script で起動するため
      // 動的 <script> 注入は不要。CSS テキストのみ MAIN world へ転送する。
      dispatchCSSToMainWorld();
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
