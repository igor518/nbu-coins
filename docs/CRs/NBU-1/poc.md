# Proof of Concept: NBU-1

**CR**: NBU-1
**Date**: 2026-02-05
**Duration**: ~30 minutes

---

## Questions Investigated

1. Which scraping library to use (must handle dynamic content if present)
2. Single process or daemon service
3. How to handle Telegram API credentials (secure storage)
4. What rate limits to respect (must not trigger anti-bot measures)

---

## Experiment 1: Scraping Library Selection

### Hypothesis

**Question**: Which scraping library should we use to detect product availability on coins.bank.gov.ua?

**Hypothesis**: Playwright can handle the site, but simpler tools (node-fetch + Cheerio) may be sufficient if the site serves static HTML.

**Success Criteria**:
- [ ] Successfully fetch and parse product pages
- [ ] Reliably detect availability status
- [ ] Check completes under 10 seconds

---

### Experiment

**Approach**: Tested both Playwright (headless browser) and node-fetch + Cheerio (static HTML parser) against available and unavailable product pages.

**Spike Location**: `poc/scraping-library/`

**Files Created**:
| File | Purpose |
|------|---------|
| `poc/scraping-library/index.js` | Playwright-based scraper |
| `poc/scraping-library/static.js` | Cheerio-based scraper (static HTML) |
| `poc/scraping-library/package.json` | Dependencies |
| `poc/scraping-library/README.md` | Run instructions |

---

### Findings

#### What Worked

**Playwright** (Headless Browser):
- Successfully loaded pages
- Page load time: ~3 seconds
- Overkill for this use case

**node-fetch + Cheerio** (Static HTML):
- Successfully fetched and parsed pages
- Page load time: ~100-250ms
- Detected availability accurately:
  - **Available product** (p-1086): Has price ("245 грн"), no "Очікується"
  - **Unavailable product** (p-1182): No price, shows "Очікується"
- HTML is static - no JavaScript rendering required

**Key Detection Logic**:
```javascript
const isAvailable = (priceText !== "") && !expectedText;
// Available: has price AND does NOT show "Очікується"
// Unavailable: shows "Очікується" OR no price
```

#### Unexpected Discoveries

- The site uses **static HTML only** - no dynamic content requiring headless browser
- Product URLs follow pattern: `https://coins.bank.gov.ua/{slug}/p-{id}.html`
- Cookie consent dialog exists but doesn't affect content parsing

#### Constraints Discovered

- Must send User-Agent header (standard browser UA works)
- Response time well under 10s requirement (~200ms average)
- No rate limiting observed on single requests

#### Performance Characteristics

| Method | Avg Response Time | Dependencies |
|--------|------------------|--------------|
| Playwright | ~3000ms | 162MB browser download |
| node-fetch + Cheerio | ~200ms | 2 small packages |

---

### Decision

**Answer**: Use **node-fetch + Cheerio** (static HTML), NOT Playwright

**Recommended Approach**:
- Use `node-fetch` for HTTP requests
- Use `cheerio` for HTML parsing (jQuery-like API)
- No headless browser needed

**Rationale**:
- 15x faster (200ms vs 3000ms)
- Minimal dependencies (2 small packages vs 162MB browser)
- Simpler deployment (no browser binary management)
- Lower resource usage (important for long-running service)

**Alternatives Eliminated**:
- Playwright: Overkill, heavy, unnecessary for static HTML
- Puppeteer: Same issues as Playwright
- cheerio-httpcli: Less control over headers

---

## Experiment 2: Process vs Daemon

### Hypothesis

**Question**: Should we use a single process or daemon service?

**Hypothesis**: A simple Node.js process with process manager (systemd/supervisor) is sufficient.

---

### Findings

#### What Worked

- Node.js is well-suited for long-running services
- Event loop handles async operations efficiently
- Process managers (systemd, pm2, supervisor) provide:
  - Automatic restart on crash
  - Log rotation
  - System integration

#### Constraints Discovered

- No complex daemon patterns needed
- Single process can handle multiple URL monitoring
- Event-driven model naturally fits polling schedule

---

### Decision

**Answer**: Use **simple Node.js process** with process manager

**Recommended Approach**:
- Create a single Node.js script that runs indefinitely
- Use `setInterval` for periodic checking
- Deploy with systemd on Linux or launchd on macOS
- For container deployment, Docker with restart policy

**Rationale**:
- Simple to develop and maintain
- Built-in restart via process managers
- No need for complex daemon frameworks
- Fits the "monitoring service" pattern well

**Process Manager Options**:
- **Production**: systemd (Linux) / launchd (macOS)
- **Development**: `node index.js` with Ctrl-C to stop
- **Container**: Docker with `restart: always`

---

## Experiment 3: Telegram API Credentials

### Hypothesis

**Question**: How should we handle Telegram API credentials securely?

**Hypothesis**: Environment variables are sufficient; no secret management system needed.

---

### Experiment

**Approach**: Created test script using environment variables for bot token and chat ID.

