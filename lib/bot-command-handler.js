/**
 * Telegram bot command handler — listens for /start, /stop, /status, /reset_cart
 * Implements: R7.1-R7.7, R6.5
 */

import { sendReply } from './notification-service.js';
import { load as loadState, save as saveState, clearCart, clearProducts } from './state-manager.js';
import { log } from './logger.js';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';
const POLL_TIMEOUT = 30;
const ERROR_RETRY_DELAY = 5000;

let _running = false;
let _offset = 0;
let _scheduler = null;
let _config = null;

export function start(config, scheduler) {
  if (_running) return;
  _running = true;
  _scheduler = scheduler;
  _config = config;
  log('info', 'Bot command handler started');
  poll();
}

export function stop() {
  _running = false;
  log('info', 'Bot command handler stopped');
}

async function poll() {
  while (_running) {
    try {
      const updates = await getUpdates();
      for (const update of updates) {
        _offset = update.update_id + 1;
        if (update.message?.text) {
          await handleMessage(update.message);
        }
      }
    } catch (error) {
      log('warn', 'Bot polling error', { error: error.message });
      await delay(ERROR_RETRY_DELAY);
    }
  }
}

async function getUpdates() {
  const url = `${TELEGRAM_API_URL}${_config.telegram.botToken}/getUpdates`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offset: _offset,
      timeout: POLL_TIMEOUT,
      allowed_updates: ['message']
    }),
    signal: AbortSignal.timeout((POLL_TIMEOUT + 5) * 1000)
  });

  if (!response.ok) {
    throw new Error(`Telegram API error: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.result || [];
}

async function handleMessage(message) {
  const chatId = String(message.chat.id);
  if (chatId !== _config.telegram.chatId) {
    log('warn', 'Unauthorized bot command', { chatId });
    return;
  }

  const command = message.text.trim().split(' ')[0].toLowerCase();
  switch (command) {
    case '/start':
      _scheduler.resume();
      await sendReply('Watcher resumed. Monitoring ' + (_scheduler.getStatus().productCount) + ' products.', _config);
      break;
    case '/stop':
      _scheduler.pause();
      await sendReply('Watcher paused. Send /start to resume.', _config);
      break;
    case '/status': {
      const status = _scheduler.getStatus();
      const state = status.paused ? 'paused' : 'running';
      const lastCheck = status.lastCheckTime || 'never';
      await sendReply(`Status: ${state}\nProducts: ${status.productCount}\nLast check: ${lastCheck}`, _config);
      break;
    }
    case '/reset_cart': {
      const st = await loadState(_config.stateFile);
      clearCart(st);
      await saveState(st, _config.stateFile);
      await sendReply('Cart records cleared. Products can be re-added to cart.', _config);
      break;
    }
    case '/clear_data': {
      const st = await loadState(_config.stateFile);
      clearProducts(st);
      await saveState(st, _config.stateFile);
      await sendReply('All saved product data cleared.', _config);
      break;
    }
    default:
      break;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
