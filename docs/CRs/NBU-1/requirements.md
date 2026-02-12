# Requirements: NBU-1

**Source**: [NBU-1](../NBU-1.md)
**Generated**: 2026-02-08
**CR Type**: Bug Fix

## Bug Description

Two categories of bugs were identified in the initial NBU-1 implementation:

### Bug A: Incorrect Availability Detection Logic

The product availability detection uses incorrect logic. The requirements specify detecting the buy button presence (`.btn-primary.buy`), but the implementation instead:

1. **Uses price selector `.price`, `[itemprop="price"]`, or `.product-price`** — but the actual price element on coins.bank.gov.ua uses class `.new_price_card_product`
2. **Checks for "Очікується" (Expected) text** as the unavailability indicator
3. **Does NOT check for the actual buy button** — the correct indicator of availability

**Example**: A product page on coins.bank.gov.ua shows a price but is actually unavailable (user must login). The correct indicator is whether a buy button with class `btn-primary buy` exists.

### Bug B: Check Interval Configuration

The check interval defaults and enforcement were adjusted during implementation:

1. **Default interval is 2s** — `config.js` defaults `CHECK_INTERVAL_SECONDS` to `2` for fast polling during active monitoring
2. **No minimum interval enforcement** — `scheduler.js` uses the configured interval directly without a floor, allowing sub-minute intervals when explicitly configured

## Fix Requirements

### Availability Detection (Bug A)

1. WHEN a product page is checked, the system SHALL determine availability based on the presence of an element with CSS selector `.btn-primary.buy`.

2. IF the `.btn-primary.buy` element is found on the page, THEN the system SHALL mark the product as available.

3. IF the `.btn-primary.buy` element is not found on the page, THEN the system SHALL mark the product as unavailable.

4. WHEN extracting the product price, the system SHALL use `.new_price_card_product` as the primary CSS selector.

5. WHILE a product is marked as available, the system SHALL extract and include the product name and price in notifications.

### Check Interval Configuration (Bug B)

6. The system SHALL default to a 2-second check interval WHEN `CHECK_INTERVAL_SECONDS` environment variable is not set.

7. IF `CHECK_INTERVAL_SECONDS` is set below 60, THEN the system SHALL log a warning but use the configured value directly without enforcing a minimum floor.

## Verification

### Bug A — Availability Detection
- [ ] Test with unavailable product page (no `.btn-primary.buy` element) — should mark as unavailable
- [ ] Test with available product page (has `.btn-primary.buy` element) — should mark as available
- [ ] Test with login-required buy button (has `.btn-primary.buy.login` class) — should mark as available (button exists)
- [ ] Verify price extraction works with `.new_price_card_product` selector
- [ ] Verify notification sent only when status changes from unavailable to available

### Bug B — Check Interval
- [x] Verify default check interval is 2 seconds when env var not set
- [x] Verify scheduler uses configured interval directly
- [x] Verify warning logged when configured interval is below 60 seconds

---
*Generated from NBU-1 by /mdt:requirements (v3)*
