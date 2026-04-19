(() => {
  // デバッグログ: 本番では no-op に差し替えて文字列生成コストを排除
  const DEBUG = false;
  const log = DEBUG ? console.debug.bind(console) : () => {};

  // BODY_FONT / MONO_FONT は src/content/font-config.js が定義し、
  // manifest の content_scripts で本ファイルより前に読み込まれる。
  // 同一スクリプトスコープのため IIFE 内から外部参照で読める。
  // eslint-disable-next-line no-undef
  const _BODY = BODY_FONT;
  // eslint-disable-next-line no-undef
  const _MONO = MONO_FONT;

  // data-replace-font / data-rfs-shadow 属性の定数
  const RFS_ATTR = 'replaceFont';               // dataset プロパティ名
  const RFS_SELECTOR = 'data-replace-font';     // querySelector 用
  const RFS_FALLBACK = 'fallback';
  const RFS_DYNAMIC = 'dynamic';
  const RFS_SHADOW_ATTR = 'data-rfs-shadow';    // inject.js と文字列一致させる

  // タイムアウト・定数
  const CSS_FETCH_TIMEOUT_MS = 5000;
  const FAILURE_TTL_MS = 5000;                  // fetch 失敗のネガティブキャッシュ TTL
  const RETRY_LIMIT = 3;                        // injectCSS の連続失敗上限
  const SHADOW_SCAN_CHUNK_SIZE = 200;           // 初期スキャンのチャンク
  const IDLE_TIMEOUT_MS = 100;                  // requestIdleCallback の最大待ち
  const SHADOW_BATCH_MAX = 512;                 // 1 マイクロタスクあたりのシャドウ処理上限
  const EARLY_STYLE_BUFFER_CAP = 1024;          // earlyStyleBuffer の上限 (FIFO)
  const HEALTH_CHECK_DELAY_MS = 1500;           // CSS 適用後のフォント load 確認遅延

  // 動的フォント検出: Next.js next/font や PostCSS modules 等の自動生成 family 名
  // 例: __Inter_abc123, __Inter_Fallback_abc123 (Fallback も末尾 [a-f0-9]+ で終わる)
  //     末尾直前の中間トークンは英字を含むため [A-Za-z0-9_]* でカバーする
  const DYNAMIC_FONT_PATTERN = /^__[A-Za-z][A-Za-z0-9_]*_[a-f0-9]{4,}$/;
  // mono 系と判定するキーワード
  const MONO_KEYWORD_PATTERN = /mono|code|menlo|consolas|courier/i;

  /**
   * @font-face ルールからフォントファミリー名を正規化して返す
   */
  function getFontFamilyName(rule) {
    return rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim().toLowerCase();
  }

  // family 名の CSS-safe エスケープ（" と \ を中和）
  // DYNAMIC_FONT_PATTERN が [A-Za-z0-9_] のみ許可しているため現状は実害ないが、
  // パターン緩和時のリグレッションを防ぐ防御深化
  function escapeFamilyName(name) {
    return String(name).replace(/\\/g, '\\\\').replace(/"/g, '');
  }

  // 拡張機能のベースURL取得
  const getExtensionBaseURL = () => {
    try {
      const url = chrome.runtime.getURL('');
      if (url && url.includes('://')) return url;
    } catch (e) {
      log('[フォント置換] runtime.getURL failed:', e.message);
    }
    return `chrome-extension://${chrome.runtime.id}/`;
  };

  const BASE_URL = getExtensionBaseURL();
  const FONT_BASE_URL = `${BASE_URL}src/fonts/`;
  const CSS_BASE_URL = `${BASE_URL}src/css/`;
  const TEMPLATE_CSS_URL = `${CSS_BASE_URL}replacefont-extension.css`;
  const IS_TOP_FRAME = (() => {
    try { return window.top === window; } catch (_) { return false; }
  })();

  // Constructable Stylesheet サポート
  const CAN_CONSTRUCT_SHEET =
    typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype;
  // document.adoptedStyleSheets サポート (Chrome 99+、Firefox 101+)
  const CAN_ADOPT_ON_DOCUMENT = (() => {
    try { return Array.isArray(document.adoptedStyleSheets); } catch (_) { return false; }
  })();

  // ── 早期 <head> 監視バッファ ──
  const earlyStyleBuffer = [];
  let earlyHeadObserver = null;

  function startEarlyHeadMonitor() {
    if (earlyHeadObserver) return;
    const head = document.head;
    if (!head) return;
    earlyHeadObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === 'STYLE' ||
              (node.nodeName === 'LINK' && (node.rel === 'stylesheet' || node.as === 'style'))) {
            // 上限超過時は先頭から捨てる (FIFO) — CSS fetch が永続失敗する環境での肥大化を防ぐ
            if (earlyStyleBuffer.length >= EARLY_STYLE_BUFFER_CAP) {
              earlyStyleBuffer.shift();
            }
            earlyStyleBuffer.push(node);
          }
        }
      }
    });
    earlyHeadObserver.observe(head, { childList: true });
    disposers.push(() => {
      if (earlyHeadObserver) {
        earlyHeadObserver.disconnect();
        earlyHeadObserver = null;
      }
    });
  }

  function stopEarlyHeadMonitor() {
    if (earlyHeadObserver) {
      earlyHeadObserver.disconnect();
      earlyHeadObserver = null;
    }
    earlyStyleBuffer.length = 0;
  }

  // ── 状態管理 ──
  let fixedCSSPromise = null;
  let sharedStyleSheetPromise = null;
  let fetchFailureAt = 0;                         // 最後に fetch が失敗した時刻 (Date.now())
  // document（メインドキュメント）への CSS 適用状態。ShadowRoot は expando で管理
  let documentApplied = false;
  let documentInProgress = false;
  let documentRetryCount = 0;

  // フォント preload 用 URL リスト
  const FONT_PRELOAD_URLS = [
    `${FONT_BASE_URL}${_BODY.woff2Regular}`,
    `${FONT_BASE_URL}${_BODY.woff2Bold}`,
    `${FONT_BASE_URL}${_MONO.woff2Regular}`,
    `${FONT_BASE_URL}${_MONO.woff2Bold}`,
  ];

  // ページ離脱時のクリーンアップ関数（MutationObserver / Listener 等のリーク防止）
  const disposers = [];
  const onPagehideDispose = (e) => {
    // bfcache に入る場合（persisted）はリスナーを保持して pageshow で復帰できるようにする。
    // 最終アンロード（persisted=false）のときのみ完全 cleanup する。
    if (e && e.persisted) return;
    for (const dispose of disposers) {
      try { dispose(); } catch (err) {}
    }
  };
  const onPagehideCacheClear = (e) => {
    if (!e.persisted) return;
    // bfcache 突入時: キャッシュをクリアし pageshow で再構築可能にする
    fixedCSSPromise = null;
    sharedStyleSheetPromise = null;
    fetchFailureAt = 0;
    documentApplied = false;
    documentInProgress = false;
    documentRetryCount = 0;
    styleSheetMonitorActive = false;
    preloadInjected = false;
  };
  window.addEventListener('pagehide', onPagehideCacheClear);
  window.addEventListener('pagehide', onPagehideDispose);
  disposers.push(() => {
    window.removeEventListener('pagehide', onPagehideCacheClear);
    window.removeEventListener('pagehide', onPagehideDispose);
  });

  /**
   * CSS テンプレートを fetch し、実行時プレースホルダー (__REPLACE_FONT_BASE__) を解決する。
   * 失敗時は FAILURE_TTL_MS のネガティブキャッシュで fetch ストームを抑制する。
   * 並行呼び出し中の外部リセットで新 Promise が null 化される race を self-identity で防ぐ。
   */
  function getCSSText() {
    if (fixedCSSPromise) return fixedCSSPromise;
    if (fetchFailureAt && Date.now() - fetchFailureAt < FAILURE_TTL_MS) {
      return Promise.resolve(null);
    }

    const self = (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CSS_FETCH_TIMEOUT_MS);
        const response = await fetch(TEMPLATE_CSS_URL, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
          fetchFailureAt = Date.now();
          if (fixedCSSPromise === self) fixedCSSPromise = null;
          return null;
        }
        const text = await response.text();
        return text.replace(/__REPLACE_FONT_BASE__/g, BASE_URL);
      } catch (e) {
        fetchFailureAt = Date.now();
        if (fixedCSSPromise === self) fixedCSSPromise = null;
        return null;
      }
    })();
    fixedCSSPromise = self;
    return self;
  }

  /**
   * 共有 CSSStyleSheet を取得（adoptedStyleSheets 用、document と Shadow DOM で共有）
   */
  function getSharedStyleSheet() {
    if (!CAN_CONSTRUCT_SHEET) return Promise.resolve(null);
    if (sharedStyleSheetPromise) return sharedStyleSheetPromise;
    const self = (async () => {
      const cssText = await getCSSText();
      if (!cssText) {
        if (sharedStyleSheetPromise === self) sharedStyleSheetPromise = null;
        return null;
      }
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        return sheet;
      } catch (e) {
        if (sharedStyleSheetPromise === self) sharedStyleSheetPromise = null;
        return null;
      }
    })();
    sharedStyleSheetPromise = self;
    return self;
  }

  // ── Shadow DOM 対応 ──
  // inject.js は manifest の content_scripts で MAIN world / document_start 登録済み。
  // host 要素に data-rfs-shadow="" 属性が一時的に付くのを監視し、処理後は削除する。
  //
  // 信頼境界について:
  //   ページスクリプトが自分で data-rfs-shadow を付与して偽装イベントを撃つことは可能。
  //   その場合 injectCSS は「拡張自身の CSS」を shadowRoot に付けるだけで、攻撃者制御
  //   CSS は注入されない。ただし DoS 防止のため 1 バッチあたり SHADOW_BATCH_MAX を上限化。

  let shadowBatchPending = false;
  const handleShadowCreated = () => {
    if (shadowBatchPending) return;
    shadowBatchPending = true;
    queueMicrotask(() => {
      shadowBatchPending = false;
      const elements = document.querySelectorAll(`[${RFS_SHADOW_ATTR}]`);
      let processed = 0;
      for (const el of elements) {
        if (processed >= SHADOW_BATCH_MAX) break;
        // 属性は即時除去して DOM 汚染を最小化
        el.removeAttribute(RFS_SHADOW_ATTR);
        if (el.shadowRoot) {
          injectCSS(el.shadowRoot);
          processed++;
        }
      }
    });
  };
  window.addEventListener('replace-font-shadow-created', handleShadowCreated);
  disposers.push(() => window.removeEventListener('replace-font-shadow-created', handleShadowCreated));

  /**
   * ShadowRoot への CSS 注入（adoptedStyleSheets 優先、フォールバックで <style> タグ）
   */
  async function injectCSS(root) {
    if (!root || !(root instanceof ShadowRoot)) return;
    if (root._replaceFontApplied || root._replaceFontInProgress) return;

    root._replaceFontInProgress = true;
    try {
      const sheet = await getSharedStyleSheet();
      if (sheet) {
        if (!root.adoptedStyleSheets.includes(sheet)) {
          root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
        }
        root._replaceFontApplied = true;
        return;
      }

      // Constructable Stylesheet 非対応 or sheet 取得失敗: <style> タグでフォールバック
      const cssText = await getCSSText();
      if (!cssText) {
        root._replaceFontRetryCount = (root._replaceFontRetryCount || 0) + 1;
        if (root._replaceFontRetryCount >= RETRY_LIMIT) root._replaceFontApplied = true;
        return;
      }
      const style = document.createElement('style');
      style.textContent = cssText;
      style.dataset[RFS_ATTR] = RFS_FALLBACK;
      root.appendChild(style);
      root._replaceFontApplied = true;
    } catch (e) {
      root._replaceFontRetryCount = (root._replaceFontRetryCount || 0) + 1;
      if (root._replaceFontRetryCount >= RETRY_LIMIT) root._replaceFontApplied = true;
    } finally {
      root._replaceFontInProgress = false;
    }
  }

  /**
   * メインドキュメントへの CSS 注入（adoptedStyleSheets 優先）。
   * ShadowRoot と異なり document は expando プロパティではなく
   * モジュールローカル変数で状態管理する（document への汚染回避）。
   */
  async function injectToDocument() {
    if (documentApplied || documentInProgress) return;
    documentInProgress = true;
    try {
      const sheet = await getSharedStyleSheet();
      if (sheet && CAN_ADOPT_ON_DOCUMENT) {
        if (!document.adoptedStyleSheets.includes(sheet)) {
          document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        }
        documentApplied = true;
        // setupStyleSheetMonitor に sheet を直接渡して querySelectorAll introspection を省略
        setupStyleSheetMonitor(sheet);
        return;
      }

      // フォールバック: <style> タグ
      const cssText = await getCSSText();
      if (!cssText) {
        documentRetryCount++;
        if (documentRetryCount >= RETRY_LIMIT) documentApplied = true;
        return;
      }
      const style = document.createElement('style');
      style.textContent = cssText;
      style.dataset[RFS_ATTR] = RFS_FALLBACK;
      (document.head || document.documentElement).appendChild(style);
      documentApplied = true;
      setupStyleSheetMonitor();
    } catch (e) {
      documentRetryCount++;
      if (documentRetryCount >= RETRY_LIMIT) documentApplied = true;
    } finally {
      documentInProgress = false;
    }
  }

  function findShadowRoots(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.isConnected && node.shadowRoot) injectCSS(node.shadowRoot);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      if (currentNode.isConnected && currentNode.shadowRoot) injectCSS(currentNode.shadowRoot);
    }
  }

  function setupShadowDOMObserver() {
    // Mutation バースト時は同一マイクロタスク内のノードを Set に蓄積して
    // 1 tick あたり 1 回だけ findShadowRoots を呼ぶ (React/Vue マウントの O(M×N) 抑制)
    const pendingMutationNodes = new Set();
    let mutationFlushPending = false;

    function flushMutationQueue() {
      mutationFlushPending = false;
      const snapshot = [...pendingMutationNodes];
      pendingMutationNodes.clear();
      for (const node of snapshot) {
        if (node.isConnected) findShadowRoots(node);
      }
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (!node.shadowRoot && !node.firstElementChild) continue;
          pendingMutationNodes.add(node);
        }
      }
      if (!mutationFlushPending && pendingMutationNodes.size > 0) {
        mutationFlushPending = true;
        queueMicrotask(flushMutationQueue);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    let scanAborted = false;
    let pendingIdleHandle = null;

    function scheduleChunk(fn) {
      if (window.requestIdleCallback) {
        pendingIdleHandle = window.requestIdleCallback(fn, { timeout: IDLE_TIMEOUT_MS });
      } else {
        pendingIdleHandle = setTimeout(fn, 0);
      }
    }

    function cancelPendingChunk() {
      if (pendingIdleHandle == null) return;
      if (window.cancelIdleCallback && window.requestIdleCallback) {
        try { window.cancelIdleCallback(pendingIdleHandle); } catch (e) {}
      } else {
        clearTimeout(pendingIdleHandle);
      }
      pendingIdleHandle = null;
    }

    function runInitialScan() {
      scanAborted = false;
      const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT);
      function processChunks() {
        pendingIdleHandle = null;
        if (scanAborted || !document.documentElement?.isConnected) return;
        let count = 0;
        let currentNode;
        while (count < SHADOW_SCAN_CHUNK_SIZE && (currentNode = walker.nextNode())) {
          if (currentNode.isConnected && currentNode.shadowRoot) injectCSS(currentNode.shadowRoot);
          count++;
        }
        if (count === SHADOW_SCAN_CHUNK_SIZE) scheduleChunk(processChunks);
      }
      processChunks();
    }

    // lifecycle: bfcache (persisted) 突入時は observer を disconnect し、復帰時に再観察
    const onPagehide = (e) => {
      scanAborted = true;
      cancelPendingChunk();
      try { observer.disconnect(); } catch (_) {}
    };
    const onPageshow = (e) => {
      if (!e.persisted) return;
      scanAborted = false;
      observer.observe(document.documentElement, { childList: true, subtree: true });
      runInitialScan();
    };
    window.addEventListener('pagehide', onPagehide);
    window.addEventListener('pageshow', onPageshow);
    disposers.push(() => {
      scanAborted = true;
      cancelPendingChunk();
      try { observer.disconnect(); } catch (_) {}
      window.removeEventListener('pagehide', onPagehide);
      window.removeEventListener('pageshow', onPageshow);
    });
    runInitialScan();
  }

  // ── フォント preload ──

  let preloadInjected = false;

  function createPreloadTag() {
    if (preloadInjected) return;
    if (!IS_TOP_FRAME) return;   // iframe は top frame の HTTP cache を共有
    const root = document.head || document.documentElement;
    if (!root) return;
    const fragment = document.createDocumentFragment();
    for (const url of FONT_PRELOAD_URLS) {
      if (!url || !url.startsWith(FONT_BASE_URL)) continue;
      const preloadTag = document.createElement('link');
      preloadTag.rel = 'preload';
      preloadTag.as = 'font';
      preloadTag.type = 'font/woff2';
      preloadTag.href = url;
      preloadTag.crossOrigin = 'anonymous';
      fragment.appendChild(preloadTag);
    }
    try {
      root.appendChild(fragment);
      preloadInjected = true;
    } catch (e) {}
  }

  // ── 動的フォント検出 (Next.js next/font / Perplexity pplx 等) ──

  const dynamicFontsInjected = new Set();
  let dynamicFontStyleNode = null;

  function buildDynamicRuleSet(families) {
    const safeLocal = (list) => list.map(f => `local("${escapeFamilyName(f)}")`).join(', ');
    const bodyRegUrl = `${FONT_BASE_URL}${_BODY.woff2Regular}`;
    const bodyBoldUrl = `${FONT_BASE_URL}${_BODY.woff2Bold}`;
    const monoRegUrl = `${FONT_BASE_URL}${_MONO.woff2Regular}`;
    const monoBoldUrl = `${FONT_BASE_URL}${_MONO.woff2Bold}`;
    const bodyLocalReg = safeLocal(_BODY.localFontsRegular);
    const bodyLocalBold = safeLocal(_BODY.localFontsBold);
    const monoLocalReg = safeLocal(_MONO.localFontsRegular);
    const monoLocalBold = safeLocal(_MONO.localFontsBold);

    const rules = [];
    for (const name of families) {
      const safeName = escapeFamilyName(name);
      const isMono = MONO_KEYWORD_PATTERN.test(name);
      const localReg = isMono ? monoLocalReg : bodyLocalReg;
      const localBold = isMono ? monoLocalBold : bodyLocalBold;
      const regUrl = isMono ? monoRegUrl : bodyRegUrl;
      const boldUrl = isMono ? monoBoldUrl : bodyBoldUrl;
      rules.push(
        `@font-face{font-family:"${safeName}";src:${localReg},url("${regUrl}") format("woff2");font-weight:100 599;font-display:swap}`,
        `@font-face{font-family:"${safeName}";src:${localBold},url("${boldUrl}") format("woff2");font-weight:600 900;font-display:swap}`
      );
    }
    return rules.join('');
  }

  function injectDynamicFonts(newFamilies) {
    if (!newFamilies.length) return;
    const css = buildDynamicRuleSet(newFamilies);
    if (!css) return;
    if (!dynamicFontStyleNode) {
      dynamicFontStyleNode = document.createElement('style');
      dynamicFontStyleNode.dataset[RFS_ATTR] = RFS_DYNAMIC;
      (document.head || document.documentElement).appendChild(dynamicFontStyleNode);
    }
    dynamicFontStyleNode.appendChild(document.createTextNode(css));
  }

  function scanDynamicFontFamilies() {
    if (!document.fonts) return;
    const added = [];
    for (const ff of document.fonts) {
      const name = (ff.family || '').replace(/['"]/g, '');
      if (!DYNAMIC_FONT_PATTERN.test(name)) continue;
      if (dynamicFontsInjected.has(name)) continue;
      dynamicFontsInjected.add(name);
      added.push(name);
    }
    if (added.length) {
      log('[フォント置換] 動的フォント検出:', added);
      injectDynamicFonts(added);
    }
  }

  function setupDynamicFontWatcher() {
    if (!document.fonts) return;
    scanDynamicFontFamilies();
    try {
      document.fonts.ready.then(() => scanDynamicFontFamilies()).catch(() => {});
    } catch (e) {}
    const onLoadingDone = () => scanDynamicFontFamilies();
    try {
      document.fonts.addEventListener('loadingdone', onLoadingDone);
      disposers.push(() => {
        try { document.fonts.removeEventListener('loadingdone', onLoadingDone); } catch (e) {}
      });
    } catch (e) {}
  }

  // ── 競合 @font-face 無効化 ──

  let styleSheetMonitorActive = false;

  /**
   * @param {CSSStyleSheet | undefined} ownSheet
   *   Constructable Stylesheet 経路で document.adoptedStyleSheets に入れたシート。
   *   渡されれば querySelectorAll introspection をスキップする（高速パス）。
   */
  function setupStyleSheetMonitor(ownSheet) {
    if (styleSheetMonitorActive || !document.head) return;
    styleSheetMonitorActive = true;

    stopEarlyHeadMonitor.__skipBuffer = true;  // 明示的に buffer を残す
    if (earlyHeadObserver) {
      earlyHeadObserver.disconnect();
      earlyHeadObserver = null;
    }

    // 置換対象フォントファミリーを「拡張機能のCSS」から収集
    const targetFamilies = new Set();
    const replacementNames = new Set([
      _BODY.name.toLowerCase(),
      _MONO.name.toLowerCase(),
      ..._BODY.localFontsRegular.map(s => s.toLowerCase()),
      ..._BODY.localFontsBold.map(s => s.toLowerCase()),
      ..._MONO.localFontsRegular.map(s => s.toLowerCase()),
      ..._MONO.localFontsBold.map(s => s.toLowerCase()),
    ]);

    const ownSheets = [];
    if (ownSheet) ownSheets.push(ownSheet);
    // フォールバック <style> タグ経路でもシートを拾う
    const fallbackStyles = document.querySelectorAll(
      `style[${RFS_SELECTOR}="${RFS_FALLBACK}"]`
    );
    for (const node of fallbackStyles) {
      if (node.sheet) ownSheets.push(node.sheet);
    }

    for (const sheet of ownSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.type === CSSRule.FONT_FACE_RULE) {
            const family = getFontFamilyName(rule);
            if (family && !replacementNames.has(family)) {
              targetFamilies.add(family);
            }
          }
        }
      } catch (e) {
        log('[フォント置換] cssRules 読み取り失敗:', e.message);
      }
    }

    if (targetFamilies.size === 0) {
      earlyStyleBuffer.length = 0;
      return;
    }

    let hasBlockedSheets = false;
    const processedSheets = new WeakSet();

    function neutralizeCompetingFontFaces(sheet) {
      if (!sheet) return true;
      if (processedSheets.has(sheet)) return true;
      try {
        const rules = sheet.cssRules;
        if (!rules) return true;
        for (let i = rules.length - 1; i >= 0; i--) {
          if (rules[i].type === CSSRule.FONT_FACE_RULE) {
            if (targetFamilies.has(getFontFamilyName(rules[i]))) {
              sheet.deleteRule(i);
            }
          }
        }
        processedSheets.add(sheet);
        return true;
      } catch (e) {
        return false;
      }
    }

    function processStyleNode(node) {
      if (node.dataset && node.dataset[RFS_ATTR]) return;
      if (node.nodeName === 'STYLE' && node.sheet) {
        neutralizeCompetingFontFaces(node.sheet);
      }
      if (node.nodeName === 'LINK') {
        if (!node.isConnected) return;    // detached link は load が永遠に来ない
        if (node.sheet) {
          neutralizeCompetingFontFaces(node.sheet);
        } else {
          node.addEventListener('load', () => {
            if (node.sheet) neutralizeCompetingFontFaces(node.sheet);
          }, { once: true });
        }
      }
    }

    for (const sheet of document.styleSheets) {
      if (!sheet.ownerNode?.dataset?.[RFS_ATTR]) {
        if (!neutralizeCompetingFontFaces(sheet)) {
          hasBlockedSheets = true;
        }
      }
    }

    for (const node of earlyStyleBuffer) {
      processStyleNode(node);
    }
    earlyStyleBuffer.length = 0;

    if (hasBlockedSheets) {
      const extStyle = document.querySelector(`style[${RFS_SELECTOR}]`);
      if (extStyle?.parentNode) {
        queueMicrotask(() => {
          if (extStyle.parentNode) extStyle.parentNode.appendChild(extStyle);
        });
      }
    }

    const headObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          const isStyle = node.nodeName === 'STYLE';
          const isLink = node.nodeName === 'LINK' &&
            (node.rel === 'stylesheet' || node.as === 'style');
          if (isStyle || isLink) processStyleNode(node);
        }
      }
    });

    headObserver.observe(document.head, { childList: true });
    const onHeadPagehide = () => {
      try { headObserver.disconnect(); } catch (_) {}
    };
    const onHeadPageshow = (e) => {
      if (e.persisted && document.head) {
        headObserver.observe(document.head, { childList: true });
        for (const sheet of document.styleSheets) {
          if (!sheet.ownerNode?.dataset?.[RFS_ATTR]) {
            neutralizeCompetingFontFaces(sheet);
          }
        }
      }
    };
    window.addEventListener('pagehide', onHeadPagehide);
    window.addEventListener('pageshow', onHeadPageshow);
    disposers.push(() => {
      try { headObserver.disconnect(); } catch (_) {}
      window.removeEventListener('pagehide', onHeadPagehide);
      window.removeEventListener('pageshow', onHeadPageshow);
    });
  }

  // ── ヘルスチェック (CSP font-src ブロック等の silent failure 検知) ──

  function runFontHealthCheck() {
    if (!IS_TOP_FRAME || !document.fonts || typeof document.fonts.check !== 'function') return;
    setTimeout(() => {
      try {
        const bodyOk = document.fonts.check(`16px "${_BODY.name}"`);
        const monoOk = document.fonts.check(`16px "${_MONO.name}"`);
        if (!bodyOk || !monoOk) {
          // DEBUG=false でも silent failure は検知したいので、console.info レベルで残す。
          // CSP font-src による woff2 ブロックやローカルフォント不在時のシグナル。
          // eslint-disable-next-line no-console
          console.info(
            '[フォント置換] フォント読込未完了:',
            `body=${bodyOk}`, `mono=${monoOk}`,
            '- サイトの CSP font-src 設定を確認してください'
          );
        }
      } catch (e) {}
    }, HEALTH_CHECK_DELAY_MS);
  }

  // ── 初期化 ──
  let initialized = false;

  function initialize() {
    if (initialized) return;
    initialized = true;
    log('[フォント置換] 初期化開始', location.href.substring(0, 80));

    setupShadowDOMObserver();

    if (document.head) {
      startEarlyHeadMonitor();
    } else {
      const headWatcher = new MutationObserver(() => {
        if (document.head) {
          headWatcher.disconnect();
          startEarlyHeadMonitor();
        }
      });
      headWatcher.observe(document.documentElement, { childList: true });
      disposers.push(() => headWatcher.disconnect());
    }

    const performInjections = () => {
      const head = document.head;
      if (!head) return;
      injectToDocument();
      createPreloadTag();
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
      disposers.push(() => observer.disconnect());
    }

    setupDynamicFontWatcher();
    runFontHealthCheck();

    log(`[フォント置換] 初期化完了: body=${_BODY.name}, mono=${_MONO.name}`);
  }

  // 実行開始
  if (document.documentElement) {
    initialize();
  } else {
    const observer = new MutationObserver(() => {
      if (document.documentElement) {
        observer.disconnect();
        initialize();
      }
    });
    observer.observe(document, { childList: true });
  }
})();
