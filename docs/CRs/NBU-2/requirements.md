# Requirements: NBU-2

**Source**: [NBU-2](../NBU-2.md)
**Generated**: 2026-02-08
**Updated**: 2026-02-13
**CR Type**: Feature Enhancement

## Introduction

Extend the NBU Watcher to automatically add coins to the shopping cart when they become available. The system must handle Cloudflare-protected pages using browser automation with stealth capabilities and solve reCAPTCHA challenges via a paid solving service. Login credentials are provided via environment variables. Additionally, the system prevents duplicate cart additions and provides Telegram bot commands for remote watcher control.

## Behavioral Requirements (EARS)

### Requirement 1: Browser Session Management (Pre-Login Strategy)

**Objective**: As a collector, I want the system to be already logged in and ready before a coin becomes available, so that add-to-cart happens with zero login delay.

#### Acceptance Criteria

1. WHEN the system starts and auto-purchase is enabled, the system SHALL launch a stealth browser instance and proactively authenticate before beginning monitoring.

2. WHILE the system is monitoring, the system SHALL maintain the authenticated browser session ready for immediate cart actions.

3. WHILE the browser session is active, the system SHALL periodically verify session validity (e.g., check for logged-in indicator on page) to detect silent expiry.

4. IF the browser session expires or becomes invalid during monitoring, THEN the system SHALL re-authenticate immediately (not wait for a coin to become available).

5. IF the browser crashes or becomes unresponsive, THEN the system SHALL restart the browser, re-authenticate, and resume monitoring.

6. WHEN a coin becomes available, the system SHALL already have a valid authenticated session — no login step needed at cart time.

### Requirement 2: Authentication Flow

**Objective**: As a collector, I want the system to log in to coins.bank.gov.ua automatically, so that I don't need to be present when a coin becomes available.

#### Acceptance Criteria

1. WHEN authenticating, the system SHALL submit the configured email and password to the login form at `login.php`.

2. IF a Cloudflare reCAPTCHA challenge appears during login, THEN the system SHALL submit it to the CAPTCHA solving service and apply the solution.

3. WHEN login succeeds, the system SHALL store the authenticated session state for reuse.

4. IF login fails due to invalid credentials, THEN the system SHALL send a Telegram notification with the failure reason and halt auto-purchase attempts (monitoring continues).

5. IF login fails due to CAPTCHA solving failure, THEN the system SHALL retry login up to 3 times before sending a failure notification.

### Requirement 3: Add to Cart on Availability (Fast Path)

**Objective**: As a collector, I want coins automatically added to my cart the moment they become available, with no login delay since the session is already active.

#### Acceptance Criteria

1. WHEN a monitored product transitions from unavailable to available, the system SHALL initiate the add-to-cart flow within 5 seconds using the pre-established authenticated session.

2. WHEN adding to cart, the system SHALL navigate directly to the product page in the authenticated browser — no login step.

3. IF the product page redirects to login (session expired), THEN the system SHALL re-authenticate and retry the cart addition immediately.

4. WHEN the product page loads with a buy button present, the system SHALL select the configured quantity and click the buy button.

5. IF a Cloudflare reCAPTCHA challenge appears during cart addition, THEN the system SHALL submit it to the CAPTCHA solving service and apply the solution.

6. WHEN the cart addition succeeds, the system SHALL send a Telegram notification confirming the item was added to cart with product name, price, quantity, and a direct link to the cart page.

7. IF the cart addition fails, THEN the system SHALL send a Telegram notification with the failure reason.

8. IF the product becomes unavailable before the cart flow completes, THEN the system SHALL send a notification indicating the item sold out.

### Requirement 4: CAPTCHA Solving Integration

**Objective**: As a collector, I want CAPTCHA challenges solved automatically, so that Cloudflare protection doesn't block the purchase flow.

#### Acceptance Criteria

1. WHEN a Cloudflare reCAPTCHA challenge is detected on any page, the system SHALL extract the challenge parameters and submit them to the configured CAPTCHA solving service.

2. WHEN the CAPTCHA solving service returns a solution, the system SHALL apply it to the page within the browser context.

3. IF the CAPTCHA solving service fails or times out (30 seconds), THEN the system SHALL retry up to 2 times.

4. IF all CAPTCHA solving attempts fail, THEN the system SHALL send a Telegram notification requesting manual intervention.

5. The system SHALL support configuring the CAPTCHA solving service API key and service provider via environment variables.

### Requirement 5: Notification Enhancement

**Objective**: As a collector, I want to know exactly what happened with the auto-purchase attempt, so that I can take manual action if needed.

#### Acceptance Criteria

1. WHEN a product is successfully added to cart, the system SHALL send a Telegram notification with product name, price, quantity, and a direct link to the cart page.

