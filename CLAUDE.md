# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension (Manifest V3) that replaces hard-to-read Japanese fonts on websites with **Noto Sans JP** (general text) and **UDEV Gothic JPDOC** (monospace/code). Vanilla JavaScript/CSS, no runtime framework, no test suite, no linter. CI/CD ships to Chrome Web Store automatically on `release/**` branch push (see `.github/workflows/publish.yml`).

## Repository Layout

All extension code lives under `src/` (referenced by `manifest.json`):

- `src/content/preload-fonts.js` — ISOLATED-world content script (~400 lines), runs at `document_start`, all frames
- `src/content/inject.js` — MAIN-world content script (~130 lines), patches `attachShadow`. Declared with `"world": "MAIN"` in manifest (requires Chrome 102+)
- `src/popup/` — popup HTML/CSS/JS (display only)
- `src/css/` — generated CSS files (do not edit)
- `src/fonts/` — bundled WOFF2 fonts + OFL license

Build/release tooling:

- `scripts/sync-version.js` — single source of version propagation (`package.json` → `manifest.json` / README / popup / webstore screenshots)
- `scripts/generate-css.js`, `generate-icons.js`, `generate-screenshots.js`, `convert-fonts.js` — Node generators
- `zip.sh` / `zip.ps1` — thin wrappers: `sync-version.js` → `generate-css.js` → ZIP
- `.github/workflows/publish.yml` — Chrome Web Store auto-publish on `release/<version>` push (SHA-pinned actions, `npm ci --omit=optional`, locally-pinned `chrome-webstore-upload-cli`)
- `webstore/screenshots/*.html` → `webstore/images/*.png` — Web Store assets
- `docs/` — GitHub Pages site (`index.html`, `privacy.html`)

## Build Commands

```bash
# Full build (icons + CSS + screenshots)
npm run build

# Individual generators
npm run generate-css          # → src/css/*.css from font configs in scripts/generate-css.js
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
2. `npm run sync-version` (called by zip.sh/zip.ps1/CI) propagates the version into `manifest.json`, `README.md`, `docs/index.html`, `src/popup/popup.html`, `webstore/screenshots/*.html`. Add new sync targets in `scripts/sync-version.js` only — never duplicate the list elsewhere.
3. Push to `release/<version>` → CI: SHA-pinned `actions/checkout` + `actions/setup-node` → `npm ci --omit=optional` → `sync-version.js` → `generate-css.js` → ZIP (`manifest.json icons/ src/`) → locally-installed `chrome-webstore-upload` (pinned in `devDependencies`) with `--auto-publish`.
4. Required GitHub secrets: `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_EXTENSION_ID`.

The `vava` skill automates the bump → commit → release-branch → push flow.

## Architecture

### CSS Generation Pipeline

`scripts/generate-css.js` is the source of truth for which fonts get replaced. Defines:

- `GOTHIC_FONT_FAMILIES` (~60 entries) — sans/serif → Noto Sans JP
- `MONO_FONT_FAMILIES` (~20 entries) — monospace → UDEV Gothic JPDOC
- Hiragino W1–W9 weight variants are auto-generated
- Multiple outputs via `OUTPUT_CONFIGS` (line 128) — extension CSS uses `__REPLACE_FONT_BASE__` placeholder, replaced at runtime by the content script with `chrome.runtime.getURL()`

### Font Replacement Strategy

1. **`@font-face` redefinition** — each target family is rebound to local Noto Sans JP / UDEV Gothic JPDOC (system install) with WOFF2 fallback bundled in `src/fonts/`
2. **CSS variable overrides** — common custom properties (`--font-sans`, `--font-mono`, `--tw-font-sans`, etc.) overridden with `!important`
3. **Selector overrides** — `pre`, `code`, `kbd`, `samp`, and code-related class selectors get explicit monospace assignment

### Shadow DOM Handling (two-pronged)

1. **Open Shadow DOM** — content script uses MutationObserver (microtask-batched) + TreeWalker to find `.shadowRoot` elements and injects CSS via Constructable Stylesheets (`adoptedStyleSheets`)
2. **Closed Shadow DOM** — `inject.js` runs in MAIN world (declarative `world: "MAIN"`), patches `Element.prototype.attachShadow` to apply CSS directly to closed shadows; for open shadows, marks hosts with `data-rfs-shadow` and dispatches `replace-font-shadow-created` for the content script

### Cross-World Communication

- ISOLATED → MAIN: `window.postMessage({ type: 'replace-font-css-payload', css })`
- MAIN side validates with `isAcceptableCSS()` (length 1KB–1MB, must start with `@charset "UTF-8"`, rejects `@import`, external `url()`, `expression()`, `behavior:`, `javascript:`, `<script`)
- Shared constants intentionally duplicated in both files (cross-world cannot share imports). `APPLIED_FLAG = '__replaceFontApplied'` and `PAYLOAD_TYPE = 'replace-font-css-payload'` must be kept in sync byte-for-byte.

### Hot-Path Implementation Notes

- **CSS injection:** prefers Constructable Stylesheets (`CSSStyleSheet.replaceSync()`), falls back to `<style>` tags. Retry counter resets after `RETRY_RESET_MS` (no permanent lock).
- **Caching:** `fixedCSSCache` (CSS text), `sheetCache` (`CSSStyleSheet`), `fetchFailureCache` (negative cache with `FAILURE_TTL_MS` to throttle fetch storms).
- **DOM scanning:** chunked (`CHUNK_SIZE = 200`) via `requestIdleCallback` (`IDLE_TIMEOUT_MS = 100`).
- **Mutation batching:** added nodes are accumulated and flushed in a single `queueMicrotask` per tick — avoids O(M×N) TreeWalker storms in React/Vue mounts.
- **Lifecycle:** `MutationObserver.disconnect()` and chunk-scan abort triggered on `pagehide`.
- **Font preloading:** `<link rel="preload">` only, on the **top frame only** (iframes share the browser's font cache). FontFace.load() removed (was redundant double-fetch).
- **Duplicate prevention:** `__replaceFontApplied` / `_replaceFontInProgress` flags on shadow roots, `adoptedStyleSheets.includes()` guard before push.
- **Event batching:** `replace-font-shadow-created` deduplicated via `queueMicrotask` to avoid O(n²) `querySelectorAll` on YouTube/Disney+ etc.
- **Closed-shadow leak guard:** `inject.js`'s `pendingClosedRoots` Set capped at 256 (FIFO eviction) to prevent unbounded growth when CSS payload never arrives.

## Adding a New Font to Replace

1. Add family name to `GOTHIC_FONT_FAMILIES` or `MONO_FONT_FAMILIES` in `scripts/generate-css.js`
2. Run `npm run generate-css`
3. If a new CSS variable is in common use, add it to the `variableOverrides` section

## Hard Constraints

- **Never use universal selectors (`* { font-family: ... }`)** — they break icon fonts (Font Awesome, Material Icons, etc.). Use explicit element/class selectors.
- **`preload-fonts.js` is a hot path** — runs at `document_start` on every frame of every page. No unnecessary DOM queries; batch where possible.
- **Generated files** (`src/css/*.css`, `icons/icon-*.png`, `webstore/images/*.png`) are committed but must not be hand-edited — re-run the generators instead.

## Testing

No automated test suite. Validate manually by loading the unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked → repo root) and visiting target sites. Pay special attention to Shadow DOM hosts (YouTube, Disney+) and code-heavy pages (GitHub) when changing the content script or CSS generation.