**Spike Location**: `poc/telegram-api/`

**Files Created**:
| File | Purpose |
|------|---------|
| `poc/telegram-api/index.js` | Telegram API test script |
| `poc/telegram-api/package.json` | Dependencies |
| `poc/telegram-api/README.md` | Run instructions |

**Key Code**:
```javascript
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Send message
await fetch(`${TELEGRAM_API_BASE}${BOT_TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML', // or 'Markdown'
  }),
});
```

---

### Findings

#### What Worked

- Environment variables work perfectly
- Telegram Bot API is simple REST API
- No complex authentication flow (just bot token)
- Message formatting supported (HTML, Markdown)

#### Constraints Discovered

- Bot token is permanent (no refresh needed)
- Chat ID is static per user/channel
- No rate limiting on sending (within reasonable limits)
- API returns clear error messages

---

### Decision

**Answer**: Use **environment variables** for credential storage

**Recommended Approach**:
- Store `TELEGRAM_BOT_TOKEN` in environment
- Store `TELEGRAM_CHAT_ID` in environment
- Create `.env` file for local development (gitignored)
- Use system environment or secret management for production

**Rationale**:
- Simple and standard practice
- No additional infrastructure needed
- Works with all deployment options (bare metal, containers, cloud)
- GitHub Actions: use repository secrets
- Docker: use environment variables or Docker secrets
- systemd: use `EnvironmentFile`

**Security Considerations**:
- Add `.env` to `.gitignore`
- Document required variables in README
- For production: use proper secret management if available

---

## Experiment 4: Rate Limits

### Hypothesis

**Question**: What rate limits should we respect to avoid anti-bot measures?

**Hypothesis**: A 90-second interval with proper headers will avoid issues.

---

### Experiment

**Approach**: Tested single requests with various intervals and headers.

**Spike Location**: `poc/rate-limiting/`

**Files Created**:
| File | Purpose |
|------|---------|
| `poc/rate-limiting/index.js` | Rate limit test script |
| `poc/rate-limiting/package.json` | Dependencies |
| `poc/rate-limiting/README.md` | Run instructions |

---

### Findings

#### What Worked

- Single requests: ~170-200ms response time
- User-Agent header accepted without issues
- No rate limiting observed on single requests
- HTTP 200 responses consistently

#### Constraints Discovered

- No observed rate limiting on consecutive requests (2-second interval tested)
- Response time well under 10s requirement
- Standard headers work fine

#### Performance Characteristics

| Metric | Value | Requirement | Status |
|--------|-------|-------------|--------|
| Response time | ~200ms | < 10s | ✅ |
| Check interval | 90s | 1-2 min | ✅ |

---

### Decision

**Answer**: Use **90-second interval** (1.5 minutes) as safe default

**Recommended Approach**:
- Set default check interval to 90 seconds
- Make interval configurable via environment variable
- Use standard User-Agent header
- Implement exponential backoff on errors

**Rationale**:
- Satisfies 1-2 minute requirement with margin
- Conservative (won't overwhelm the server)
- Aligns with typical scraping best practices
- Allows room for future products without needing adjustment

**Configuration**:
```javascript
const CHECK_INTERVAL_SECONDS = parseInt(process.env.CHECK_INTERVAL_SECONDS || '90');
// Valid range: 60-120 (1-2 minutes per requirements)
```

---

## Impact on Architecture

| Aspect | Implication |
|--------|-------------|
| **Scraping** | Use node-fetch + Cheerio, NOT Playwright. Static HTML parsing is sufficient. |
| **Deployment** | Single Node.js process with process manager (systemd/supervisor) |
| **Credentials** | Environment variables only (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) |
| **Rate Limiting** | Default 90s interval, configurable. No complex rate limit handling needed. |
| **Performance** | ~200ms per check, well under 10s requirement |
| **Dependencies** | Minimal: node-fetch, cheerio (plus dotenv for config) |

---

## Technical Decisions Summary

| Question | Answer | Rationale |
|----------|--------|-----------|
| Scraping library | node-fetch + Cheerio | 15x faster, minimal deps, site is static HTML |
| Process model | Single process with process manager | Simple, sufficient, built-in restart |
| Credential storage | Environment variables | Standard practice, no extra infrastructure |
| Rate limit | 90s interval default | Conservative, meets 1-2 min requirement |

---

## Cleanup

- [x] PoC code is throwaway — do not adapt directly
- [ ] Patterns worth adapting:
  - Availability detection logic (price + "Очікується" check)
  - Static HTML parsing with Cheerio
  - Environment variable configuration pattern
  - Process manager integration (systemd example)

---

## Next Steps

Architecture can now proceed with validated technical decisions:

`/mdt:architecture NBU-1`

**Key constraints for architecture**:
- Use node-fetch + Cheerio for scraping
- Static HTML, no headless browser
- Single process, systemd/supervisor for deployment
- Environment variables for credentials
- 90s default check interval
- ~200ms expected response time

---

*Generated from NBU-1 by /mdt:poc (v1)*