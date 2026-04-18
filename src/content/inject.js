(() => {
  // 二重注入防止（manifest content_scripts と動的注入の両方で実行される可能性がある）
  if (window.__replaceFontShadowInterceptor) return;
  window.__replaceFontShadowInterceptor = true;

  // --- 役割分担 ---
  // このスクリプトは MAIN World で動作し、closed Shadow Root にだけ CSS を注入する。
  // open Shadow Root は ISOLATED World の preload-fonts.js に任せる（二重注入回避）。
  //
  // --- CSP 回避 ---
  // MAIN World からの fetch() はページの CSP (connect-src) に縛られるため、
  // preload-fonts.js (ISOLATED) が chrome-extension:// URL を fetch して
  // window.postMessage で CSS テキストを送ってくる。こちらはそれを受信するだけ。

  const canConstructSheet = typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype;
  let cachedSheet = null;
  let cachedCSSText = null;
  const pendingClosedRoots = new Set();
  const APPLIED_FLAG = '__replaceFontApplied';
  const PAYLOAD_TYPE = 'replace-font-css-payload';

  function applyToShadowRoot(shadowRoot) {
    if (!shadowRoot || shadowRoot[APPLIED_FLAG]) return;
    if (cachedCSSText === null) {
      pendingClosedRoots.add(shadowRoot);
      return;
    }
    try {
      if (cachedSheet && shadowRoot.adoptedStyleSheets) {
        if (!shadowRoot.adoptedStyleSheets.includes(cachedSheet)) {
          shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, cachedSheet];
        }
      } else if (!shadowRoot.querySelector?.('[data-replace-font]')) {
        const style = document.createElement('style');
        style.textContent = cachedCSSText;
        style.dataset.replaceFont = 'true';
        shadowRoot.appendChild(style);
      }
      shadowRoot[APPLIED_FLAG] = true;
    } catch (_) {
      // 失敗時はフラグを立てずに終了 → 次回 attachShadow 時に再試行可能
    }
  }

  // ISOLATED World から CSS テキストを postMessage で受信
  // (CustomEvent.detail は Chrome の isolated world 跨ぎで型保証が弱いため postMessage 採用)
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== PAYLOAD_TYPE) return;
    if (cachedCSSText !== null) return; // 初回のみ受理
    const text = typeof data.css === 'string' ? data.css : null;
    if (!text) return;
    cachedCSSText = text;
    if (canConstructSheet) {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(text);
        cachedSheet = sheet;
      } catch (_) {
        cachedSheet = null;
      }
    }
    // 保留中の closed shadow root に一括適用
    for (const root of pendingClosedRoots) applyToShadowRoot(root);
    pendingClosedRoots.clear();
  });

  try {
    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(init) {
      const shadowRoot = originalAttachShadow.apply(this, arguments);
      if (shadowRoot) {
        const host = this;
        // Web Components 仕様上、コンストラクタ内 attachShadow 直後の setAttribute は
        // NotSupportedError を投げるケースがあるため microtask で遅延させる。
        queueMicrotask(() => {
          if (init?.mode === 'closed') {
            // closed Shadow DOM は MAIN World からしかアクセスできないため、
            // ここで注入を完結させる。
            applyToShadowRoot(shadowRoot);
          } else {
            // open Shadow DOM は ISOLATED World 側で処理する。
            // host に目印を付けて event で通知 (detail 不要)。
            try { host.setAttribute('data-rfs-shadow', ''); } catch (_) {}
            window.dispatchEvent(new Event('replace-font-shadow-created'));
          }
        });
      }
      return shadowRoot;
    };
  } catch (e) {
    console.debug('[NotoSans置換] attachShadow override failed:', e.message);
  }
})();
