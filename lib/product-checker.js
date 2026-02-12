/**
 * Product checker - fetches and parses product pages
 * Implements: R5.1-R5.3 (Network error handling), R6.1-R6.3, FR-1, NFR-P1
 */

import { log } from './logger.js';
import { retry } from './retry.js';
import { checkAvailability } from './availability-detector.js';

// User agent header for HTTP requests
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Check a product URL for availability
 * @param {string} url - Product URL to check
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Availability result: { available, name, price, url }
 */
export async function check(url, config) {
  log('info', 'Checking product', { url });

  const html = await fetchProductPage(url, config);
  const cheerio = await import('cheerio');
  const $ = cheerio.load(html);

  const result = checkAvailability($, url);

  log('info', 'Product check complete', { url, available: result.available });
  return result;
}

/**
 * Fetch product page HTML with retry logic
 * @param {string} url - Product URL
 * @param {Object} config - Configuration object
 * @returns {Promise<string>} HTML content
 */
async function fetchProductPage(url, config) {
  return await retry(
    async () => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7'
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        // Validate we got HTML content
        if (!html || html.length < 100) {
          throw new Error('Received empty or invalid HTML');
        }

        return html;
      } catch (error) {
        if (error.name === 'AbortError') {
          log('warn', 'Product page fetch timed out', { url, timeout: REQUEST_TIMEOUT });
          throw new Error(`Request timed out after ${REQUEST_TIMEOUT}ms`);
        }

        log('error', 'Error fetching product page', { url, error: error.message });
        throw error;
      }
    },
    {
      maxAttempts: config.maxRetries || 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
      onRetry: (attempt, error) => {
        log('warn', 'Product fetch retry', { url, attempt, error: error.message });
      }
    }
  );
}
