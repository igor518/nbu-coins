# PoC: Rate Limiting and Anti-Bot Detection

## How to Run

```bash
npm install
node index.js
```

## Expected Output

```
Testing rate limits with different intervals...
Single request: {time}ms - Status: {200/429/etc}
90s interval requests: {results}
60s interval requests: {results}
30s interval requests: {results}
```

## Experiment Goal

Test different request intervals to determine safe rate limits that won't trigger anti-bot measures.