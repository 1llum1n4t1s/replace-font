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
  // 全ファイル横断で共有するフラグ名（preload-fonts.js も同名を参照する）
  const APPLIED_FLAG = '__replaceFontApplied';
  const PAYLOAD_TYPE = 'replace-font-css-payload';
  // CSS 受信前にメモリリークしないよう pending Set の上限を設ける
  const PENDING_CAP = 256;
  // CSS 文字列のサイズ上限（実 CSS は ~100KB なので 1MB は十分余裕）
  const MAX_CSS_BYTES = 1024 * 1024;
  // 構造化検証で受け入れるべき先頭 prefix（生成 CSS は @charset で始まる）
  const CSS_PREFIX = '@charset "UTF-8"';

  /**
   * 受信した CSS テキストが拡張正規のものかを構造で判定する。
   * Why: postMessage は MAIN world の任意ページスクリプトが偽装可能。
   *      nonce による認証は document_start 時点では DOM 読み取りで突破されうる。
   *      そこで CSS 内容自身を検査し、外部リソース取得や JS 風記述を含むものは拒否する。
   */
  function isAcceptableCSS(text) {
    if (typeof text !== 'string') return false;
    if (text.length < 1024) return false;            // 短すぎる
    if (text.length > MAX_CSS_BYTES) return false;   // 大きすぎる
    if (!text.startsWith(CSS_PREFIX)) return false;  // 生成 CSS の固定 prefix
    // 外部リソース取得・スクリプト系構文を弾く
    if (/@import\b/i.test(text)) return false;
    if (/url\(\s*['"]?(?:https?:|\/\/)/i.test(text)) return false;
    if (/expression\s*\(/i.test(text)) return false;
    if (/behavior\s*:/i.test(text)) return false;
    if (/javascript\s*:/i.test(text)) return false;
    if (/<\s*script/i.test(text)) return false;
    return true;
  }

  function applyToShadowRoot(shadowRoot) {
    if (!shadowRoot || shadowRoot[APPLIED_FLAG]) return;
    if (cachedCSSText === null) {
      // 上限まで保留。超過分は古いものから捨てる (FIFO) ことで永続的なメモリリークを防ぐ
      if (pendingClosedRoots.size >= PENDING_CAP) {
        const first = pendingClosedRoots.values().next().value;
        if (first) pendingClosedRoots.delete(first);
      }
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
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== PAYLOAD_TYPE) return;
    if (cachedCSSText !== null) return; // 初回のみ受理
    const text = typeof data.css === 'string' ? data.css : null;
    if (!isAcceptableCSS(text)) return; // 構造検査でスプーフィング防止
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
