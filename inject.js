(() => {
  // 二重注入防止（manifest content_scripts と動的注入の両方で実行される可能性がある）
  if (window.__replaceFontShadowInterceptor) return;
  window.__replaceFontShadowInterceptor = true;

  try {
    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(init) {
      const shadowRoot = originalAttachShadow.apply(this, arguments);
      if (shadowRoot) {
        // Host element に目印を付ける（Content Script 側が検出できるように）
        // ※ CustomEvent.detail で DOM オブジェクト（ShadowRoot）を渡しても
        //   MAIN → ISOLATED World 間の構造化クローンで null になるため、
        //   data 属性で host element を特定する方式を使用
        // ※ queueMicrotask で遅延実行する理由：
        //   カスタム要素のコンストラクタ内で attachShadow が呼ばれた場合、
        //   同期的に setAttribute を実行すると Web Components 仕様違反
        //   (NotSupportedError) になるため、コンストラクタ完了後に実行する
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
    console.debug('[NotoSans置換] attachShadow override failed:', e.message);
  }
})();