2. WHEN a product fails to be added to cart, the system SHALL send a Telegram notification with the failure reason (CAPTCHA failed, session expired, out of stock, etc.).

3. WHEN login fails, the system SHALL send a Telegram notification indicating the authentication failure.

4. WHILE the auto-purchase feature is enabled, the system SHALL continue sending the existing availability notifications from NBU-1.

### Requirement 6: Cart Deduplication

**Objective**: As a collector, I want the system to skip cart addition for coins that are already in my cart, so that I don't get duplicate items or wasted CAPTCHA-solving attempts.

#### Acceptance Criteria

1. WHEN a product is successfully added to cart, the system SHALL record the product URL as "in cart" in persistent state.

2. WHEN a monitored product transitions to available AND its URL is already recorded as "in cart", the system SHALL skip the add-to-cart flow for that product.

3. WHEN a product's cart addition is skipped due to deduplication, the system SHALL log the skip reason but NOT send a Telegram notification.

4. WHEN the system starts, the system SHALL load the "in cart" state from the persisted state file.

5. IF the user sends a `/reset_cart` command via Telegram, THEN the system SHALL clear all "in cart" records, allowing products to be added again.

### Requirement 7: Telegram Bot Commands for Watcher Control

**Objective**: As a collector, I want to enable and disable the coins watcher remotely via Telegram commands, so that I can control monitoring without restarting the application.

#### Acceptance Criteria

1. WHEN the system starts, the system SHALL begin listening for incoming Telegram bot commands via polling or webhook.

2. WHEN the user sends a `/stop` command via Telegram, the system SHALL pause the monitoring scheduler and confirm with a reply message indicating monitoring is paused.

3. WHEN the user sends a `/start` command via Telegram, the system SHALL resume the monitoring scheduler and confirm with a reply message indicating monitoring is active.

4. WHILE monitoring is paused via the `/stop` command, the system SHALL NOT perform any product availability checks or cart additions.

5. WHILE monitoring is paused, the system SHALL continue listening for Telegram bot commands so the user can resume monitoring.

6. WHEN the user sends a `/status` command via Telegram, the system SHALL reply with the current watcher state (running/paused), the number of monitored products, and the last check timestamp.

7. The system SHALL only accept commands from the configured `TELEGRAM_CHAT_ID` to prevent unauthorized control.

---

## Functional Requirements

> Specific capabilities the system must provide.

| ID | Requirement | Rationale |
|----|-------------|-----------|
| FR-1 | Launch and manage a Puppeteer browser with stealth plugin | Cloudflare detects standard headless browsers |
| FR-2 | Authenticate to coins.bank.gov.ua using email/password from env vars | Automated login required for cart access |
| FR-3 | Detect and solve Cloudflare reCAPTCHA via external solving service | CAPTCHA blocks automated cart additions |
| FR-4 | Navigate to product page and click buy button with configured quantity | Core add-to-cart functionality |
| FR-5 | Detect cart addition success/failure from page response | User needs confirmation of result |
| FR-6 | Send enhanced Telegram notifications for cart events | User awareness of auto-purchase outcomes |
| FR-7 | Pre-login at startup and maintain session across monitoring cycles | Zero login delay when coin appears |
| FR-8 | Periodically verify session validity and re-authenticate proactively | Prevent stale session at cart time |
| FR-9 | Configurable quantity per product (default: 1) | Different products may have different needs |
| FR-10 | Detect login-redirect during cart flow and re-auth + retry | Graceful recovery if session silently expired |
| FR-11 | Track successfully carted products in persistent state and skip re-adding | Avoid duplicate cart entries and wasted CAPTCHA solves |
| FR-12 | Listen for Telegram bot commands (`/start`, `/stop`, `/status`, `/reset_cart`) | Remote watcher control without restart |
| FR-13 | Pause and resume the monitoring scheduler via Telegram commands | User controls monitoring lifecycle remotely |
| FR-14 | Restrict bot command processing to configured chat ID only | Prevent unauthorized control of the watcher |

## Non-Functional Requirements

> Quality attributes and constraints.

### Performance
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-P1 | Time from availability detection to cart addition initiation | < 5 seconds | Coins sell out quickly |
| NFR-P2 | CAPTCHA solving time | < 30 seconds | Minimize delay in purchase flow |
| NFR-P3 | Login flow completion | < 15 seconds (excluding CAPTCHA) | Fast session establishment |
| NFR-P4 | Telegram command response time | < 2 seconds | User expects near-instant feedback |

### Reliability
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-R1 | Browser crash recovery | Auto-restart within 10 seconds | Continuous operation required |
| NFR-R2 | CAPTCHA solving retry | Up to 2 retries per challenge | Solving services occasionally fail |
| NFR-R3 | Login retry on CAPTCHA failure | Up to 3 attempts | Transient CAPTCHA failures |
| NFR-R4 | Memory usage over 24h runtime | No leaks, < 500MB | Long-running process stability |
| NFR-R5 | Telegram polling resilience | Auto-reconnect on polling errors | Bot commands must remain available |

