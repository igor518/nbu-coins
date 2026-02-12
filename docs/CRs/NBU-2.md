# Auto-Purchase: Login and Add to Cart on Availability

### Requirements Scope
full

### Problem
- When a monitored coin becomes available, the user must manually rush to login and add it to cart
- High-demand coins sell out within minutes, making manual reaction too slow
- The current system (NBU-1) only sends a Telegram notification — no purchase action is taken
- The target website (coins.bank.gov.ua) uses Cloudflare reCAPTCHA on cart actions, requiring browser-based automation

### Affected Areas
- Backend: New browser automation module for login + cart
- Integration: CAPTCHA solving service (2captcha or similar)
- Existing: Scheduler and notification flow (trigger point for auto-purchase)

### Scope
- In scope: Automated login, session management, add-to-cart on availability detection
- In scope: Cloudflare reCAPTCHA bypass via stealth plugin + CAPTCHA solving service
- In scope: Puppeteer/Playwright with stealth plugin for browser automation
- Out of scope: Payment/checkout completion (cart only)
- Out of scope: Account registration

## Architecture Design

> **Extracted**: Complex architecture — see [architecture.md](./NBU-2/architecture.md)

**Summary**:
- Pattern: Pre-Authenticated Browser Agent + Command Listener
- Components: 5 new (browser-manager, auth-service, cart-service, captcha-solver, bot-command-handler) + 5 modified
- Key constraint: Browser only launched when AUTO_PURCHASE_ENABLED=true; monitoring uses existing HTTP flow
- Key dependencies: playwright-extra + stealth plugin, @2captcha/captcha-solver
- New: Cart deduplication via state-manager; Telegram bot commands (/start, /stop, /status, /reset_cart) via getUpdates polling

**Extension Rule**: To add new browser action, create `lib/{action}-service.js` (limit 200 lines) using browser-manager for page access. To add new bot command, add case in `bot-command-handler.js` (limit 120 lines total).

## 2. Desired Outcome

### Success Conditions
- When product becomes available, system automatically logs in (if needed) and adds product to cart
- CAPTCHA challenges are solved automatically via solving service
- Cart addition completes within seconds of availability detection
- User receives Telegram notification confirming item was added to cart (or if it failed)
- Existing monitoring functionality (NBU-1) continues to work

### Constraints
- Must use real browser automation (Puppeteer/Playwright) due to Cloudflare protection
- Must use stealth plugin to avoid bot detection
- Must integrate with a CAPTCHA solving service for reCAPTCHA checkbox
- Login credentials stored securely in .env
- Must not break existing monitoring-only flow

### Non-Goals
- Not completing checkout/payment
- Not handling payment details
- Not bypassing purchase limits
- Not creating new accounts

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| CAPTCHA | Which solving service to use (2captcha, anti-captcha, CapSolver)? | Cost, speed, reliability |
| Browser | Puppeteer vs Playwright? | Stealth plugin maturity, Cloudflare evasion |
| Session | Can we pre-login and keep session warm? | Session timeout, Cloudflare cookie expiry |
| Cart | Exact cart API endpoint and payload? | Need to reverse-engineer from browser |
| Timing | How fast can CAPTCHA be solved? | Typical 5-20 seconds for solving services |
| Quantity | Should we configure quantity to add? | Default 1, max per user limits |

### Known Constraints
- Target website: https://coins.bank.gov.ua
- Login page: https://coins.bank.gov.ua/login.php
- Cart mechanism: AJAX-based with product ID and quantity
- Protection: Cloudflare reCAPTCHA on cart actions
- User has existing account credentials

> Full EARS requirements: [requirements.md](./NBU-2/requirements.md)

## 4. Acceptance Criteria

### Functional
- [ ] System logs into coins.bank.gov.ua with configured credentials
- [ ] System maintains authenticated session across monitoring cycles
- [ ] When product becomes available, system adds it to cart automatically
- [ ] Cloudflare reCAPTCHA challenges are solved via CAPTCHA solving service
- [ ] Telegram notification sent confirming cart addition (success or failure)
- [ ] Existing monitoring flow continues to work alongside auto-purchase
- [ ] Quantity to add is configurable (default: 1)
- [ ] System skips cart addition for products already added to cart (deduplication)
- [ ] Telegram bot accepts `/start`, `/stop`, `/status`, `/reset_cart` commands for remote watcher control
- [ ] Only the configured chat ID can send bot commands

### Non-Functional
- [ ] Cart addition initiated within 5 seconds of availability detection
- [ ] CAPTCHA solved within 30 seconds
- [ ] Browser automation does not leak memory over extended runtime
- [ ] Credentials never logged or exposed in notifications
- [ ] System recovers from browser crashes gracefully

### Edge Cases
- Session expired during monitoring: Re-login automatically
- CAPTCHA solving service unavailable: Send Telegram alert, continue monitoring
- Cart addition fails (out of stock): Send Telegram notification with failure reason
- Browser crash: Restart browser and resume monitoring
- Multiple products become available simultaneously: Queue cart additions

## 5. Artifacts

### New Files (estimated)

| File | Purpose | Size Limit |
|------|---------|------------|
| `lib/browser-manager.js` | Puppeteer/stealth browser lifecycle | 150 lines |
| `lib/auth-service.js` | Login flow with session management | 150 lines |
| `lib/cart-service.js` | Add-to-cart with CAPTCHA solving | 200 lines |
| `lib/captcha-solver.js` | CAPTCHA solving service integration | 100 lines |

### Modified Artifacts

| File | Change | Reason |
|------|--------|--------|
| `lib/scheduler.js` | Add cart trigger after availability detection | Wire auto-purchase into existing flow |
| `lib/notification-service.js` | Add cart confirmation message format | Notify user of cart result |
| `lib/config.js` | Add new env vars for credentials, CAPTCHA API key | Configuration for new feature |
| `package.json` | Add puppeteer-extra, stealth plugin, captcha deps | New dependencies |

### Key Dependencies

| Package | Purpose |
|---------|---------|
| playwright-extra | Enhanced Playwright with plugin support (actively maintained) |
| puppeteer-extra-plugin-stealth | Shared stealth plugin (works with playwright-extra) |
| @2captcha/captcha-solver | CAPTCHA solving service SDK with Cloudflare Turnstile support |
