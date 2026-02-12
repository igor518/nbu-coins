/**
 * Configuration loader with validation
 * Implements: FR-5, FR-6 (Configuration Requirements)
 */

import { log } from './logger.js';

// Required environment variables
const REQUIRED_VARS = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'PRODUCT_URLS'];

/**
 * Load and validate configuration from environment variables
 * @returns {Object} Validated configuration object
 * @throws {Error} If required variables are missing or invalid
 */
export function load() {
  const config = {
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID
    },
    productUrls: parseProductUrls(process.env.PRODUCT_URLS),
    checkInterval: parseInt(process.env.CHECK_INTERVAL_SECONDS, 10) || 2,
    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
    stateFile: process.env.STATE_FILE || 'data/state.json',
    autoPurchase: {
      enabled: process.env.AUTO_PURCHASE_ENABLED !== 'false',
      email: process.env.NBU_LOGIN_EMAIL,
      password: process.env.NBU_LOGIN_PASSWORD,
      captchaService: process.env.CAPTCHA_SERVICE || '2captcha',
      captchaApiKey: process.env.CAPTCHA_API_KEY,
      cartQuantity: parseInt(process.env.CART_QUANTITY, 10) || 1,
      browserHeadless: process.env.BROWSER_HEADLESS !== 'false'
    }
  };

  validateConfig(config);
  return config;
}

/**
 * Parse comma-separated product URLs
 * @param {string} urlsString - Comma-separated URLs
 * @returns {Array<string>} Array of URLs
 */
function parseProductUrls(urlsString) {
  if (!urlsString) return [];
  return urlsString.split(',').map(url => url.trim()).filter(url => url);
}

/**
 * Validate required configuration fields
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If validation fails
 */
function validateConfig(config) {
  const missing = [];

  if (!config.telegram.botToken) missing.push('TELEGRAM_BOT_TOKEN');
  if (!config.telegram.chatId) missing.push('TELEGRAM_CHAT_ID');
  if (config.productUrls.length === 0) missing.push('PRODUCT_URLS');

  // Validate auto-purchase config (only when enabled)
  if (config.autoPurchase.enabled) {
    if (!config.autoPurchase.email) missing.push('NBU_LOGIN_EMAIL');
    if (!config.autoPurchase.password) missing.push('NBU_LOGIN_PASSWORD');
    if (!config.autoPurchase.captchaApiKey) missing.push('CAPTCHA_API_KEY');
  }

  if (missing.length > 0) {
    log('error', 'Missing required configuration', { missing });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate URLs
  const invalidUrls = config.productUrls.filter(url => !isValidUrl(url));
  if (invalidUrls.length > 0) {
    log('error', 'Invalid product URLs', { invalidUrls });
    throw new Error(`Invalid URLs: ${invalidUrls.join(', ')}`);
  }

  // Validate numeric values
  if (config.checkInterval < 60) {
    log('warn', 'CHECK_INTERVAL_SECONDS below recommended minimum', { value: config.checkInterval, minimum: 60 });
  }
}

/**
 * Simple URL validation
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
