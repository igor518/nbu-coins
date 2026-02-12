# Tasks: NBU-2

**Source**: [NBU-2](../NBU-2.md) → [requirements.md](./requirements.md) → [architecture.md](./architecture.md)
**Generated**: 2026-02-08
**Updated**: 2026-02-13
**Type**: Feature Enhancement — Auto-Purchase on Availability

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `lib/` |
| Entry point | `index.js` |
| File extension | `.js` (ES modules) |
| Package manager | npm |
| Test command | `npm test` (manual verification) |

## Size Thresholds

| Module | Default | Hard Max | Current | Status |
|--------|---------|----------|---------|--------|
| `lib/captcha-solver.js` | 100 | 150 | 89 | ✅ OK |
| `lib/browser-manager.js` | 150 | 225 | 79 | ✅ OK |
| `lib/auth-service.js` | 150 | 225 | 90 | ✅ OK |
| `lib/cart-service.js` | 200 | 300 | 116 | ✅ OK |
| `lib/bot-command-handler.js` | 120 | 180 | (new) | — |
| `lib/config.js` | 120 | 180 | 100 | ✅ OK |
| `lib/notification-service.js` | 220 | 330 | 160 | ✅ OK |
| `lib/scheduler.js` | 250 | 375 | 198 | ✅ OK |
| `lib/state-manager.js` | 175 | 260 | 139 | ✅ OK |
| `index.js` | 120 | 180 | 95 | ✅ OK |

*(From Architecture Design — updated 2026-02-13)*

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating logic that exists in shared module → STOP, import instead
- Structure path doesn't match Architecture Design → STOP, clarify

## Dependency Order (New Tasks — R6 + R7)

```
Task 11: Extend state-manager.js with cart dedup (markInCart, isInCart, clearCart)
Task 12: Extend notification-service.js with sendReply for bot responses
Task 13: Modify cart-service.js — dedup check + mark in cart on success
Task 14: Modify scheduler.js — pause/resume/getStatus + dedup check wiring
Task 15: Create bot-command-handler.js (depends on: scheduler, state-manager, notification)
Task 16: Modify index.js — start bot handler alongside scheduler
Task 17: End-to-end verification (R6 + R7)
```

---

## Completed Tasks (R1-R5)

<details>
<summary>Tasks 1-10 — completed 2026-02-08</summary>

### Task 1: Install dependencies ✅
### Task 2: Extend config.js with new env vars ✅
### Task 3: Extend notification-service.js with new message formats ✅
### Task 4: Create captcha-solver.js ✅
### Task 5: Create browser-manager.js ✅
### Task 6: Create auth-service.js ✅
### Task 7: Create cart-service.js ✅
### Task 8: Modify scheduler.js — wire cart trigger ✅
### Task 9: Modify index.js — browser init on startup ✅
### Task 10: End-to-end verification ✅

</details>

---

## New Tasks (R6: Cart Deduplication + R7: Telegram Bot Commands)

### Task 11: Extend state-manager.js with cart dedup tracking

**Structure**: `lib/state-manager.js`

**Implements**: R6.1, R6.4, R6.5

**Limits**:
- Default: 175 lines
- Hard Max: 260 lines
- Current: 139 lines → projected: ~175 lines

**Change**:
- Add `markInCart(state, url)` — set `inCart: true` + `cartedAt` timestamp on the product entry
- Add `isInCart(state, url)` — return boolean from product entry's `inCart` flag
- Add `clearCart(state)` — clear all `inCart` flags across all products (for `/reset_cart`)

**State shape** (extends existing `state.products[url]`):
```javascript
// Existing:
state.products[url] = {
  status: 'available',
  name: 'Coin Name',
  updatedAt: '2026-02-13T...',
  lastNotified: '2026-02-13T...'
};

// Extended with:
state.products[url] = {
  ...existing,
  inCart: true,
  cartedAt: '2026-02-13T...'
};
```

**Exclude**:
- Do NOT change `load()`, `save()`, `getProductStatus()`, `updateProductStatus()` signatures
- Do NOT add separate cart state file — reuse existing `state.json`

**Anti-duplication**:
- This IS the single state persistence module — cart-service and bot-handler import from here

**Verify**:
```bash
wc -l lib/state-manager.js  # ≤ 175
```

