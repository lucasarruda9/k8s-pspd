import { config } from '../config.js';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const activeLevel = LEVELS[config.logLevel] ?? LEVELS.info;

function log(level, service, message, meta = {}) {
  if (LEVELS[level] > activeLevel) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export function createLogger(service) {
  return {
    error: (msg, meta) => log('error', service, msg, meta),
    warn: (msg, meta) => log('warn', service, msg, meta),
    info: (msg, meta) => log('info', service, msg, meta),
    debug: (msg, meta) => log('debug', service, msg, meta),
  };
}
