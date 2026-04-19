(() => {
  // デバッグログ: 本番は no-op。MAIN world なのでページから丸見えになるため厳密に抑制。
  const DEBUG = false;
  const log = DEBUG ? console.debug.bind(console) : () => {};

  // 二重注入防止。グローバル名はページスクリプトから衝突・上書き攻撃を受けにくいよう
  // ビルドごとに変わらない固定ランダム接頭辞にしている（推測困難化が目的）。
  const FLAG_KEY = '__rfs_7d42f8c1_shadow_intercept__';
  if (window[FLAG_KEY]) return;
  Object.defineProperty(window, FLAG_KEY, {
    value: true,
    writable: false,
    configurable: false,
    enumerable: false
  });

  try {
    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(init) {
      const shadowRoot = originalAttachShadow.apply(this, arguments);
      if (shadowRoot) {
        // Host element に目印を付ける（Content Script 側が検出できるように）
        // ※ CustomEvent.detail で DOM オブジェクト（ShadowRoot）を渡しても
        //   MAIN → ISOLATED World 間の構造化クローンで null になるため、
        //   data 属性で host element を特定する方式を使用
        // ※ queueMicrotask で遅延: カスタム要素のコンストラクタ内で attachShadow が
        //   呼ばれた場合、同期的な setAttribute は仕様違反でエラーになるため
        const host = this;
        queueMicrotask(() => {
          try {
            host.setAttribute('data-rfs-shadow', '');
          } catch (_) {
            // SVGElement 等で setAttribute が使えない場合は無視
          }
          // Content Script 側に通知（detail なしのシンプルなイベント）
          window.dispatchEvent(new Event('replace-font-shadow-created'));
        });
      }
      return shadowRoot;
    };
  } catch (e) {
    log('[フォント置換] attachShadow override failed:', e.message);
  }
})();
