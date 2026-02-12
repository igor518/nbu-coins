/**
 * Cart service — add-to-cart orchestration
 * Implements: R3.1-R3.8, R6.1-R6.3
 */

import { ensureAuthenticated } from './auth-service.js';
import { detectChallenge, solve as solveCaptcha } from './captcha-solver.js';
import { sendCartSuccess, sendCartFailure } from './notification-service.js';
import { isInCart, markInCart } from './state-manager.js';
import { log } from './logger.js';

const CART_SUCCESS_TEXT = 'Товар успішно доданий у кошик';

export async function addToCart(product, config, browserManager, state) {
  // Dedup check — skip if already in cart (R6.2, R6.3)
  if (state && isInCart(state, product.url)) {
    log('info', 'Skipping cart addition — already in cart', { url: product.url });
    return { success: false, reason: 'already_in_cart' };
  }

  const page = browserManager.getPage();
  const quantity = config.autoPurchase.cartQuantity;

  log('info', 'Starting cart flow', { url: product.url, quantity });

  try {
    // Navigate to product page
    await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Check if redirected to login (session expired)
    if (isLoginPage(page.url())) {
      log('info', 'Redirected to login, re-authenticating');
      const authOk = await ensureAuthenticated(page, config);
      if (!authOk) {
        await sendCartFailure(product, 'Re-authentication failed', config);
        return { success: false, reason: 'auth_failed' };
      }
      // Retry navigation after re-auth
      await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    // Check for CAPTCHA on product page
    if (await detectChallenge(page)) {
      log('info', 'CAPTCHA detected on product page, solving...');
      await solveCaptcha(page, config);
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    }

    // Check if product is still available (buy button present)
    const buyButton = await page.$('.btn-primary.buy');
    if (!buyButton) {
      log('info', 'Product no longer available (buy button not found)', { url: product.url });
      await sendCartFailure(product, 'Product sold out — buy button not found', config);
      return { success: false, reason: 'sold_out' };
    }

    // Select quantity if dropdown exists
    const qtySelect = await page.$('select[name="quantity"], select.quantity');
    if (qtySelect) {
      await qtySelect.selectOption(String(quantity));
    }

    // Click buy button
    log('info', 'Clicking buy button', { url: product.url });
    await buyButton.click();

    // Wait for response
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });

    // Check for CAPTCHA after buy click
    if (await detectChallenge(page)) {
      log('info', 'CAPTCHA detected after buy click, solving...');
      await solveCaptcha(page, config);
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    }

    // Detect cart result
    const result = await detectCartResult(page);

    if (result.success) {
      log('info', 'Cart addition successful', { product: product.name });
      if (state) markInCart(state, product.url);
      await sendCartSuccess(product, quantity, config);
      return { success: true };
    }

    log('warn', 'Cart addition failed', { product: product.name, reason: result.reason });
    await sendCartFailure(product, result.reason, config);
    return { success: false, reason: result.reason };

  } catch (error) {
    log('error', 'Cart flow error', { url: product.url, error: error.message });
    await sendCartFailure(product, error.message, config).catch(() => {});
    return { success: false, reason: error.message };
  }
}

function isLoginPage(url) {
  return url.includes('login.php');
}

async function detectCartResult(page) {
  try {
    const pageText = await page.evaluate(() => document.body.innerText);

    if (pageText.includes(CART_SUCCESS_TEXT)) {
      return { success: true };
    }

    // Check for common failure indicators
    if (pageText.includes('немає в наявності') || pageText.includes('out of stock')) {
      return { success: false, reason: 'Product sold out' };
    }

    // Check if we ended up on the cart page (another success indicator)
    if (page.url().includes('shopping_cart.php')) {
      return { success: true };
    }

    return { success: false, reason: 'Unknown cart result — success text not found' };
  } catch (error) {
    return { success: false, reason: `Failed to detect cart result: ${error.message}` };
  }
}
