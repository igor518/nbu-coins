# NBU Watcher

NBU coin availability monitor with Telegram notifications.

## Description

Monitors NBU (National Bank of Ukraine) coin availability on product pages and sends Telegram notifications when items become available. Features configurable check intervals, retry logic with exponential backoff, state persistence to prevent duplicate notifications, and structured logging.

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nbu-watcher
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your values
```

## Configuration

Edit `.env` file with your configuration:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | - | Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | Yes | - | Telegram chat ID to send notifications to |
| `PRODUCT_URLS` | Yes | - | Comma-separated list of product URLs to monitor |
| `CHECK_INTERVAL_SECONDS` | No | 90 | How often to check for updates (seconds, minimum 60) |
| `MAX_RETRIES` | No | 3 | Maximum retry attempts for failed requests |
| `STATE_FILE` | No | `data/state.json` | Path to state persistence file |

### Getting Telegram Bot Token and Chat ID

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
2. Copy the bot token (e.g., `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
3. To get your chat ID:
   - Send a message to your bot
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find the `chat.id` value in the response

## Usage

Start the watcher:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Example Output

When a product becomes available, you'll receive a Telegram message:

```
🔔 NBU Coin Available!

Product: NBU Collector Coin
URL: https://example.com/product
Price: 500 грн

Status changed at: 2026-02-05T12:00:00Z
```

## Features

- **Scheduled Monitoring**: Periodic checks at configurable intervals
- **Duplicate Prevention**: State tracking prevents spam notifications
- **Retry Logic**: Exponential backoff for failed requests
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT
- **Structured Logging**: JSON-formatted logs with timestamps

## Project Structure

```
nbu-watcher/
├── index.js                 # Entry point
├── lib/
│   ├── logger.js            # Centralized logging
│   ├── config.js            # Configuration loader
│   ├── retry.js             # Retry utility with backoff
│   ├── availability-detector.js  # Availability detection logic
│   ├── state-manager.js     # State persistence
│   ├── product-checker.js   # HTTP fetching + parsing
│   ├── notification-service.js   # Telegram notifications
│   └── scheduler.js         # Orchestration loop
├── data/
│   └── state.json           # Persisted state (auto-created)
├── package.json
├── .env.example
└── README.md
```

## License

MIT
