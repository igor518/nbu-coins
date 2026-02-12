/**
 * CAPTCHA solver — detects Cloudflare Turnstile challenges and solves via 2captcha
 * Implements: R4.1-R4.5
 */

import { Solver } from '@2captcha/captcha-solver';
import { log } from './logger.js';

export async function detectChallenge(page) {
  try {
    const hasTurnstile = await page.evaluate(() => {
      return !!(
        document.querySelector('.cf-turnstile') ||
        document.querySelector('iframe[src*="challenges.cloudflare.com"]') ||
        document.querySelector('#challenge-form')
      );
    });
    if (hasTurnstile) {
      log('info', 'Cloudflare Turnstile challenge detected', { url: page.url() });
    }
    return hasTurnstile;
  } catch (error) {
    log('warn', 'Error detecting challenge', { error: error.message });
    return false;
  }
}

export async function solve(page, config) {
  const sitekey = await extractTurnstileParams(page);
  if (!sitekey) {
    throw new Error('Could not extract Turnstile sitekey from page');
  }

  log('info', 'Submitting CAPTCHA to 2captcha', { url: page.url(), sitekey });

  const solver = new Solver(config.autoPurchase.captchaApiKey);
  const result = await solver.cloudflareTurnstile({
    pageurl: page.url(),
    sitekey
  });

  log('info', 'CAPTCHA solution received', { id: result.id });

  await applyToken(page, result.data);
}

/**
 * Extract Turnstile sitekey from the page
 * @param {import('playwright').Page} page
 * @returns {Promise<string|null>} Sitekey or null
 */
async function extractTurnstileParams(page) {
  return page.evaluate(() => {
    const turnstileDiv = document.querySelector('.cf-turnstile');
    if (turnstileDiv) {
      return turnstileDiv.getAttribute('data-sitekey');
    }
    const iframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
    if (iframe) {
      const match = iframe.src.match(/sitekey=([^&]+)/);
      return match ? match[1] : null;
    }
    return null;
  });
}

/**
 * Inject the solved token into the page and trigger callback
 * @param {import('playwright').Page} page
 * @param {string} token - Solved CAPTCHA token
 * @returns {Promise<void>}
 */
async function applyToken(page, token) {
  await page.evaluate((tk) => {
    const responseInput = document.querySelector('[name="cf-turnstile-response"]');
    if (responseInput) {
      responseInput.value = tk;
    }
    if (typeof window.turnstile !== 'undefined' && window.turnstile.getResponse) {
      // Trigger turnstile callback if available
      const cb = document.querySelector('.cf-turnstile')?.getAttribute('data-callback');
      if (cb && typeof window[cb] === 'function') {
        window[cb](tk);
      }
    }
  }, token);

  log('info', 'CAPTCHA token applied to page');
}
