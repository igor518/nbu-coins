# NBU Product Availability Monitor

## 1. Description

### Requirements Scope
~~full — Full EARS behavioral specs + FR + NFR tables~~ (Updated post-implementation: 2026-02-08)
brief — Focused fix requirements with verification checklist

### Problem
- Users cannot know when coins become available for purchase on coins.bank.gov.ua
- Manual checking is inefficient and may miss availability windows
- No automated notification system exists for sales start events

### Affected Areas
- Backend: Monitoring and notification service

### Scope
- In scope: Product availability monitoring and Telegram notifications
- Out of scope: Actual purchase functionality, inventory management

## 2. Desired Outcome

## Architecture Design

> **Extracted**: Complex architecture — see [architecture.md](./NBU-1/architecture.md)

**Summary**:
- Pattern: Event-Driven Polling with State Persistence
- Components: 8 (Scheduler, Product Checker, Notification Service, State Manager, plus shared utilities)
- Key constraint: Each module has strict size limit (75-300 lines), total ~950 lines

**Extension Rule**: To add new capability, create module in `lib/` directory with appropriate size limit and wire into `scheduler.js` if needed.

### Success Conditions
- When product becomes available, system sends Telegram notification
- System checks product status every 1-2 minutes automatically
- Notification contains product URL and name

### Constraints
- Must not overwhelm the target website with requests
- Must handle network failures gracefully
- Must not send duplicate notifications for same state

### Non-Goals
- Not automating actual purchases
- Not managing inventory or reservations
- Not providing shopping cart functionality

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Technology | Which scraping library to use | Must handle dynamic content if present |
| Architecture | Single process or daemon service | Must run continuously with restart capability |
| Integration | How to handle Telegram API credentials | Secure credential storage required |
| Performance | What rate limits to respect | Must not trigger anti-bot measures |

### Known Constraints
- Target website: https://coins.bank.gov.ua
- Check frequency: 1-2 minutes
- Notification platform: Telegram
- Detection method: Buy button presence (CSS class `btn-primary buy`)

### Decisions Deferred
- Implementation approach determined by /mdt:architecture
- Specific artifacts determined by /mdt:architecture
- Task breakdown determined by /mdt:tasks

## 4. Acceptance Criteria

> Bug fix requirements: [requirements.md](./NBU-1/requirements.md)

### Functional
- [ ] Telegram notification received when product becomes available
- [ ] No notification sent when product is unavailable
- [ ] Status check runs every 1-2 minutes
- [ ] Notification includes product URL and name
- [ ] Duplicate notifications not sent for same availability state

### Non-Functional
- [ ] Status check completes in under 10 seconds
- [ ] System handles network failures without crashing
- [ ] System recovers from temporary failures automatically
- [ ] Logs written for every status check

### Edge Cases
- Network timeout: Retry after delay, log error
- Page structure changes: Log warning, continue monitoring
- Telegram API failure: Queue notification, retry
- Multiple rapid availability changes: Send notification once per state change

["requirements.md](./requirements.md)\n\n## Artifacts

### New Files

| File | Purpose | Size Limit |
|------|---------|------------|
| `index.js` | Application entry point, graceful shutdown | 75 lines |
| `lib/logger.js` | Centralized logging utility | 50 lines |
| `lib/config.js` | Configuration loading & validation | 75 lines |
| `lib/retry.js` | Retry logic with exponential backoff | 50 lines |
| `lib/availability-detector.js` | Business logic for availability detection | 100 lines |
| `lib/state-manager.js` | State persistence to JSON file | 150 lines |
| `lib/product-checker.js` | HTTP fetching + HTML parsing | 150 lines |
| `lib/notification-service.js` | Telegram message sending | 200 lines |
| `lib/scheduler.js` | Orchestration (polling loop) | 150 lines |
| `data/state.json` | Persisted availability state (runtime) | - |
| `.env.example` | Configuration template | - |

### Modified Artifacts (Updated post-implementation: 2026-02-08)

| File | Change | Reason |
|------|--------|--------|
| `lib/availability-detector.js` | Replaced `hasExpectedText()` with `hasBuyButtonElement()` using `.btn-primary.buy`; added `.new_price_card_product` price selector | Original detection logic was incorrect for coins.bank.gov.ua |
| `lib/config.js` | Default `CHECK_INTERVAL_SECONDS` changed from `90` to `2` | Adjusted for faster checking during development |
| `lib/scheduler.js` | Removed `Math.max(checkInterval, 60)` minimum interval enforcement | Allows sub-minute check intervals |
| `docs/CRs/NBU-1/requirements.md` | Rewritten from Feature Enhancement to Bug Fix format | Scope narrowed to availability detection fix |

### Key Dependencies

| Package | Purpose | Source |
|---------|---------|--------|
| node-fetch | HTTP client | PoC validated |
| cheerio | HTML parsing | PoC validated |
| dotenv | Environment variable loading | Standard practice |

### How to Verify Success"]
- Manual verification:
  - Start monitoring an unavailable product
  - Observe logs showing status checks every 1-2 minutes
  - Manually make product available
  - Verify Telegram notification received
  - Verify no additional notifications for same state

- Automated verification:
  - Mock HTTP responses with different HTML
  - Test notification sending to test Telegram chat
  - Verify notification content contains expected data

- Performance verification:
  - Measure time for status check operation
  - Verify no memory leaks over extended runtime

## 8. Clarifications

### Post-Implementation Session 2026-02-08

- **[Specification Correction]** `lib/availability-detector.js`: Detection logic rewritten — replaced `hasExpectedText()` (checking for "Очікується" text pattern) with `hasBuyButtonElement()` using CSS selector `.btn-primary.buy`. Original logic incorrectly used price presence + absence of Ukrainian text as availability indicator.
- **[Specification Correction]** `lib/availability-detector.js` `extractPrice()`: Added `.new_price_card_product` as primary price selector — original selectors (`.price`, `[itemprop="price"]`, `.product-price`) do not match coins.bank.gov.ua actual DOM structure.
- **[Integration Change]** `lib/config.js` `load()`: Default `CHECK_INTERVAL_SECONDS` changed from `90` to `2` seconds. This is below the 60-second warning threshold in `validateConfig()`.
- **[Integration Change]** `lib/scheduler.js` `start()`: Removed `Math.max(checkInterval, 60)` minimum interval enforcement — raw `checkInterval` value is now used directly. This contradicts the "Must not overwhelm the target website" constraint and the 1-2 minute check frequency requirement.
- **[Artifact Discovery]** `docs/CRs/NBU-1/requirements.md`: Rewritten from Feature Enhancement (178 lines, full EARS + FR/NFR + traceability) to Bug Fix format (48 lines, focused fix requirements + verification checklist). CR type changed accordingly.