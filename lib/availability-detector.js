/**
 * Product availability detector
 * Implements: R1.1-R1.3 (Product availability detection), FR-2
 */

import { log } from './logger.js';

/**
 * Check product availability from parsed HTML
 * @param {Object} $ - Cheerio selector with loaded HTML
 * @param {string} url - Product URL for context
 * @returns {Object} Availability result: { available, name, price, url }
 */
export function checkAvailability($, url) {
  try {
    const name = extractProductName($);
    const price = extractPrice($);
    const hasBuyButton = hasBuyButtonElement($);

    // Available: has buy button (.btn-primary.buy)
    const available = hasBuyButton;

    log('info', 'Product availability checked', { url, available, name, price, hasBuyButton });

    return { available, name, price, url };
  } catch (error) {
    log('error', 'Error checking product availability', { url, error: error.message });
    throw error;
  }
}

/**
 * Extract product name from page
 * @param {Object} $ - Cheerio selector
 * @returns {string} Product name or "Unknown"
 */
function extractProductName($) {
  // Try common selectors for product name
  const selectors = [
    'h1.product-title',
    'h1[itemprop="name"]',
    '.product-name',
    'h1'
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      const text = element.text().trim();
      if (text) return text;
    }
  }

  return "Unknown Product";
}

/**
 * Extract price from page
 * @param {Object} $ - Cheerio selector
 * @returns {string} Price text or empty string if not found
 */
function extractPrice($) {
  // Try common selectors for price
  const selectors = [
    '.new_price_card_product',
    '.price',
    '[itemprop="price"]',
    '.product-price'
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      const text = element.text().trim();
      if (text) return text;
    }
  }

  return "";
}

/**
 * Check if page has buy button
 * @param {Object} $ - Cheerio selector
 * @returns {boolean} True if buy button (.btn-primary.buy) is found
 */
function hasBuyButtonElement($) {
  const buyButton = $('.btn-primary.buy');
  return buyButton.length > 0;
}
