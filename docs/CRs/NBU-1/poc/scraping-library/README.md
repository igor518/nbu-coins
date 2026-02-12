# PoC: NBU Coin Scraper - Scraping Library Evaluation

## How to Run

```bash
npm install
node index.js
```

## Expected Output

```
Fetching https://coins.bank.gov.ua/en/product/...
Page title: {actual page title}
Shopping cart button found: true/false
Cart button text: {button text if found}
Product name: {extracted product name}
Elapsed time: {milliseconds}ms
```

## Experiment Goal

Test whether we can reliably detect the shopping cart button on coins.bank.gov.ua product pages using Playwright.