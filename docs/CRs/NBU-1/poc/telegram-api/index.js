import fetch from 'node-fetch';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN environment variable not set');
  console.error('Get a token from @BotFather on Telegram');
  process.exit(1);
}

if (!CHAT_ID) {
  console.error('Error: TELEGRAM_CHAT_ID environment variable not set');
  console.error('Get your chat ID from @userinfobot on Telegram');
  process.exit(1);
}

async function getBotInfo() {
  const url = `${TELEGRAM_API_BASE}${BOT_TOKEN}/getMe`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Failed to get bot info: ${data.description}`);
  }

  return data.result;
}

async function sendMessage(text) {
  const url = `${TELEGRAM_API_BASE}${BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Failed to send message: ${data.description}`);
  }

  return data.result;
}

async function testAvailabilityNotification() {
  const startTime = Date.now();

  try {
    console.log('Testing Telegram API connection...\n');

    // Step 1: Verify bot token
    console.log('Step 1: Getting bot info...');
    const botInfo = await getBotInfo();
    console.log(`✓ Bot info: @${botInfo.username} (ID: ${botInfo.id})\n`);

    // Step 2: Send a test message simulating availability notification
    console.log('Step 2: Sending test availability notification...');
    const message = `🚀 *NBU Coin Available!*

Coin: Test Coin 2025
Price: 500 UAH
Link: https://coins.bank.gov.ua/en/product/test

Detected at: ${new Date().toISOString()}`;

    const result = await sendMessage(message);
    console.log(`✓ Message sent successfully`);
    console.log(`  Message ID: ${result.message_id}`);
    console.log(`  Chat ID: ${result.chat.id}`);
    console.log(`  Sent at: ${new Date(result.date * 1000).toISOString()}\n`);

    // Step 3: Test with HTML/Markdown formatting
    console.log('Step 3: Testing message formatting...');
    const htmlMessage = `<b>NBU Coin Available!</b>

<b>Coin:</b> Test Coin 2025
<b>Price:</b> 500 UAH
<b>Link:</b> <a href="https://coins.bank.gov.ua/en/product/test">View Product</a>

<i>Detected at: ${new Date().toISOString()}</i>`;

    await fetch(`${TELEGRAM_API_BASE}${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: htmlMessage,
        parse_mode: 'HTML',
      }),
    });
    console.log(`✓ HTML-formatted message sent\n`);

    const elapsed = Date.now() - startTime;
    console.log(`Total elapsed time: ${elapsed}ms`);

    return {
      success: true,
      botName: botInfo.username,
      messageId: result.message_id,
      elapsed,
    };

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`\nError: ${error.message}`);
    console.error(`Elapsed time: ${elapsed}ms`);

    return {
      success: false,
      error: error.message,
      elapsed,
    };
  }
}

// Run the experiment
const result = await testAvailabilityNotification();
console.log('\n=== RESULT ===');
console.log(JSON.stringify(result, null, 2));