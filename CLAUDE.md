# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension (Manifest V3, also Firefox-compatible via `browser_specific_settings`) that replaces hard-to-read Japanese fonts on websites with **Noto Sans JP** (general text) and **UDEV Gothic JPDOC** (monospace/code). Vanilla JavaScript/CSS, no runtime framework, no test suite, no linter. CI/CD ships to Chrome Web Store automatically on `release/**` branch push (see `.github/workflows/publish.yml`).

This variant ships with **fixed fonts** (no user selection UI, no storage permission, no background service worker). All settings are baked in at build time via `scripts/generate-css.js`.

## Repository Layout

All extension code lives under `src/` (referenced by `manifest.json`):

- `src/content/font-config.js` — Single source of truth for `BODY_FONT` / `MONO_FONT` constants. Loaded as a content script BEFORE `preload-fonts.js`, and `require()`-able from Node.js build scripts. ~30 lines.
- `src/content/preload-fonts.js` — ISOLATED-world content script (~660 lines), runs at `document_start`, all frames. Main logic: CSS injection, Shadow DOM observation, competing `@font-face` neutralization, dynamic font detection (Next.js `next/font` hashed family names), font load health check.
- `src/content/inject.js` — MAIN-world content script (~45 lines), patches `Element.prototype.attachShadow` to mark hosts with `data-rfs-shadow` and dispatch `replace-font-shadow-created`. Declared with `"world": "MAIN"` in manifest.
- `src/popup/` — popup HTML/CSS/JS (display only, no settings).
- `src/css/` — generated CSS files (do not edit).
- `src/fonts/` — bundled WOFF2 fonts + OFL license.

Build/release tooling:

