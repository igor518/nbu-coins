/**
 * Authentication service — login flow with session management
 * Implements: R1.3, R1.4, R1.6, R2.1-R2.5
 */

import { detectChallenge, solve as solveCaptcha } from './captcha-solver.js';
import { retry } from './retry.js';
import { log } from './logger.js';

const LOGIN_URL = 'https://coins.bank.gov.ua/login.php';
const ACCOUNT_URL = 'https://coins.bank.gov.ua/account.php';

export async function login(page, config) {
  log('info', 'Navigating to login page');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Fill login form (field is "email_address", not "email" — "email" is the footer newsletter)
  await page.fill('input[name="email_address"]', config.autoPurchase.email);
  await page.fill('input[name="password"]', config.autoPurchase.password);
  await page.click('button[type="submit"].btn.btn-default');

  // Wait for navigation after submit
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });

  // Check for CAPTCHA challenge after submit
  if (await detectChallenge(page)) {
    log('info', 'CAPTCHA detected during login, solving...');
    await solveCaptcha(page, config);
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  }

  // Verify login success
  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    throw new Error('Login failed — still on login page after submission');
  }

  log('info', 'Login successful');
  return true;
}

export async function isLoggedIn(page) {
  try {
    // Check for logged-in indicators without navigating away
    const currentUrl = page.url();

    // If we're already on a page, check for user menu / account link
    const hasUserIndicator = await page.evaluate(() => {
      return !!(
        document.querySelector('a[href*="account.php"]') ||
        document.querySelector('.user-menu') ||
        document.querySelector('a[href*="logout"]') ||
        document.querySelector('.cabinet-link') ||
        [...document.querySelectorAll('a')].some(a => a.textContent.includes('Мій кабінет'))
      );
    });

    return hasUserIndicator;
  } catch (error) {
    log('warn', 'Error checking login status', { error: error.message });
    return false;
  }
}

export async function ensureAuthenticated(page, config) {
  // Check if already logged in
  if (await isLoggedIn(page)) {
    log('info', 'Session is valid, already logged in');
    return true;
  }

  // Attempt login with retries (up to 3 attempts for CAPTCHA failures)
  try {
    await retry(
      () => login(page, config),
      {
        maxAttempts: 3,
        initialDelay: 2000,
        backoffMultiplier: 2,
        onRetry: (attempt, error) => {
          log('warn', 'Login attempt failed, retrying', { attempt, error: error.message });
        }
      }
    );
    return true;
  } catch (error) {
    log('error', 'All login attempts failed', { error: error.message });
    return false;
  }
}
