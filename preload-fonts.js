(() => {
  // ベースURL情報をキャッシュして効率化
  const FONT_BASE_URL = chrome.runtime.getURL('fonts/');

  // フォントURLをプリコンピュート（ループ内での文字列連結を回避）
  const FONT_CONFIG = [
    { weight: 'Regular', fontUrl: `${FONT_BASE_URL}NotoSansJP-Regular.woff2` },
    { weight: 'Bold', fontUrl: `${FONT_BASE_URL}NotoSansJP-Bold.woff2` },
    { weight: 'MonoRegular', fontUrl: `${FONT_BASE_URL}UDEVGothicJPDOC-Regular.woff2` },
    { weight: 'MonoBold', fontUrl: `${FONT_BASE_URL}UDEVGothicJPDOC-Bold.woff2` }
  ];

  // クラス名の衝突を防ぐためのユニークID生成
  const uniqueId = `preloadFontTag${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // document.body が利用可能になるまで待機してから処理
  function initializeWhenReady() {
    if (document.body) {
      initialize();
    } else {
      // DOMContentLoaded を待つ
      document.addEventListener('DOMContentLoaded', initialize, { once: true });
    }
  }

  // 初期化処理
  function initialize() {
    // 現在のドキュメントにフォント読み込み
    createPreloadTag();

    // ページ読み込み完了後、フォント preload 警告を回避
    setupFontForceLoad();
  }

  // フォントの preload タグを生成して挿入
  function createPreloadTag() {
    if (!document.body) return;

    // DocumentFragmentを使用してDOM操作をバッチ化
    const fragment = document.createDocumentFragment();

    for (const config of FONT_CONFIG) {
      const preloadTag = document.createElement('link');
      preloadTag.rel = 'preload';
      preloadTag.as = 'font';
      preloadTag.href = config.fontUrl;
      preloadTag.crossOrigin = 'anonymous';
      preloadTag.className = `${uniqueId}_${config.weight}`;

      fragment.appendChild(preloadTag);
    }

    // 一度のDOM操作でまとめて追加
    try {
      document.body.appendChild(fragment);
    } catch (e) {
      console.error('[NotoSansへ置換するやつ(改修型)] フォントpreloadタグの追加エラー:', e);
    }
  }

  // ページ読み込み完了後、CSS Font Loading API でフォントを強制的にロードして preload 警告を回避
  function setupFontForceLoad() {
    const forceLoad = () => {
      // CSS Font Loading API を使用してフォントを明示的にロード（DOM操作不要）
      for (const config of FONT_CONFIG) {
        const fontFace = new FontFace(
          `ForceLoadNotoSans${config.weight}`,
          `url(${config.fontUrl})`,
          { display: 'swap' }
        );

        fontFace.load()
          .then(loadedFace => document.fonts.add(loadedFace))
          .catch(() => {
            // preloadタグで既にロード済みの場合があるためエラーは無視
          });
      }
    };

    if (document.readyState === 'complete') {
      forceLoad();
    } else {
      window.addEventListener('load', forceLoad, { once: true });
    }
  }

  // 初期化開始
  initializeWhenReady();
})();
