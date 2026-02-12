import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const AVAILABLE_URL = 'https://coins.bank.gov.ua/pam-jatna-banknota-iednist-rjatuie-svit-u-suvenirnomu-pakovanni/p-1086.html';
const UNAVAILABLE_URL = 'https://coins.bank.gov.ua/nabir-moneti-ukrajini-2025-u-suvenirnomu-pakovanni/p-1182.html';

async function checkAvailabilityStatic(url) {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract product name
    const productName = $('h1').first().text().trim() || $('title').text().trim();

    // Check for availability indicators

    // 1. Check for quantity input (indicates available)
    const quantityInput = $('input[type="text"][name*="quantity"], input[name*="qty"], .qty input').length > 0;
    const quantityLabel = $('input[type="text"]').closest('div').find('label, span').first().text().trim();

    // 2. Check for price
    const priceText = $('.price, [class*="price"]').first().text().trim();

    // 3. Check for "Очікується" (Expected - indicates unavailable)
    const expectedText = $('*:contains("Очікується")').length > 0;
    const statusText = $('.status, [class*="status"], .availability').first().text().trim();

    // 4. Check for "У продажу" (In sale) text
    const inSaleText = $('*:contains("У продажу")').length > 0;

    // 5. Check for buy button/cart link
    const buyButton = $('button:contains("Купити"), button:contains("В кошик"), button:contains("Add to cart")').length > 0;
    const buyLink = $('a:contains("Купити"), a:contains("В кошик"), a:contains("Add to cart")').length > 0;

    // 6. Check for auth link (appears when item available but need to login)
    const authLink = $('a[href*="login.php"]').length > 0;

    const elapsed = Date.now() - startTime;

    // Determine availability
    const isAvailable = (quantityInput || priceText) && !expectedText;

    return {
      url,
      productName,
      isAvailable,
      indicators: {
        quantityInput,
        quantityLabel,
        priceText,
        expectedText,
        statusText,
        inSaleText,
        buyButton,
        buyLink,
        authLink,
      },
      elapsed,
    };

  } catch (error) {
    const elapsed = Date.now() - startTime;
    return {
      url,
      success: false,
      error: error.message,
      elapsed,
    };
  }
}

async function main() {
  console.log('=== Testing Static HTML Scraping (Cheerio) ===\n');

  console.log('Test 1: Available product');
  console.log(`URL: ${AVAILABLE_URL}`);
  const result1 = await checkAvailabilityStatic(AVAILABLE_URL);
  console.log(JSON.stringify(result1, null, 2));
  console.log('');

  console.log('Test 2: Unavailable product');
  console.log(`URL: ${UNAVAILABLE_URL}`);
  const result2 = await checkAvailabilityStatic(UNAVAILABLE_URL);
  console.log(JSON.stringify(result2, null, 2));
  console.log('');

  console.log('=== Comparison ===');
  console.log(`Available product has quantity input: ${result1.indicators.quantityInput}`);
  console.log(`Unavailable product has quantity input: ${result2.indicators.quantityInput}`);
  console.log(`Available product shows "Очікується": ${result1.indicators.expectedText}`);
  console.log(`Unavailable product shows "Очікується": ${result2.indicators.expectedText}`);
  console.log(`Available product has price: ${!!result1.indicators.priceText}`);
  console.log(`Unavailable product has price: ${!!result2.indicators.priceText}`);
}

main();