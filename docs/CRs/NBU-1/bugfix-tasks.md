# Bug Fix Tasks: NBU-1

**Source**: [NBU-1](../NBU-1.md) → [requirements.md](./requirements.md)
**Generated**: 2026-02-08
**Type**: Bug Fix — Availability Detection Logic

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
| `lib/availability-detector.js` | 100 | 150 | 90 | ✅ OK |
| `lib/config.js` | 75 | 110 | 84 | ⚠️ FLAG |
| `lib/scheduler.js` | 150 | 225 | 149 | ✅ OK |

*(From Architecture Design)*

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating logic that exists in shared module → STOP, import instead
- Structure path doesn't match Architecture Design → STOP, clarify

## Dependency Order

```
Task BF-1: Fix availability detection logic (ALREADY DONE)
Task BF-2: Fix price selector order (ALREADY DONE)
Task BF-3: Accept 2s default check interval (CLOSED — accepted as-is)
Task BF-4: Accept no minimum interval enforcement (CLOSED — accepted as-is)
Task BF-5: Verify bug fix requirements
```

---

## Task BF-1: Fix availability detection logic *(ALREADY DONE)*

**Structure**: `lib/availability-detector.js`

**Implements**: Fix Requirements 1-4

**Limits**:
- Default: 100 lines
- Hard Max: 150 lines

**Change**:
- Replaced `hasExpectedText()` (body text regex for "Очікується") with `hasBuyButtonElement()` using `.btn-primary.buy` CSS selector
- Detection now uses buy button presence instead of price + absence-of-text logic

**Verify**:
```bash
wc -l lib/availability-detector.js  # ≤ 100
grep -n "btn-primary.buy" lib/availability-detector.js  # Must exist
grep -n "Очікується" lib/availability-detector.js  # Must NOT exist
```

**Done when**:
- [x] `hasBuyButtonElement()` function uses `.btn-primary.buy` selector
- [x] Old `hasExpectedText()` function removed
- [x] `EXPECTED_TEXT_PATTERN` constant removed
- [x] Size ≤ 100 lines ✅ (90 lines)

---

## Task BF-2: Fix price selector order *(ALREADY DONE)*

**Structure**: `lib/availability-detector.js`

**Implements**: Fix Requirement 6

**Limits**:
- Default: 100 lines (same file as BF-1)
- Hard Max: 150 lines

**Change**:
- Added `.new_price_card_product` as first selector in `extractPrice()` selector list
- coins.bank.gov.ua uses this class for price display

**Verify**:
```bash
grep -A5 "extractPrice" lib/availability-detector.js  # .new_price_card_product should be first
```

**Done when**:
- [x] `.new_price_card_product` is first selector in `extractPrice()`
- [x] Original selectors preserved as fallbacks

---

## Task BF-3: Accept 2s default check interval *(CLOSED — accepted as-is)*

**Structure**: `lib/config.js`

**Resolution**: Accepted current implementation. The 2-second default is intentional for fast polling during active monitoring. Users can override via `CHECK_INTERVAL_SECONDS` env var. Warning still fires for values < 60.

**Done when**:
- [x] Default `CHECK_INTERVAL_SECONDS` is `2` (accepted as-is)
- [x] Size ≤ 110 lines (hard max) ✅ (84 lines)
- [x] Warning still fires for values < 60 ✅

---

## Task BF-4: Accept no minimum interval enforcement *(CLOSED — accepted as-is)*

**Structure**: `lib/scheduler.js`

**Resolution**: Accepted current implementation. The scheduler uses the configured interval directly without a floor. The config warning for values < 60s provides sufficient user awareness. No minimum enforcement needed — the operator controls polling frequency.

**Done when**:
- [x] Scheduler uses `checkInterval` directly (accepted as-is)
- [x] Size ≤ 225 lines (hard max) ✅ (149 lines)
- [x] Config warning for < 60s provides sufficient guardrail ✅

---

## Post-Implementation

### Task BF-5: Verify bug fix requirements

Manual verification against [requirements.md](./requirements.md) checklist:

**Verify**:
```bash
# 1. Unavailable product (no .btn-primary.buy)
# Mock HTML without buy button → checkAvailability returns { available: false }

# 2. Available product (has .btn-primary.buy)
# Mock HTML with buy button → checkAvailability returns { available: true }

# 3. Login-required buy button (.btn-primary.buy.login)
# Mock HTML with login buy button → checkAvailability returns { available: true }

# 4. Price extraction (.new_price_card_product)
# Mock HTML with .new_price_card_product → extractPrice returns price text

# 5. Notification on state change
# Run with mock: unavailable → available triggers notification

# 6. No notification for login buttons
# Since .btn-primary.buy.login matches .btn-primary.buy, button exists = available
```

**Done when**:
- [ ] Unavailable page correctly detected (no `.btn-primary.buy`)
- [ ] Available page correctly detected (has `.btn-primary.buy`)
- [ ] Login-required buy button treated as available (button exists)
- [ ] Price extracted via `.new_price_card_product`
- [ ] Notification sent only on unavailable→available transition
- [ ] Default interval is 2s, warning fires for values < 60s, no minimum enforcement

---

## Size Compliance (after all tasks)

| File | Lines Before | Expected After | Default | Status |
|------|-------------|----------------|---------|--------|
| `lib/availability-detector.js` | 90 | 90 (no change) | 100 | ✅ OK |
| `lib/config.js` | 84 | 84 (no change) | 75 | ⚠️ FLAG |
| `lib/scheduler.js` | 149 | 149 (no change) | 150 | ✅ OK |

**Flagged**: 2 files (both under hard max)

## Requirement Coverage

| Fix Requirement | Task | Status |
|-----------------|------|--------|
| R1: Availability based on `.btn-primary.buy` | BF-1 | ✅ Complete |
| R2: Parse buy button with `.btn-primary.buy` | BF-1 | ✅ Complete |
| R3: `.btn-primary.buy` found → available | BF-1 | ✅ Complete |
| R4: `.btn-primary.buy` not found → unavailable | BF-1 | ✅ Complete |
| R5: Include product name in notifications | BF-1 | ✅ Complete (existing) |
| R6: Price via `.new_price_card_product` | BF-2 | ✅ Complete |
| R6: Default 2s interval, warn < 60s | BF-3 | ✅ Complete (accepted as-is) |
| R7: No minimum enforcement, warn < 60s | BF-4 | ✅ Complete (accepted as-is) |

**Coverage**: 7/7 requirements complete

---
*Generated from NBU-1 by /mdt:tasks (v5)*