- `scripts/sync-version.js` — single source of version propagation (`package.json` → `manifest.json` / README / popup / webstore screenshots / docs/*)
- `scripts/generate-css.js`, `generate-icons.js`, `generate-screenshots.js`, `convert-fonts.js` — Node generators. `generate-css.js` reads `src/content/font-config.js` via `require()`.
- `zip.sh` / `zip.ps1` — thin wrappers: `sync-version.js` → `generate-css.js` → ZIP
- `.github/workflows/publish.yml` — Chrome Web Store auto-publish on `release/<version>` push (SHA-pinned actions, `npm ci --omit=optional`, locally-pinned `chrome-webstore-upload-cli`)
- `webstore/screenshots/*.html` → `webstore/images/*.png` — Web Store assets
- `docs/` — GitHub Pages site (`index.html`, `privacy.html`)

## Build Commands

```bash
# Full build (icons + CSS + screenshots)
npm run build

# Individual generators
npm run generate-css          # → src/css/replacefont-extension.css (reads src/content/font-config.js + scripts/generate-css.js)
npm run generate-icons        # → icons/icon-*.png from icons/icon.svg (requires sharp)
npm run generate-screenshots  # → webstore/images/*.png (requires puppeteer)
npm run convert-fonts         # TTF → WOFF2 (requires ttf2woff2)

# Package for Chrome Web Store (version sync + CSS gen + ZIP)
powershell -File zip.ps1   # Windows
bash zip.sh                # Unix/macOS
```

`sharp`, `puppeteer`, `ttf2woff2` are in `optionalDependencies` — ZIP packaging works without `npm install`. Install only when regenerating icons/screenshots/fonts.

## Release Flow

1. `package.json` is the version source of truth (must match `^[0-9]+\.[0-9]+\.[0-9]+$` — `sync-version.js` rejects anything else).
2. `npm run sync-version` (called by zip.sh/zip.ps1/CI) propagates the version into `manifest.json`, `README.md`, `docs/index.html`, `docs/privacy.html`, `src/popup/popup.html`, `webstore/screenshots/*.html`. Add new sync targets in `scripts/sync-version.js` only — never duplicate the list elsewhere.
3. Push to `release/<version>` → CI: SHA-pinned `actions/checkout` + `actions/setup-node` → `npm ci --omit=optional` → `sync-version.js` → `generate-css.js` → ZIP (`manifest.json icons/ src/`) → locally-installed `chrome-webstore-upload` (pinned in `devDependencies`) with `--auto-publish`.
4. Required GitHub secrets: `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_EXTENSION_ID`.
5. **Branch protection recommended**: `release/**` should require review — push access alone is sufficient to ship to all users otherwise. See repository settings.

The `vava` skill automates the bump → commit → release-branch → push flow.

## Architecture

### Single Source of Truth for Font Definitions

`src/content/font-config.js` declares `BODY_FONT` / `MONO_FONT` constants and is read from two execution contexts:

1. **Content script runtime**: manifest's `content_scripts.js` list loads `font-config.js` before `preload-fonts.js`, so both scripts share the same top-level script scope. `preload-fonts.js`'s IIFE reads `BODY_FONT` / `MONO_FONT` via outer-scope lookup.
2. **Node.js build scripts**: `scripts/generate-css.js` uses `require('../src/content/font-config')`. The file exports via `module.exports` guarded by `typeof module !== 'undefined'`.

Swap fonts by editing `font-config.js` only — both paths update atomically.

### CSS Generation Pipeline

`scripts/generate-css.js` is the source of truth for which fonts get replaced. Defines:

- `GOTHIC_FONT_FAMILIES` (~60 entries) — sans/serif → body font (Noto Sans JP)
- `MONO_FONT_FAMILIES` (~20 entries) — monospace → mono font (UDEV Gothic JPDOC)
- Hiragino W1–W9 weight variants are auto-generated
- `validateConsistency()` checks that `BODY_FONT.name` / `localFontsRegular` / `localFontsBold` aliases don't collide with `GOTHIC_FAMILIES` (and the same for mono) — exits with error if self-reference would occur.
- Single output `replacefont-extension.css` via `OUTPUT_CONFIGS`. Placeholders like `__BODY_FONT_NAME__` are resolved at build time; only `__REPLACE_FONT_BASE__` remains for runtime substitution (replaced by `preload-fonts.js` with `chrome.runtime.getURL('')`).
- CSS variables and selectors are centralized in `BODY_CSS_VARS` / `MONO_CSS_VARS` / `EDITABLE_SELECTORS` / `VAR_OVERRIDE_SELECTORS` / `MONO_FORCE_TARGETS` — update these arrays rather than inlining selectors in the generated output.

### Font Replacement Strategy

1. **`@font-face` redefinition** — each target family is rebound to local `Noto Sans JP` / `UDEV Gothic JPDOC` (system install) with WOFF2 fallback bundled in `src/fonts/`.
2. **CSS variable overrides** — common custom properties (`--font-sans`, `--font-mono`, `--tw-font-sans`, etc.) overridden with `!important` in `BODY_CSS_VARS` / `MONO_CSS_VARS`.
3. **Selector overrides** — `pre`, `code`, `kbd`, `samp`, and code-related class selectors (`MONO_FORCE_TARGETS`) get explicit monospace assignment via `:is()` with `:not(:where(EDITABLE))` to exclude RTEs.
4. **Editable exclusion zone** — RTEs (contenteditable, ProseMirror, Monaco, etc.) reset the overridden CSS variables to `initial` to avoid breaking inline editors.

### Shadow DOM Handling

**Open Shadow DOM only**. Closed Shadow DOM is NOT supported — the cost of the cross-world `postMessage` payload pipeline was deemed not worth it for the rare real-world closed-shadow cases.

1. **MutationObserver + TreeWalker** — `preload-fonts.js` scans `document.documentElement` subtree. Mutation callbacks batch added nodes into a `Set` and flush via `queueMicrotask` to avoid O(M×N) TreeWalker storms on React/Vue mounts. Initial full scan is chunked (`SHADOW_SCAN_CHUNK_SIZE = 200`) via `requestIdleCallback`.
2. **`attachShadow` interception** — `inject.js` runs in MAIN world (declarative `"world": "MAIN"`), overrides `Element.prototype.attachShadow`, marks the host with `data-rfs-shadow=""` and dispatches `replace-font-shadow-created`. ISOLATED-side `preload-fonts.js` listens to the event, batches via `queueMicrotask`, and scans `[data-rfs-shadow]` hosts (up to `SHADOW_BATCH_MAX = 512` per tick for DoS resistance). The attribute is removed immediately to avoid DOM pollution.
3. **CSS injection per shadow** — `CSSStyleSheet` (Constructable) shared across all ShadowRoots via `adoptedStyleSheets`. Fallback to `<style>` tag when Constructable is unsupported or `getSharedStyleSheet()` returns null.

**Trust model caveat**: a page script can synthesize `data-rfs-shadow` + event to trick ISOLATED into calling `injectCSS(shadowRoot)`. The impact is limited to injecting our own CSS (no attacker-controlled content) and is rate-limited by `SHADOW_BATCH_MAX`. No credential/DOM-write escalation is possible.

### Cross-World Communication

- **No `postMessage` between worlds** in this variant. Previous designs used it for closed-shadow CSS payload; the current architecture uses only the `data-rfs-shadow` attribute + `Event` dispatch pattern for open-shadow coordination.
- Shared constants are **literal-copied** between `inject.js` and `preload-fonts.js` (cross-world cannot share module imports). The attribute name `data-rfs-shadow` and the event name `replace-font-shadow-created` must stay byte-for-byte identical.

### Main-Document CSS Injection

`injectToDocument()` prefers `document.adoptedStyleSheets` (Chrome 99+) to avoid the ~10ms CSSOM parse cost of a 94KB `<style>` textContent. Falls back to `<style>` tag when Constructable Stylesheet or `document.adoptedStyleSheets` is unavailable.

`setupStyleSheetMonitor(ownSheet?)` accepts the shared sheet as an argument to skip the `querySelectorAll` introspection path when the Constructable path is used.

### Hot-Path Implementation Notes

- **Caching:** `fixedCSSPromise` (CSS text promise), `sharedStyleSheetPromise` (`CSSStyleSheet` promise), `fetchFailureAt` (negative cache timestamp with `FAILURE_TTL_MS = 5000` to throttle fetch storms). All three are reset on bfcache `pagehide` (persisted) and rebuilt on next access.
- **Race-safe promise reset**: async bodies check `if (fixedCSSPromise === self)` before nulling — prevents overwriting a new promise when the old one resolves after external cache clear.
- **Retry**: `_replaceFontRetryCount` per ShadowRoot / `documentRetryCount` module-global; `RETRY_LIMIT = 3` before giving up and marking applied. Counter increments in **both** the `null cssText` branch **and** the `catch` branch (earlier versions missed the latter).
- **DOM scanning:** chunked (`SHADOW_SCAN_CHUNK_SIZE = 200`) via `requestIdleCallback` (`IDLE_TIMEOUT_MS = 100`).
- **Mutation batching:** both initial mount bursts (`pendingMutationNodes` Set flushed via microtask) and shadow creation events (`shadowBatchPending` gate) are batched.
- **Lifecycle:** `onPagehideDispose(e)` checks `e.persisted` — bfcache (persisted=true) keeps listeners alive for pageshow revival; final unload (persisted=false) runs all `disposers[]` cleanups.
- **Font preloading:** `<link rel="preload">` only, on the **top frame only** (iframes share the browser's font cache).
- **Duplicate prevention:** `_replaceFontApplied` / `_replaceFontInProgress` flags on shadow roots; `documentApplied` / `documentInProgress` module-global for main document; `adoptedStyleSheets.includes()` guard before push.
- **Event batching:** `replace-font-shadow-created` deduplicated via `queueMicrotask` to avoid O(n²) `querySelectorAll` on YouTube/Disney+ etc. Processing capped at `SHADOW_BATCH_MAX = 512` per tick.
- **Early head buffer:** `earlyStyleBuffer` captures `<style>`/`<link>` added before `setupStyleSheetMonitor` initializes. Bounded by `EARLY_STYLE_BUFFER_CAP = 1024` (FIFO) to prevent runaway growth on sites where CSS fetch permanently fails.
- **Detached LINK guard:** `processStyleNode()` skips LINK nodes that are not `isConnected` — avoids leaking load-event listeners on GC-able nodes.
- **Dynamic font detection**: `DYNAMIC_FONT_PATTERN = /^__[A-Za-z][A-Za-z0-9_]*_[a-f0-9]{4,}$/` matches Next.js `next/font` hashed names (`__Inter_abc123`). `MONO_KEYWORD_PATTERN` (`/mono|code|menlo|consolas|courier/i`) classifies detected families. Runtime-injected `@font-face` with `data-replace-font="dynamic"` tag.
- **Font health check**: `document.fonts.check()` runs `HEALTH_CHECK_DELAY_MS = 1500` after init (top frame only). Logs `console.info` when body/mono font reports not-loaded — catches CSP `font-src` silent-block situations.
- **Family name escape:** `escapeFamilyName()` replaces `\` → `\\` then strips `"` for defense-in-depth. `DYNAMIC_FONT_PATTERN`'s character class already prevents those characters at the source, but pattern relaxation would otherwise permit CSS injection.

## Adding a New Font to Replace

1. Add family name to `GOTHIC_FONT_FAMILIES` or `MONO_FONT_FAMILIES` in `scripts/generate-css.js`
2. Run `npm run generate-css` — `validateConsistency()` will abort if the new name collides with `BODY_FONT` / `MONO_FONT` aliases
3. If a new CSS variable is in common use, add it to the `BODY_CSS_VARS` / `MONO_CSS_VARS` arrays

## Swapping the Replacement Font

1. Edit `src/content/font-config.js` — change `name`, `localFontsRegular`, `localFontsBold`, `woff2Regular`, `woff2Bold`
2. Drop the new WOFF2 files into `src/fonts/`
3. Run `npm run generate-css` — `validateConsistency()` will catch alias conflicts
4. No other code changes needed (both runtime and build pick up the new values)

## Hard Constraints

- **Never use universal selectors (`* { font-family: ... }`)** — they break icon fonts (Font Awesome, Material Icons, etc.). Use explicit element/class selectors.
- **`preload-fonts.js` is a hot path** — runs at `document_start` on every frame of every page. No unnecessary DOM queries; batch where possible.
- **`BODY_FONT` / `MONO_FONT` MUST live only in `src/content/font-config.js`** — do not inline copies elsewhere. The DRY violation caused bugs in past revisions.
- **Generated files** (`src/css/replacefont-extension.css`, `icons/icon-*.png`, `webstore/images/*.png`) are committed but must not be hand-edited — re-run the generators instead.

## Testing

No automated test suite. Validate manually by loading the unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked → repo root) and visiting target sites. Pay special attention to:

- Shadow DOM hosts (YouTube, Disney+) — shadow injection
- Code-heavy pages (GitHub) — `MONO_FORCE_TARGETS` selectors
- Rich text editors (Notion, Google Docs, Monaco-based editors) — `EDITABLE_SELECTORS` exclusion
- Next.js sites (Vercel, Notion Calendar) — `DYNAMIC_FONT_PATTERN` dynamic injection
- Sites with strict CSP `font-src` — watch console for `[フォント置換] フォント読込未完了` health-check warnings
