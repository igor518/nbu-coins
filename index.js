/**
 * NBU Watcher - Main entry point
 * Monitors NBU coin availability and sends Telegram notifications
 */

import 'dotenv/config';
import { load as loadConfig } from './lib/config.js';
import { log } from './lib/logger.js';
import * as scheduler from './lib/scheduler.js';
import { start as startScheduler, stop as stopScheduler, updateBrowserManager } from './lib/scheduler.js';
import { launch as launchBrowser, close as closeBrowser } from './lib/browser-manager.js';
import { ensureAuthenticated } from './lib/auth-service.js';
import { sendAuthFailure } from './lib/notification-service.js';
import { start as startBot, stop as stopBot } from './lib/bot-command-handler.js';
import { promises as fs } from 'fs';
import { dirname } from 'path';

async function main() {
  try {
    // Load and validate configuration
    const config = loadConfig();

    // Ensure data directory exists
    await ensureDataDirectory(config.stateFile);

    log('info', 'NBU Watcher starting', {
      urlCount: config.productUrls.length,
      checkInterval: config.checkInterval,
      stateFile: config.stateFile,
      autoPurchase: config.autoPurchase.enabled
    });

    // Launch browser and pre-login if auto-purchase enabled
    let browserManager = null;
    if (config.autoPurchase.enabled) {
      log('info', 'Auto-purchase enabled, launching browser...');
      browserManager = await launchBrowser(config);
      const page = browserManager.getPage();
      const loggedIn = await ensureAuthenticated(page, config);
      if (!loggedIn) {
        await sendAuthFailure('Initial login failed', config);
        log('warn', 'Auto-purchase disabled due to login failure');
        config.autoPurchase.enabled = false;
        await closeBrowser();
        browserManager = null;
      } else {
        // Set up crash recovery
        browserManager.onCrash(async () => {
          log('warn', 'Browser crashed, restarting...');
          try {
            browserManager = await launchBrowser(config);
            updateBrowserManager(browserManager);
            const page = browserManager.getPage();
            await ensureAuthenticated(page, config);
            log('info', 'Browser recovered successfully');
          } catch (err) {
            log('error', 'Browser recovery failed', { error: err.message });
            updateBrowserManager(null);
          }
        });
      }
    }

    // Start the scheduler
    await startScheduler(config, browserManager);

    // Start Telegram bot command listener
    startBot(config, scheduler);

    log('info', 'NBU Watcher is running');
  } catch (error) {
    log('error', 'Failed to start NBU Watcher', { error: error.message });
    process.exit(1);
  }
}

async function ensureDataDirectory(stateFile) {
  const stateDir = dirname(stateFile);
  if (stateDir && stateDir !== '.') {
    await fs.mkdir(stateDir, { recursive: true });
  }
}

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  log('error', 'Uncaught exception', { error: error.message, stack: error.stack });
  stopBot();
  stopScheduler();
  await closeBrowser().catch(() => {});
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  log('error', 'Unhandled rejection', { reason });
  stopBot();
  stopScheduler();
  await closeBrowser().catch(() => {});
  process.exit(1);
});

// Start the application
main();
