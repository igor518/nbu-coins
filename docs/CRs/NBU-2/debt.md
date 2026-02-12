# NBU-2 Technical Debt Analysis

**CR**: NBU-2
**Date**: 2026-02-09
**Files Analyzed**: 8 (4 new + 4 modified)
**Debt Items Found**: 5 (2 High, 3 Medium)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `lib/` |
| File extension | `.js` |
| Max file size | 200 lines (default), 300 lines (hard max) |

## Summary

Implementation is clean and well-structured, staying within all size limits. The main debt concerns are: (1) duplicated retry configuration patterns across 5 notification functions, and (2) the notification-service.js JSDoc comment for `sendToTelegram` was overwritten by `sendCartSuccess` during task 3, indicating a copy-paste artifact. A missing architectural concern around session health checking (R1.3 periodic validation) is also unimplemented.

## Size Compliance

| File | Lines | Target | Hard Max | Status |
|------|-------|--------|----------|--------|
| `lib/captcha-solver.js` | 89 | <100 | 150 | ✅ |
| `lib/browser-manager.js` | 79 | <150 | 225 | ✅ |
| `lib/auth-service.js` | 90 | <150 | 225 | ✅ |
| `lib/cart-service.js` | 116 | <200 | 300 | ✅ |
| `lib/config.js` | 100 | <120 | 180 | ✅ |
| `lib/notification-service.js` | 171 | <200 | 300 | ✅ |
| `lib/scheduler.js` | 161 | <200 | 300 | ✅ |
| `index.js` | 93 | <100 | 150 | ✅ |

All files within limits.

## High Severity

### 1. ~~Duplication: Retry configuration repeated in every notification function~~ — FIXED

- **Status**: **RESOLVED** (2026-02-09)
- **Fix**: Extracted `sendWithRetry(message, config)` helper that wraps `sendToTelegram` with standard retry config + `onRetry` logging. All 5 notification functions now call `sendWithRetry` instead of duplicating retry setup. File reduced from 171 to 159 lines.
- **Files changed**: `lib/notification-service.js` (159 lines, was 171)

### 2. ~~Unsatisfied Requirement: R1.3 — Periodic session validity check not implemented~~ — FIXED

- **Status**: **RESOLVED** (2026-02-09)
- **Fix**: Added `checkSessionHealth(config)` function in `scheduler.js` that calls `isLoggedIn()` via the browser page and re-authenticates if expired. Runs every 10 check cycles inside `runCheckCycle()` when `autoPurchase.enabled`. Wrapped in try/catch so failures don't break monitoring.
- **Files changed**: `lib/scheduler.js` (197 lines, was 169)

## Medium Severity

### 3. ~~Missing Abstraction: JSDoc comment artifact in notification-service.js~~ — FIXED

- **Status**: **RESOLVED** (2026-02-09)
- **Fix**: Orphaned JSDoc removed as part of `sendWithRetry` refactor (item #1). The refactored code no longer has misplaced documentation.

### 4. Hidden Coupling: browser-manager uses module-level mutable state

- **Location**: `lib/browser-manager.js` (lines 12-15)
- **Evidence**: `browser`, `context`, `page`, and `onCrashCallback` are module-level mutable variables. The `launch()` function returns an object with methods (`getPage`, `close`, `isAlive`, `onCrash`), but these methods are also exported directly from the module. This means both `import { getPage } from './browser-manager.js'` and `browserManager.getPage()` work — but they refer to the same mutable state. `index.js` uses the returned object pattern (line 36), while `scheduler.js` passes `browserManager` as a parameter to `cart-service.js`.
- **Impact**: If a second browser instance were ever needed (e.g., for testing or parallel operation), the module-level state would conflict. The dual-access pattern (module export + returned object) is confusing — callers may not realize they share state.
- **Suggested Fix**: Choose one access pattern. Since the returned-object pattern is already used by callers, consider making `getPage`, `close`, `isAlive` non-exported (internal) and only expose `launch()` which returns the manager object. Or keep module exports but remove the returned object.

### 5. ~~Hidden Coupling: scheduler.js crash recovery doesn't update _browserManager~~ — FIXED

- **Status**: **RESOLVED** (2026-02-09)
- **Fix**: Added `updateBrowserManager()` setter in `scheduler.js`. Crash recovery callback in `index.js` now calls `updateBrowserManager(browserManager)` after relaunch and `updateBrowserManager(null)` on recovery failure.
- **Files changed**: `lib/scheduler.js` (+8 lines → 169), `index.js` (+2 lines → 95)

## Suggested Inline Comments

~~All inline comment suggestions resolved — items #1, #2, #5 fixed in code.~~

## Recommended Actions

### Immediate (High Severity)
1. [x] Extract `sendWithRetry()` helper in `notification-service.js` (FIXED)
2. [x] Fix crash recovery propagation (FIXED)
3. [x] Implement periodic session health check R1.3 (FIXED)

### Deferred (Medium/Low)
1. [x] Fix orphaned JSDoc comment in `notification-service.js` (FIXED — resolved by #1 refactor)
2. [ ] Consolidate browser-manager access pattern — choose module exports or returned object, not both

## Metrics

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| `lib/captcha-solver.js` lines | (new) | 89 | <100 | ✅ |
| `lib/browser-manager.js` lines | (new) | 79 | <150 | ✅ |
| `lib/auth-service.js` lines | (new) | 90 | <150 | ✅ |
| `lib/cart-service.js` lines | (new) | 116 | <200 | ✅ |
| `lib/config.js` lines | 84 | 100 | <120 | ✅ |
| `lib/notification-service.js` lines | 105 | 159 | <200 | ✅ |
| `lib/scheduler.js` lines | 149 | 197 | <200 | ✅ |
| `index.js` lines | 69 | 95 | <100 | ✅ |
| Total files | 9 | 13 | — | — |
| Debt items | — | 1 open | 0 | ⚠️ |

---
*Generated: 2026-02-09T12:00:00Z*
