/**
 * State manager for persistence and duplicate notification prevention
 * Implements: R4.1-R4.3 (Duplicate notification prevention), FR-4, FR-6, NFR-R2
 */

import { log } from './logger.js';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default state file path (relative to project root)
const DEFAULT_STATE_FILE = 'data/state.json';

/**
 * Load state from JSON file
 * @param {string} [filePath] - Path to state file (defaults to DEFAULT_STATE_FILE)
 * @returns {Promise<Object>} State object
 */
export async function load(filePath = DEFAULT_STATE_FILE) {
  try {
    const absolutePath = resolvePath(filePath);
    const data = await fs.readFile(absolutePath, 'utf-8');
    const state = JSON.parse(data);

    log('info', 'State loaded successfully', { filePath: absolutePath, products: Object.keys(state.products || {}).length });
    return state;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return initial state
      log('info', 'State file not found, creating initial state', { filePath });
      return createInitialState();
    }
    log('error', 'Error loading state', { error: error.message });
    throw new Error(`Failed to load state: ${error.message}`);
  }
}

/**
 * Save state to JSON file
 * @param {Object} state - State object to save
 * @param {string} [filePath] - Path to state file (defaults to DEFAULT_STATE_FILE)
 * @returns {Promise<void>}
 */
export async function save(state, filePath = DEFAULT_STATE_FILE) {
  try {
    const absolutePath = resolvePath(filePath);
    state.lastUpdated = new Date().toISOString();

    // Ensure directory exists
    await fs.mkdir(dirname(absolutePath), { recursive: true });

    await fs.writeFile(absolutePath, JSON.stringify(state, null, 2), 'utf-8');
    log('info', 'State saved successfully', { filePath: absolutePath });
  } catch (error) {
    log('error', 'Error saving state', { error: error.message });
    throw new Error(`Failed to save state: ${error.message}`);
  }
}

/**
 * Get product status from state
 * @param {Object} state - State object
 * @param {string} url - Product URL
 * @returns {string|null} Product status ('available', 'unavailable', or null)
 */
export function getProductStatus(state, url) {
  const product = state.products?.[url];
  return product?.status || null;
}

/**
 * Update product status in state
 * @param {Object} state - State object to update
 * @param {string} url - Product URL
 * @param {string} status - New status ('available' or 'unavailable')
 * @param {string} [name] - Product name
 */
export function updateProductStatus(state, url, status, name) {
  if (!state.products) {
    state.products = {};
  }

  state.products[url] = {
    status,
    name: name || state.products[url]?.name || "Unknown Product",
    updatedAt: new Date().toISOString()
  };

  log('info', 'Product status updated', { url, status, name });
}

/**
 * Get last notified timestamp for a product
 * @param {Object} state - State object
 * @param {string} url - Product URL
 * @returns {string|null} ISO timestamp or null
 */
export function getLastNotified(state, url) {
  return state.products?.[url]?.lastNotified || null;
}

/**
 * Mark product as notified (prevents duplicate notifications)
 * @param {Object} state - State object to update
 * @param {string} url - Product URL
 */
export function markNotified(state, url) {
  if (state.products?.[url]) {
    state.products[url].lastNotified = new Date().toISOString();
    log('info', 'Product marked as notified', { url });
  }
}

/**
 * Mark product as added to cart (prevents duplicate cart additions)
 * @param {Object} state - State object to update
 * @param {string} url - Product URL
 */
export function markInCart(state, url) {
  if (state.products?.[url]) {
    state.products[url].inCart = true;
    state.products[url].cartedAt = new Date().toISOString();
    log('info', 'Product marked as in cart', { url });
  }
}

/**
 * Check if product is already in cart
 * @param {Object} state - State object
 * @param {string} url - Product URL
 * @returns {boolean} True if product is in cart
 */
export function isInCart(state, url) {
  return state.products?.[url]?.inCart === true;
}

/**
 * Clear all cart records (reset deduplication)
 * @param {Object} state - State object to update
 */
export function clearCart(state) {
  for (const url of Object.keys(state.products || {})) {
    delete state.products[url].inCart;
    delete state.products[url].cartedAt;
  }
  log('info', 'All cart records cleared');
}

/**
 * Clear all product data (reset state to empty)
 * @param {Object} state - State object to update
 */
export function clearProducts(state) {
  state.products = {};
  log('info', 'All product data cleared');
}

/**
 * Create initial empty state
 * @returns {Object} Initial state object
 */
function createInitialState() {
  return {
    lastUpdated: new Date().toISOString(),
    products: {}
  };
}

/**
 * Resolve relative path to absolute path
 * @param {string} filePath - File path (can be relative)
 * @returns {string} Absolute path
 */
function resolvePath(filePath) {
  if (filePath.startsWith('/')) {
    return filePath; // Already absolute
  }
  // Relative to project root (one level up from lib/)
  return join(__dirname, '..', filePath);
}
