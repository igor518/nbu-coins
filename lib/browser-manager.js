/**
 * Browser lifecycle manager — Playwright with stealth plugin
 * Implements: R1.1, R1.2, R1.5, R2.3
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { log } from './logger.js';

chromium.use(StealthPlugin());

let browser = null;
let context = null;
let page = null;
let onCrashCallback = null;

export async function launch(config) {
  log('info', 'Launching stealth browser', { headless: config.autoPurchase.browserHeadless });

  browser = await chromium.launch({
    headless: config.autoPurchase.browserHeadless
  });

  context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'uk-UA',
    viewport: { width: 1280, height: 720 }
  });

  page = await context.newPage();

  setupCrashRecovery();

  log('info', 'Browser launched successfully');

  return { getPage, close, isAlive, onCrash };
}

export function getPage() {
  if (!page || page.isClosed()) {
    throw new Error('Browser page is not available');
  }
  return page;
}

export async function close() {
  log('info', 'Closing browser');
  try {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  } finally {
    browser = null;
    context = null;
    page = null;
  }
}

export function isAlive() {
  return browser !== null && browser.isConnected() && page !== null && !page.isClosed();
}

export function onCrash(callback) {
  onCrashCallback = callback;
}

function setupCrashRecovery() {
  if (!browser) return;

  browser.on('disconnected', () => {
    log('error', 'Browser disconnected unexpectedly');
    browser = null;
    context = null;
    page = null;

    if (onCrashCallback) {
      onCrashCallback();
    }
  });
}
