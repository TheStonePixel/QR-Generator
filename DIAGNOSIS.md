# Repository Diagnosis Report

## Project Overview

A monorepo QR code generator with a zero-dependency vanilla JS core (`@stone-pixel/qr-core`), plus React and Vue 3 wrapper components. Implements QR Code Model 2 (ISO/IEC 18004) with advanced styling capabilities (dot shapes, corner shapes, gradients, center image overlay). Includes an interactive demo page.

## Issues Found

### 1. CRITICAL: Dependency Conflict — `rollup-plugin-terser` incompatible with Rollup 4

**File:** `packages/core/package.json`

`rollup-plugin-terser@^7.0.2` requires `rollup@^2.0.0` as a peer dependency, but `rollup@^4.9.0` is specified. Running `npm install` fails without `--legacy-peer-deps`.

Additionally, `rollup-plugin-terser` is deprecated. The maintained replacement is `@rollup/plugin-terser`.

**Fix:** Replace `rollup-plugin-terser` with `@rollup/plugin-terser` and update the import in `rollup.config.mjs`.

---

### 2. HIGH: Build fails for React and Vue workspaces

**File:** `package.json` (root)

Running `npm run build` executes `npm run build --workspaces`, which fails because `packages/react/package.json` and `packages/vue/package.json` have no `build` script. The core package builds successfully, but the workspace-wide build exits with an error.

**Fix:** Either add `build` scripts to the React/Vue packages (even if just a no-op), use `--if-present` flag (`npm run build --workspaces --if-present`), or change the root build script to only build core.

---

### 3. HIGH: `qr-styled.js` is not included in the build output

**File:** `packages/core/rollup.config.mjs`

The Rollup config only bundles `src/qr-core.js`. The styled renderer (`src/qr-styled.js`) is not built into any dist output. The React/Vue components and the demo page import it directly from source (`@stone-pixel/qr-core/src/qr-styled.js`), which works in development but means:
- Published npm consumers cannot use the styled renderer from the dist bundle
- The `exports` field in `package.json` only maps `.` to dist files, not the styled module

**Fix:** Either add `qr-styled.js` as a second Rollup entry point, or re-export it from `qr-core.js`, or add a subpath export in `package.json`.

---

### 4. MEDIUM: Missing TypeScript declaration file

**File:** `packages/core/package.json:9`

The `"types": "dist/qr-core.d.ts"` field references a file that does not exist and is never generated. TypeScript consumers will get no type information.

**Fix:** Either create a `qr-core.d.ts` declaration file, or remove the `types` field until one is created.

---

### 5. MEDIUM: No tests

There are no test files, test frameworks, or test scripts anywhere in the repository. The core QR encoding logic is complex (945 lines implementing Reed-Solomon error correction, multiple encoding modes, mask evaluation) and would benefit from automated testing.

---

### 6. MEDIUM: No CI/CD configuration

No GitHub Actions workflows, no CI configuration of any kind. There is no automated verification of builds or (future) tests on pull requests.

---

### 7. LOW: No linting or formatting configuration

No ESLint, Prettier, or other code quality tooling is configured. The code style is consistent manually, but there's nothing enforcing it.

---

### 8. LOW: React component uses `dangerouslySetInnerHTML`

**File:** `packages/react/src/QRCode.jsx:90`

The React component renders SVG via `dangerouslySetInnerHTML`. While the SVG is generated programmatically (not from raw user input), this bypasses React's XSS protections. If the `centerImage` prop contains a malicious string, it is embedded directly into the SVG as an `href` attribute.

---

## What Works Well

- **Core QR generation is correct.** Finder patterns, encoding modes (numeric, alphanumeric, byte), error correction levels, and mask selection all produce valid output. Tested with various inputs including URLs, Unicode, special characters, and large data.
- **Error handling is solid.** Empty input, non-string input, and invalid EC levels all throw descriptive errors. Data exceeding max QR capacity is caught properly.
- **Zero runtime dependencies** in the core package — the only devDependencies are for the build step.
- **Clean code organization.** The monorepo structure with `packages/core`, `packages/react`, `packages/vue` is well-organized.
- **Feature-rich styling system.** 6 dot shapes, 4 corner square shapes, 5 corner dot shapes, gradient support, and center image overlay.
- **The demo page** is polished and fully functional when loaded directly from the repo.

## Summary

| Category | Status |
|----------|--------|
| `npm install` | Fails without `--legacy-peer-deps` |
| `npm run build` | Fails (react/vue missing build scripts) |
| Core build (`npm run build:core`) | Passes |
| Core functionality | Correct |
| Tests | None |
| CI/CD | None |
| Linting | None |
| Types | Declared but missing |
