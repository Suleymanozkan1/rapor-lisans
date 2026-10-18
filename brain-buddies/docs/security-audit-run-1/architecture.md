# Architecture — rapor-lisans / brain-buddies (run-1, quick)

## 1. Product, principals, resources
"Zihin Molası" (brain-buddies/): single-player, offline, browser brain-training game; vanilla ES2022 modules, no dependencies, no server, no accounts, no network calls (brain-buddies/src/main.js:6-16; brain-buddies/src/ui/app.js). Protected resource: the player's own progress record in localStorage key `zihin-molasi:v` (brain-buddies/src/core/storage.js:6). Principals: the player (full authority by design); the author of a JSON file the player chooses to import (brain-buddies/src/ui/app.js:832-843); any script that can write localStorage for the page origin (same-origin pages; under file:// browser-dependent); local processes/users and web pages reaching the dev server on 127.0.0.1 (brain-buddies/tools/serve.mjs:43). Repo root `lisans.json` is an unreferenced flag file in a public repository.

## 2. Comparable baseline
None source-grounded (Brain Buddies/Big Brain Academy are closed source; serve.mjs resembles generic Node static servers).

## 3. Stack and deployment paths
Dev: `npm start` → tools/serve.mjs serves brain-buddies/ root, index.html loads src/main.js as ES module. Bundle: tools/build.mjs inlines CSS/JS into dist/zihin-molasi.html opened via file:// (no CSP meta, inline script). Offline commands: `node --test`, check-syntax, build (writes dist/). Prohibited this run: npm install/npx/publish, ui-check (global Playwright), anything writing the target tree. Target execution: host can compose unshare -n/-m/-p + prlimit + tmpfs, but the composed wrapper and a trusted promoter are untested; therefore target-controlled execution is BLOCKED this run — source-only review; decisive runtime facts become needs_validation.

## 4. Entry surfaces and source→sink paths
- Import file: app.js:832-843 file.text() → storage.js:291 importJson → JSON.parse → migrate (:47-58, MIGRATIONS[0] :32-44) → sanitize (:64-132) → save. No size limit, no confirmation, overwrites all data.
- Stored record at startup: storage.js:186-201 load() → same migrate/sanitize; on failure raw copied to `zihin-molasi:v:bozuk` and warning text shown (app.js:869).
- Stored values → sinks: DOM text via h() createTextNode (dom.js:1-29), SVG setAttribute with code keys (svg.js), style width `${accuracy}%` (app.js:740), sparkline points, seed input value (app.js:919) → createRng/hashSeed (rng.js:45-52), options → getOptions → memoryGrid variant whitelist (memoryGrid.js:48).
- Dev server: serve.mjs:20-41 URL → decodeURIComponent → resolve(ROOT,'.'+path) → startsWith(ROOT+sep) → stat/readFile (follows symlinks) ; any method; no Host check; binds 127.0.0.1.

## 5. Trust boundaries and strongest controls
- Import/storage → app state: sanitize() (type/enum/range checks, game-id regex, caps 30/500). Weak spot: `options` branch has no key validation or count limit (storage.js:123-130); sessions strings unbounded.
- Data → DOM: h() never uses innerHTML; ESLint bans innerHTML in src (eslint.config.js).
- HTTP → filesystem: path containment check; loopback bind.

## 6. Starting paths
brain-buddies/src/core/storage.js, brain-buddies/src/ui/app.js, brain-buddies/src/ui/dom.js, brain-buddies/src/ui/svg.js, brain-buddies/src/core/stats.js, brain-buddies/src/core/adaptive.js, brain-buddies/tools/serve.mjs, brain-buddies/index.html, lisans.json.

## 7. Prior coverage
No prior ledger or findings exist for this repo (first run).

## 8. Companion selection
CLIENT-SIDE.md selected: browser storage, file-import rendering, and DOM sinks are the trust-sensitive surfaces (DOM-based XSS, Prototype pollution and gadget chain, Browser-storage disclosure and stale authorization). Excluded: postMessage/WebSocket/CORS/XS-Leaks/service-worker/clickjacking/navigation (no such code: no message listeners, no network, no workers, no navigation from data). WEB-PROTOCOL-AND-AUTH.md excluded (no sessions/auth; dev server covered by ordinary Resource/Access classes). SUPPLY-CHAIN-AND-RELEASE.md excluded (no dependencies, lockfile, CI). Other companions: no matching boundary.
