(() => {
  try {
    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(init) {
      const shadowRoot = originalAttachShadow.apply(this, arguments);
      if (shadowRoot) {
        // Content Script 側に通知して CSS を注入させる
        // detail に shadowRoot を直接渡す（Content Script側からはアクセス可能）
        const event = new CustomEvent('replace-font-inject-shadow', {
          detail: shadowRoot,
          bubbles: true,
          composed: true
        });
        window.dispatchEvent(event);
      }
      return shadowRoot;
    };
  } catch (e) {}
})();
