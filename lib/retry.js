/**
 * Retry utility with exponential backoff
 * Implements: NFR-R1, NFR-R3
 */

import { log } from './logger.js';

const DEFAULTS = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffMultiplier: 2
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} [options] - Retry options
 * @param {number} [options.maxAttempts] - Maximum retry attempts (default: 3)
 * @param {number} [options.initialDelay] - Initial delay in ms (default: 1000)
 * @param {number} [options.backoffMultiplier] - Backoff multiplier (default: 2)
 * @param {Function} [options.onRetry] - Callback after each failed attempt
 * @returns {Promise} Result of successful execution
 * @throws {Error} Last error if all attempts fail
 */
export async function retry(fn, options = {}) {
  const { maxAttempts, initialDelay, backoffMultiplier, onRetry } = { ...DEFAULTS, ...options };
  let lastError = null;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      log('warn', 'Attempt failed, retrying...', { attempt, maxAttempts, error: error.message });

      if (onRetry) {
        onRetry(attempt, error);
      }

      // Don't delay after last attempt
      if (attempt < maxAttempts) {
        await sleep(delay);
        delay *= backoffMultiplier;
      }
    }
  }

  log('error', 'All retry attempts exhausted', { maxAttempts });
  throw lastError;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
