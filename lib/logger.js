/**
 * Centralized logging utility with structured JSON output
 * Implements: R8.1-R8.3 (Logging)
 */

// ANSI color codes for console output
const COLORS = {
  info: '\x1b[36m',   // Cyan
  warn: '\x1b[33m',   // Yellow
  error: '\x1b[31m',  // Red
  reset: '\x1b[0m'
};

/**
 * Log a message with level, timestamp, and context
 * @param {string} level - Log level: 'info', 'warn', 'error'
 * @param {string} message - Main log message
 * @param {Object} [context] - Additional structured data
 */
export function log(level, message, context = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };

  const color = COLORS[level] || COLORS.info;
  const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  // Output colored JSON to console
  consoleMethod(`${color}${JSON.stringify(logEntry)}${COLORS.reset}`);
}
