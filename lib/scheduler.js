/**
 * Scheduler - orchestrates product monitoring loop
 * Implements: R3.1-R3.2 (Scheduled monitoring), R6.2, R7.2-R7.4, R7.6, FR-5
 */

import { log } from './logger.js';
import { check as productChecker } from './product-checker.js';
import { send as notificationService } from './notification-service.js';
import { load as loadState, save as saveState, getProductStatus, updateProductStatus, getLastNotified, markNotified } from './state-manager.js';
import { addToCart } from './cart-service.js';
import { isLoggedIn, ensureAuthenticated } from './auth-service.js';

let intervalId = null;
let isRunning = false;
let isPaused = false;
let _browserManager = null;
let _config = null;
let _checkCycleCount = 0;
let _lastCheckTime = null;
const SESSION_CHECK_INTERVAL = 10; // Check session every N cycles

/**
 * Start the monitoring scheduler
 * @param {Object} config - Configuration object
 * @returns {Promise<void>}
 */
export async function start(config, browserManager = null) {
  if (isRunning) {
    log('warn', 'Scheduler already running');
    return;
  }

  isRunning = true;
  isPaused = false;
  _browserManager = browserManager;
  _config = config;
  const { productUrls, checkInterval, stateFile } = config;

  const intervalMs = checkInterval * 1000;

  log('info', 'Starting scheduler', {
    urlCount: productUrls.length,
    interval: checkInterval,
    stateFile
  });

  // Set up graceful shutdown handlers
  setupShutdownHandlers();

  // Run initial check
  await runCheckCycle(config);

  // Start periodic checks
  intervalId = setInterval(async () => {
    await runCheckCycle(config);
  }, intervalMs);
}

/**
 * Update the browser manager reference (e.g., after crash recovery)
 * @param {Object|null} browserManager - New browser manager instance
 */
export function updateBrowserManager(browserManager) {
  _browserManager = browserManager;
}

/**
 * Stop the monitoring scheduler
 */
export function stop() {
  if (!isRunning) {
    log('warn', 'Scheduler not running');
    return;
  }

  log('info', 'Stopping scheduler');

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  isRunning = false;
}

/**
 * Pause monitoring (bot command). Interval keeps running but cycles are skipped.
 */
export function pause() {
  isPaused = true;
  log('info', 'Scheduler paused via bot command');
}

/**
 * Resume monitoring (bot command).
 */
export function resume() {
  isPaused = false;
  log('info', 'Scheduler resumed via bot command');
}

/**
 * Get scheduler status for bot /status command.
 * @returns {{ running: boolean, paused: boolean, productCount: number, lastCheckTime: string|null }}
 */
export function getStatus() {
  return {
    running: isRunning,
    paused: isPaused,
    productCount: _config?.productUrls?.length || 0,
    lastCheckTime: _lastCheckTime
  };
}

/**
 * Run a single check cycle for all products
 * @param {Object} config - Configuration object
 * @returns {Promise<void>}
 */
async function runCheckCycle(config) {
  if (isPaused) {
    log('info', 'Check cycle skipped — scheduler paused');
    return;
  }

  const { productUrls, stateFile } = config;

  log('info', 'Starting check cycle', { urlCount: productUrls.length });

  // Periodic session health check (R1.3)
  if (config.autoPurchase?.enabled && _browserManager) {
    _checkCycleCount++;
    if (_checkCycleCount % SESSION_CHECK_INTERVAL === 0) {
      await checkSessionHealth(config);
    }
  }

  // Load current state
  const state = await loadState(stateFile);

  for (const url of productUrls) {
    await checkProduct(url, config, state);
  }

  // Save updated state
  await saveState(state, stateFile);

  _lastCheckTime = new Date().toISOString();
  log('info', 'Check cycle complete');
}

/**
 * Proactively verify browser session and re-authenticate if expired (R1.3)
 * @param {Object} config - Configuration object
 */
async function checkSessionHealth(config) {
  try {
    const page = _browserManager.getPage();
    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      log('warn', 'Session expired (periodic check), re-authenticating');
      await ensureAuthenticated(page, config);
    }
  } catch (error) {
    log('warn', 'Session health check failed', { error: error.message });
  }
}

/**
 * Check a single product and notify if status changed to available
 * @param {string} url - Product URL
 * @param {Object} config - Configuration object
 * @param {Object} state - State object (updated in-place)
 * @returns {Promise<void>}
 */
async function checkProduct(url, config, state) {
  try {
    const previousStatus = getProductStatus(state, url);
    const result = await productChecker(url, config);

    // Update status in state
    updateProductStatus(state, url, result.available ? 'available' : 'unavailable', result.name);

    // Check for transition to available
    if (result.available && previousStatus !== 'available') {
      log('info', 'Product became available', { url, name: result.name });

      // Check if we've already notified recently
      const lastNotified = getLastNotified(state, url);
      const shouldNotify = !lastNotified || isExpiredNotification(lastNotified);

      if (shouldNotify) {
        await notificationService(result, config);
        markNotified(state, url);
      } else {
        log('info', 'Already notified recently, skipping', { url, lastNotified });
      }

      // Auto-purchase: add to cart if enabled
      if (config.autoPurchase?.enabled && _browserManager) {
        try {
          await addToCart(result, config, _browserManager, state);
        } catch (error) {
          log('error', 'Auto-purchase failed', { url, error: error.message });
        }
      }
    }
  } catch (error) {
    log('error', 'Error checking product', { url, error: error.message });
  }
}

/**
 * Check if a notification timestamp is expired (older than interval)
 * @param {string} timestamp - ISO timestamp
 * @returns {boolean} True if notification is expired
 */
function isExpiredNotification(timestamp) {
  const notifiedTime = new Date(timestamp);
  const now = new Date();
  const ageMs = now - notifiedTime;
  return ageMs > 86400000; // 24 hours
}

/**
 * Set up graceful shutdown handlers
 */
function setupShutdownHandlers() {
  const shutdown = () => {
    log('info', 'Received shutdown signal');
    stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
