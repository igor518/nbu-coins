/**
 * Telegram notification service
 * Implements: R2.1-R2.3 (Telegram notifications), R7.1-R7.3, FR-3, NFR-R3, NFR-S1
 */

import { log } from './logger.js';
import { retry } from './retry.js';

// Telegram API endpoint
const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

/**
 * Send a message to Telegram with standard retry and logging
 * @param {string} message - Message text
 * @param {Object} config - Configuration with telegram.botToken, telegram.chatId, maxRetries
 * @returns {Promise<void>}
 */
async function sendWithRetry(message, config) {
  const { botToken, chatId } = config.telegram;

  if (!botToken || !chatId) {
    throw new Error('Telegram bot token and chat ID are required');
  }

  await retry(
    () => sendToTelegram(botToken, chatId, message),
    {
      maxAttempts: config.maxRetries || 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
      onRetry: (attempt, error) => {
        log('warn', 'Telegram API retry', { attempt, error: error.message });
      }
    }
  );
}

/**
 * Send availability notification to Telegram
 * @param {Object} product - Product info: { name, price, url, available }
 * @param {Object} config - Configuration with telegram.botToken and telegram.chatId
 * @returns {Promise<void>}
 */
export async function send(product, config) {
  const message = formatMessage(product);
  log('info', 'Sending Telegram notification', { productName: product.name });
  await sendWithRetry(message, config);
  log('info', 'Telegram notification sent successfully', { productName: product.name });
}

/**
 * Format notification message
 * @param {Object} product - Product info
 * @returns {string} Formatted message
 */
function formatMessage(product) {
  const lines = [
    '🔔 NBU Coin Available!',
    '',
    `Product: ${product.name}`,
    `URL: ${product.url}`
  ];

  if (product.price) {
    lines.push(`Price: ${product.price}`);
  }

  lines.push('', `Status changed at: ${new Date().toISOString()}`);

  return lines.join('\n');
}

export async function sendCartSuccess(product, quantity, config) {
  const message = [
    '🛒 Added to Cart!',
    '',
    `Product: ${product.name}`,
    `Price: ${product.price || 'N/A'}`,
    `Quantity: ${quantity}`,
    'Cart: https://coins.bank.gov.ua/shopping_cart.php',
    `Time: ${new Date().toISOString()}`
  ].join('\n');

  log('info', 'Sending cart success notification', { productName: product.name });
  await sendWithRetry(message, config);
}

export async function sendCartFailure(product, reason, config) {
  const message = [
    '❌ Cart Failed',
    '',
    `Product: ${product.name}`,
    `Reason: ${reason}`,
    `URL: ${product.url}`,
    `Time: ${new Date().toISOString()}`
  ].join('\n');

  log('info', 'Sending cart failure notification', { productName: product.name, reason });
  await sendWithRetry(message, config);
}

export async function sendAuthFailure(reason, config) {
  const message = [
    '🔑 Login Failed',
    '',
    `Reason: ${reason}`,
    'Action: Check credentials in .env',
    `Time: ${new Date().toISOString()}`
  ].join('\n');

  log('info', 'Sending auth failure notification', { reason });
  await sendWithRetry(message, config);
}

export async function sendCaptchaFailure(context, config) {
  const message = [
    '⚠️ CAPTCHA Failed',
    '',
    `Context: ${context}`,
    'Action: Manual intervention may be needed',
    `Time: ${new Date().toISOString()}`
  ].join('\n');

  log('info', 'Sending CAPTCHA failure notification', { context });
  await sendWithRetry(message, config);
}

/**
 * Send a plain text reply (best-effort, no retry). Used by bot command handler.
 * @param {string} text - Reply text
 * @param {Object} config - Configuration with telegram.botToken and telegram.chatId
 * @returns {Promise<void>}
 */
export async function sendReply(text, config) {
  const { botToken, chatId } = config.telegram;
  try {
    await sendToTelegram(botToken, chatId, text);
  } catch (error) {
    log('warn', 'Failed to send bot reply', { error: error.message });
  }
}

async function sendToTelegram(botToken, chatId, text) {
  const url = `${TELEGRAM_API_URL}${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      }),
      // 10 second timeout for API calls
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.description || `HTTP ${response.status}`;
      throw new Error(`Telegram API error: ${errorMsg}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Telegram API request timed out');
    }
    throw error;
  }
}
