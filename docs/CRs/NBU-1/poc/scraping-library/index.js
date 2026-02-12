import { chromium } from 'playwright';

const TARGET_URL = 'https://coins.bank.gov.ua/en/product/';

// Common selectors for shopping cart buttons (will test multiple)
const CART_BUTTON_SELECTORS = [
  'button:has-text("Add to cart")',
  'button:has-text("Buy")',
  'button:has-text("Add")',
  'button.cart-button',
  'a:has-text("Add to cart")',
  'a:has-text("Buy")',
  '[class*="cart"]',
  '[class*="add-to"]',
  'button', // Fallback - find all buttons
];

async function scrapeProductPage() {
  const startTime = Date.now();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    console.log(`Fetching ${TARGET_URL}...`);

    // Set timeout to 10 seconds per requirements
    page.setDefaultTimeout(10000);

    await page.goto(TARGET_URL, {
      waitUntil: 'networkidle',
    });

    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Check each selector
    let cartFound = false;
    let cartButtonElement = null;
    let cartButtonText = '';

    for (const selector of CART_BUTTON_SELECTORS) {
      try {
        const element = await page.locator(selector).first();
        const count = await element.count();
        if (count > 0) {
          console.log(`✓ Found ${count} element(s) with selector: "${selector}"`);

          // Get the actual element for details
          cartFound = true;
          cartButtonElement = element;
          cartButtonText = await element.textContent({ timeout: 1000 }).catch(() => 'N/A');
          console.log(`  Button text: "${cartButtonText.trim()}"`);

          // Try to get more details
          const isVisible = await element.isVisible().catch(() => false);
          console.log(`  Is visible: ${isVisible}`);

          if (isVisible) {
            // Found our match, stop checking other selectors
            break;
          }
        }
      } catch (e) {
        // Element not found, try next selector
      }
    }

    // Extract product name
    let productName = 'N/A';
    const productNameSelectors = ['h1', '[class*="product-name"]', '[class*="title"]'];
    for (const selector of productNameSelectors) {
      try {
        const element = await page.locator(selector).first();
        const text = await element.textContent({ timeout: 1000 }).catch(() => '');
        if (text && text.length > 5 && text.length < 100) {
          productName = text.trim();
          console.log(`Product name: ${productName}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    // Log all buttons on page (for analysis)
    console.log('\n--- All buttons on page ---');
    const allButtons = await page.locator('button').all();
    console.log(`Total buttons found: ${allButtons.length}`);
    for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
      try {
        const text = await allButtons[i].textContent();
        const classes = await allButtons[i].getAttribute('class');
        console.log(`  [${i}] Text: "${text?.trim()}", Class: "${classes || 'N/A'}"`);
      } catch (e) {
        // Skip
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`\nElapsed time: ${elapsed}ms`);

    return {
      success: true,
      url: TARGET_URL,
      title,
      cartFound,
      cartButtonText: cartButtonText.trim(),
      productName,
      elapsed,
      selectors: CART_BUTTON_SELECTORS,
    };

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      elapsed,
    };
  } finally {
    await browser.close();
  }
}

// Run the experiment
const result = await scrapeProductPage();
console.log('\n=== RESULT ===');
console.log(JSON.stringify(result, null, 2));