### Security
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-S1 | Credentials storage | .env file only, never logged | Prevent credential exposure |
| NFR-S2 | CAPTCHA API key storage | .env file only, never logged | Prevent API key exposure |
| NFR-S3 | Credentials in notifications | Never included | Prevent exposure via Telegram |
| NFR-S4 | Bot command authorization | Only configured chat ID accepted | Prevent unauthorized watcher control |

## Configuration Requirements

| Setting | Description | Default | Valid Range | Rationale |
|---------|-------------|---------|-------------|-----------|
| `NBU_LOGIN_EMAIL` | Account email for coins.bank.gov.ua | (required) | Valid email | Authentication |
| `NBU_LOGIN_PASSWORD` | Account password | (required) | Non-empty string | Authentication |
| `CAPTCHA_SERVICE` | CAPTCHA solving service name | `2captcha` | `2captcha`, `anticaptcha`, `capsolver` | Service provider choice |
| `CAPTCHA_API_KEY` | API key for CAPTCHA solving service | (required) | Non-empty string | Service authentication |
| `AUTO_PURCHASE_ENABLED` | Enable/disable auto-purchase | `true` | `true`, `false` | Feature toggle |
| `CART_QUANTITY` | Default quantity to add to cart | `1` | 1-10 | Purchase quantity |
| `BROWSER_HEADLESS` | Run browser in headless mode | `true` | `true`, `false` | Debug visibility |

## Current Implementation Context

> Informational only. Architecture may restructure as needed.

| Behavior | Current Location | Notes |
|----------|------------------|-------|
| Availability detection | `lib/availability-detector.js:14-30` | Detects `.btn-primary.buy` — triggers auto-purchase |
| Product check cycle | `lib/scheduler.js:86-110` | Orchestrates checks — insertion point for cart trigger |
| State transition detection | `lib/scheduler.js:136-171` | Detects unavailable→available — triggers notification + cart |
| Cart addition flow | `lib/cart-service.js:13-88` | Full add-to-cart orchestration — no deduplication check |
| State persistence | `lib/state-manager.js` | Tracks product status — extend with "in cart" tracking |
| Telegram notifications | `lib/notification-service.js` | Send-only — no incoming command handling |
| Configuration loading | `lib/config.js` | Add new env vars for credentials, CAPTCHA |
| HTTP product fetching | `lib/product-checker.js` | May coexist with browser-based checking |

---

## Artifact Mapping

> Maps requirements to implementation. Architecture decides final structure.

| Req ID | Requirement Summary | Primary Artifact | Integration Points |
|--------|---------------------|------------------|-------------------|
| R1.1-R1.6 | Browser session lifecycle + pre-login | `lib/browser-manager.js` | `lib/scheduler.js`, `lib/auth-service.js` |
| R2.1-R2.5 | Authentication flow | `lib/auth-service.js` | `lib/browser-manager.js`, `lib/captcha-solver.js` |
| R3.1-R3.8 | Add-to-cart flow (fast path) | `lib/cart-service.js` | `lib/browser-manager.js`, `lib/auth-service.js`, `lib/captcha-solver.js`, `lib/notification-service.js` |
| R4.1-R4.5 | CAPTCHA solving | `lib/captcha-solver.js` | External API (2captcha/etc) |
| R5.1-R5.4 | Enhanced notifications | `lib/notification-service.js` | `lib/cart-service.js` |
| R6.1-R6.5 | Cart deduplication | `lib/state-manager.js` | `lib/cart-service.js`, `lib/scheduler.js` |
| R7.1-R7.7 | Telegram bot commands | `lib/bot-command-handler.js` | `lib/scheduler.js`, `lib/notification-service.js`, `lib/state-manager.js` |

## Traceability

| Req ID | CR Section | Acceptance Criteria |
|--------|------------|---------------------|
| R1.1-R1.5 | Constraints (Cloudflare) | AC: Browser automation, session reuse |
| R2.1-R2.5 | Success Conditions | AC: System logs in automatically |
| R3.1-R3.7 | Success Conditions | AC: Auto add-to-cart on availability |
| R4.1-R4.5 | Constraints (reCAPTCHA) | AC: CAPTCHA solved via service |
| R5.1-R5.4 | Success Conditions | AC: Telegram confirmation |
| R6.1-R6.5 | User Input (2026-02-13) | AC: No duplicate cart additions |
| R7.1-R7.7 | User Input (2026-02-13) | AC: Remote enable/disable via Telegram |

---
*Generated from NBU-2 by /mdt:requirements (v3)*
