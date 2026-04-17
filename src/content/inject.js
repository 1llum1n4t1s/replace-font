(() => {
  // 二重注入防止（manifest content_scripts と動的注入の両方で実行される可能性がある）
  if (window.__replaceFontShadowInterceptor) return;
  window.__replaceFontShadowInterceptor = true;

  // preload-fonts.js (ISOLATED World) が <script> タグの dataset に埋め込んだ
  // CSS URL と BASE_URL を読み出し、MAIN World 内で fetch & Shadow Root 注入まで完結させる。
  // ISOLATED → MAIN の CustomEvent.detail は DOM 参照を渡せないが、data 属性なら
  // 単純な文字列として共有でき、`document.currentScript` 経由で同期的に取得できる。
  const script = document.currentScript;
  const cssUrl = script?.dataset?.rfsCssUrl || '';
  const baseUrl = script?.dataset?.rfsBaseUrl || '';

  const canConstructSheet = typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype;
  let cachedSheet = null;
  let cachedCSSText = null;
  let cssLoadPromise = null;
  const pendingRoots = new Set();
  const APPLIED_FLAG = '__replaceFontApplied';

  async function loadCSS() {
    if (cachedCSSText !== null || !cssUrl) return cachedCSSText;
    if (cssLoadPromise) return cssLoadPromise;
    cssLoadPromise = (async () => {
      try {
        const response = await fetch(cssUrl);
        if (!response.ok) return null;
        let text = await response.text();
        if (baseUrl) text = text.replaceAll('__REPLACE_FONT_BASE__', baseUrl);
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
        // CSS 準備完了後、保留中の Shadow Root を一括処理
        for (const root of pendingRoots) applyToShadowRoot(root);
        pendingRoots.clear();
        return text;
      } catch (_) {
        return null;
      }
    })();
    return cssLoadPromise;
  }

  function applyToShadowRoot(shadowRoot) {
    if (!shadowRoot || shadowRoot[APPLIED_FLAG]) return;
    // CSS 未ロード時はキューに入れて後で処理
    if (cachedCSSText === null) {
      pendingRoots.add(shadowRoot);
      loadCSS();
      return;
    }
    try {
      if (cachedSheet && shadowRoot.adoptedStyleSheets) {
        // 既に同じシートが含まれている場合はスキップ（ISOLATED 側の重複注入に備える）
        if (!shadowRoot.adoptedStyleSheets.includes(cachedSheet)) {
          shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, cachedSheet];
        }
      } else {
        // 非対応環境 or adoptedStyleSheets 失敗時は <style> タグ
        if (!shadowRoot.querySelector?.('[data-replace-font]')) {
          const style = document.createElement('style');
          style.textContent = cachedCSSText;
          style.dataset.replaceFont = 'true';
          shadowRoot.appendChild(style);
        }
      }
      shadowRoot[APPLIED_FLAG] = true;
    } catch (_) {
      // 一度だけ applied フラグを立てずに終了 → 次回 attachShadow 時にリトライ可能
    }
  }

  try {
    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(init) {
      const shadowRoot = originalAttachShadow.apply(this, arguments);
      if (shadowRoot) {
        // MAIN World で直接 ShadowRoot を保持しているため open / closed 問わず注入可能。
        // attachShadow がカスタム要素のコンストラクタ内で呼ばれるケースでも
        // Web Components 仕様に抵触しないよう microtask で遅延実行する。
        const host = this;
        queueMicrotask(() => {
          applyToShadowRoot(shadowRoot);
          // open shadow はホスト要素を辿って ISOLATED 側からも到達可能。
          // 既存の MutationObserver フォールバックと協調するため、マーカーを付与しておく
          // （重複注入は applyToShadowRoot 側で防止済み）。
          if (init?.mode === 'open') {
            try { host.setAttribute('data-rfs-shadow', ''); } catch (_) {}
            window.dispatchEvent(new Event('replace-font-shadow-created'));
          }
        });
      }
      return shadowRoot;
    };
  } catch (e) {
    // attachShadow の上書きに失敗した場合、ISOLATED 側の MutationObserver にフォールバック
    console.debug('[NotoSans置換] attachShadow override failed:', e.message);
  }

  // CSS の先行ロード（attachShadow が呼ばれる前に準備完了することが多い）
  if (cssUrl) loadCSS();
})();
