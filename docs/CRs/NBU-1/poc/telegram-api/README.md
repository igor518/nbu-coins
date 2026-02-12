# PoC: Telegram API Integration

## How to Run

```bash
# Set your Telegram bot token (get from @BotFather)
export TELEGRAM_BOT_TOKEN="your_bot_token_here"

# Set your chat ID (use @userinfobot to get your ID)
export TELEGRAM_CHAT_ID="your_chat_id_here"

npm install
node index.js
```

## Expected Output

```
Testing Telegram API connection...
Bot info: {bot name, id}
Sending test message...
✓ Message sent successfully
Message ID: {message_id}
Sent at: {timestamp}
```

## Experiment Goal

Validate that we can send messages to Telegram via the Bot API using environment variables for credentials.