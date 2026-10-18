# Security audit report: rapor-lisans / brain-buddies (run-1)

## 1. Run facts
- Profile: **quick** (one hunter wave + one final coverage critic). This is a **partial pass**, not exhaustive coverage.
- Scope: `brain-buddies/` (uncommitted working tree on 2026-10-18 over base commit 11d10b5) plus repo-root `lisans.json`.
- Budget: 10 agent invocations (parent-proposed). Spent 6: 4 reconnaissance, 1 hunter, 1 final critic, 0 verifiers (no candidates).
- Execution policy: sandboxed-source-and-local-only. Target-controlled execution was **not used**: the host can compose `unshare`/`prlimit`/tmpfs controls, but the composed wrapper and a trusted artifact promoter were not verified, so all checks are source review.
- Prior runs: none. No carried confirmations or revalidations.
- Deferred units: none. Out-of-scope: none. Not applicable: 1 (bundler inputs: developer's own source, no lower-trust principal).

## 2. Posture summary
Single-player, offline browser game with no server, accounts, network calls or dependencies. The only lower-trust inputs are an imported JSON file, the stored localStorage record and requests to the loopback-only dev server. All persisted data passes one `migrate()` → `sanitize()` path; DOM output is text-only. No boundary violation with a lower-trust principal and a concrete result was found.

## 3. Confirmed findings
None.

## 4. Confirmed finding details
None.

## 5. NEEDS VALIDATION
None.

## 6. Hardening notes (not findings)
1. `brain-buddies/tools/serve.mjs:20-41`: add a Host header allowlist and accept only GET/HEAD, so a DNS-rebinding page cannot read the project tree while the dev server runs.
2. `brain-buddies/tools/serve.mjs:25-29`: compare `realpath(file)` with `realpath(ROOT)` and read through one opened handle, so a future symlink under ROOT cannot escape.
3. `brain-buddies/src/core/storage.js:123-130`: restrict option ids to registered games (or use a null-prototype object) and keys/values to declared options; `__proto__` currently replaces the prototype of `clean.options` (no gadget).
4. `brain-buddies/src/core/storage.js:110-121`: bound `sessions[].gameId`/`category` length or restrict them to known ids, and clamp `history[].level` to 1..10.
5. `brain-buddies/src/ui/app.js:833-837`: cap import file size before reading and ask for confirmation before overwriting progress.
6. `brain-buddies/src/core/storage.js:196-197`: check the `setItem` result for the corrupt-record backup so the warning does not claim a backup that failed.
7. `lisans.json`: if an external application reads it as an activation/kill switch, that decision is only as trustworthy as write access to this public repository; consider signing it.

Positive patterns: text-only DOM helper with ESLint ban on `innerHTML`; single validation pipeline for load and import; corrupt data backed up, not trusted; dev server bound to 127.0.0.1 with lexical path containment; zero dependencies.

## 7. Coverage summary
| Status | Count |
|---|---|
| covered | 7 |
| candidate | 0 |
| blocked | 0 |
| deferred | 0 |
| not_applicable | 1 |

Attack classes covered: Prototype pollution and gadget chain, DOM-based XSS, Browser-storage disclosure and stale authorization (CLIENT-SIDE.md); Feature abuse and data leakage, Resource and file handling, Access control, Obvious things (ATTACK-CLASSES.md). Excluded with reasons: messaging/WebSocket/CORS/XS-Leaks/service worker/clickjacking/navigation (no such code), WEB-PROTOCOL-AND-AUTH, SUPPLY-CHAIN-AND-RELEASE and other companions (no matching boundary). Final critic (`critic-final`): no missing units, no reassignments. One quick pass never exhausts a target; a later `standard` run could add Business logic and Wildcard units.