**Done when**:
- [x] `markInCart(state, url)` exported — sets `inCart: true` and `cartedAt` timestamp
- [x] `isInCart(state, url)` exported — returns boolean
- [x] `clearCart(state)` exported — clears all `inCart` flags
- [x] Existing functions unchanged
- [x] Size ≤ 175 lines (173 lines)

---

### Task 12: Extend notification-service.js with sendReply

**Structure**: `lib/notification-service.js`

**Implements**: R7.2, R7.3, R7.6 (bot reply messages)

**Limits**:
- Default: 220 lines
- Hard Max: 330 lines
- Current: 160 lines → projected: ~195 lines

**Change**:
- Add `sendReply(text, config)` — sends a plain text message to the configured chat ID (no formatting). Used by bot-command-handler to reply to commands.
- Reuses existing `sendToTelegram()` internally — no retry needed for bot replies (best-effort).

**Exclude**:
- Do NOT change existing `send()`, `sendCartSuccess()`, `sendCartFailure()`, `sendAuthFailure()`, `sendCaptchaFailure()`
- Do NOT change `sendToTelegram()` internals
- Do NOT add bot command parsing here (that's bot-command-handler)

**Anti-duplication**:
- Reuse existing `sendToTelegram()` — do NOT create new HTTP logic
- Bot handler imports `sendReply` — do NOT duplicate Telegram API calls in bot handler

**Verify**:
```bash
wc -l lib/notification-service.js  # ≤ 220
```

**Done when**:
- [x] `sendReply(text, config)` exported
- [x] Uses existing `sendToTelegram()` internally
- [x] Existing notification functions unchanged
- [x] Size ≤ 220 lines (174 lines)

---

### Task 13: Modify cart-service.js — dedup check + mark in cart

**Structure**: `lib/cart-service.js`

**Implements**: R6.1, R6.2, R6.3

**Limits**:
- Default: 200 lines
- Hard Max: 300 lines
- Current: 116 lines → projected: ~135 lines

**Change**:
- Import `markInCart`, `isInCart` from `state-manager.js`
- At the start of `addToCart()`, check `isInCart(state, product.url)` — if true, log skip and return `{ success: false, reason: 'already_in_cart' }` without sending any notification
- After successful cart addition (after `sendCartSuccess`), call `markInCart(state, product.url)`
- Accept `state` as a parameter to `addToCart()` (passed from scheduler)

**Signature change**:
```javascript
// Before:
export async function addToCart(product, config, browserManager)

// After:
export async function addToCart(product, config, browserManager, state)
```

**Exclude**:
- Do NOT change cart flow logic (navigation, CAPTCHA, buy click, result detection)
- Do NOT change notification calls for success/failure
- Do NOT persist state here — scheduler owns save

**Anti-duplication**:
- Import dedup functions from `state-manager.js` — do NOT track cart state locally

**Verify**:
```bash
wc -l lib/cart-service.js  # ≤ 200
```

**Done when**:
- [x] `addToCart` accepts `state` parameter
- [x] Checks `isInCart()` before starting cart flow
- [x] Skips silently (log only, no notification) when already in cart
- [x] Calls `markInCart()` after successful cart addition
- [x] Existing cart flow unchanged
- [x] Size ≤ 200 lines (124 lines)

---

### Task 14: Modify scheduler.js — pause/resume + dedup wiring

**Structure**: `lib/scheduler.js`

**Implements**: R6.2, R6.3, R7.2, R7.3, R7.4, R7.6

**Limits**:
- Default: 250 lines
- Hard Max: 375 lines
- Current: 198 lines → projected: ~250 lines

**Change**:

1. **Pause/Resume** (for bot commands):
   - Add module-level `let isPaused = false`
   - Add `export function pause()` — sets `isPaused = true`, logs
   - Add `export function resume()` — sets `isPaused = false`, logs
   - Add `export function getStatus()` — returns `{ running: isRunning, paused: isPaused, productCount, lastCheckTime }`
   - In `runCheckCycle()`, add early return if `isPaused` (skip all checks)

2. **Pass state to addToCart** (for dedup):
   - In `checkProduct()`, pass `state` to `addToCart(result, config, _browserManager, state)`

**Exclude**:
- Do NOT change `runCheckCycle()` structure beyond adding pause check
- Do NOT change existing notification logic
- Do NOT change `checkProduct()` beyond passing state to addToCart
- Do NOT implement bot command parsing (that's bot-command-handler)

**Anti-duplication**:
- Dedup check lives in `cart-service.js` — scheduler just passes state through
- Pause/resume is simple flag — no need for state machine

**Verify**:
```bash
wc -l lib/scheduler.js  # ≤ 250
```

**Done when**:
- [x] `pause()` exported — sets paused flag
- [x] `resume()` exported — clears paused flag
- [x] `getStatus()` exported — returns running/paused state + stats
- [x] `runCheckCycle()` skips when paused
- [x] `state` passed to `addToCart()` in `checkProduct()`
- [x] Existing scheduling logic unchanged
- [x] Size ≤ 250 lines (237 lines)

---

### Task 15: Create bot-command-handler.js

**Structure**: `lib/bot-command-handler.js`

**Implements**: R7.1-R7.7, R6.5

**Limits**:
- Default: 120 lines
- Hard Max: 180 lines

**Create**:
- `start(config, scheduler, stateManager)` — begins long-polling loop via `getUpdates`
- `stop()` — stops the polling loop

**Commands** (dispatch table):
| Command | Action | Reply |
|---------|--------|-------|
| `/start` | Call `scheduler.resume()` | "Watcher resumed. Monitoring {N} products." |
| `/stop` | Call `scheduler.pause()` | "Watcher paused. Send /start to resume." |
| `/status` | Call `scheduler.getStatus()` | "Status: {running\|paused}, Products: {N}, Last check: {time}" |
| `/reset_cart` | Call `stateManager.clearCart(state)` + save | "Cart records cleared. Products can be re-added to cart." |

**Polling mechanism**:
```javascript
// Long-polling loop using getUpdates
const POLL_TIMEOUT = 30; // seconds
let offset = 0;

async function poll(config) {
  const url = `${TELEGRAM_API_URL}${config.telegram.botToken}/getUpdates`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offset,
      timeout: POLL_TIMEOUT,
      allowed_updates: ['message']
    })
  });
  const data = await response.json();
  // Process updates, advance offset
}
```

**Authorization** (R7.7):
- Compare `message.chat.id` (number) to `config.telegram.chatId` (string → parse to number)
- Ignore messages from unauthorized chat IDs (log warning, no reply)

**Exclude**:
- Do NOT implement notification sending — import `sendReply` from notification-service
- Do NOT implement pause/resume logic — call scheduler exports
- Do NOT implement state persistence — call state-manager exports
- Do NOT handle non-text messages or inline queries

**Anti-duplication**:
- Import `sendReply` from `notification-service.js` — do NOT create new Telegram send logic
- Import scheduler functions — do NOT duplicate scheduling state

**Verify**:
```bash
wc -l lib/bot-command-handler.js  # ≤ 120
```

**Done when**:
- [x] `start(config, scheduler)` exported — starts polling
- [x] `stop()` exported — stops polling
- [x] Handles `/start`, `/stop`, `/status`, `/reset_cart` commands
- [x] Replies to each command with confirmation message
- [x] Only accepts commands from configured `TELEGRAM_CHAT_ID`
- [x] Ignores unauthorized messages silently (log only)
- [x] Polling loop handles errors gracefully (retry after delay)
- [x] Size ≤ 120 lines (109 lines)

---

### Task 16: Modify index.js — start bot handler

**Structure**: `index.js`

**Implements**: R7.1, R7.5

**Limits**:
- Default: 120 lines
- Hard Max: 180 lines
- Current: 95 lines → projected: ~115 lines

**Change**:
- Import `bot-command-handler`
- Import necessary scheduler exports (`pause`, `resume`, `getStatus`) — pass to bot handler
- Import state-manager for `clearCart` — pass to bot handler
- In `main()`, after starting scheduler, start bot command handler:
  ```javascript
  // Start Telegram bot command listener
  import * as botHandler from './lib/bot-command-handler.js';
  import * as scheduler from './lib/scheduler.js';
  import * as stateManager from './lib/state-manager.js';

  botHandler.start(config, scheduler, stateManager);
  ```
- In shutdown handlers, call `botHandler.stop()`

**Exclude**:
- Do NOT change browser init logic
- Do NOT change scheduler start logic
- Do NOT change crash recovery logic

**Anti-duplication**:
- Bot handler lives in `bot-command-handler.js` — index.js only starts/stops it

**Verify**:
```bash
wc -l index.js  # ≤ 120
```

**Done when**:
- [x] Bot handler started in `main()` after scheduler
- [x] Bot handler stopped in shutdown handlers
- [x] Bot handler receives references to scheduler
- [x] Existing startup/shutdown logic unchanged
- [x] Size ≤ 120 lines (102 lines)

---

### Task 17: End-to-end verification (R6 + R7)

**Manual verification against new requirements.**

**Verify Cart Deduplication (R6)**:
```bash
# 1. Product becomes available → system adds to cart
# → state.json should show inCart: true for that product URL

# 2. Same product still available on next check cycle
# → Log shows "Skipping cart addition — already in cart"
# → No duplicate Telegram notification

# 3. Send /reset_cart via Telegram
# → Reply: "Cart records cleared"
# → state.json inCart flags cleared

# 4. Product still available on next check cycle
# → System attempts to add to cart again
```

**Verify Telegram Bot Commands (R7)**:
```bash
# 1. Send /status via Telegram
# → Reply: "Status: running, Products: N, Last check: {time}"

# 2. Send /stop via Telegram
# → Reply: "Watcher paused. Send /start to resume."
# → No check cycles run (verify in logs)

# 3. Send /start via Telegram
# → Reply: "Watcher resumed. Monitoring N products."
# → Check cycles resume

# 4. Send command from unauthorized chat
# → No reply, warning logged

# 5. Send unknown command (e.g., /hello)
# → Ignored or replied with "Unknown command"
```

**Done when**:
- [x] Cart dedup: product added once, skipped on subsequent checks
- [x] Cart dedup: `/reset_cart` clears dedup state
- [x] Bot: `/start` resumes monitoring
- [x] Bot: `/stop` pauses monitoring (no checks while paused)
- [x] Bot: `/status` returns watcher state
- [x] Bot: unauthorized messages ignored
- [x] Bot: polling survives network errors (auto-retry)
- [x] All existing functionality (R1-R5) still works
- [x] All files pass `node --check` syntax verification

---

## Size Compliance (projected — new tasks)

| File | Before | After | Default | Hard Max | Status |
|------|--------|-------|---------|----------|--------|
| `lib/state-manager.js` | 139 | 173 | 175 | 260 | ✅ OK |
| `lib/notification-service.js` | 160 | 174 | 220 | 330 | ✅ OK |
| `lib/cart-service.js` | 116 | 124 | 200 | 300 | ✅ OK |
| `lib/scheduler.js` | 198 | 237 | 250 | 375 | ✅ OK |
| `lib/bot-command-handler.js` | (new) | 109 | 120 | 180 | ✅ OK |
| `index.js` | 95 | 102 | 120 | 180 | ✅ OK |

**New code**: 109 lines (1 new module)
**Modified delta**: 104 lines across 5 existing modules
**Total**: 213 new/modified lines

## Requirement Coverage (R6 + R7)

| Requirement | Task | Status |
|-------------|------|--------|
| R6.1 Record "in cart" in state | Task 11, 13 | ✅ Done |
| R6.2 Skip if already in cart | Task 13, 14 | ✅ Done |
| R6.3 Log skip, no notification | Task 13 | ✅ Done |
| R6.4 Load "in cart" on startup | Task 11 | ✅ Done |
| R6.5 Reset cart via command | Task 11, 15 | ✅ Done |
| R7.1 Listen for commands | Task 15 | ✅ Done |
| R7.2 /stop pauses monitoring | Task 14, 15 | ✅ Done |
| R7.3 /start resumes monitoring | Task 14, 15 | ✅ Done |
| R7.4 No checks while paused | Task 14 | ✅ Done |
| R7.5 Commands available while paused | Task 15, 16 | ✅ Done |
| R7.6 /status returns state | Task 14, 15 | ✅ Done |
| R7.7 Authorization check | Task 15 | ✅ Done |

**Coverage**: 12/12 new requirements mapped (100%)
**Overall coverage**: 37/37 total requirements mapped (100%)

---
*Generated from NBU-2 by /mdt:tasks (v5)*
